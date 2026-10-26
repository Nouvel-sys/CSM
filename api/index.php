<?php

declare(strict_types=1);

require dirname(__DIR__) . '/server/bootstrap.php';
require dirname(__DIR__) . '/server/arena.php';
require dirname(__DIR__) . '/server/learning_workspace.php';

// ============================================================================
// 1. Request Context & Security Headers
// ============================================================================
$route = $_GET['r'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

header('Referrer-Policy: same-origin');
header('X-Frame-Options: SAMEORIGIN');

if (!is_string($route)) {
    fail(400, 'Invalid endpoint.');
}

if (!in_array($method, ['GET', 'POST', 'PATCH', 'DELETE'], true)) {
    fail(405, 'Method not allowed.');
}

if (str_starts_with($route, 'admin/')) {
    enforce_admin_access();
}

if ($method !== 'GET' && !same_origin_request()) {
    fail(403, 'Cross-origin state-changing requests are not allowed.');
}

$publicSessionRoutes = [
    'auth/session',
    'auth/login',
    'auth/register',
    'auth/password/request',
    'auth/password/reset',
    'shared/deck',
    'shared/document',
    'people/document',
];

if (isset($_SESSION['user_id']) && !in_array($route, $publicSessionRoutes, true)) {
    $sessionUserId = (string)$_SESSION['user_id'];
    $currentAuthVersion = query('SELECT auth_version FROM users WHERE id=?', [$sessionUserId])->fetchColumn();
    if ($currentAuthVersion === false || (int)$currentAuthVersion !== (int)($_SESSION['auth_version'] ?? 0)) {
        fail(401, 'Your account was signed in on another device or tab. Please sign in again.', ['code' => 'session_replaced']);
    }
    if (!tab_session_matches($sessionUserId, ['auth_version' => (int)$currentAuthVersion])) {
        fail(401, 'Your account was signed in from another tab. Please sign in again.', ['code' => 'another_tab']);
    }
}

if ($method !== 'GET') {
    csrf();
}

// ============================================================================
// 2. Authentication & Session Endpoints
// ============================================================================

// Check active session & return profile
if ($route === 'auth/session' && $method === 'GET') {
    $ok = false;
    $sessionReason = null;
    if (isset($_SESSION['user_id'])) {
        $u = query('SELECT auth_version FROM users WHERE id=?', [$_SESSION['user_id']])->fetch();
        if (!$u || (int)$u['auth_version'] !== (int)($_SESSION['auth_version'] ?? 0)) {
            $sessionReason = 'session_replaced';
        } elseif (!tab_session_matches((string)$_SESSION['user_id'], $u)) {
            $sessionReason = 'another_tab';
        } else {
            $ok = true;
        }
    }
    $sessionProfile = $ok ? profile($_SESSION['user_id']) : null;
    respond([
        'authenticated' => (bool)$ok,
        'timedOut' => $sessionTimedOut,
        'reason' => $sessionReason,
        'csrf' => $_SESSION['csrf'],
        'profile' => $sessionProfile,
        'adminUrl' => $sessionProfile && in_array($sessionProfile['role'] ?? '', ['admin', 'superadmin'], true) ? admin_entry_url() : null,
    ]);
}

// Password reset request (send recovery email)
if ($route === 'auth/password/request' && $method === 'POST') {
    $started = microtime(true);
    $data = input();
    $email = $data['email'] ?? '';
    $email = is_string($email) ? trim($email) : '';
    $validEmail = strlen($email) <= 254 && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    $normalized = $validEmail ? (function_exists('mb_strtolower') ? mb_strtolower($email, 'UTF-8') : strtolower($email)) : '';
    $key = (string)($config['mailer_secret'] ?: 'local-reset-throttle-key-change-this');
    $address = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');

    $allowed = throttle_allows(hash_hmac('sha256', 'reset-ip:' . $address, $key), 30, 900);
    if ($validEmail) {
        $allowed = throttle_allows(hash_hmac('sha256', 'reset-email:' . $normalized, $key), 3, 900) && $allowed;
    }

    if ($allowed && $validEmail && recovery_delivery_configured()) {
        $issued = $passwordRecovery->issue($normalized);
        if ($issued) {
            $base = rtrim($config['app_base_url'], '/');
            $resetUrl = $base . '/login.html?mode=reset#token=' . rawurlencode($issued['token']);
            $target = query('SELECT id FROM users WHERE email=?', [$normalized])->fetchColumn();
            $sent = false;
            try {
                $sent = send_password_recovery_email($issued['email'], $resetUrl);
            } catch (Throwable $ignored) {
            }

            if (!$sent) {
                $passwordRecovery->revoke($issued['token']);
                audit_event(null, 'password_reset_delivery_failed', is_string($target) ? $target : null, ['channel' => 'email']);
                error_log('Password recovery mail delivery failed.');
            } else {
                audit_event(null, 'password_reset_requested', is_string($target) ? $target : null, ['channel' => 'email']);
            }
        }
    }

    $delay = 500000 - (int)((microtime(true) - $started) * 1000000);
    if ($delay > 0) {
        usleep($delay);
    }

    respond(['message' => 'If an account exists for that email and email delivery is configured, password reset instructions will be sent.']);
}

// Password reset consume token
if ($route === 'auth/password/reset' && $method === 'POST') {
    $data = input();
    $token = field($data, 'token', 64);
    $next = password_value($data, 'newPassword');
    $confirm = password_value($data, 'confirmPassword');

    if (!hash_equals($next, $confirm)) {
        fail(422, 'The new password and confirmation do not match.');
    }

    $target = query('SELECT user_id FROM password_reset_tokens WHERE token_hash=?', [hash('sha256', $token)])->fetchColumn();
    $passwordRecovery->consume($token, password_hash($next, PASSWORD_DEFAULT));
    audit_event(null, 'password_reset_completed', is_string($target) ? $target : null, ['channel' => 'email']);
    respond(['ok' => true, 'message' => 'Password reset. You can now sign in with your new password.']);
}

// User registration & login
if (in_array($route, ['auth/register', 'auth/login'], true) && $method === 'POST') {
    global $users;
    $data = input();
    $login = field($data, 'username', 254);
    $pass = password_value($data, 'password');
    $bucket = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'local') . ':' . $route);
    $now = time();

    query(
        'INSERT INTO auth_attempts (bucket,attempts,window_start) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=IF(window_start<?,1,attempts+1),window_start=IF(window_start<?,VALUES(window_start),window_start)',
        [$bucket, $now, $now - 900, $now - 900]
    );

    if ((int)query('SELECT attempts FROM auth_attempts WHERE bucket=?', [$bucket])->fetchColumn() > 30) {
        fail(429, 'Too many attempts. Try again in 15 minutes.');
    }

    if ($route === 'auth/register') {
        $username = $login;
        if (!preg_match('/^[A-Za-z0-9_]{3,24}$/D', $username)) {
            fail(422, 'Username must contain 3–24 letters, numbers, or underscores.');
        }
        $firstName = field($data, 'firstName', 80);
        $middleName = field($data, 'middleName', 80, false);
        $lastName = field($data, 'lastName', 80);
        foreach ([$firstName, $middleName, $lastName] as $namePart) {
            if (preg_match('/[\x00-\x1F\x7F]/', $namePart)) {
                fail(422, 'Names cannot contain control characters.');
            }
        }
        $email = field($data, 'email', 254);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            fail(422, 'Enter a valid email address.');
        }
        $normalizedEmail = function_exists('mb_strtolower') ? mb_strtolower($email, 'UTF-8') : strtolower($email);
        try {
            $users->register(uid(), $username, $normalizedEmail, password_hash($pass, PASSWORD_DEFAULT), $firstName, $middleName !== '' ? $middleName : null, $lastName);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                fail(409, 'That username or email is already registered.');
            }
            throw $e;
        }
        respond(['message' => 'Account created. Please sign in.'], 201);
    }

    $row = $users->byUsername($login);
    $normalizedLogin = function_exists('mb_strtolower') ? mb_strtolower(trim($login), 'UTF-8') : strtolower(trim($login));
    $accountBucket = $row ? hash('sha256', 'account-login:user:' . $row['id']) : hash('sha256', 'account-login:identifier:' . $normalizedLogin);

    if ($row && !empty($row['banned_at'])) {
        audit_event(null, 'login_blocked', $row['id'], ['reason' => 'account_banned']);
        fail(401, 'Incorrect username or password, or account unavailable.');
    }

    if ($row && $row['locked_until'] && strtotime($row['locked_until'] . ' UTC') > time()) {
        audit_event(null, 'login_blocked', $row['id'], ['reason' => 'account_locked']);
        fail(401, 'Incorrect username or password, or account temporarily unavailable.');
    }

    $hash = $row['password_hash'] ?? '$2y$10$92IXUNpkjJ0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
    if (!$row || !password_verify($pass, $hash)) {
        $withinLimit = throttle_allows($accountBucket, 8, 900);
        $attempts = (int)query('SELECT attempts FROM auth_attempts WHERE bucket=?', [$accountBucket])->fetchColumn();
        if ($row && !$withinLimit) {
            query(
                'UPDATE users SET locked_until=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 MINUTE) WHERE id=? AND (locked_until IS NULL OR locked_until<=UTC_TIMESTAMP(3))',
                [$row['id']]
            );
            audit_event(null, 'account_locked', $row['id'], ['reason' => 'failed_login_threshold']);
        }
        audit_event(null, 'login_failure', $row['id'] ?? null, ['reason' => 'invalid_credentials']);
        fail(401, 'Incorrect username or password, or account temporarily unavailable.');
    }

    if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
        query('UPDATE users SET password_hash=? WHERE id=?', [password_hash($pass, PASSWORD_DEFAULT), $row['id']]);
    }

    $tabHash = request_tab_hash();
    $browserHash = request_browser_hash();
    if (!$tabHash || !$browserHash) {
        fail(400, 'Refresh the page and try signing in again.');
    }

    // Increment the account-wide auth version so every older device/session is revoked.
    query('UPDATE users SET auth_version=auth_version+1 WHERE id=?', [$row['id']]);
    $newAuthVersion = (int)query('SELECT auth_version FROM users WHERE id=?', [$row['id']])->fetchColumn();

    query(
        'INSERT INTO user_active_tabs(user_id,browser_hash,active_tab_hash) VALUES(?,?,?) ON DUPLICATE KEY UPDATE active_tab_hash=VALUES(active_tab_hash),updated_at=UTC_TIMESTAMP(3)',
        [$row['id'], $browserHash, $tabHash]
    );
    query('DELETE FROM auth_attempts WHERE bucket IN (?,?)', [$bucket, $accountBucket]);
    audit_event($row['id'], 'login_success', $row['id'], ['remembered' => ($data['remember'] ?? false) === true]);

    $tabSessions = $_SESSION['tab_sessions'] ?? [];
    $_SESSION = ['tab_sessions' => $tabSessions];
    session_regenerate_id(true);
    $remember = ($data['remember'] ?? false) === true;
    $until = time() + ($remember ? 2592000 : 43200);
    $_SESSION['user_id'] = $row['id'];
    $_SESSION['auth_version'] = $newAuthVersion;
    $_SESSION['expires_at'] = $until;
    $_SESSION['last_activity'] = time();
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    unset($_SESSION['idle_logout']);
    setcookie(session_name(), session_id(), [
        'expires' => $remember ? $until : 0,
        'path' => '/',
        'secure' => (bool)$config['secure_cookie'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    respond(['profile' => profile($row['id']), 'csrf' => $_SESSION['csrf']]);
}

// ============================================================================
// 3. Public Sharing Endpoints (Guest Access)
// ============================================================================

// View shared deck
if ($route === 'shared/deck' && $method === 'GET') {
    $token = $_GET['token'] ?? '';
    if (!is_string($token) || !preg_match('/^[a-zA-Z0-9_-]{3,64}$/D', $token)) {
        fail(404, 'Shared deck link is invalid or not found.');
    }
    $share = $deckSharesService->getByToken($token);
    if (!$share) {
        fail(404, 'Shared deck link not found.');
    }
    if ($share['moderation_status'] !== 'visible') {
        fail(404, 'This deck is currently unavailable.');
    }
    if (!(bool)$share['is_active']) {
        fail(403, 'This shared deck link has been deactivated by the owner.');
    }

    $cards = array_map('card_data', $bombcardsService->forDeck($share['deck_id']));
    $docs = $materialsService->byDeck($share['deck_id']);
    foreach ($docs as &$doc) {
        $doc['deckId'] = $share['deck_id'];
        $doc['url'] = app_base_url() . '/api/index.php?r=shared/document&token=' . rawurlencode($token) . '&id=' . rawurlencode((string)$doc['id']);
    }
    unset($doc);

    respond([
        'deck' => [
            'id' => $share['deck_id'],
            'code' => $share['title'],
            'title' => $share['title'],
            'subject' => $share['subject'],
            'category' => $share['category'],
            'owner' => $share['owner_name'],
            'lastModified' => $share['updated_at'],
            'section' => 'recent',
            'cards' => $cards,
            'documents' => $docs,
            'share' => [
                'token' => $share['share_token'],
                'isActive' => true,
                'url' => app_base_url() . '/shared/deck/' . $share['share_token'],
            ],
        ],
        'share' => [
            'token' => $share['share_token'],
            'isActive' => true,
            'url' => app_base_url() . '/shared/deck/' . $share['share_token'],
        ],
    ]);
}

// Download/view shared document
if ($route === 'shared/document' && $method === 'GET') {
    $token = $_GET['token'] ?? '';
    $docId = $_GET['id'] ?? '';
    if (!is_string($token) || !preg_match('/^[a-zA-Z0-9_-]{3,64}$/D', $token)) {
        fail(404, 'Invalid share token.');
    }
    if (!is_string($docId) || !preg_match('/^[a-f0-9]{32}$/D', $docId)) {
        fail(404, 'Invalid document ID.');
    }
    $share = $deckSharesService->getByToken($token);
    if (!$share || $share['moderation_status'] !== 'visible' || !(bool)$share['is_active']) {
        fail(403, 'This shared document is not available.');
    }

    $document = query("SELECT m.id,m.title,m.stored_name FROM documents m WHERE m.id=? AND m.deck_id=?", [$docId, $share['deck_id']])->fetch();
    if (!$document) {
        fail(404, 'PDF not found.');
    }
    $path = $config['upload_dir'] . '/' . $document['stored_name'];
    if (!is_file($path)) {
        fail(404, 'PDF missing from file storage.');
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    header('Content-Type: application/pdf');
    header('Content-Length: ' . filesize($path));
    $disp = ($_GET['download'] ?? '') === '1' ? 'attachment' : 'inline';
    header("Content-Disposition: $disp; filename=\"document.pdf\"; filename*=UTF-8''" . rawurlencode((string)$document['title']));
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: frame-ancestors 'self'; base-uri 'none'");
    readfile($path);
    exit;
}

// Public PDFs attached to a deck that is currently shared through Discover.
// Visibility is checked on every request so changing a deck back to private revokes access.
if ($route === 'people/document' && $method === 'GET') {
    $docId = $_GET['id'] ?? '';
    if (!is_string($docId) || !preg_match('/^[a-f0-9]{32}$/D', $docId)) fail(404, 'Invalid document ID.');
    $document = query("SELECT m.id,m.title,m.stored_name FROM documents m
        JOIN decks d ON d.id=m.deck_id JOIN users u ON u.id=d.user_id JOIN profiles p ON p.user_id=d.user_id
        WHERE m.id=? AND u.role='user' AND u.banned_at IS NULL AND d.deleted_at IS NULL AND d.moderation_status='visible'
          AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))", [$docId])->fetch();
    if (!$document) fail(404, 'This PDF is private or unavailable.');
    $path = $config['upload_dir'] . '/' . $document['stored_name'];
    if (!is_file($path)) fail(404, 'PDF missing from file storage.');
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    header('Content-Type: application/pdf');
    header('Content-Length: ' . filesize($path));
    header("Content-Disposition: inline; filename=\"document.pdf\"; filename*=UTF-8''" . rawurlencode((string)$document['title']));
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: frame-ancestors 'self'; base-uri 'none'");
    readfile($path);
    exit;
}

// ============================================================================
// 4. Authenticated Context Setup
// ============================================================================
$user = user_id();
$currentRole = current_role($user);

global $users, $decksService, $bombcardsService, $materialsService, $progressService, $bombstyleService, $deckSharesService;

// Searchable public profiles expose only explicitly public reviewer decks.
if ($route === 'people/search' && $method === 'GET') {
    $term = field($_GET, 'q', 60, false);
    if (text_length($term) < 2) respond(['people' => [], 'total' => 0]);
    $limit = max(1, min(20, (int)($_GET['limit'] ?? 12)));
    $offset = max(0, min(1000, (int)($_GET['offset'] ?? 0)));
    $count = (int)query("SELECT COUNT(*) FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.role='user' AND u.banned_at IS NULL AND (LOCATE(LOWER(?),LOWER(u.username))>0 OR LOCATE(LOWER(?),LOWER(p.display_name))>0)", [$term, $term])->fetchColumn();
    $people = query("SELECT u.id, u.username, p.display_name, p.avatar,
        (SELECT COUNT(*) FROM decks d WHERE d.user_id=u.id AND d.deleted_at IS NULL AND d.moderation_status='visible' AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))) public_deck_count
        FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.role='user' AND u.banned_at IS NULL AND (LOCATE(LOWER(?),LOWER(u.username))>0 OR LOCATE(LOWER(?),LOWER(p.display_name))>0)
        ORDER BY p.display_name,u.username LIMIT $limit OFFSET $offset", [$term, $term])->fetchAll();
    respond(['people' => $people, 'total' => $count, 'limit' => $limit, 'offset' => $offset]);
}

if ($route === 'people/profile' && $method === 'GET') {
    $target = id_field($_GET);
    $person = query("SELECT u.id,u.username,p.display_name,p.avatar FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=? AND u.role='user' AND u.banned_at IS NULL", [$target])->fetch();
    if (!$person) fail(404, 'Profile not found.');
    $person['decks'] = query("SELECT d.id,d.title,d.subject,d.category,d.updated_at,
        (SELECT COUNT(*) FROM cards c WHERE c.deck_id=d.id) card_count
        FROM decks d JOIN profiles p ON p.user_id=d.user_id
        WHERE d.user_id=? AND d.deleted_at IS NULL AND d.moderation_status='visible'
          AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))
        ORDER BY d.updated_at DESC,d.id", [$target])->fetchAll();
    respond(['person' => $person]);
}

if ($route === 'people/deck' && $method === 'GET') {
    $deckId = id_field($_GET);
    $deck = query("SELECT d.id,d.title,d.subject,d.category,d.created_at,u.username owner,p.display_name owner_display_name,p.avatar owner_avatar
        FROM decks d JOIN users u ON u.id=d.user_id JOIN profiles p ON p.user_id=u.id
        WHERE d.id=? AND u.role='user' AND u.banned_at IS NULL AND d.deleted_at IS NULL AND d.moderation_status='visible'
          AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))", [$deckId])->fetch();
    if (!$deck) fail(404, 'This deck is private or unavailable.');
    $deck['cards'] = array_map('card_data', $bombcardsService->forDeck($deckId));
    $deck['documents'] = query('SELECT id,title,size_bytes size FROM documents WHERE deck_id=? ORDER BY created_at,id', [$deckId])->fetchAll();
    foreach ($deck['documents'] as &$document) {
        $document['size'] = (int)$document['size'];
        $document['url'] = 'api/index.php?r=people/document&id=' . rawurlencode((string)$document['id']);
    }
    unset($document);
    // Public deck PDFs are shareable; annotations and personal study progress remain private.
    respond(['deck' => $deck]);
}

if ($route === 'people/deck/report' && $method === 'POST') {
    $data = input();
    $deckId = id_field($data, 'deckId');
    $reason = field($data, 'reason', 1000);
    if (text_length($reason) < 8) fail(422, 'Please provide at least 8 characters explaining the issue.');
    $deck = query("SELECT d.id,d.user_id,d.title FROM decks d JOIN users owner ON owner.id=d.user_id JOIN profiles p ON p.user_id=d.user_id WHERE d.id=? AND owner.role='user' AND owner.banned_at IS NULL AND d.deleted_at IS NULL AND d.moderation_status='visible' AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))", [$deckId])->fetch();
    if (!$deck) fail(404, 'This public deck is no longer available.');
    if ((string)$deck['user_id'] === (string)$user) fail(403, 'You cannot report your own deck.');
    if (query("SELECT 1 FROM deck_reports WHERE deck_id=? AND flagged_by_user_id=? AND status='open' LIMIT 1", [$deckId, $user])->fetchColumn()) {
        fail(409, 'You already have an open report for this deck.');
    }
    $db->beginTransaction();
    query('INSERT INTO deck_reports(deck_id,flagged_by_user_id,reason) VALUES(?,?,?)', [$deckId, $user, $reason]);
    $reportId = (int)$db->lastInsertId();
    $staffRecipients = query("SELECT id FROM users WHERE role IN ('admin','superadmin') AND banned_at IS NULL")->fetchAll();
    foreach ($staffRecipients as $recipient) {
        notify_user((string)$recipient['id'], 'deck_report_received', 'Deck reported', 'A public deck was reported and is waiting in the review queue.', (string)$deckId);
    }
    audit_event($user, 'deck_flagged', $deckId, ['reportId' => $reportId], 'deck');
    $db->commit();
    respond(['ok' => true, 'reportId' => $reportId], 201);
}

// Notifications
if ($route === 'notifications' && $method === 'GET') {
    $items = query(
        'SELECT id,notification_type type,title,message,read_at readAt,created_at createdAt,deck_id deckId FROM user_notifications WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 50',
        [$user]
    )->fetchAll();
    $unread = (int)query('SELECT COUNT(*) FROM user_notifications WHERE user_id=? AND read_at IS NULL', [$user])->fetchColumn();
    $unreadReportDecks = (int)query("SELECT COUNT(DISTINCT deck_id) FROM user_notifications WHERE user_id=? AND notification_type='deck_report_received' AND read_at IS NULL AND deck_id IS NOT NULL", [$user])->fetchColumn();
    foreach ($items as &$item) {
        $item['id'] = (int)$item['id'];
        $item['isRead'] = $item['readAt'] !== null;
    }
    unset($item);
    respond(['notifications' => $items, 'unreadCount' => $unread, 'unreadReportDeckCount' => $unreadReportDecks]);
}

if ($route === 'notifications/read' && $method === 'PATCH') {
    $data = input();
    if (array_key_exists('id', $data)) {
        if (!is_int($data['id']) || $data['id'] < 1) {
            fail(422, 'Invalid notification id.');
        }
        query('UPDATE user_notifications SET read_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND read_at IS NULL', [$data['id'], $user]);
    } elseif (($data['type'] ?? null) === 'deck_report_received') {
        query("UPDATE user_notifications SET read_at=UTC_TIMESTAMP(3) WHERE user_id=? AND notification_type='deck_report_received' AND read_at IS NULL", [$user]);
    } else {
        query('UPDATE user_notifications SET read_at=UTC_TIMESTAMP(3) WHERE user_id=? AND read_at IS NULL', [$user]);
    }
    respond(['ok' => true]);
}

if ($route === 'notifications' && $method === 'DELETE') {
    query('DELETE FROM user_notifications WHERE user_id=?', [$user]);
    respond(['ok' => true]);
}

// ============================================================================
// 5. Staff & Administration Routes (`admin/*`)
// ============================================================================
if (str_starts_with($route, 'admin/')) {
    $role = $currentRole;
    if (!in_array($role, ['admin', 'superadmin'], true)) {
        fail(403, 'Administrator access is required.');
    }
    $isSuper = $role === 'superadmin';
    $admin = new Admin($database);
    $sendCsv = static function (string $filename, array $columns, callable $writeRows): void {
        $csvCell = static function ($value): string {
            if ($value === null) return '';
            $cell = is_string($value) ? $value : (string)$value;
            return preg_match('/^[\\s]*[=+\\-@]/u', $cell) ? "'" . $cell : $cell;
        };
        session_write_close();
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: private, no-store');
        header('X-Content-Type-Options: nosniff');
        $output = fopen('php://output', 'wb');
        if ($output === false) fail(500, 'Could not create the CSV export.');
        fwrite($output, "\xEF\xBB\xBF"); // UTF-8 BOM helps Excel identify the encoding.
        fputcsv($output, array_map($csvCell, $columns), ',', '"', '\\');
        $writeRow = static function (array $values) use ($output, $csvCell): void {
            fputcsv($output, array_map($csvCell, $values), ',', '"', '\\');
        };
        $writeRows($writeRow);
        fclose($output);
        exit;
    };

    if ($route === 'admin/dashboard' && $method === 'GET') {
        $from = $_GET['from'] ?? gmdate('Y-m-01');
        $to = $_GET['to'] ?? gmdate('Y-m-d');
        if (!is_string($from) || !is_string($to)) {
            fail(422, 'Invalid date range.');
        }
        respond($admin->dashboard($from, $to));
    }

    if ($route === 'admin/dashboard/export' && $method === 'GET') {
        $from = $_GET['from'] ?? gmdate('Y-m-01');
        $to = $_GET['to'] ?? gmdate('Y-m-d');
        if (!is_string($from) || !is_string($to)) {
            fail(422, 'Invalid date range.');
        }
        $summary = $admin->dashboard($from, $to);
        audit_event($user, 'admin_activity_summary_exported', null, ['from' => $summary['from'], 'to' => $summary['to'], 'format' => 'csv'], 'system');
        $filename = 'co-studymaxx-activity-summary-' . $summary['from'] . '-to-' . $summary['to'] . '.csv';
        $sendCsv($filename, ['record_type','period_start','period_end','date','active_users','new_users','new_decks','documents_uploaded','arena_sessions','sessions_completed'], static function (callable $writeRow) use ($summary): void {
            $period = $summary['period'];
            $writeRow(['summary',$summary['from'],$summary['to'],'',$period['activeUsers'],$period['newUsers'],$period['newDecks'],$period['uploads'],$period['sessions'],$period['completedSessions']]);
            if ($summary['days']) {
                foreach ($summary['days'] as $day) {
                    $writeRow(['daily','','',$day['date'],$day['activeUsers'],'',$day['decks'],$day['uploads'],$day['arenaSessions'],'']);
                }
            } else {
                $writeRow(['daily','','',$summary['from'] === $summary['to'] ? $summary['from'] : 'Selected period',0,'',0,0,0,'']);
            }
        });
    }

    if ($route === 'admin/users/export' && $method === 'GET') {
        audit_event($user, 'admin_users_exported', null, ['format' => 'csv'], 'system');
        $columns = ['user_id','username','email','display_name','role','account_status','locked_until_utc','active_now','deck_count','pdf_count','created_at_utc','last_active_utc'];
        $notArchivedSql = '(GREATEST(u.created_at,COALESCE((SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id),u.created_at),COALESCE((SELECT MAX(e.created_at) FROM security_events e WHERE e.actor_user_id=u.id OR e.target_user_id=u.id),u.created_at),COALESCE((SELECT MAX(t.updated_at) FROM user_active_tabs t WHERE t.user_id=u.id),u.created_at))>=UTC_TIMESTAMP(3)-INTERVAL 7 DAY OR EXISTS(SELECT 1 FROM user_active_tabs live WHERE live.user_id=u.id AND live.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE))';
        $sendCsv('co-studymaxx-users.csv', $columns, static function (callable $writeRow) use ($notArchivedSql): void {
            $statement = query('SELECT u.id,u.username,u.email,COALESCE(p.display_name,u.username) display_name,u.role,CASE WHEN u.locked_until>UTC_TIMESTAMP(3) THEN \'locked\' ELSE \'active\' END account_status,u.locked_until,EXISTS(SELECT 1 FROM user_active_tabs t WHERE t.user_id=u.id AND t.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE) is_active_now,(SELECT COUNT(*) FROM decks d WHERE d.user_id=u.id AND d.deleted_at IS NULL) deck_count,(SELECT COUNT(*) FROM documents m JOIN decks d ON d.id=m.deck_id WHERE m.user_id=u.id AND d.deleted_at IS NULL) pdf_count,u.created_at,(SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id) last_active FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE ' . $notArchivedSql . ' ORDER BY is_active_now DESC,LOWER(u.username) ASC,u.id ASC');
            while ($row = $statement->fetch()) {
                $writeRow([$row['id'],$row['username'],$row['email'],$row['display_name'],$row['role'],$row['account_status'],$row['locked_until'],$row['is_active_now'] ? 'Yes' : 'No',$row['deck_count'],$row['pdf_count'],$row['created_at'],$row['last_active']]);
            }
        });
    }

    if ($route === 'admin/users' && $method === 'GET') {
        $search = $_GET['q'] ?? '';
        if (!is_string($search) || text_length($search) > 80) {
            fail(422, 'Search text is too long.');
        }
        $roleFilter = $_GET['role'] ?? 'all';
        if (!is_string($roleFilter) || !in_array($roleFilter, ['all', 'user', 'admin', 'superadmin'], true)) {
            fail(422, 'Invalid user role filter.');
        }
        $like = '%' . trim($search) . '%';
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
        $offset = max(0, min(100000, (int)($_GET['offset'] ?? 0)));
        $notArchivedSql = '(GREATEST(u.created_at,COALESCE((SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id),u.created_at),COALESCE((SELECT MAX(e.created_at) FROM security_events e WHERE e.actor_user_id=u.id OR e.target_user_id=u.id),u.created_at),COALESCE((SELECT MAX(t.updated_at) FROM user_active_tabs t WHERE t.user_id=u.id),u.created_at))>=UTC_TIMESTAMP(3)-INTERVAL 7 DAY OR EXISTS(SELECT 1 FROM user_active_tabs live WHERE live.user_id=u.id AND live.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE))';
        $userWhere = $notArchivedSql . ' AND (u.username LIKE ? OR u.email LIKE ?)' . ($roleFilter === 'all' ? '' : ' AND u.role=?');
        $userParams = [$like, $like];
        if ($roleFilter !== 'all') {
            $userParams[] = $roleFilter;
        }
        $total = (int)query('SELECT COUNT(*) FROM users u WHERE ' . $userWhere, $userParams)->fetchColumn();
        $rows = query(
            'SELECT u.id,u.username,u.email,u.role,u.locked_until,u.banned_at,u.ban_reason,u.created_at,EXISTS(SELECT 1 FROM user_active_tabs t WHERE t.user_id=u.id AND t.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE) is_active_now,COALESCE(p.display_name,u.username) display_name,COALESCE(p.avatar,\'ember\') avatar,(SELECT COUNT(*) FROM decks d WHERE d.user_id=u.id AND d.deleted_at IS NULL) deck_count,(SELECT COUNT(*) FROM documents m JOIN decks d ON d.id=m.deck_id WHERE m.user_id=u.id AND d.deleted_at IS NULL) document_count,(SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id) last_active FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE ' . $userWhere . ' ORDER BY is_active_now DESC,LOWER(u.username) ASC,u.id ASC LIMIT ' . $limit . ' OFFSET ' . $offset,
            $userParams
        )->fetchAll();
        $rows = array_map(static function (array $row): array {
            $row['is_active_now'] = (bool)$row['is_active_now'];
            return $row;
        }, $rows);
        respond(['users' => $rows, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
    }

    if ($route === 'admin/users/profile' && $method === 'GET') {
        $target = id_field($_GET, 'id');
        $account = query('SELECT u.id,u.username,u.email,u.role,u.created_at,u.locked_until,u.banned_at,u.ban_reason,COALESCE(p.display_name,u.username) display_name,COALESCE(p.first_name,\'\') first_name,p.middle_name,COALESCE(p.last_name,\'\') last_name,COALESCE(p.avatar,\'ember\') avatar,(SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id) last_active,(SELECT COUNT(*) FROM decks d WHERE d.user_id=u.id AND d.deleted_at IS NULL) deck_count,(SELECT COUNT(*) FROM documents m JOIN decks d ON d.id=m.deck_id WHERE m.user_id=u.id AND d.deleted_at IS NULL) document_count FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=?', [$target])->fetch();
        if (!$account) fail(404, 'Account not found.');
        $activity = query('SELECT material,mode,screen,status,accuracy,created_at FROM study_activity WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 25', [$target])->fetchAll();
        $submittedReports = query('SELECT r.id,r.reason,r.status,r.moderation_action,r.moderation_reason,r.created_at,r.reviewed_at,d.title deck_title,owner.username deck_owner FROM deck_reports r JOIN decks d ON d.id=r.deck_id JOIN users owner ON owner.id=d.user_id WHERE r.flagged_by_user_id=? ORDER BY r.created_at DESC,r.id DESC LIMIT 50', [$target])->fetchAll();
        $receivedReports = query('SELECT r.id,r.reason,r.status,r.moderation_action,r.moderation_reason,r.created_at,r.reviewed_at,d.title deck_title,flagger.username flagged_by FROM deck_reports r JOIN decks d ON d.id=r.deck_id LEFT JOIN users flagger ON flagger.id=r.flagged_by_user_id WHERE d.user_id=? ORDER BY r.created_at DESC,r.id DESC LIMIT 50', [$target])->fetchAll();
        respond(['account'=>$account,'activity'=>$activity,'submittedReports'=>$submittedReports,'receivedReports'=>$receivedReports]);
    }

    if ($route === 'admin/decks' && $method === 'GET') {
        $search = $_GET['q'] ?? '';
        if (!is_string($search) || text_length($search) > 100) {
            fail(422, 'Search text is too long.');
        }
        $like = '%' . trim($search) . '%';
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
        $offset = max(0, (int)($_GET['offset'] ?? 0));
        $total = (int)query(
            'SELECT COUNT(*) FROM decks d JOIN users u ON u.id=d.user_id WHERE d.deleted_at IS NULL AND d.moderation_status=\'visible\' AND (d.title LIKE ? OR d.subject LIKE ? OR u.username LIKE ?)',
            [$like, $like, $like]
        )->fetchColumn();
        $rows = query(
            'SELECT d.id,d.title,d.subject,d.category,d.moderation_status,d.created_at,d.updated_at,u.username owner,(SELECT COUNT(*) FROM cards c WHERE c.deck_id=d.id) card_count,(SELECT COUNT(*) FROM documents m WHERE m.deck_id=d.id) document_count,(SELECT COUNT(*) FROM deck_reports r WHERE r.deck_id=d.id AND r.status=\'open\') open_reports FROM decks d JOIN users u ON u.id=d.user_id WHERE d.deleted_at IS NULL AND d.moderation_status=\'visible\' AND (d.title LIKE ? OR d.subject LIKE ? OR u.username LIKE ?) ORDER BY d.updated_at DESC LIMIT ' . $limit . ' OFFSET ' . $offset,
            [$like, $like, $like]
        )->fetchAll();
        respond(['decks' => $rows, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
    }

    if ($route === 'admin/content/export' && $method === 'GET') {
        audit_event($user, 'admin_content_exported', null, ['format' => 'csv'], 'system');
        $columns = ['record_type','deck_id','deck_title','owner_username','subject','category','moderation_status','deck_created_at','deck_updated_at','card_id','card_type','prompt','options_json','correct_answer','accepted_alternates','hint','explanation','card_created_at','document_id','document_title','document_mime_type','document_size_bytes','document_uploaded_at'];
        $sendCsv('co-studymaxx-content.csv', $columns, static function (callable $writeRow): void {
            $decks = query('SELECT d.id,d.title,d.subject,d.category,d.moderation_status,d.created_at,d.updated_at,u.username owner FROM decks d JOIN users u ON u.id=d.user_id WHERE d.deleted_at IS NULL AND d.moderation_status=\'visible\' ORDER BY d.title,d.id');
            while ($deck = $decks->fetch()) {
                $writeRow(['deck',$deck['id'],$deck['title'],$deck['owner'],$deck['subject'],$deck['category'],$deck['moderation_status'],$deck['created_at'],$deck['updated_at']]);
            }

            $cards = query('SELECT c.id card_id,c.deck_id,c.type,c.prompt,c.hint,c.correct_answer,c.alternates,c.explanation,c.created_at card_created_at,d.title deck_title,d.subject,d.category,d.moderation_status,d.created_at deck_created_at,d.updated_at deck_updated_at,u.username owner,o.answer_text option_text,o.is_correct option_correct FROM cards c JOIN decks d ON d.id=c.deck_id JOIN users u ON u.id=d.user_id LEFT JOIN card_options o ON o.card_id=c.id WHERE d.deleted_at IS NULL AND d.moderation_status=\'visible\' ORDER BY d.title,c.position,c.id,o.position');
            $currentCard = null;
            $options = [];
            $writeCard = static function (?array $card, array $cardOptions) use ($writeRow): void {
                if (!$card) return;
                $writeRow(['card',$card['deck_id'],$card['deck_title'],$card['owner'],$card['subject'],$card['category'],$card['moderation_status'],$card['deck_created_at'],$card['deck_updated_at'],$card['card_id'],$card['type'],$card['prompt'],json_encode($cardOptions, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),$card['correct_answer'],$card['alternates'],$card['hint'],$card['explanation'],$card['card_created_at']]);
            };
            while ($row = $cards->fetch()) {
                if ($currentCard !== null && $currentCard['card_id'] !== $row['card_id']) {
                    $writeCard($currentCard, $options);
                    $options = [];
                }
                $currentCard = $row;
                if ($row['option_text'] !== null) $options[] = ['text' => $row['option_text'], 'is_correct' => (bool)$row['option_correct']];
            }
            $writeCard($currentCard, $options);

            $documents = query('SELECT m.id document_id,m.deck_id,m.title document_title,m.mime_type,m.size_bytes,m.created_at uploaded_at,d.title deck_title,d.subject,d.category,d.moderation_status,d.created_at deck_created_at,d.updated_at deck_updated_at,u.username owner FROM documents m JOIN decks d ON d.id=m.deck_id JOIN users u ON u.id=d.user_id WHERE d.deleted_at IS NULL AND d.moderation_status=\'visible\' ORDER BY d.title,m.created_at,m.id');
            while ($document = $documents->fetch()) {
                $writeRow(['document',$document['deck_id'],$document['deck_title'],$document['owner'],$document['subject'],$document['category'],$document['moderation_status'],$document['deck_created_at'],$document['deck_updated_at'],null,null,null,null,null,null,null,null,null,$document['document_id'],$document['document_title'],$document['mime_type'],$document['size_bytes'],$document['uploaded_at']]);
            }
        });
    }

    if ($route === 'admin/decks/view' && $method === 'GET') {
        $deckId = id_field($_GET);
        $deck = query('SELECT d.id,d.title,d.subject,d.category,d.moderation_status,d.updated_at,u.username owner FROM decks d JOIN users u ON u.id=d.user_id WHERE d.id=? AND d.deleted_at IS NULL', [$deckId])->fetch();
        if (!$deck) {
            fail(404, 'Reviewer not found.');
        }
        $documents = query('SELECT id,title,mime_type mimeType,size_bytes size,created_at uploadedAt FROM documents WHERE deck_id=? ORDER BY created_at DESC,id', [$deckId])->fetchAll();
        foreach ($documents as &$document) {
            $document['size'] = (int)$document['size'];
            $document['url'] = 'api/index.php?r=admin/documents/file&id=' . rawurlencode((string)$document['id']) . '&tabId=' . rawurlencode((string)request_tab_id()) . '&browserId=' . rawurlencode((string)request_browser_id());
        }
        unset($document);
        $deck['document_count'] = count($documents);
        audit_event($user, 'admin_deck_viewed', $deckId, ['documentCount' => count($documents)], 'deck');
        respond(['deck' => $deck, 'documents' => $documents]);
    }

    if ($route === 'admin/documents/file' && $method === 'GET') {
        $documentId = id_field($_GET);
        $document = query('SELECT m.id,m.deck_id,m.title,m.stored_name FROM documents m JOIN decks d ON d.id=m.deck_id WHERE m.id=? AND d.deleted_at IS NULL', [$documentId])->fetch();
        if (!$document) {
            fail(404, 'PDF not found.');
        }
        $path = $config['upload_dir'] . '/' . $document['stored_name'];
        if (!is_file($path)) {
            fail(404, 'PDF missing from file storage.');
        }
        audit_event($user, 'admin_document_viewed', (string)$document['deck_id'], ['documentId' => (string)$document['id']], 'deck');
        session_write_close();
        header('Content-Type: application/pdf');
        header('Content-Length: ' . filesize($path));
        header('Content-Disposition: inline; filename="document.pdf"; filename*=UTF-8\'\'' . rawurlencode((string)$document['title']));
        header('Cache-Control: private, no-store');
        header('X-Content-Type-Options: nosniff');
        header("Content-Security-Policy: frame-ancestors 'self'; base-uri 'none'");
        readfile($path);
        exit;
    }

    if ($route === 'admin/decks/flag' && $method === 'POST') {
        $data = input();
        $deckId = id_field($data, 'deckId');
        $reason = field($data, 'reason', 1000);
        $deck = query('SELECT id,user_id,title FROM decks WHERE id=? AND deleted_at IS NULL', [$deckId])->fetch();
        if (!$deck) {
            fail(404, 'Reviewer not found.');
        }
        $db->beginTransaction();
        query('INSERT INTO deck_reports(deck_id,flagged_by_user_id,reason) VALUES(?,?,?)', [$deckId, $user, $reason]);
        $reportId = (int)$db->lastInsertId();
        $noticeMessage = 'Your deck “' . $deck['title'] . '” was flagged for staff review. Staff note: ' . $reason;
        notify_user((string)$deck['user_id'], 'deck_flagged', 'Your deck was flagged for review', $noticeMessage, $deckId);
        audit_event($user, 'deck_flagged', $deckId, ['reportId' => $reportId], 'deck');
        $db->commit();
        respond(['ok' => true, 'reportId' => $reportId], 201);
    }

    if ($route === 'admin/decks/visibility' && $method === 'PATCH') {
        $data = input();
        $deckId = id_field($data, 'deckId');
        $action = field($data, 'action', 16);
        $reason = field($data, 'reason', 1000);
        if (!in_array($action, ['hide', 'restore'], true)) {
            fail(422, 'Invalid moderation action.');
        }
        $status = $action === 'hide' ? 'hidden' : 'visible';
        $db->beginTransaction();
        $deck = query('SELECT id,user_id,title,moderation_status FROM decks WHERE id=? AND deleted_at IS NULL FOR UPDATE', [$deckId])->fetch();
        if (!$deck) {
            fail(404, 'Reviewer not found.');
        }
        query('UPDATE decks SET moderation_status=? WHERE id=?', [$status, $deckId]);
        if ($action === 'hide') {
            arena_stop_hidden_deck($deckId);
        }
        query(
            'INSERT INTO deck_reports(deck_id,flagged_by_user_id,reason,status,moderation_action,moderation_reason,reviewed_by_user_id,reviewed_at) VALUES(?,?,?,\'actioned\',?,?,?,UTC_TIMESTAMP(3))',
            [$deckId, $user, 'Administrative visibility change', $action, $reason, $user]
        );
        $noticeTitle = $action === 'hide' ? 'Deck hidden after staff review' : 'Deck restored after staff review';
        $noticeMessage = 'Your deck “' . $deck['title'] . '” was ' . ($action === 'hide' ? 'hidden' : 'restored') . '. Staff note: ' . $reason;
        notify_user((string)$deck['user_id'], 'deck_' . $action, $noticeTitle, $noticeMessage, $deckId);
        audit_event($user, 'deck_' . $action, $deckId, ['reason' => $reason], 'deck');
        $db->commit();
        respond(['ok' => true, 'moderationStatus' => $status]);
    }

    if ($route === 'admin/reports' && $method === 'GET') {
        $status = $_GET['status'] ?? 'open';
        if (!in_array($status, ['open', 'dismissed', 'actioned', 'all'], true)) {
            fail(422, 'Invalid report status.');
        }
        $where = $status === 'all' ? '' : 'WHERE r.status=?';
        $params = $status === 'all' ? [] : [$status];
        $rows = query(
            'SELECT r.id,r.deck_id deckId,r.reason,r.status,r.moderation_action moderationAction,r.moderation_reason moderationReason,r.created_at,r.reviewed_at,d.title deckTitle,d.subject,d.moderation_status moderationStatus,u.username owner,flagger.username flaggedBy FROM deck_reports r JOIN decks d ON d.id=r.deck_id JOIN users u ON u.id=d.user_id LEFT JOIN users flagger ON flagger.id=r.flagged_by_user_id WHERE d.deleted_at IS NULL' . ($where !== '' ? ' AND ' . substr($where, 6) : '') . ' ORDER BY (r.status=\'open\') DESC,r.created_at DESC LIMIT 100',
            $params
        )->fetchAll();
        respond(['reports' => $rows]);
    }

    if ($route === 'admin/reports' && $method === 'PATCH') {
        $data = input();
        $reportId = $data['id'] ?? null;
        if (!is_int($reportId) || $reportId < 1) {
            fail(422, 'Invalid report id.');
        }
        $action = field($data, 'action', 16);
        $reason = field($data, 'reason', 1000);
        if (!in_array($action, ['dismiss', 'hide'], true)) {
            fail(422, 'Invalid report action.');
        }
        $db->beginTransaction();
        $report = query('SELECT id,deck_id,status FROM deck_reports WHERE id=? FOR UPDATE', [$reportId])->fetch();
        if (!$report) {
            fail(404, 'Report not found.');
        }
        if ($report['status'] !== 'open') {
            fail(409, 'This report has already been reviewed.');
        }
        $deck = query('SELECT id,user_id,title FROM decks WHERE id=? AND deleted_at IS NULL FOR UPDATE', [$report['deck_id']])->fetch();
        if (!$deck) {
            fail(404, 'Reviewer not found.');
        }
        if ($action === 'hide') {
            query("UPDATE decks SET moderation_status='hidden' WHERE id=?", [$report['deck_id']]);
            arena_stop_hidden_deck($report['deck_id']);
        }
        $nextStatus = $action === 'hide' ? 'actioned' : 'dismissed';
        query(
            'UPDATE deck_reports SET status=?,moderation_action=?,moderation_reason=?,reviewed_by_user_id=?,reviewed_at=UTC_TIMESTAMP(3) WHERE id=?',
            [$nextStatus, $action === 'hide' ? 'hide' : null, $reason, $user, $reportId]
        );
        $noticeTitle = $action === 'hide' ? 'Deck hidden after staff review' : 'Deck review completed';
        $noticeMessage = $action === 'hide'
            ? 'Your deck “' . $deck['title'] . '” was hidden after a report review. Staff note: ' . $reason
            : 'A report about your deck “' . $deck['title'] . '” was reviewed and dismissed. Staff note: ' . $reason;
        notify_user((string)$deck['user_id'], 'deck_report_' . $action, $noticeTitle, $noticeMessage, (string)$deck['id']);
        audit_event($user, 'deck_report_' . $action, $report['deck_id'], ['reportId' => $reportId, 'reason' => $reason], 'deck');
        $db->commit();
        respond(['ok' => true]);
    }

    if ($route === 'admin/users/warn' && $method === 'POST') {
        $data = input();
        $target = id_field($data, 'userId');
        $reason = field($data, 'reason', 500);
        if ($target === $user) fail(409, 'You cannot warn your own account.');
        $account = query('SELECT id,username,role FROM users WHERE id=?', [$target])->fetch();
        if (!$account) fail(404, 'Account not found.');
        if ($account['role'] !== 'user') fail(403, 'Only regular user accounts can be warned here.');
        notify_user($target, 'account_warning', 'Account warning', 'A workspace administrator issued a warning: ' . $reason);
        audit_event($user, 'account_warned', $target, ['reason'=>$reason]);
        respond(['ok'=>true]);
    }

    if ($route === 'admin/users/ban' && $method === 'POST') {
        $data = input();
        $target = id_field($data, 'userId');
        $reason = field($data, 'reason', 500);
        if ($target === $user) fail(409, 'You cannot ban your own account.');
        $account = query('SELECT id,username,role,banned_at FROM users WHERE id=?', [$target])->fetch();
        if (!$account) fail(404, 'Account not found.');
        if ($account['role'] !== 'user') fail(403, 'Only regular user accounts can be banned here.');
        if ($account['banned_at']) fail(409, 'This account is already banned.');
        $db->beginTransaction();
        query('SELECT id FROM users WHERE id=? FOR UPDATE', [$target]);
        query('UPDATE users SET banned_at=UTC_TIMESTAMP(3),banned_by_user_id=?,ban_reason=?,locked_until=NULL,auth_version=auth_version+1 WHERE id=?', [$user,$reason,$target]);
        query('DELETE FROM user_active_tabs WHERE user_id=?', [$target]);
        audit_event($user, 'account_banned', $target, ['reason'=>$reason]);
        $db->commit();
        respond(['ok'=>true]);
    }

    if ($route === 'admin/users/unban' && $method === 'POST') {
        $data = input();
        $target = id_field($data, 'userId');
        $reason = field($data, 'reason', 500);
        $account = query('SELECT id,username,role,banned_at FROM users WHERE id=?', [$target])->fetch();
        if (!$account) fail(404, 'Account not found.');
        if ($account['role'] !== 'user') fail(403, 'Only regular user accounts can be unbanned here.');
        if (!$account['banned_at']) fail(409, 'This account is not banned.');
        query('UPDATE users SET banned_at=NULL,banned_by_user_id=NULL,ban_reason=NULL,auth_version=auth_version+1 WHERE id=?', [$target]);
        audit_event($user, 'account_unbanned', $target, ['reason'=>$reason]);
        respond(['ok'=>true]);
    }

    if ($route === 'admin/users/unlock' && $method === 'POST') {
        $data = input();
        $target = id_field($data, 'userId');
        $reason = field($data, 'reason', 500);
        $account = query('SELECT id,locked_until FROM users WHERE id=?', [$target])->fetch();
        if (!$account) {
            fail(404, 'Account not found.');
        }
        $db->beginTransaction();
        query('SELECT id FROM users WHERE id=? FOR UPDATE', [$target]);
        query('UPDATE users SET locked_until=NULL WHERE id=?', [$target]);
        query('DELETE FROM auth_attempts WHERE bucket=?', [hash('sha256', 'account-login:user:' . $target)]);
        audit_event($user, 'account_unlocked', $target, ['reason' => $reason]);
        $db->commit();
        respond(['ok' => true]);
    }

    if ($route === 'admin/users/reset' && $method === 'POST') {
        $data = input();
        $target = id_field($data, 'userId');
        $account = query('SELECT id,email FROM users WHERE id=?', [$target])->fetch();
        if (!$account) {
            fail(404, 'Account not found.');
        }
        if (!$account['email']) {
            fail(409, 'This account has no email address for secure password recovery.');
        }
        $resetBucket = hash('sha256', 'admin-reset:' . $user . ':' . $target);
        if (!throttle_allows($resetBucket, 3, 3600)) {
            fail(429, 'Password reset email requests for this account are temporarily limited.');
        }
        $issued = $passwordRecovery->issue((string)$account['email']);
        if (!$issued) {
            fail(409, 'Password recovery is unavailable for this account.');
        }
        $resetUrl = rtrim((string)$config['app_base_url'], '/') . '/login.html?mode=reset#token=' . rawurlencode($issued['token']);
        $sent = false;
        try {
            $sent = send_password_recovery_email($issued['email'], $resetUrl);
        } catch (Throwable $ignored) {
        }
        if (!$sent) {
            $passwordRecovery->revoke($issued['token']);
            audit_event($user, 'admin_password_reset_delivery_failed', $target, ['reason' => 'mailer_unavailable']);
            fail(502, 'The secure reset email could not be delivered. Check the configured mail service and try again.');
        }
        audit_event($user, 'admin_password_reset_requested', $target, ['channel' => 'registered_email']);
        respond(['ok' => true, 'message' => 'A secure password-reset link was sent to the account email address.']);
    }

    if ($route === 'admin/users/role' && $method === 'POST') {
        if (!$isSuper) {
            fail(403, 'Only a superadmin can change account roles.');
        }
        $data = input();
        $target = id_field($data, 'userId');
        $nextRole = field($data, 'role', 16);
        if (!in_array($nextRole, ['user', 'admin', 'superadmin'], true)) {
            fail(422, 'Invalid role.');
        }
        $isPromotingToSuperadmin = $nextRole === 'superadmin' && (string)$target !== (string)$user;
        $confirmationPassword = $data['password'] ?? null;
        if ($isPromotingToSuperadmin && (!is_string($confirmationPassword) || $confirmationPassword === '' || strlen($confirmationPassword) > 72)) {
            fail(422, 'Enter your password to confirm promoting this account to superadmin.');
        }
        if ((string)$target === (string)$user && $nextRole !== 'superadmin') {
            fail(409, 'Use another superadmin to change your own role.');
        }
        $db->beginTransaction();
        $accounts = query('SELECT id,role,password_hash FROM users WHERE id IN (?,?) ORDER BY id FOR UPDATE', [$user, $target])->fetchAll();
        $targetRow = null;
        $actorRow = null;
        foreach ($accounts as $account) {
            if ($account['id'] === $target) {
                $targetRow = $account;
            }
            if ($account['id'] === $user) {
                $actorRow = $account;
            }
        }
        if (!$actorRow || $actorRow['role'] !== 'superadmin') {
            fail(403, 'Only a current superadmin can change account roles.');
        }
        if (!$targetRow) {
            fail(404, 'Account not found.');
        }
        if ($isPromotingToSuperadmin && !password_verify($confirmationPassword, (string)$actorRow['password_hash'])) {
            fail(403, 'Password confirmation failed. No role changes were made.');
        }
        $superCount = (int)query("SELECT COUNT(*) FROM users WHERE role='superadmin'")->fetchColumn();
        if ($targetRow['role'] === 'superadmin' && $nextRole !== 'superadmin' && $superCount <= 1) {
            fail(409, 'The system must retain at least one superadmin.');
        }
        query('UPDATE users SET role=? WHERE id=?', [$nextRole, $target]);
        audit_event($user, 'user_role_changed', $target, ['from' => $targetRow['role'], 'to' => $nextRole]);
        $db->commit();
        respond(['ok' => true, 'role' => $nextRole]);
    }

    if ($route === 'admin/settings' && $method === 'GET') {
        if (!$isSuper) {
            fail(403, 'Only a superadmin can view system settings.');
        }
        $storage = (int)query('SELECT COALESCE(SUM(size_bytes),0) FROM documents')->fetchColumn();
        respond([
            'maintenanceMode' => maintenance_enabled(),
            'storageLimitBytes' => (int)system_setting('storage_limit_bytes', '10737418240'),
            'storageUsedBytes' => $storage,
        ]);
    }

    if ($route === 'admin/settings' && $method === 'PATCH') {
        if (!$isSuper) {
            fail(403, 'Only a superadmin can change system settings.');
        }
        $data = input();
        $updates = [];
        $db->beginTransaction();

        if (array_key_exists('maintenanceMode', $data)) {
            if (!is_bool($data['maintenanceMode'])) {
                fail(422, 'Maintenance mode must be true or false.');
            }
            $updates['maintenance_mode'] = $data['maintenanceMode'] ? '1' : '0';
        }

        if (array_key_exists('storageLimitBytes', $data)) {
            $limit = $data['storageLimitBytes'];
            if (!is_int($limit) || $limit < 1048576 || $limit > 1099511627776) {
                fail(422, 'Storage limit must be between 1 MiB and 1 TiB.');
            }
            query('SELECT setting_key FROM system_settings WHERE setting_key=? FOR UPDATE', ['storage_limit_bytes'])->fetchColumn();
            $used = (int)query('SELECT COALESCE(SUM(size_bytes),0) FROM documents')->fetchColumn();
            if ($limit < $used) {
                fail(409, 'Storage limit cannot be lower than current stored PDF usage.');
            }
            $updates['storage_limit_bytes'] = (string)$limit;
        }

        if (!$updates) {
            fail(422, 'No valid system settings were supplied.');
        }

        foreach ($updates as $key => $value) {
            query(
                'INSERT INTO system_settings(setting_key,value_text,updated_by_user_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),updated_by_user_id=VALUES(updated_by_user_id)',
                [$key, $value, $user]
            );
        }

        audit_event($user, 'system_settings_updated', null, ['settings' => array_keys($updates)]);
        $db->commit();
        respond([
            'ok' => true,
            'maintenanceMode' => maintenance_enabled(),
            'storageLimitBytes' => (int)system_setting('storage_limit_bytes', '10737418240'),
        ]);
    }

    if ($route === 'admin/sessions/clear' && $method === 'POST') {
        if (!$isSuper) {
            fail(403, 'Only a superadmin can clear all sessions.');
        }
        $data = input();
        if (($data['confirm'] ?? false) !== true) {
            fail(422, 'Confirm that all users should be signed out.');
        }
        $actor = $user;
        $_SESSION = [];
        session_write_close();
        $db->beginTransaction();
        $accounts = query('UPDATE users SET auth_version=auth_version+1');
        $sessions = query('DELETE FROM web_sessions');
        query('DELETE FROM user_active_tabs');
        audit_event($actor, 'all_sessions_cleared', null, [
            'accountsInvalidated' => $accounts->rowCount(),
            'sessionsRemoved' => $sessions->rowCount(),
        ]);
        $db->commit();
        setcookie(session_name(), '', [
            'expires' => time() - 3600,
            'path' => '/',
            'secure' => (bool)$config['secure_cookie'],
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        respond([
            'ok' => true,
            'sessionsRemoved' => $sessions->rowCount(),
            'accountsInvalidated' => $accounts->rowCount(),
        ]);
    }

    if ($route === 'admin/archive/inactive-users/export' && $method === 'GET') {
        audit_event($user, 'admin_inactive_users_exported', null, ['format' => 'csv'], 'system');
        $activitySql = '(SELECT u.id,GREATEST(u.created_at,COALESCE((SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id),u.created_at),COALESCE((SELECT MAX(e.created_at) FROM security_events e WHERE e.actor_user_id=u.id OR e.target_user_id=u.id),u.created_at),COALESCE((SELECT MAX(t.updated_at) FROM user_active_tabs t WHERE t.user_id=u.id),u.created_at)) last_seen_at FROM users u) activity';
        $filter = 'activity.last_seen_at<UTC_TIMESTAMP(3)-INTERVAL 7 DAY AND NOT EXISTS(SELECT 1 FROM user_active_tabs live WHERE live.user_id=u.id AND live.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE)';
        $sendCsv('co-studymaxx-inactive-users.csv', ['user_id','username','email','role','last_active_utc','inactive_days','joined_at_utc'], static function (callable $writeRow) use ($activitySql, $filter): void {
            $statement = query('SELECT u.id,u.username,u.email,u.role,u.created_at,activity.last_seen_at,TIMESTAMPDIFF(DAY,activity.last_seen_at,UTC_TIMESTAMP(3)) inactive_days FROM users u JOIN ' . $activitySql . ' ON activity.id=u.id WHERE ' . $filter . ' ORDER BY activity.last_seen_at ASC,u.id ASC');
            while ($row = $statement->fetch()) {
                $writeRow([$row['id'],$row['username'],$row['email'],$row['role'],$row['last_seen_at'],$row['inactive_days'],$row['created_at']]);
            }
        });
    }

    if ($route === 'admin/archive/security-events/export' && $method === 'GET') {
        if (!$isSuper) fail(403, 'Only a superadmin can export archived security events.');
        audit_event($user, 'admin_archived_security_log_exported', null, ['format' => 'csv'], 'system');
        $allCount = (int)query('SELECT COUNT(*) FROM security_events')->fetchColumn();
        $cutoff = $allCount > 100 ? query('SELECT id FROM security_events ORDER BY id DESC LIMIT 1 OFFSET 99')->fetchColumn() : false;
        $archivedSql = 'SELECT e.id,e.event_code event,e.created_at,e.ip_hash,e.target_type,a.username actor,COALESCE(t.username,IF(e.target_type=\'deck\',CONCAT(\'Deck \' ,e.target_id),NULL)) target,e.details_json FROM security_events e LEFT JOIN users a ON a.id=e.actor_user_id LEFT JOIN users t ON t.id=e.target_user_id' . ($cutoff === false ? ' WHERE 1=0' : ' WHERE e.id<?') . ' ORDER BY e.id DESC';
        $archivedParams = $cutoff === false ? [] : [(int)$cutoff];
        $sendCsv('co-studymaxx-archived-security-events.csv', ['event_id','occurred_at_utc','event','actor_username','target','target_type','ip_fingerprint','details_json'], static function (callable $writeRow) use ($archivedSql, $archivedParams): void {
            $statement = query($archivedSql, $archivedParams);
            while ($row = $statement->fetch()) {
                $writeRow([$row['id'],$row['created_at'],$row['event'],$row['actor'],$row['target'],$row['target_type'],$row['ip_hash'] ? substr($row['ip_hash'], 0, 16) : '',$row['details_json'] ?: '{}']);
            }
        });
    }

    if ($route === 'admin/archive/inactive-users' && $method === 'GET') {
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));
        $offset = max(0, min(100000, (int)($_GET['offset'] ?? 0)));
        $activitySql = '(SELECT u.id,GREATEST(u.created_at,COALESCE((SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id),u.created_at),COALESCE((SELECT MAX(e.created_at) FROM security_events e WHERE e.actor_user_id=u.id OR e.target_user_id=u.id),u.created_at),COALESCE((SELECT MAX(t.updated_at) FROM user_active_tabs t WHERE t.user_id=u.id),u.created_at)) last_seen_at FROM users u) activity';
        $filter = 'activity.last_seen_at<UTC_TIMESTAMP(3)-INTERVAL 7 DAY AND NOT EXISTS(SELECT 1 FROM user_active_tabs live WHERE live.user_id=u.id AND live.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE)';
        $total = (int)query('SELECT COUNT(*) FROM users u JOIN ' . $activitySql . ' ON activity.id=u.id WHERE ' . $filter)->fetchColumn();
        $rows = query('SELECT u.id,u.username,u.email,u.role,u.created_at,COALESCE(p.display_name,u.username) display_name,COALESCE(p.avatar,\'ember\') avatar,activity.last_seen_at,TIMESTAMPDIFF(DAY,activity.last_seen_at,UTC_TIMESTAMP(3)) inactive_days FROM users u JOIN ' . $activitySql . ' ON activity.id=u.id LEFT JOIN profiles p ON p.user_id=u.id WHERE ' . $filter . ' ORDER BY activity.last_seen_at ASC,u.id ASC LIMIT ' . $limit . ' OFFSET ' . $offset)->fetchAll();
        respond(['users'=>$rows,'total'=>$total,'limit'=>$limit,'offset'=>$offset,'inactiveAfterDays'=>7]);
    }

    if ($route === 'admin/archive/hidden-decks' && $method === 'GET') {
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));
        $offset = max(0, min(1000000, (int)($_GET['offset'] ?? 0)));
        $total = (int)query("SELECT COUNT(*) FROM decks WHERE moderation_status='hidden' AND deleted_at IS NULL")->fetchColumn();
        $rows = query("SELECT d.id,d.title,d.subject,d.category,d.updated_at,d.created_at,u.username owner,(SELECT COUNT(*) FROM cards c WHERE c.deck_id=d.id) card_count,(SELECT COUNT(*) FROM documents m WHERE m.deck_id=d.id) document_count,(SELECT MAX(r.reviewed_at) FROM deck_reports r WHERE r.deck_id=d.id AND r.moderation_action='hide') hidden_at FROM decks d JOIN users u ON u.id=d.user_id WHERE d.moderation_status='hidden' AND d.deleted_at IS NULL ORDER BY hidden_at DESC,d.updated_at DESC LIMIT " . $limit . ' OFFSET ' . $offset)->fetchAll();
        respond(['decks'=>$rows,'total'=>$total,'limit'=>$limit,'offset'=>$offset]);
    }

    if ($route === 'admin/archive/hidden-decks/delete' && $method === 'DELETE') {
        $data = input();
        $ids = $data['ids'] ?? null;
        if (!is_array($ids) || count($ids) < 1 || count($ids) > 100) {
            fail(422, 'Select between 1 and 100 hidden decks to delete.');
        }
        $ids = array_values(array_unique(array_map(static function ($id): string {
            if (!is_string($id) || !preg_match('/^[a-f0-9]{32}$/D', $id)) fail(422, 'Invalid deck selection.');
            return $id;
        }, $ids)));
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $db->beginTransaction();
        $decksToDelete = query("SELECT d.id,d.title FROM decks d WHERE d.id IN ($placeholders) AND d.moderation_status='hidden' AND d.deleted_at IS NULL FOR UPDATE", $ids)->fetchAll();
        if (count($decksToDelete) !== count($ids)) {
            $db->rollBack();
            fail(404, 'One or more selected decks are no longer hidden. Refresh the archive and try again.');
        }
        $documents = query("SELECT deck_id,stored_name FROM documents WHERE deck_id IN ($placeholders)", $ids)->fetchAll();
        foreach ($decksToDelete as $deck) {
            audit_event($user, 'admin_hidden_deck_permanently_deleted', (string)$deck['id'], ['deckTitle'=>$deck['title']], 'deck');
        }
        query("DELETE FROM decks WHERE id IN ($placeholders) AND moderation_status='hidden' AND deleted_at IS NULL", $ids);
        $db->commit();
        foreach ($documents as $document) {
            $path = $config['upload_dir'] . '/' . $document['stored_name'];
            if (is_file($path)) unlink($path);
        }
        respond(['ok'=>true,'deleted'=>count($decksToDelete)]);
    }

    if ($route === 'admin/archive/security-events' && $method === 'GET') {
        if (!$isSuper) fail(403, 'Only a superadmin can view archived security events.');
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));
        $offset = max(0, min(1000000, (int)($_GET['offset'] ?? 0)));
        $allCount = (int)query('SELECT COUNT(*) FROM security_events')->fetchColumn();
        $cutoff = $allCount > 100 ? query('SELECT id FROM security_events ORDER BY id DESC LIMIT 1 OFFSET 99')->fetchColumn() : false;
        if ($cutoff === false) {
            respond(['events'=>[],'total'=>0,'limit'=>$limit,'offset'=>$offset,'archivedAfterPages'=>10]);
        }
        $cutoff = (int)$cutoff;
        $total = (int)query('SELECT COUNT(*) FROM security_events WHERE id<?', [$cutoff])->fetchColumn();
        $rows = query('SELECT e.id,e.event_code event,e.created_at,e.ip_hash,e.target_type,a.username actor,COALESCE(t.username,IF(e.target_type=\'deck\',CONCAT(\'Deck \',e.target_id),NULL)) target,e.details_json FROM security_events e LEFT JOIN users a ON a.id=e.actor_user_id LEFT JOIN users t ON t.id=e.target_user_id WHERE e.id<? ORDER BY e.id DESC LIMIT ' . $limit . ' OFFSET ' . $offset, [$cutoff])->fetchAll();
        foreach ($rows as &$row) {
            $row['details'] = $row['details_json'] ? json_decode($row['details_json'], true) : new stdClass();
            unset($row['details_json']);
        }
        respond(['events'=>$rows,'total'=>$total,'limit'=>$limit,'offset'=>$offset,'archivedAfterPages'=>10]);
    }

    if ($route === 'admin/audit' && $method === 'GET') {
        if (!$isSuper) {
            fail(403, 'Only a superadmin can view raw security events.');
        }
        $from = $_GET['from'] ?? gmdate('Y-m-01');
        $to = $_GET['to'] ?? gmdate('Y-m-d');
        if (!is_string($from) || !is_string($to)) {
            fail(422, 'Invalid date range.');
        }
        [$start, $end] = $admin->dateRange($from, $to);
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
        $offset = max(0, min(100000, (int)($_GET['offset'] ?? 0)));
        $allCount = (int)query('SELECT COUNT(*) FROM security_events')->fetchColumn();
        $cutoff = $allCount > 100 ? query('SELECT id FROM security_events ORDER BY id DESC LIMIT 1 OFFSET 99')->fetchColumn() : false;
        $liveClause = $cutoff === false ? '' : ' AND id>=?';
        $auditParams = $cutoff === false ? [$start, $end] : [$start, $end, (int)$cutoff];
        $total = (int)query('SELECT COUNT(*) FROM security_events WHERE created_at>=? AND created_at<?' . $liveClause, $auditParams)->fetchColumn();
        $rowParams = $auditParams;
        $rows = query(
            'SELECT e.id,e.event_code event,e.created_at,e.ip_hash,e.target_type,a.username actor,COALESCE(t.username,IF(e.target_type=\'deck\',CONCAT(\'Deck \',e.target_id),NULL)) target,e.details_json FROM security_events e LEFT JOIN users a ON a.id=e.actor_user_id LEFT JOIN users t ON t.id=e.target_user_id WHERE e.created_at>=? AND e.created_at<?' . ($cutoff === false ? '' : ' AND e.id>=?') . ' ORDER BY e.id DESC LIMIT ' . $limit . ' OFFSET ' . $offset,
            $rowParams
        )->fetchAll();
        foreach ($rows as &$row) {
            $row['details'] = $row['details_json'] ? json_decode($row['details_json'], true) : new stdClass();
            unset($row['details_json']);
        }
        respond([
            'events' => $rows,
            'from' => substr($start, 0, 10),
            'to' => gmdate('Y-m-d', strtotime($end . ' UTC') - 86400),
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ]);
    }

    if ($route === 'admin/audit/export' && $method === 'GET') {
        $from = $_GET['from'] ?? gmdate('Y-m-01');
        $to = $_GET['to'] ?? gmdate('Y-m-d');
        if (!is_string($from) || !is_string($to)) {
            fail(422, 'Invalid date range.');
        }
        [$start, $end] = $admin->dateRange($from, $to);
        audit_event($user, 'admin_security_log_exported', null, ['from' => $from, 'to' => $to, 'format' => 'csv'], 'system');
        $allCount = (int)query('SELECT COUNT(*) FROM security_events')->fetchColumn();
        $cutoff = $allCount > 100 ? query('SELECT id FROM security_events ORDER BY id DESC LIMIT 1 OFFSET 99')->fetchColumn() : false;
        $auditSql = 'SELECT e.id,e.event_code event,e.created_at,e.ip_hash,e.target_type,a.username actor,COALESCE(t.username,IF(e.target_type=\'deck\',CONCAT(\'Deck \' ,e.target_id),NULL)) target,e.details_json FROM security_events e LEFT JOIN users a ON a.id=e.actor_user_id LEFT JOIN users t ON t.id=e.target_user_id WHERE e.created_at>=? AND e.created_at<?' . ($cutoff === false ? '' : ' AND e.id>=?') . ' ORDER BY e.id DESC';
        $auditParams = $cutoff === false ? [$start, $end] : [$start, $end, (int)$cutoff];
        $sendCsv('co-studymaxx-security-events-' . $from . '-to-' . $to . '.csv', ['event_id','occurred_at_utc','event','actor_username','target','target_type','ip_fingerprint','details_json'], static function (callable $writeRow) use ($auditSql, $auditParams): void {
            $statement = query($auditSql, $auditParams);
            while ($row = $statement->fetch()) {
                $writeRow([$row['id'],$row['created_at'],$row['event'],$row['actor'],$row['target'],$row['target_type'],$row['ip_hash'] ? substr($row['ip_hash'], 0, 16) : '',$row['details_json'] ?: '{}']);
            }
        });
    }

    fail(404, 'Endpoint not found.');
}

// ============================================================================
// 6. Maintenance & Workspace Routing
// ============================================================================
// Maintenance blocks regular accounts only. Keep the allow-list explicit so
// administrators can reach the workspace and turn maintenance back off.
if ($route !== 'auth/logout' && maintenance_enabled() && !in_array($currentRole, ['admin', 'superadmin'], true)) {
    fail(503, 'The workspace is temporarily in maintenance mode. Please try again later.');
}

// Logout
if ($route === 'auth/logout' && $method === 'POST') {
    audit_event($user, 'logout', $user);
    $tabHash = request_tab_hash();
    $browserHash = request_browser_hash();
    if ($tabHash && $browserHash) {
        query('DELETE FROM user_active_tabs WHERE user_id=? AND browser_hash=? AND active_tab_hash=?', [$user, $browserHash, $tabHash]);
    }
    $GLOBALS['csmForgetTabSession'] = true;
    foreach (['user_id','auth_version','expires_at','last_activity','idle_logout'] as $field) unset($_SESSION[$field]);
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    respond(['ok' => true]);
}

// Staff accounts cannot access personal library or game arena
if (in_array($currentRole, ['admin', 'superadmin'], true) && (in_array($route, ['decks', 'decks/share', 'cards', 'documents', 'highlights', 'study/progress', 'activity', 'account/export'], true) || str_starts_with($route, 'arena/'))) {
    fail(403, 'Personal library and Arena features are not available to staff accounts.');
}

// Full user workspace
if ($route === 'workspace' && $method === 'GET') {
    respond(workspace($user));
}

// Profile management
if ($route === 'profile' && $method === 'PATCH') {
    $data = input();
    $p = query('SELECT * FROM profiles WHERE user_id=? FOR UPDATE', [$user])->fetch();

    if (isset($data['displayName'])) {
        $name = field($data, 'displayName', 40);
        if ($name !== $p['display_name']) {
            if ($p['name_changed_at'] && strtotime($p['name_changed_at']) > time() - 604800) {
                fail(409, 'Display names can only change once every 7 days.');
            }
            query('UPDATE profiles SET display_name=?,name_changed_at=CURRENT_TIMESTAMP(3) WHERE user_id=?', [$name, $user]);
        }
    }

    if (isset($data['avatar'])) {
        $avatar = field($data, 'avatar', 16);
        if (!in_array($avatar, ['ember', 'ocean', 'mint', 'violet', 'sunset', 'slate'], true)) {
            fail(422, 'Invalid avatar.');
        }
        query('UPDATE profiles SET avatar=? WHERE user_id=?', [$avatar, $user]);
    }

    if (array_key_exists('deckVisibility', $data)) {
        $visibility = $data['deckVisibility'];
        if (!is_string($visibility) || !in_array($visibility, ['private', 'public'], true)) fail(422, 'Choose public or private deck visibility.');
        query('UPDATE profiles SET deck_visibility=? WHERE user_id=?', [$visibility, $user]);
    }

    respond(profile($user));
}

// Password change
if ($route === 'auth/password' && $method === 'POST') {
    $data = input();
    $old = password_value($data, 'currentPassword');
    $next = password_value($data, 'newPassword');
    $row = query('SELECT password_hash,auth_version FROM users WHERE id=? FOR UPDATE', [$user])->fetch();

    if (!password_verify($old, $row['password_hash'])) {
        fail(422, 'Current password is incorrect.');
    }

    $users->setPassword($user, password_hash($next, PASSWORD_DEFAULT));
    audit_event($user, 'password_changed', $user);
    $_SESSION['auth_version'] = (int)$row['auth_version'] + 1;
    session_regenerate_id(true);
    respond(['ok' => true]);
}

// ============================================================================
// 7. Decks & Sharing Management
// ============================================================================
if ($route === 'decks') {
    if ($method === 'GET') {
        respond(deck_data(owned_deck(id_field($_GET), $user)));
    }

    if (in_array($method, ['POST', 'PATCH'], true)) {
        $data = input();
        $title = canonical_deck_title(field($data, 'title', 160));
        $subject = field($data, 'subject', 160, false);
        $category = field($data, 'category', 80, false) ?: 'Recent';
        $id = $method === 'PATCH' ? id_field($data) : uid();
        $visibility = 'inherit';

        $db->beginTransaction();
        query('SELECT id FROM users WHERE id=? FOR UPDATE', [$user]);
        if ($method === 'PATCH') {
            $old = owned_deck($id, $user);
            $visibility = (string)($old['visibility'] ?? 'inherit');
            if (array_key_exists('visibility', $data)) {
                if (!is_string($data['visibility']) || !in_array($data['visibility'], ['inherit', 'private', 'public'], true)) fail(422, 'Choose inherited, public, or private deck visibility.');
                $visibility = $data['visibility'];
            }
            if (normalized_deck_title((string)$old['title']) !== normalized_deck_title($title)) {
                assert_unique_reviewer_title($user, $title, $id);
            }
            $decksService->update($id, $title, $subject, $category, $visibility);
        } else {
            assert_unique_reviewer_title($user, $title);
            $decksService->create($id, $user, $title, $subject, $category);
        }

        if (array_key_exists('cards', $data)) {
            if (!is_array($data['cards']) || count($data['cards']) > 1000) {
                fail(422, 'Invalid card list.');
            }
            $keep = [];
            foreach ($data['cards'] as $i => $card) {
                if (!is_array($card)) {
                    fail(422, 'Invalid Bombcard.');
                }
                $cardId = isset($card['id']) && preg_match('/^[a-f0-9]{32}$/D', (string)$card['id']) ? $card['id'] : null;
                $keep[] = save_card($card, $id, $cardId, $i);
            }
            foreach ($bombcardsService->forDeck($id) as $card) {
                if (!in_array($card['id'], $keep, true)) {
                    $bombcardsService->delete($card['id'], $id);
                }
            }
        }

        activity($user, $id, $title, 'Reviewer', 'library', $method === 'POST' ? 'Created' : 'Edited');
        $db->commit();
        respond(deck_data(owned_deck($id, $user)), $method === 'POST' ? 201 : 200);
    }

    if ($method === 'DELETE') {
        $id = id_field(input());
        owned_deck($id, $user);
        arena_stop_hidden_deck($id);
        $decksService->archive($id, $user);
        audit_event($user, 'deck_archived', $id, [], 'deck');
        respond(['ok' => true, 'archived' => true]);
    }
}

if ($route === 'archive/decks' && $method === 'GET') {
    $limit = max(1, min(50, (int)($_GET['limit'] ?? 10)));
    $offset = max(0, min(100000, (int)($_GET['offset'] ?? 0)));
    respond([
        'decks' => $decksService->archivedForUser($user, $limit, $offset),
        'total' => $decksService->archivedCountForUser($user),
        'limit' => $limit,
        'offset' => $offset,
    ]);
}

if ($route === 'archive/decks/restore' && $method === 'POST') {
    $id = id_field(input());
    $deck = $decksService->ownedArchived($id, $user);
    if (!$deck) fail(404, 'Archived reviewer not found.');
    assert_unique_reviewer_title($user, (string)$deck['title'], $id);
    $decksService->restore($id, $user);
    audit_event($user, 'deck_restored_from_archive', $id, [], 'deck');
    respond(['ok' => true]);
}

if ($route === 'archive/decks/permanent' && $method === 'DELETE') {
    $id = id_field(input());
    $deck = $decksService->ownedArchived($id, $user);
    if (!$deck) fail(404, 'Archived reviewer not found.');
    $names = query('SELECT stored_name FROM documents WHERE deck_id=? AND user_id=?', [$id, $user])->fetchAll(PDO::FETCH_COLUMN);
    $decksService->delete($id, $user);
    foreach ($names as $name) {
        $path = $config['upload_dir'] . '/' . $name;
        if (is_file($path)) unlink($path);
    }
    audit_event($user, 'deck_permanently_deleted', $id, [], 'deck');
    respond(['ok' => true]);
}

// Deck Share links
if ($route === 'decks/share') {
    $deckId = id_field($method === 'GET' ? $_GET : input(), 'deckId');
    owned_deck($deckId, $user);

    if ($method === 'GET') {
        $share = $deckSharesService->getForDeck($deckId, $user);
        if (!$share) {
            respond(['isShared' => false, 'isActive' => false, 'token' => null, 'url' => null]);
        }
        respond([
            'isShared' => true,
            'isActive' => (bool)$share['is_active'],
            'token' => $share['share_token'],
            'url' => app_base_url() . '/shared/deck/' . $share['share_token'],
            'createdAt' => $share['created_at'],
            'updatedAt' => $share['updated_at'],
        ]);
    }

    if ($method === 'POST') {
        $data = input();
        $action = $data['action'] ?? 'create';

        if ($action === 'create') {
            $share = $deckSharesService->createOrGet($deckId, $user);
        } elseif ($action === 'regenerate') {
            $share = $deckSharesService->regenerate($deckId, $user);
        } elseif ($action === 'toggle') {
            $active = (bool)($data['active'] ?? true);
            $share = $deckSharesService->setActive($deckId, $user, $active);
        } else {
            fail(422, 'Invalid share action.');
        }

        respond([
            'ok' => true,
            'isShared' => true,
            'isActive' => (bool)$share['is_active'],
            'token' => $share['share_token'],
            'url' => app_base_url() . '/shared/deck/' . $share['share_token'],
            'action' => $action,
        ]);
    }

    if ($method === 'DELETE') {
        $share = $deckSharesService->setActive($deckId, $user, false);
        respond(['ok' => true, 'isShared' => true, 'isActive' => false]);
    }
}

// Bombcard CRUD
if ($route === 'cards/bulk-delete' && $method === 'POST') {
    $data = input();
    $deck = owned_deck(id_field($data, 'deckId'), $user);
    $rawIds = $data['ids'] ?? null;
    if (!is_array($rawIds) || count($rawIds) < 1 || count($rawIds) > 500) {
        fail(422, 'Select between 1 and 500 Bombcards to delete.');
    }

    $ids = array_values(array_unique(array_filter($rawIds, static fn($id) => is_string($id) && $id !== '')));
    if (count($ids) !== count($rawIds)) {
        fail(422, 'The selected Bombcard list is invalid.');
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $matchingCount = (int)query(
        "SELECT COUNT(*) FROM cards WHERE deck_id=? AND id IN ($placeholders)",
        array_merge([$deck['id']], $ids)
    )->fetchColumn();
    if ($matchingCount !== count($ids)) {
        fail(404, 'One or more selected Bombcards were not found in this reviewer.');
    }

    $db->beginTransaction();
    foreach ($ids as $id) {
        $bombcardsService->delete($id, $deck['id']);
    }
    activity($user, $deck['id'], $deck['title'], 'Bombcards', 'library', 'Removed');
    $db->commit();
    respond(['ok' => true, 'deleted' => count($ids)]);
}

if ($route === 'cards' && in_array($method, ['POST', 'PATCH', 'DELETE'], true)) {
    $data = input();
    $deck = owned_deck(id_field($data, 'deckId'), $user);
    $db->beginTransaction();

    if ($method === 'DELETE') {
        $id = id_field($data);
        if (!$bombcardsService->delete($id, $deck['id'])) {
            fail(404, 'Bombcard not found.');
        }
    } else {
        $position = (int)query('SELECT COALESCE(MAX(position),-1)+1 FROM cards WHERE deck_id=?', [$deck['id']])->fetchColumn();
        $id = save_card($data, $deck['id'], $method === 'PATCH' ? id_field($data) : null, $position);
    }

    activity($user, $deck['id'], $deck['title'], 'Bombcards', 'library', $method === 'DELETE' ? 'Removed' : ($method === 'POST' ? 'Created' : 'Edited'));
    $db->commit();
    respond(['id' => $id], $method === 'POST' ? 201 : 200);
}

// ============================================================================
// 8. AI Flashcard Generator (Gemini Integration)
// ============================================================================
if ($route === 'ai/generate' && $method === 'POST') {
    $apiKey = trim((string)($config['gemini_api_key'] ?? ''));
    if ($apiKey === '') {
        fail(503, 'The server did not load GEMINI_API_KEY. Check the root .env variable name and format, then restart the server.');
    }
    if (!throttle_allows(hash_hmac('sha256', 'ai-generate:' . $user, (string)($config['mailer_secret'] ?: 'local-ai-throttle-key-change-this')), 20, 3600)) {
        fail(429, 'AI generation is temporarily rate-limited. Please try again later.');
    }

    $data = input();
    $notes = field($data, 'notes', 60000);
    $deckId = isset($data['deckId']) && is_string($data['deckId']) && $data['deckId'] !== '' ? id_field($data, 'deckId') : null;
    preg_match_all('/[\p{L}\p{N}]+(?:[\'’\-][\p{L}\p{N}]+)*/u', $notes, $wordMatches);
    $sourceWordCount = count($wordMatches[0] ?? []);
    $adaptiveTargetCount = min(50, max(3, (int)ceil($sourceWordCount / 80)));
    $format = field($data, 'format', 32, false) ?: 'MIXED';
    $focus = field($data, 'focus', 64, false) ?: 'comprehensive';
    $deck = $deckId ? owned_deck($deckId, $user) : null;

    $instruction = "You are an expert academic study assistant for Co-StudyMaxx.\nCreate a comprehensive, high-quality set of study flashcards based SOLELY on the study notes below. The source contains about {$sourceWordCount} words; use approximately {$adaptiveTargetCount} cards as a guide, while letting the number reflect the distinct testable concepts and the density of the material. Cover the important concepts without repetition or filler. Never generate more than 50 cards.\n";
    if ($format === 'MULTIPLE_CHOICE') {
        $instruction .= "Every card must be MULTIPLE_CHOICE with 4 distinct options, correctIndex (0-3), and correctAnswer matching options[correctIndex].\n";
    } elseif ($format === 'TRUE_FALSE') {
        $instruction .= "Every card must be a TRUE_FALSE statement with correctAnswer exactly True or False.\n";
    } elseif ($format === 'IDENTIFICATION') {
        $instruction .= "Every card must be IDENTIFICATION with a prompt and clear, concise correctAnswer term/concept.\n";
    } else {
        $instruction .= "Provide a balanced mix of MULTIPLE_CHOICE (4 options, correctIndex, correctAnswer), TRUE_FALSE (correctAnswer exactly True or False), and IDENTIFICATION (prompt, correctAnswer).\n";
    }

    if ($focus === 'key_terms') {
        $instruction .= "Focus: Emphasize key vocabulary, acronyms, and foundational definitions.\n";
    } elseif ($focus === 'conceptual') {
        $instruction .= "Focus: Emphasize conceptual understanding, cause-and-effect relationships, and practical scenarios.\n";
    }

    $instruction .= "Output schema: Return ONLY a raw JSON array matching this structure:\n[{\"type\":\"MULTIPLE_CHOICE\"|\"TRUE_FALSE\"|\"IDENTIFICATION\",\"prompt\":\"...\",\"options\":[\"...\"],\"correctIndex\":0,\"correctAnswer\":\"...\",\"alternates\":\"...\",\"hint\":\"...\"}]\nDo NOT wrap in markdown fences like ```json. Return ONLY valid JSON array.\n\nSTUDY MATERIAL:\n" . $notes;

    $modelsToTry = array_values(array_unique(array_filter([
        trim((string)($config['gemini_model'] ?? 'gemini-3.8-flash')),
        'gemini-3.8-flash',
        'gemini-3.5-flash-lite',
        'gemini-2.5-flash',
    ])));
    $geminiResponse = null;
    $lastErr = '';

    foreach ($modelsToTry as $mName) {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $mName . ':generateContent';
        $payload = json_encode([
            'contents' => [['parts' => [['text' => $instruction]]]],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'temperature' => 0.3,
                'maxOutputTokens' => min(16384, max(4096, $adaptiveTargetCount * 320)),
            ],
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'x-goog-api-key: ' . $apiKey]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 90);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cErr = curl_error($ch);
        curl_close($ch);

        if ($code === 200 && is_string($raw) && $raw !== '') {
            $p = json_decode($raw, true);
            $txt = $p['candidates'][0]['content']['parts'][0]['text'] ?? '';
            if ($txt !== '') {
                $geminiResponse = $txt;
                break;
            }
            $finishReason = (string)($p['candidates'][0]['finishReason'] ?? 'no candidate text');
            $lastErr = "Model $mName returned HTTP 200 without usable text (finish reason: $finishReason).";
        } else {
            $providerBody = is_string($raw) ? json_decode($raw, true) : null;
            $providerMessage = is_array($providerBody) && is_array($providerBody['error'] ?? null)
                ? (string)($providerBody['error']['message'] ?? '')
                : '';
            $lastErr = "Model $mName HTTP $code";
            if ($providerMessage !== '') {
                $lastErr .= ': ' . preg_replace('/[\r\n\t]+/', ' ', $providerMessage);
            } elseif ($cErr !== '') {
                $lastErr .= ': cURL ' . preg_replace('/[\r\n\t]+/', ' ', $cErr);
            }
        }
    }

    if (!$geminiResponse) {
        error_log('Gemini bombcard generation failed: ' . substr($lastErr ?: 'No response from configured models.', 0, 600));
        fail(502, 'Could not generate flashcards with Gemini. Please try again in a moment.');
    }

    $clean = trim($geminiResponse);
    if (str_starts_with($clean, '```')) {
        $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/', '', $clean);
        $clean = trim($clean);
    }

    $cardsData = json_decode($clean, true);
    if (!is_array($cardsData) && isset($cardsData['cards']) && is_array($cardsData['cards'])) {
        $cardsData = $cardsData['cards'];
    }

    if (!is_array($cardsData)) {
        error_log('Gemini bombcard generation returned invalid JSON; response length: ' . strlen($clean));
        fail(502, 'Gemini returned an unparseable response. Please try again.');
    }

    $normalized = [];
    foreach ($cardsData as $idx => $c) {
        if (!is_array($c) || empty($c['prompt'])) {
            continue;
        }
        $rawType = strtoupper(trim((string)($c['type'] ?? 'MULTIPLE_CHOICE')));
        $type = in_array($rawType, ['MULTIPLE_CHOICE','TRUE_FALSE','IDENTIFICATION'], true) ? $rawType : 'MULTIPLE_CHOICE';
        $prompt = trim((string)$c['prompt']);
        $hint = !empty($c['hint']) ? trim((string)$c['hint']) : null;

        if ($type === 'MULTIPLE_CHOICE') {
            $rawOpts = is_array($c['options'] ?? null) ? $c['options'] : [];
            $options = [];
            foreach ($rawOpts as $opt) {
                if (is_string($opt) || is_numeric($opt)) {
                    $options[] = trim((string)$opt);
                }
            }
            while (count($options) < 4) {
                $options[] = 'Option ' . (count($options) + 1);
            }
            $options = array_slice($options, 0, 4);
            $cIdx = isset($c['correctIndex']) && is_numeric($c['correctIndex']) ? (int)$c['correctIndex'] : 0;
            if ($cIdx < 0 || $cIdx > 3) {
                $cIdx = 0;
            }
            $ans = $options[$cIdx];
            $normalized[] = [
                'id' => 'ai-' . ($idx + 1) . '-' . uid(),
                'type' => 'MULTIPLE_CHOICE',
                'prompt' => $prompt,
                'options' => $options,
                'correctIndex' => $cIdx,
                'correctAnswer' => $ans,
                'hint' => $hint,
            ];
        } elseif ($type === 'TRUE_FALSE') {
            $rawAnswer = $c['correctAnswer'] ?? ($c['answer'] ?? '');
            $ans = is_bool($rawAnswer) ? ($rawAnswer ? 'True' : 'False') : ucfirst(strtolower(trim((string)$rawAnswer)));
            if (!in_array($ans, ['True','False'], true)) {
                continue;
            }
            $normalized[] = [
                'id' => 'ai-' . ($idx + 1) . '-' . uid(),
                'type' => 'TRUE_FALSE',
                'prompt' => $prompt,
                'options' => ['True','False'],
                'correctIndex' => $ans === 'True' ? 0 : 1,
                'correctAnswer' => $ans,
                'hint' => $hint,
            ];
        } else {
            $ans = trim((string)($c['correctAnswer'] ?? ''));
            if ($ans === '') {
                continue;
            }
            $normalized[] = [
                'id' => 'ai-' . ($idx + 1) . '-' . uid(),
                'type' => 'IDENTIFICATION',
                'prompt' => $prompt,
                'correctAnswer' => $ans,
                'alternates' => !empty($c['alternates']) ? trim((string)$c['alternates']) : '',
                'hint' => $hint,
            ];
        }
    }

    if (empty($normalized)) {
        fail(422, 'Could not extract valid questions from the provided notes. Please supply more detailed study text.');
    }

    $saveDirectly = ($data['saveDirectly'] ?? false) === true;
    if ($saveDirectly && $deck) {
        $db->beginTransaction();
        $startPos = (int)query('SELECT COALESCE(MAX(position),-1)+1 FROM cards WHERE deck_id=?', [$deck['id']])->fetchColumn();
        foreach ($normalized as $i => $card) {
            save_card($card, $deck['id'], null, $startPos + $i);
        }
        activity($user, $deck['id'], $deck['title'], 'AI Bombcards', 'creator', 'Created');
        $db->commit();
    }

    respond([
        'ok' => true,
        'count' => count($normalized),
        'deckId' => $deckId,
        'saved' => $saveDirectly && $deck !== null,
        'cards' => $normalized,
    ]);
}

if ($route === 'ai/reviewer' && $method === 'POST') {
    $apiKey = trim((string)($config['gemini_api_key'] ?? ''));
    if ($apiKey === '') {
        fail(503, 'Gemini is not configured on the server.');
    }
    if (!throttle_allows(hash_hmac('sha256', 'ai-reviewer:' . $user, (string)($config['mailer_secret'] ?: 'local-ai-throttle-key-change-this')), 10, 3600)) {
        fail(429, 'Reviewer creation is temporarily rate-limited. Please try again later.');
    }

    $data = input();
    $notes = field($data, 'notes', 60000, false);
    $deckTitle = field($data, 'deckTitle', 120, false) ?: 'Generated reviewer';
    $rawCards = $data['cards'] ?? null;
    if (!is_array($rawCards) || count($rawCards) < 1 || count($rawCards) > 50) {
        fail(422, 'The generated Bombcards could not be read. Please generate them again.');
    }
    $limitText = static fn(string $value, int $limit): string => function_exists('mb_substr') ? mb_substr($value, 0, $limit, 'UTF-8') : substr($value, 0, $limit);
    $reviewCards = [];
    foreach ($rawCards as $card) {
        if (!is_array($card)) continue;
        $prompt = trim((string)($card['prompt'] ?? ''));
        $answer = trim((string)($card['correctAnswer'] ?? ''));
        if ($prompt === '' || $answer === '') continue;
        $reviewCards[] = [
            'type' => substr((string)($card['type'] ?? ''), 0, 32),
            'prompt' => $limitText($prompt, 1200),
            'answer' => $limitText($answer, 500),
            'options' => is_array($card['options'] ?? null) ? array_slice(array_map(static fn($value) => is_string($value) || is_numeric($value) ? $limitText((string)$value, 300) : '', $card['options']), 0, 4) : [],
        ];
    }
    if (!$reviewCards) fail(422, 'No usable Bombcards were provided.');

    $instruction = "You are an expert academic study guide writer. Create an actual concept reviewer from the provided study source and generated flashcards. Write organized study notes that explain the subject for learning and offline review. Do not produce an answer sheet: never reproduce the card questions, multiple-choice options, question numbers, or an answer-by-answer list. Group related concepts under useful topic headings. Explain what ideas mean and how they relate, using concise paragraphs, term definitions, and bullet points. Include key facts and distinctions supported by the source; do not invent facts or expand beyond what is supported. Put each key term in the term field so it can be emphasized in bold, and make each core takeaway concise. Return only JSON in this schema: {\"title\":\"...\",\"sections\":[{\"heading\":\"...\",\"blocks\":[{\"type\":\"paragraph\",\"text\":\"...\"},{\"type\":\"definition\",\"term\":\"...\",\"explanation\":\"...\"},{\"type\":\"bullet\",\"text\":\"...\"},{\"type\":\"key_takeaway\",\"text\":\"...\"}]}]}. Include enough explanation to function as a study reviewer, not just a list of terms. Keep it focused and readable, with about 3 to 10 sections depending on the material.\n\nDECK/SUBJECT: " . $deckTitle . "\n\nGENERATED BOMBCARDS (use only to identify concepts and coverage; do not repeat their question format):\n" . json_encode($reviewCards, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($notes !== '') {
        $instruction .= "\n\nSOURCE STUDY NOTES (primary factual source):\n" . $notes;
    }

    $modelsToTry = array_values(array_unique(array_filter([
        trim((string)($config['gemini_model'] ?? 'gemini-3.8-flash')),
        'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash',
    ])));
    $reviewerResponse = null;
    $lastErr = '';
    foreach ($modelsToTry as $mName) {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $mName . ':generateContent';
        $payload = json_encode([
            'contents' => [['parts' => [['text' => $instruction]]]],
            'generationConfig' => ['responseMimeType' => 'application/json', 'temperature' => 0.35, 'maxOutputTokens' => 9000],
        ]);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'x-goog-api-key: ' . $apiKey]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 90);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cErr = curl_error($ch);
        curl_close($ch);
        if ($code === 200 && is_string($raw) && $raw !== '') {
            $provider = json_decode($raw, true);
            $text = $provider['candidates'][0]['content']['parts'][0]['text'] ?? '';
            if ($text !== '') { $reviewerResponse = $text; break; }
            $lastErr = 'Model ' . $mName . ' returned no reviewer text.';
        } else {
            $lastErr = 'Model ' . $mName . ' HTTP ' . $code . ($cErr !== '' ? ': ' . $cErr : '');
        }
    }
    if (!$reviewerResponse) {
        error_log('Gemini reviewer creation failed: ' . substr($lastErr ?: 'No response from configured models.', 0, 600));
        fail(502, 'Gemini could not create the study reviewer. Please try again.');
    }
    $clean = trim($reviewerResponse);
    if (str_starts_with($clean, '```')) {
        $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/', '', $clean);
    }
    $reviewer = json_decode(trim($clean), true);
    if (!is_array($reviewer) || !is_array($reviewer['sections'] ?? null)) {
        fail(502, 'Gemini returned a reviewer in an unsupported format. Please try again.');
    }
    $sections = [];
    foreach (array_slice($reviewer['sections'], 0, 12) as $section) {
        if (!is_array($section) || trim((string)($section['heading'] ?? '')) === '' || !is_array($section['blocks'] ?? null)) continue;
        $blocks = [];
        foreach (array_slice($section['blocks'], 0, 30) as $block) {
            if (!is_array($block)) continue;
            $type = (string)($block['type'] ?? '');
            if ($type === 'definition') {
                $term = trim((string)($block['term'] ?? ''));
                $explanation = trim((string)($block['explanation'] ?? ''));
                if ($term !== '' && $explanation !== '') $blocks[] = ['type' => 'definition', 'term' => $limitText($term, 180), 'explanation' => $limitText($explanation, 1200)];
            } elseif (in_array($type, ['paragraph', 'bullet', 'key_takeaway'], true)) {
                $text = trim((string)($block['text'] ?? ''));
                if ($text !== '') $blocks[] = ['type' => $type, 'text' => $limitText($text, 1800)];
            }
        }
        if ($blocks) $sections[] = ['heading' => $limitText(trim((string)$section['heading']), 180), 'blocks' => $blocks];
    }
    if (!$sections) fail(502, 'Gemini did not return usable study notes. Please try again.');
    respond(['ok' => true, 'reviewer' => ['title' => $limitText(trim((string)($reviewer['title'] ?? 'Study Reviewer')), 180), 'sections' => $sections]]);
}

// ============================================================================
// 9. Document & PDF Storage
// ============================================================================
if ($route === 'documents' && $method === 'POST') {
    $deck = owned_deck(id_field($_POST, 'deckId'), $user);
    $file = $_FILES['file'] ?? null;

    if (!$file || !is_array($file) || is_array($file['error'] ?? null)) {
        fail(422, 'Choose a PDF.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        fail(413, 'Upload failed; check the PDF size and PHP limits.');
    }
    if (!isset($file['tmp_name'], $file['name'], $file['size']) || !is_string($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        fail(422, 'The uploaded file could not be verified.');
    }
    if ($file['size'] < 5 || $file['size'] > $config['max_upload_bytes']) {
        fail(413, 'PDFs must be no larger than 10 MB.');
    }

    $name = basename(str_replace('\\', '/', $file['name']));
    if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== 'pdf' || text_length($name) > 255) {
        fail(422, 'Only PDF files are allowed.');
    }

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $h = fopen($file['tmp_name'], 'rb');
    $magic = fread($h, 5);
    fclose($h);

    if ($mime !== 'application/pdf' || $magic !== '%PDF-') {
        fail(422, 'Invalid PDF content.');
    }

    $dir = $config['upload_dir'];
    if (!is_dir($dir) && !mkdir($dir, 0700, true)) {
        fail(500, 'Private file storage is unavailable.');
    }

    $real = realpath($dir);
    if ($real === false) {
        fail(500, 'Private file storage could not be resolved.');
    }
    $root = realpath(dirname(__DIR__));
    if (str_starts_with(strtolower(str_replace('\\', '/', $real) . '/'), strtolower(str_replace('\\', '/', $root) . '/'))) {
        fail(503, 'PDF storage must be outside the public project directory.');
    }

    $id = uid();
    $stored = uid() . '.pdf';
    $path = $real . DIRECTORY_SEPARATOR . $stored;

    $db->beginTransaction();
    query('SELECT setting_key FROM system_settings WHERE setting_key=? FOR UPDATE', ['storage_limit_bytes'])->fetchColumn();
    $storageLimit = (int)system_setting('storage_limit_bytes', '10737418240');
    $storageUsed = (int)query('SELECT COALESCE(SUM(size_bytes),0) FROM documents')->fetchColumn();

    if ($storageUsed + (int)$file['size'] > $storageLimit) {
        fail(413, 'The system PDF storage limit has been reached.');
    }

    if (!move_uploaded_file($file['tmp_name'], $path)) {
        fail(500, 'Could not store the PDF.');
    }

    try {
        $materialsService->add($id, $deck['id'], $user, $name, $stored, $mime, (int)$file['size']);
        activity($user, $deck['id'], $name, 'PDF', 'library', 'Uploaded');
        $db->commit();
    } catch (Throwable $e) {
        if (is_file($path)) {
            unlink($path);
        }
        throw $e;
    }

    respond(['id' => $id, 'title' => $name, 'size' => (int)$file['size'], 'url' => 'api/index.php?r=documents/file&id=' . $id], 201);
}

if ($route === 'documents' && $method === 'DELETE') {
    $doc = $materialsService->remove(id_field(input()), $user);
    if (!$doc) {
        fail(404, 'Material not found.');
    }
    $path = $config['upload_dir'] . '/' . $doc['stored_name'];
    if (is_file($path)) {
        unlink($path);
    }
    respond(['ok' => true]);
}

if ($route === 'documents/file' && $method === 'GET') {
    $doc = owned_document(id_field($_GET), $user);
    $path = $config['upload_dir'] . '/' . $doc['stored_name'];
    if (!is_file($path)) {
        fail(404, 'PDF missing from file storage.');
    }
    session_write_close();
    header('Content-Type: application/pdf');
    header('Content-Length: ' . filesize($path));
    $disp = ($_GET['download'] ?? '') === '1' ? 'attachment' : 'inline';
    header("Content-Disposition: $disp; filename=\"document.pdf\"; filename*=UTF-8''" . rawurlencode($doc['title']));
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: frame-ancestors 'self'; base-uri 'none'");
    readfile($path);
    exit;
}

// ============================================================================
// 10. PDF Highlights & Excerpt-to-Card
// ============================================================================
if ($route === 'highlights/card' && $method === 'POST') {
    $data = input();
    $doc = owned_document(id_field($data, 'documentId'), $user);
    $text = field($data, 'text', 10000);
    $counterpart = field($data, 'counterpart', 10000);
    $page = $data['page'] ?? 1;
    $color = field($data, 'color', 7);
    $purpose = field($data, 'purpose', 16);
    $selection = selection_json($data);

    if (!$selection || !in_array($purpose, ['question', 'answer'], true) || !is_int($page) || $page < 1 || $page > 100000 || !preg_match('/^#[0-9a-fA-F]{6}$/D', $color)) {
        fail(422, 'Choose whether the excerpt is the question or answer.');
    }

    $prompt = $purpose === 'question' ? $text : $counterpart;
    $answer = $purpose === 'answer' ? $text : $counterpart;
    $position = (int)query('SELECT COALESCE(MAX(position),-1)+1 FROM cards WHERE deck_id=?', [$doc['deck_id']])->fetchColumn();

    $db->beginTransaction();
    $cardId = save_card(['type' => 'IDENTIFICATION', 'prompt' => $prompt, 'correctAnswer' => $answer], $doc['deck_id'], null, $position);
    $id = uid();
    query(
        'INSERT INTO highlights(id,document_id,page_number,note_text,color,purpose,selection_json,card_id) VALUES(?,?,?,?,?,?,?,?)',
        [$id, $doc['id'], $page, $text, $color, $purpose, $selection, $cardId]
    );
    activity($user, $doc['deck_id'], $doc['title'], 'PDF-to-Bombcard', 'highlighter', 'Created');
    $db->commit();

    respond([
        'cardId' => $cardId,
        'highlight' => [
            'id' => $id,
            'text' => $text,
            'page' => $page,
            'color' => $color,
            'purpose' => $purpose,
            'selection' => json_decode($selection, true),
            'cardId' => $cardId,
        ],
    ], 201);
}

if ($route === 'highlights') {
    $data = $method === 'GET' ? $_GET : input();
    $doc = owned_document(id_field($data, 'documentId'), $user);

    if ($method === 'GET') {
        $rows = query(
            'SELECT id,note_text text,page_number page,color,purpose,selection_json,card_id cardId FROM highlights WHERE document_id=? ORDER BY page_number,created_at',
            [$doc['id']]
        )->fetchAll();
        foreach ($rows as &$row) {
            $row['selection'] = $row['selection_json'] ? json_decode($row['selection_json'], true) : [];
            unset($row['selection_json']);
        }
        respond($rows);
    }

    if ($method === 'DELETE') {
        if (isset($data['id'])) {
            query('DELETE FROM highlights WHERE id=? AND document_id=?', [id_field($data), $doc['id']]);
        } else {
            query('DELETE FROM highlights WHERE document_id=?', [$doc['id']]);
        }
        respond(['ok' => true]);
    }

    if (in_array($method, ['POST', 'PATCH'], true)) {
        $text = field($data, 'text', 10000);
        $page = $data['page'] ?? 1;
        $color = field($data, 'color', 7);
        $purpose = $data['purpose'] ?? 'note';
        $selection = selection_json($data);

        if (!is_int($page) || $page < 1 || $page > 100000 || !preg_match('/^#[0-9a-fA-F]{6}$/D', $color) || !is_string($purpose) || !in_array($purpose, ['note', 'question', 'answer'], true)) {
            fail(422, 'Invalid note page, role, or color.');
        }

        $id = $method === 'PATCH' ? id_field($data) : uid();
        if ($method === 'PATCH') {
            if (!query('SELECT id FROM highlights WHERE id=? AND document_id=?', [$id, $doc['id']])->fetch()) {
                fail(404, 'Note not found.');
            }
            query(
                'UPDATE highlights SET note_text=?,page_number=?,color=?,purpose=?,selection_json=? WHERE id=?',
                [$text, $page, $color, $purpose, $selection, $id]
            );
        } else {
            query(
                'INSERT INTO highlights(id,document_id,page_number,note_text,color,purpose,selection_json) VALUES(?,?,?,?,?,?,?)',
                [$id, $doc['id'], $page, $text, $color, $purpose, $selection]
            );
        }

        respond([
            'id' => $id,
            'text' => $text,
            'page' => $page,
            'color' => $color,
            'purpose' => $purpose,
            'selection' => $selection ? json_decode($selection, true) : [],
        ], $method === 'POST' ? 201 : 200);
    }
}

// ============================================================================
// 11. Study Progress, Activity & Account Export
// ============================================================================
if ($route === 'study/progress' && $method === 'GET') {
    respond($progressService->forUser($user));
}

if ($route === 'study/progress' && $method === 'POST') {
    $data = input();
    $card = id_field($data, 'bombcardId');
    if (!query("SELECT c.id FROM cards c JOIN decks d ON d.id=c.deck_id WHERE c.id=? AND d.user_id=? AND d.moderation_status='visible' AND d.deleted_at IS NULL", [$card, $user])->fetch()) {
        fail(404, 'Bombcard not found.');
    }
    $result = field($data, 'result', 16);
    $progressService->record($user, $card, $result);
    respond(['ok' => true], 201);
}

if ($route === 'activity' && $method === 'POST') {
    $data = input();
    $deck = isset($data['deckId']) ? owned_deck(id_field($data, 'deckId'), $user) : null;
    $screen = field($data, 'screen', 32);
    if (!in_array($screen, ['library', 'flashcards', 'highlighter', 'game', 'creator'], true)) {
        fail(422, 'Invalid study screen.');
    }
    activity($user, $deck['id'] ?? null, field($data, 'material', 255), field($data, 'mode', 80), $screen, 'Opened');
    respond(['ok' => true], 201);
}

if ($route === 'account/export' && $method === 'GET') {
    $data = workspace($user);
    $data['exportedAt'] = gmdate(DATE_ATOM);
    $data['highlights'] = [];
    $data['arenaHistory'] = [];
    $data['activities'] = query(
        'SELECT id,deck_id deckId,material,mode,screen,status,accuracy,created_at FROM study_activity WHERE user_id=? ORDER BY created_at DESC',
        [$user]
    )->fetchAll();

    foreach ($data['decks'] as $deck) {
        foreach ($deck['documents'] as $doc) {
            $data['highlights'][$doc['id']] = query(
                'SELECT id,page_number,note_text,color,purpose,selection_json,card_id cardId,created_at FROM highlights WHERE document_id=?',
                [$doc['id']]
            )->fetchAll();
        }
    }

    foreach ($bombstyleService->history($user, 500) as $s) {
        $data['arenaHistory'][] = arena_view($s);
    }

    header('Content-Disposition: attachment; filename="co-studymaxx-export.json"');
    respond($data);
}

// ============================================================================
// 12. Learning Workspace (PDF, AI, Notes, Flashcards) & Bombstyle Arena
// ============================================================================
if (handle_learning_workspace_routes($route, $method, $user)) {
    exit;
}

arena_routes($route, $method, $user);

fail(404, 'Endpoint not found.');
