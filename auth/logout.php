<?php
/**
 * Co-StudyMaxx - Logout Handler (PHP Session Clearance)
 */

require_once __DIR__ . '/../config/database.php';

startSecureSession();

// 1. Unset all session variables
$_SESSION = [];

// 2. Clear the session cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

// 3. Destroy session
session_destroy();

// If requested via JSON/Fetch API
$isJson = (!empty($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
       || (!empty($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false)
       || (isset($_GET['format']) && $_GET['format'] === 'json');

if ($isJson) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success'  => true,
        'message'  => 'Logged out successfully.',
        'redirect' => 'login.php'
    ]);
    exit;
}

// Standard browser redirect
header('Location: ../login.php');
exit;
