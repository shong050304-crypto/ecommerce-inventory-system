-- ============================================================
-- 電商訂單與庫存管理系統 (E-Commerce Order & Inventory Management System)
-- 04_queries.sql - 核心查詢語句
-- ============================================================
-- 建立日期：2026-05-17
-- 說明：提供各種實用查詢，用於驗證資料庫功能及日常營運使用
-- 依計劃書預期成果：訂單明細還原、即時庫存追蹤、營運統計分析
-- ============================================================

USE ecommerce_db;

-- ============================================================
-- 查詢一：訂單還原查詢（多表 JOIN）
-- 說明：透過 JOIN 連結會員、訂單、訂單明細與商品，
--       完整呈現每筆訂單的購買明細
-- 對應計劃書：「訂單明細還原」
-- ============================================================
SELECT
    o.order_id                AS '訂單編號',
    m.name                    AS '會員姓名',
    m.email                   AS '電子郵件',
    p.name                    AS '商品名稱',
    od.quantity               AS '購買數量',
    od.unit_price             AS '結帳單價',
    od.subtotal               AS '小計',
    o.total_amount            AS '訂單總額',
    o.payment_status          AS '付款狀態',
    o.order_status            AS '訂單狀態',
    o.created_at              AS '下單時間'
FROM ORDERS o
    INNER JOIN MEMBERS m        ON o.member_id = m.member_id
    INNER JOIN ORDER_DETAILS od ON o.order_id  = od.order_id
    INNER JOIN PRODUCTS p       ON od.product_id = p.product_id
ORDER BY o.order_id, od.detail_id;


-- ============================================================
-- 查詢二：即時庫存查詢
-- 說明：查詢特定商品的當前庫存量及其所有庫存變動紀錄
-- 對應計劃書：「即時庫存與異動追蹤」
-- ============================================================
-- (A) 查詢所有商品的即時庫存
SELECT
    p.product_id   AS '商品ID',
    p.name         AS '商品名稱',
    c.name         AS '所屬分類',
    p.price        AS '售價',
    p.stock_quantity AS '當前庫存',
    CASE
        WHEN p.stock_quantity = 0 THEN '⛔ 缺貨'
        WHEN p.stock_quantity < 20 THEN '⚠️ 低庫存'
        ELSE '✅ 正常'
    END AS '庫存狀態',
    p.is_active    AS '上架中'
FROM PRODUCTS p
    INNER JOIN CATEGORIES c ON p.category_id = c.category_id
ORDER BY p.stock_quantity ASC;

-- (B) 查詢特定商品（ID=1）的庫存變動歷程
SELECT
    il.log_id         AS '紀錄ID',
    p.name            AS '商品名稱',
    il.change_quantity AS '變動數量',
    il.change_type    AS '變動類型',
    il.created_at     AS '紀錄時間'
FROM INVENTORY_LOGS il
    INNER JOIN PRODUCTS p ON il.product_id = p.product_id
WHERE il.product_id = 1
ORDER BY il.created_at;


-- ============================================================
-- 查詢三：營業統計報表（GROUP BY + 聚合函數）
-- 對應計劃書：「營運統計分析」
-- ============================================================
-- (A) 各會員消費總額排行
SELECT
    m.member_id     AS '會員ID',
    m.name          AS '會員姓名',
    COUNT(o.order_id) AS '訂單數',
    SUM(o.total_amount) AS '消費總額',
    AVG(o.total_amount) AS '平均訂單金額'
FROM MEMBERS m
    LEFT JOIN ORDERS o ON m.member_id = o.member_id
GROUP BY m.member_id, m.name
ORDER BY SUM(o.total_amount) DESC;

-- (B) 各分類商品銷售數量與金額統計
SELECT
    c.name                    AS '商品分類',
    COUNT(DISTINCT p.product_id) AS '商品數量',
    COALESCE(SUM(od.quantity), 0) AS '總銷售數量',
    COALESCE(SUM(od.subtotal), 0) AS '總銷售金額'
FROM CATEGORIES c
    LEFT JOIN PRODUCTS p       ON c.category_id = p.category_id
    LEFT JOIN ORDER_DETAILS od ON p.product_id = od.product_id
GROUP BY c.category_id, c.name
ORDER BY COALESCE(SUM(od.subtotal), 0) DESC;

-- (C) 商品銷售排行榜 TOP 10
SELECT
    p.product_id              AS '商品ID',
    p.name                    AS '商品名稱',
    c.name                    AS '所屬分類',
    COALESCE(SUM(od.quantity), 0) AS '總銷售量',
    COALESCE(SUM(od.subtotal), 0) AS '總銷售額'
FROM PRODUCTS p
    INNER JOIN CATEGORIES c    ON p.category_id = c.category_id
    LEFT JOIN ORDER_DETAILS od ON p.product_id = od.product_id
GROUP BY p.product_id, p.name, c.name
ORDER BY COALESCE(SUM(od.subtotal), 0) DESC
LIMIT 10;


-- ============================================================
-- 查詢四：月度銷售趨勢分析
-- ============================================================
SELECT
    DATE_FORMAT(o.created_at, '%Y-%m') AS '月份',
    COUNT(DISTINCT o.order_id)         AS '訂單數',
    SUM(o.total_amount)                AS '營業額',
    COUNT(DISTINCT o.member_id)        AS '下單人數'
FROM ORDERS o
GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
ORDER BY DATE_FORMAT(o.created_at, '%Y-%m');


-- ============================================================
-- 查詢五：訂單狀態分佈
-- ============================================================
SELECT
    order_status     AS '訂單狀態',
    payment_status   AS '付款狀態',
    COUNT(*)         AS '訂單數',
    SUM(total_amount) AS '金額小計'
FROM ORDERS
GROUP BY order_status, payment_status
ORDER BY order_status, payment_status;


-- ============================================================
-- 查詢六：子查詢 - 找出消費金額高於平均值的會員
-- ============================================================
SELECT
    m.name          AS '會員姓名',
    m.email         AS '電子郵件',
    member_total.total_spent AS '消費總額'
FROM MEMBERS m
INNER JOIN (
    SELECT member_id, SUM(total_amount) AS total_spent
    FROM ORDERS
    GROUP BY member_id
) member_total ON m.member_id = member_total.member_id
WHERE member_total.total_spent > (
    SELECT AVG(total_spent) FROM (
        SELECT SUM(total_amount) AS total_spent
        FROM ORDERS
        GROUP BY member_id
    ) avg_table
)
ORDER BY member_total.total_spent DESC;


-- ============================================================
-- 查詢七：VIEW 建立 - 訂單總覽視圖
-- ============================================================
CREATE OR REPLACE VIEW vw_order_summary AS
SELECT
    o.order_id,
    m.name          AS member_name,
    m.email         AS member_email,
    o.total_amount,
    o.payment_status,
    o.order_status,
    o.created_at,
    COUNT(od.detail_id) AS item_count
FROM ORDERS o
    INNER JOIN MEMBERS m        ON o.member_id = m.member_id
    INNER JOIN ORDER_DETAILS od ON o.order_id  = od.order_id
GROUP BY o.order_id, m.name, m.email, o.total_amount,
         o.payment_status, o.order_status, o.created_at;

-- 使用視圖查詢
SELECT * FROM vw_order_summary ORDER BY created_at DESC;


SELECT '======= 所有查詢執行完成 =======' AS message;
