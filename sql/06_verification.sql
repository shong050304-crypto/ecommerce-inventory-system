-- ============================================================
-- 電商訂單與庫存管理系統 (E-Commerce Order & Inventory Management System)
-- 06_verification.sql - 資料驗證測試腳本
-- ============================================================
-- 建立日期：2026-05-17
-- 說明：用於驗證資料庫結構與資料完整性（6 個實體）
-- ============================================================

USE ecommerce_db;

-- ============================================================
-- 驗證 1：確認所有資料表已建立（應為 6 張）
-- ============================================================
SELECT '===== 驗證 1：資料表清單 =====' AS test_case;
SHOW TABLES;

-- ============================================================
-- 驗證 2：確認各表欄位結構
-- ============================================================
SELECT '===== 驗證 2：資料表結構 =====' AS test_case;
DESCRIBE MEMBERS;
DESCRIBE CATEGORIES;
DESCRIBE PRODUCTS;
DESCRIBE ORDERS;
DESCRIBE ORDER_DETAILS;
DESCRIBE INVENTORY_LOGS;

-- ============================================================
-- 驗證 3：確認外鍵約束正確建立
-- ============================================================
SELECT '===== 驗證 3：外鍵約束 =====' AS test_case;
SELECT
    CONSTRAINT_NAME     AS '約束名稱',
    TABLE_NAME          AS '來源表',
    COLUMN_NAME         AS '來源欄位',
    REFERENCED_TABLE_NAME  AS '參照表',
    REFERENCED_COLUMN_NAME AS '參照欄位'
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'ecommerce_db'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;

-- ============================================================
-- 驗證 4：確認各表資料筆數
-- ============================================================
SELECT '===== 驗證 4：資料筆數 =====' AS test_case;
SELECT 'MEMBERS' AS '資料表', COUNT(*) AS '筆數' FROM MEMBERS
UNION ALL SELECT 'CATEGORIES', COUNT(*) FROM CATEGORIES
UNION ALL SELECT 'PRODUCTS', COUNT(*) FROM PRODUCTS
UNION ALL SELECT 'ORDERS', COUNT(*) FROM ORDERS
UNION ALL SELECT 'ORDER_DETAILS', COUNT(*) FROM ORDER_DETAILS
UNION ALL SELECT 'INVENTORY_LOGS', COUNT(*) FROM INVENTORY_LOGS;

-- ============================================================
-- 驗證 5：測試 CHECK 約束 - 應失敗（價格為負）
-- ============================================================
SELECT '===== 驗證 5：CHECK 約束測試 =====' AS test_case;

-- 此 INSERT 應該被 CHECK 約束拒絕（price < 0）
-- 取消註解以測試：
-- INSERT INTO PRODUCTS (category_id, name, price, stock_quantity)
-- VALUES (1, '測試負價格商品', -100.00, 10);

-- 此 INSERT 應該被 CHECK 約束拒絕（stock_quantity < 0）
-- 取消註解以測試：
-- INSERT INTO PRODUCTS (category_id, name, price, stock_quantity)
-- VALUES (1, '測試負庫存商品', 100.00, -5);

SELECT '已跳過破壞性測試（取消註解即可執行）' AS '測試結果';

-- ============================================================
-- 驗證 6：測試外鍵約束 - 應失敗（不存在的會員）
-- ============================================================
SELECT '===== 驗證 6：外鍵約束測試 =====' AS test_case;

-- 此 INSERT 應該被外鍵約束拒絕（member_id 999 不存在）
-- 取消註解以測試：
-- INSERT INTO ORDERS (member_id, total_amount) VALUES (999, 100.00);

SELECT '已跳過破壞性測試（取消註解即可執行）' AS '測試結果';

-- ============================================================
-- 驗證 7：訂單金額一致性檢查
-- ============================================================
SELECT '===== 驗證 7：訂單金額一致性 =====' AS test_case;
SELECT
    o.order_id          AS '訂單ID',
    o.total_amount      AS '訂單記錄金額',
    SUM(od.subtotal)    AS '明細加總金額',
    CASE
        WHEN o.total_amount = SUM(od.subtotal) THEN '✅ 一致'
        ELSE '❌ 不一致'
    END AS '驗證結果'
FROM ORDERS o
    INNER JOIN ORDER_DETAILS od ON o.order_id = od.order_id
GROUP BY o.order_id, o.total_amount;

-- ============================================================
-- 驗證 8：確認索引已建立
-- ============================================================
SELECT '===== 驗證 8：索引清單 =====' AS test_case;
SELECT
    TABLE_NAME   AS '資料表',
    INDEX_NAME   AS '索引名稱',
    COLUMN_NAME  AS '索引欄位',
    NON_UNIQUE   AS '允許重複'
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'ecommerce_db'
ORDER BY TABLE_NAME, INDEX_NAME;


SELECT '======= 所有驗證完成 =======' AS final_message;
