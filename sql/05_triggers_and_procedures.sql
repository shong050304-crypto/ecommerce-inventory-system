-- ============================================================
-- 電商訂單與庫存管理系統 (E-Commerce Order & Inventory Management System)
-- 05_triggers_and_procedures.sql - 觸發器與預存程序
-- ============================================================
-- 建立日期：2026-05-17
-- 說明：建立自動化機制，確保資料一致性
-- 設計原則：庫存更新統一由觸發器處理，避免重複計算
-- ============================================================

USE ecommerce_db;

-- ============================================================
-- 觸發器一：訂單明細插入後，自動更新訂單總金額
-- ============================================================
DELIMITER //

CREATE TRIGGER trg_after_order_detail_insert
AFTER INSERT ON ORDER_DETAILS
FOR EACH ROW
BEGIN
    UPDATE ORDERS
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM ORDER_DETAILS
        WHERE order_id = NEW.order_id
    )
    WHERE order_id = NEW.order_id;
END //

DELIMITER ;


-- ============================================================
-- 觸發器二：訂單明細刪除後，自動更新訂單總金額
-- ============================================================
DELIMITER //

CREATE TRIGGER trg_after_order_detail_delete
AFTER DELETE ON ORDER_DETAILS
FOR EACH ROW
BEGIN
    UPDATE ORDERS
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM ORDER_DETAILS
        WHERE order_id = OLD.order_id
    )
    WHERE order_id = OLD.order_id;
END //

DELIMITER ;


-- ============================================================
-- 觸發器三：庫存異動記錄插入後，自動更新商品庫存量
-- 說明：根據 change_quantity 正負值自動增減庫存
--       這是庫存更新的唯一入口，預存程序不再手動更新庫存
-- ============================================================
DELIMITER //

CREATE TRIGGER trg_after_inventory_log_insert
AFTER INSERT ON INVENTORY_LOGS
FOR EACH ROW
BEGIN
    UPDATE PRODUCTS
    SET stock_quantity = stock_quantity + NEW.change_quantity
    WHERE product_id = NEW.product_id;
END //

DELIMITER ;


-- ============================================================
-- 預存程序一：新增訂單（含明細與庫存扣減）
-- 說明：使用 Transaction 確保訂單建立、明細寫入、庫存扣減
--       三個操作的原子性
-- 注意：庫存扣減統一透過 INSERT INTO INVENTORY_LOGS 觸發
--       trg_after_inventory_log_insert 來自動完成，
--       避免手動 UPDATE + 觸發器造成的 double-counting 問題
-- ============================================================
DELIMITER //

CREATE PROCEDURE sp_create_order(
    IN p_member_id INT,
    IN p_product_id INT,
    IN p_quantity INT,
    OUT p_order_id INT,
    OUT p_result_message VARCHAR(255)
)
BEGIN
    DECLARE v_price DECIMAL(10,2);
    DECLARE v_stock INT;
    DECLARE v_product_name VARCHAR(100);
    DECLARE v_subtotal DECIMAL(12,2);

    -- 錯誤處理
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result_message = '錯誤：訂單建立失敗，已回滾交易';
    END;

    START TRANSACTION;

    -- 檢查商品是否存在且上架中（使用 FOR UPDATE 行級鎖防止 Race Condition）
    SELECT price, stock_quantity, name
    INTO v_price, v_stock, v_product_name
    FROM PRODUCTS
    WHERE product_id = p_product_id AND is_active = TRUE
    FOR UPDATE;

    IF v_price IS NULL THEN
        SET p_result_message = '錯誤：商品不存在或已下架';
        ROLLBACK;
    ELSEIF v_stock < p_quantity THEN
        SET p_result_message = CONCAT('錯誤：庫存不足，目前庫存：', v_stock);
        ROLLBACK;
    ELSE
        -- 計算小計
        SET v_subtotal = v_price * p_quantity;

        -- 建立訂單
        INSERT INTO ORDERS (member_id, total_amount, payment_status, order_status)
        VALUES (p_member_id, v_subtotal, '未付款', '處理中');

        SET p_order_id = LAST_INSERT_ID();

        -- 建立訂單明細
        INSERT INTO ORDER_DETAILS (order_id, product_id, quantity, unit_price, subtotal)
        VALUES (p_order_id, p_product_id, p_quantity, v_price, v_subtotal);

        -- 寫入庫存異動記錄（觸發器會自動扣減庫存，無需手動 UPDATE）
        INSERT INTO INVENTORY_LOGS (product_id, change_quantity, change_type)
        VALUES (p_product_id, -p_quantity, '訂單扣減');

        COMMIT;
        SET p_result_message = CONCAT('成功：訂單 #', p_order_id, ' 已建立，商品：',
                                       v_product_name, '，數量：', p_quantity,
                                       '，金額：', v_subtotal);
    END IF;
END //

DELIMITER ;


-- ============================================================
-- 預存程序二：查詢會員訂單歷史
-- ============================================================
DELIMITER //

CREATE PROCEDURE sp_get_member_orders(
    IN p_member_id INT
)
BEGIN
    SELECT
        o.order_id       AS '訂單編號',
        o.total_amount   AS '訂單總額',
        o.payment_status AS '付款狀態',
        o.order_status   AS '訂單狀態',
        o.created_at     AS '下單時間',
        GROUP_CONCAT(
            CONCAT(p.name, ' x', od.quantity)
            ORDER BY od.detail_id
            SEPARATOR '、'
        ) AS '購買商品'
    FROM ORDERS o
        INNER JOIN ORDER_DETAILS od ON o.order_id = od.order_id
        INNER JOIN PRODUCTS p ON od.product_id = p.product_id
    WHERE o.member_id = p_member_id
    GROUP BY o.order_id, o.total_amount, o.payment_status,
             o.order_status, o.created_at
    ORDER BY o.created_at DESC;
END //

DELIMITER ;


-- ============================================================
-- 預存程序三：庫存補貨
-- 注意：庫存增加統一透過 INSERT INTO INVENTORY_LOGS 觸發
--       trg_after_inventory_log_insert 來自動完成
-- ============================================================
DELIMITER //

CREATE PROCEDURE sp_restock_product(
    IN p_product_id INT,
    IN p_quantity INT,
    OUT p_result_message VARCHAR(255)
)
BEGIN
    DECLARE v_product_name VARCHAR(100);
    DECLARE v_new_stock INT;

    -- 檢查商品是否存在
    SELECT name INTO v_product_name
    FROM PRODUCTS
    WHERE product_id = p_product_id;

    IF v_product_name IS NULL THEN
        SET p_result_message = '錯誤：商品不存在';
    ELSEIF p_quantity <= 0 THEN
        SET p_result_message = '錯誤：補貨數量必須大於 0';
    ELSE
        -- 寫入庫存異動記錄（觸發器會自動增加庫存，無需手動 UPDATE）
        INSERT INTO INVENTORY_LOGS (product_id, change_quantity, change_type)
        VALUES (p_product_id, p_quantity, '進貨');

        -- 查詢更新後的庫存（觸發器已在 INSERT 後立即更新）
        SELECT stock_quantity INTO v_new_stock
        FROM PRODUCTS
        WHERE product_id = p_product_id;

        SET p_result_message = CONCAT('成功：', v_product_name,
                                       ' 已補貨 ', p_quantity, ' 件',
                                       '，目前庫存：', v_new_stock);
    END IF;
END //

DELIMITER ;


-- ============================================================
-- 測試預存程序
-- ============================================================
-- 測試1：建立新訂單（會員9，許文傑，購買綜合堅果 x3）
SET @new_order_id = 0;
SET @result_msg = '';
CALL sp_create_order(9, 12, 3, @new_order_id, @result_msg);
SELECT @new_order_id AS '新訂單ID', @result_msg AS '執行結果';

-- 測試2：查詢會員1（王小明）的訂單歷史
CALL sp_get_member_orders(1);

-- 測試3：補貨（MacBook Air 補 10 台）
SET @restock_msg = '';
CALL sp_restock_product(2, 10, @restock_msg);
SELECT @restock_msg AS '補貨結果';


SELECT '======= 觸發器與預存程序建立完成 =======' AS message;
