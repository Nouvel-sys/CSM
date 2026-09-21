<?php
/**
 * Co-StudyMaxx - Main Protected Application Entry Point
 *
 * Enforces server-side authentication using PHP sessions before rendering
 * the dashboard and game arena. Unauthenticated requests are immediately
 * redirected to login.php.
 */

require_once __DIR__ . '/auth/check_auth.php';

// Authenticated user is available in $currentUser
// Render the complete Co-StudyMaxx interface
require_once __DIR__ . '/index.html';
