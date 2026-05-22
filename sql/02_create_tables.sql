-- ============================================================
-- 電商訂單與庫存管理系統 (E-Commerce Order & Inventory Management System)
-- 02_create_tables.sql - 建立資料表
-- ============================================================
-- 建立日期：2026-05-17
-- 依照資料庫計劃書、ERD 圖與 Schema 圖設計（6 個實體）
-- 表格建立順序依據外鍵依賴關係排列
-- ============================================================

USE ecommerce_db;

-- ============================================================
-- 1. 會員資料表 (MEMBERS)
-- 描述：儲存系統會員的個人資訊
-- 關係：一位會員可以下多筆訂單 (1:N)
-- ============================================================
CREATE TABLE MEMBERS (
    member_id    INT            AUTO_INCREMENT  COMMENT '會員ID',
    name         VARCHAR(50)    NOT NULL        COMMENT '姓名',
    email        VARCHAR(100)   NOT NULL        COMMENT '電子郵件',
    password_hash VARCHAR(255)  NOT NULL        COMMENT '密碼雜湊值',
    phone        VARCHAR(20)    DEFAULT NULL    COMMENT '聯絡電話',
    address      VARCHAR(255)   DEFAULT NULL    COMMENT '送貨地址',
    created_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '註冊時間',

    -- 主鍵約束
    CONSTRAINT pk_members PRIMARY KEY (member_id),

    -- 唯一約束：Email 不可重複
    CONSTRAINT uq_members_email UNIQUE (email),

    -- 唯一約束：電話號碼不可重複（允許 NULL）
    CONSTRAINT uq_members_phone UNIQUE (phone)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='會員資料表';


-- ============================================================
-- 2. 商品分類資料表 (CATEGORIES)
-- 描述：儲存商品的分類資訊
-- 關係：一個分類可以包含多個商品 (1:N)
-- ============================================================
CREATE TABLE CATEGORIES (
    category_id  INT            AUTO_INCREMENT  COMMENT '分類ID',
    name         VARCHAR(50)    NOT NULL        COMMENT '分類名稱',
    description  VARCHAR(255)   DEFAULT NULL    COMMENT '分類描述',

    -- 主鍵約束
    CONSTRAINT pk_categories PRIMARY KEY (category_id),

    -- 唯一約束：分類名稱不可重複
    CONSTRAINT uq_categories_name UNIQUE (name)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='商品分類資料表';


-- ============================================================
-- 3. 商品資料表 (PRODUCTS)
-- 描述：儲存商品的詳細資訊
-- 關係：
--   - 每個商品屬於一個分類 (N:1 -> CATEGORIES)
--   - 一個商品可以被列入多筆訂單明細 (1:N -> ORDER_DETAILS)
--   - 一個商品可以產生多筆庫存記錄 (1:N -> INVENTORY_LOGS)
-- ============================================================
CREATE TABLE PRODUCTS (
    product_id     INT            AUTO_INCREMENT  COMMENT '商品ID',
    category_id    INT            NOT NULL        COMMENT '分類ID',
    name           VARCHAR(100)   NOT NULL        COMMENT '商品名稱',
    price          DECIMAL(10,2)  NOT NULL        COMMENT '售價',
    stock_quantity INT            NOT NULL DEFAULT 0 COMMENT '當前庫存量',
    description    TEXT           DEFAULT NULL    COMMENT '商品描述',
    is_active      BOOLEAN        NOT NULL DEFAULT TRUE COMMENT '上架狀態',

    -- 主鍵約束
    CONSTRAINT pk_products PRIMARY KEY (product_id),

    -- 外鍵約束：關聯到 CATEGORIES 表
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES CATEGORIES(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- CHECK 約束：售價必須大於 0
    CONSTRAINT chk_products_price CHECK (price > 0),

    -- CHECK 約束：庫存量必須大於等於 0
    CONSTRAINT chk_products_stock CHECK (stock_quantity >= 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='商品資料表';

-- 索引：加速依分類查詢商品
CREATE INDEX idx_products_category ON PRODUCTS(category_id);

-- 索引：加速依上架狀態篩選
CREATE INDEX idx_products_is_active ON PRODUCTS(is_active);


-- ============================================================
-- 4. 訂單資料表 (ORDERS)
-- 描述：儲存訂單的主要資訊
-- 關係：
--   - 每筆訂單屬於一位會員 (N:1 -> MEMBERS)
--   - 一筆訂單可以記載多筆訂單明細 (1:N -> ORDER_DETAILS)
-- ============================================================
CREATE TABLE ORDERS (
    order_id       INT            AUTO_INCREMENT  COMMENT '訂單ID',
    member_id      INT            NOT NULL        COMMENT '會員ID',
    total_amount   DECIMAL(12,2)  NOT NULL DEFAULT 0.00 COMMENT '訂單總金額',
    payment_status VARCHAR(20)    NOT NULL DEFAULT '未付款' COMMENT '付款狀態',
    order_status   VARCHAR(20)    NOT NULL DEFAULT '處理中' COMMENT '訂單狀態',
    shipping_phone VARCHAR(20)    DEFAULT NULL    COMMENT '送貨電話',
    shipping_address VARCHAR(255) DEFAULT NULL    COMMENT '送貨地址',
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',

    -- 主鍵約束
    CONSTRAINT pk_orders PRIMARY KEY (order_id),

    -- 外鍵約束：關聯到 MEMBERS 表
    CONSTRAINT fk_orders_member
        FOREIGN KEY (member_id) REFERENCES MEMBERS(member_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- CHECK 約束：訂單總金額不可為負
    CONSTRAINT chk_orders_total CHECK (total_amount >= 0),

    -- CHECK 約束：付款狀態必須為指定值（依計劃書定義）
    CONSTRAINT chk_orders_payment_status
        CHECK (payment_status IN ('未付款', '已付款', '失敗')),

    -- CHECK 約束：訂單狀態必須為指定值（依計劃書定義）
    CONSTRAINT chk_orders_order_status
        CHECK (order_status IN ('處理中', '已出貨', '已完成'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='訂單資料表';

-- 索引：加速依會員查詢訂單
CREATE INDEX idx_orders_member ON ORDERS(member_id);

-- 索引：加速依訂單狀態篩選
CREATE INDEX idx_orders_status ON ORDERS(order_status);

-- 索引：加速依付款狀態篩選
CREATE INDEX idx_orders_payment ON ORDERS(payment_status);

-- 索引：加速依日期排序/篩選
CREATE INDEX idx_orders_created ON ORDERS(created_at);


-- ============================================================
-- 5. 訂單明細資料表 (ORDER_DETAILS)
-- 描述：儲存訂單中每個商品的購買詳情
-- 關係：
--   - 每筆明細屬於一筆訂單 (N:1 -> ORDERS)
--   - 每筆明細對應一個商品 (N:1 -> PRODUCTS)
-- 說明：此為訂單與商品間多對多關係的中介表
-- ============================================================
CREATE TABLE ORDER_DETAILS (
    detail_id    INT            AUTO_INCREMENT  COMMENT '明細ID',
    order_id     INT            NOT NULL        COMMENT '訂單ID',
    product_id   INT            NOT NULL        COMMENT '商品ID',
    quantity     INT            NOT NULL        COMMENT '購買數量',
    unit_price   DECIMAL(10,2)  NOT NULL        COMMENT '結帳單價',
    subtotal     DECIMAL(12,2)  NOT NULL        COMMENT '小計金額',

    -- 主鍵約束
    CONSTRAINT pk_order_details PRIMARY KEY (detail_id),

    -- 外鍵約束：關聯到 ORDERS 表
    CONSTRAINT fk_order_details_order
        FOREIGN KEY (order_id) REFERENCES ORDERS(order_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- 外鍵約束：關聯到 PRODUCTS 表
    CONSTRAINT fk_order_details_product
        FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- CHECK 約束：購買數量必須大於 0
    CONSTRAINT chk_order_details_qty CHECK (quantity > 0),

    -- CHECK 約束：結帳單價必須大於 0
    CONSTRAINT chk_order_details_price CHECK (unit_price > 0),

    -- CHECK 約束：小計金額必須大於 0
    CONSTRAINT chk_order_details_subtotal CHECK (subtotal > 0),

    -- 唯一約束：同一訂單中不可重複出現相同商品
    CONSTRAINT uq_order_product UNIQUE (order_id, product_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='訂單明細資料表';

-- 索引：加速依訂單查詢明細
CREATE INDEX idx_order_details_order ON ORDER_DETAILS(order_id);

-- 索引：加速依商品查詢明細
CREATE INDEX idx_order_details_product ON ORDER_DETAILS(product_id);


-- ============================================================
-- 6. 庫存異動記錄表 (INVENTORY_LOGS)
-- 描述：記錄商品庫存的所有變動歷程
-- 關係：每筆記錄對應一個商品 (N:1 -> PRODUCTS)
-- 變動類型（依計劃書定義）：進貨(入庫)、訂單扣減(出庫)、取消退回
-- ============================================================
CREATE TABLE INVENTORY_LOGS (
    log_id           INT            AUTO_INCREMENT  COMMENT '紀錄ID',
    product_id       INT            NOT NULL        COMMENT '商品ID',
    change_quantity  INT            NOT NULL        COMMENT '變動數量（正數為入庫，負數為出庫）',
    change_type      VARCHAR(20)    NOT NULL        COMMENT '變動類型',
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '紀錄時間',

    -- 主鍵約束
    CONSTRAINT pk_inventory_logs PRIMARY KEY (log_id),

    -- 外鍵約束：關聯到 PRODUCTS 表
    CONSTRAINT fk_inventory_logs_product
        FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- CHECK 約束：變動數量不可為 0
    CONSTRAINT chk_inventory_logs_qty CHECK (change_quantity != 0),

    -- CHECK 約束：變動類型必須為指定值（依計劃書定義）
    CONSTRAINT chk_inventory_logs_type
        CHECK (change_type IN ('進貨', '訂單扣減', '取消退回'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='庫存異動記錄表';

-- 索引：加速依商品查詢庫存記錄
CREATE INDEX idx_inventory_logs_product ON INVENTORY_LOGS(product_id);

-- 索引：加速依變動類型篩選
CREATE INDEX idx_inventory_logs_type ON INVENTORY_LOGS(change_type);

-- 索引：加速依時間排序/篩選
CREATE INDEX idx_inventory_logs_created ON INVENTORY_LOGS(created_at);


-- ============================================================
-- 完成提示
-- ============================================================
SELECT '所有資料表建立完成！（共 6 張表）' AS message;
SHOW TABLES;
