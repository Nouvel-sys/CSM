<?php
/**
 * Co-StudyMaxx - Server-Side Authentication Guard & Session Check
 *
 * Usage on protected pages:
 *   require_once __DIR__ . '/auth/check_auth.php';
 */

require_once __DIR__ . '/../config/database.php';

startSecureSession();

$isAuthenticated = !empty($_SESSION['user_id']) && !empty($_SESSION['logged_in']);

// Detect whether this script was called as a JSON API endpoint or included in a page
$isJsonRequest = (!empty($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
              || (isset($_GET['format']) && $_GET['format'] === 'json')
              || (basename($_SERVER['SCRIPT_FILENAME']) === 'check_auth.php');

if (!$isAuthenticated) {
    if ($isJsonRequest) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(401);
        echo json_encode([
            'authenticated' => false,
            'user'          => null,
            'redirect'      => 'login.php'
        ]);
        exit;
    } else {
        // Enforce server-side redirect to login page
        header('Location: login.php');
        exit;
    }
}

// User is authenticated
$currentUser = [
    'id'       => (int)$_SESSION['user_id'],
    'username' => $_SESSION['username'] ?? 'User'
];

// If called directly via AJAX to check login status
if ($isJsonRequest && basename($_SERVER['SCRIPT_FILENAME']) === 'check_auth.php') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'authenticated' => true,
        'user'          => $currentUser
    ]);
    exit;
}
