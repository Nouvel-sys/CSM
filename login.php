<?php
/**
 * Co-StudyMaxx - Login & Registration Entry Point
 *
 * Checks if user is already authenticated and redirects to index.php.
 * Otherwise renders the login/registration interface.
 */

require_once __DIR__ . '/config/database.php';
startSecureSession();

// If user already has an active authenticated session, skip login
if (!empty($_SESSION['user_id']) && !empty($_SESSION['logged_in'])) {
    header('Location: index.php');
    exit;
}

// Render the login/registration page
require_once __DIR__ . '/login.html';
