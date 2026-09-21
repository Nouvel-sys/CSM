-- Co-StudyMaxx Database Schema
-- Compatible with MySQL 5.7+ / MariaDB 10.3+ / phpMyAdmin

CREATE DATABASE IF NOT EXISTS `costudymaxx`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `costudymaxx`;

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional default seed user: 'Nouvel' (Password: password123)
INSERT INTO `users` (`username`, `password`)
VALUES ('Nouvel', '$2y$10$sDykOc.9YCMwC4ud8oWOmO2QfO.hHSkDeYktwySB/r8Py/TX5792K')
ON DUPLICATE KEY UPDATE `username` = `username`;
