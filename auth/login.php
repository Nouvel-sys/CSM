<?php
/**
 * Co-StudyMaxx - User Login Handler (PHP + MySQL)
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

// Accept both JSON payload and standard application/x-www-form-urlencoded
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$username       = trim($input['username'] ?? '');
$password       = $input['password'] ?? '';
$rememberDevice = !empty($input['rememberDevice']);

// 1. Validate required fields
if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'Please enter your username and password.'
    ]);
    exit;
}

try {
    $pdo = getDbConnection();
    $colMap = getUserColumnMap($pdo);
    $idCol = $colMap['id'];
    $passCol = $colMap['password'];

    // 2. Find corresponding user by username using prepared statement
    $sql = "SELECT `{$idCol}` AS id, `username`, `{$passCol}` AS password
            FROM `users`
            WHERE LOWER(`username`) = LOWER(:username)
            LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':username' => $username
    ]);
    $user = $stmt->fetch();

    // 3. Generic error message helper (does not leak whether username exists)
    $genericError = 'Invalid username or password.';

    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error'   => $genericError
        ]);
        exit;
    }

    // 4. Verify password hash using password_verify()
    if (!password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error'   => $genericError
        ]);
        exit;
    }

    // 5. Authentication succeeds: Start session
    startSecureSession();

    // 6. Regenerate session ID to prevent session fixation attacks
    session_regenerate_id(true);

    // If remember device is checked, extend cookie lifetime to 30 days
    if ($rememberDevice) {
        $lifetime = 30 * 24 * 60 * 60; // 30 days
        setcookie(
            session_name(),
            session_id(),
            [
                'expires'  => time() + $lifetime,
                'path'     => '/',
                'domain'   => '',
                'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
                'httponly' => true,
                'samesite' => 'Lax'
            ]
        );
    }

    // Store minimal, non-sensitive session data
    $_SESSION['user_id']   = (int)$user['id'];
    $_SESSION['username']  = $user['username'];
    $_SESSION['logged_in'] = true;

    // Return success response (never exposing password)
    http_response_code(200);
    echo json_encode([
        'success'  => true,
        'message'  => 'Login successful!',
        'redirect' => 'index.php',
        'user'     => [
            'id'       => (int)$user['id'],
            'username' => $user['username']
        ]
    ]);
} catch (PDOException $e) {
    error_log("Login PDO error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'An internal error occurred. Please try again later.'
    ]);
}
