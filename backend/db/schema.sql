-- ============================================================
-- Схема БД для системы регистрации личного кабинета
-- MySQL 8+
-- ============================================================

CREATE DATABASE IF NOT EXISTS `lk_registration`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `lk_registration`;

-- ------------------------------------------------------------
-- Пользователи
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `phone`           VARCHAR(20)  NOT NULL,                 -- нормализованный формат: 79991234567
  `phone_verified`  TINYINT(1)   NOT NULL DEFAULT 0,
  `email`           VARCHAR(255) NULL,                     -- только домен @yuodomen.ru
  `email_verified`  TINYINT(1)   NOT NULL DEFAULT 0,
  `status`          ENUM('pending','active','blocked') NOT NULL DEFAULT 'pending',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_users_phone` (`phone`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Привязанные внешние идентификаторы (VK, MAX, Telegram, SberID, ...)
-- Архитектура рассчитана на добавление новых провайдеров без
-- изменения структуры таблицы — просто новое значение `provider`.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_identities` (
  `id`              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `provider`        VARCHAR(32) NOT NULL,   -- 'vk' | 'max' | 'telegram' | 'sberid' | ...
  `provider_uid`    VARCHAR(255) NOT NULL,  -- id пользователя у провайдера
  `raw_profile`     JSON NULL,              -- сырой ответ провайдера (для отладки/аудита)
  `linked_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_provider_uid` (`provider`, `provider_uid`),
  KEY `idx_user_identities_user` (`user_id`),
  CONSTRAINT `fk_identities_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Журнал звонков-подтверждений (verification call через SMSC.ru)
-- Хранит всё, что нужно для аудита: какой номер звонил,
-- ожидаемый код, статус проверки, ip/user-agent запросившего.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `phone_verification_attempts` (
  `id`                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `phone`             VARCHAR(20)  NOT NULL,
  `caller_number`     VARCHAR(20)  NOT NULL,   -- номер, с которого SMSC совершит звонок
  `expected_code`     VARCHAR(6)   NOT NULL,   -- последние 6 цифр caller_number
  `all_phones`        JSON NULL,               -- список всех возможных номеров-звонилок (от SMSC)
  `status`            ENUM('requested','verified','expired','failed') NOT NULL DEFAULT 'requested',
  `smsc_error_code`   SMALLINT NULL,           -- код ошибки SMSC, если был
  `attempts_count`    SMALLINT NOT NULL DEFAULT 0,  -- сколько раз вводили код
  `ip_address`        VARCHAR(64) NULL,
  `user_agent`        VARCHAR(512) NULL,
  `requested_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`        DATETIME NOT NULL,
  `verified_at`        DATETIME NULL,
  KEY `idx_pva_phone` (`phone`),
  KEY `idx_pva_status` (`status`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Журнал email-кодов подтверждения
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_verification_attempts` (
  `id`            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`       BIGINT UNSIGNED NULL,
  `email`         VARCHAR(255) NOT NULL,
  `code_hash`     VARCHAR(255) NOT NULL,   -- код храним только в виде хэша
  `status`        ENUM('requested','verified','expired','failed') NOT NULL DEFAULT 'requested',
  `attempts_count` SMALLINT NOT NULL DEFAULT 0,
  `ip_address`    VARCHAR(64) NULL,
  `requested_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`    DATETIME NOT NULL,
  `verified_at`   DATETIME NULL,
  KEY `idx_eva_email` (`email`),
  CONSTRAINT `fk_eva_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;
