<?php
/**
 * Co-StudyMaxx - User Registration Handler (PHP + MySQL)
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

// Accept both JSON payload and standard application/x-www-form-urlencoded
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$username        = trim($input['username'] ?? '');
$password        = $input['password'] ?? '';
$confirmPassword = $input['confirmPassword'] ?? null;

// 1. Validate required fields
if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'Please provide username and password.'
    ]);
    exit;
}

// 2. Validate username format & length
if (strlen($username) < 3 || strlen($username) > 50) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'Username must be between 3 and 50 characters.'
    ]);
    exit;
}

if (!preg_match('/^[a-zA-Z0-9_\-]+$/', $username)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'Username may only contain letters, numbers, underscores, and dashes.'
    ]);
    exit;
}

// 3. Validate password requirements
if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'Password must be at least 6 characters long.'
    ]);
    exit;
}

if ($confirmPassword !== null && $password !== $confirmPassword) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'Passwords do not match.'
    ]);
    exit;
}

try {
    $pdo = getDbConnection();
    $colMap = getUserColumnMap($pdo);

    // 4. Check whether username already exists
    $checkUserStmt = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE LOWER(`username`) = LOWER(:username)");
    $checkUserStmt->execute([':username' => $username]);
    if ($checkUserStmt->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error'   => 'Username is already taken. Please choose another.'
        ]);
        exit;
    }

    // 5. Hash the password using password_hash()
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // 6. Insert user using prepared statement
    $passCol = $colMap['password'];
    $sql = "INSERT INTO `users` (`username`, `{$passCol}`) VALUES (:username, :password)";
    $insertStmt = $pdo->prepare($sql);
    $insertStmt->execute([
        ':username' => $username,
        ':password' => $passwordHash
    ]);

    $newId = (int)$pdo->lastInsertId();

    // 7. Return success response (never exposing password)
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful!',
        'user'    => [
            'id'       => $newId,
            'username' => $username
        ]
    ]);
} catch (PDOException $e) {
    error_log("Registration PDO error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Database error during registration. Please try again later.'
    ]);
}
