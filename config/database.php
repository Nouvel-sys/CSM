<?php
/**
 * Co-StudyMaxx - Centralized Database Configuration (PDO)
 */

// Centralized credentials
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'costudymaxx');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_CHARSET', 'utf8mb4');

/**
 * Returns a configured PDO database connection instance.
 *
 * @return PDO
 * @throws PDOException
 */
function getDbConnection(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_PORT,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Attempt to create database if it doesn't exist yet
            if ($e->getCode() == 1049) {
                $initDsn = sprintf('mysql:host=%s;port=%s;charset=%s', DB_HOST, DB_PORT, DB_CHARSET);
                $tempPdo = new PDO($initDsn, DB_USER, DB_PASS, $options);
                $tempPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            } else {
                error_log("Database connection error: " . $e->getMessage());
                throw $e;
            }
        }

        // Ensure users table exists with required schema
        ensureUsersTable($pdo);
    }

    return $pdo;
}

/**
 * Ensures the users table exists.
 */
function ensureUsersTable(PDO $pdo): void {
    $sql = "CREATE TABLE IF NOT EXISTS `users` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `username` VARCHAR(50) NOT NULL UNIQUE,
        `password` VARCHAR(255) NOT NULL,
        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_username` (`username`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sql);
}

/**
 * Starts a secure PHP session if not already started.
 */
function startSecureSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
        
        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'domain'   => '',
            'secure'   => $isSecure,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        
        session_start();
    }
}

/**
 * Detects user table column names for maximum compatibility across schemas.
 *
 * @param PDO $pdo
 * @return array ['id' => string, 'password' => string]
 */
function getUserColumnMap(PDO $pdo): array {
    static $map = null;
    if ($map !== null) {
        return $map;
    }

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `users`");
        $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $idCol = in_array('id', $cols) ? 'id' : (in_array('user_id', $cols) ? 'user_id' : 'id');
        $passCol = in_array('password', $cols) ? 'password' : (in_array('password_hash', $cols) ? 'password_hash' : 'password');
        
        $map = [
            'id'       => $idCol,
            'password' => $passCol
        ];
    } catch (Exception $e) {
        $map = ['id' => 'id', 'password' => 'password'];
    }

    return $map;
}
