-- ============================================================
-- 電商訂單與庫存管理系統 (E-Commerce Order & Inventory Management System)
-- 01_create_database.sql - 建立資料庫
-- ============================================================
-- 建立日期：2026-05-17
-- 資料庫系統：MySQL 8.0+
-- 編碼：UTF-8 (utf8mb4)
-- ============================================================

-- 如果資料庫已存在則先刪除（開發測試用途）
DROP DATABASE IF EXISTS ecommerce_db;

-- 建立資料庫，使用 utf8mb4 支援完整的中文字元
CREATE DATABASE ecommerce_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 切換至新建的資料庫
USE ecommerce_db;

SELECT '資料庫 ecommerce_db 建立完成！' AS message;
