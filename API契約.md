# 電商訂單與庫存管理系統 — API 契約文件

> **版本**：v1.0  
> **日期**：2026-05-17  
> **撰寫**：前端組（會員端 UI）  
> **對象**：後端／資料庫組員  
> **前端對接檔**：`frontend/src/services/api.js`

本文件定義會員端前端目前與未來所需的 REST API。欄位命名統一採 **snake_case**，與 MySQL 資料表一致。後端實作完成後，前端將在 `api.js` 改為 `fetch` 呼叫，並設定環境變數 `VITE_API_URL`。

---

## 1. 通用約定

### 1.1 Base URL

| 環境 | URL |
|------|-----|
| 本機開發 | `http://localhost:3000/api`（埠號可調整，請與前端同步） |
| 前端設定 | `frontend/.env` → `VITE_API_URL=http://localhost:3000/api` |

### 1.2 請求格式

- `Content-Type: application/json`
- 字元編碼：UTF-8
- 日期時間：ISO 8601 字串，例如 `2026-05-17T14:30:00.000Z`

### 1.3 回應格式

**成功**：HTTP 2xx，Body 為 JSON 物件或陣列。

**失敗**：HTTP 4xx / 5xx，Body 建議統一為：

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "純棉素色 T 恤 庫存不足（剩餘 2 件）"
  }
}
```

| HTTP | 用途 |
|------|------|
| 400 | 參數錯誤、業務邏輯拒絕 |
| 401 | 未登入或 Token 無效 |
| 403 | 無權限（例如查看他人訂單） |
| 404 | 資源不存在 |
| 409 | 衝突（例如 email 已註冊） |
| 500 | 伺服器錯誤 |

前端目前以 `message` 字串顯示錯誤，請至少提供 `error.message`。

### 1.4 認證（建議）

會員端需登入的 API 建議採 **JWT**：

```
Authorization: Bearer <token>
```

| 項目 | 說明 |
|------|------|
| 登入／註冊成功 | 回傳 `token` + `user` 物件 |
| 需登入的 API | 驗證 Token，從中取得 `member_id` |
| 密碼 | 僅存雜湊值，API 絕不回傳 `password` |

若第一版尚未實作 JWT，可暫時用 Session Cookie，但請與前端事先約定。

### 1.5 CORS

請允許前端開發來源：

- `http://localhost:5173`（Vite 預設）

---

## 2. 列舉值（Enum）

與資料庫 CHECK 或應用層驗證請保持一致。

### 2.1 付款狀態 `payment_status`

| 值 | 中文 | 說明 |
|----|------|------|
| `unpaid` | 未付款 | 訂單建立預設值 |
| `paid` | 已付款 | 付款完成 |
| `failed` | 付款失敗 | 付款流程失敗 |

### 2.2 訂單狀態 `order_status`

| 值 | 中文 | 說明 |
|----|------|------|
| `processing` | 處理中 | 訂單成立預設值 |
| `shipped` | 已出貨 | 管理者出貨後 |
| `completed` | 已完成 | 訂單結案 |

### 2.3 庫存異動類型 `change_type`（管理端／紀錄用）

| 值 | 中文 |
|----|------|
| `purchase` | 進貨 |
| `order_deduct` | 訂單扣減 |
| `cancel_return` | 取消退回 |

### 2.4 商品上架 `is_active`

| 值 | 說明 |
|----|------|
| `true` / `1` | 上架中（會員端可瀏覽） |
| `false` / `0` | 已下架 |

---

## 3. 資料模型與資料表對照

### 3.1 會員 `members`

| API 欄位 | DB 欄位 | 類型 | 說明 |
|----------|---------|------|------|
| `id` | member_id | INT PK | |
| `name` | name | VARCHAR | 姓名 |
| `email` | email | VARCHAR UNIQUE | |
| `phone` | phone | VARCHAR | 聯絡電話 |
| `address` | address | VARCHAR | 預設送貨地址 |
| `created_at` | created_at | DATETIME | |

> 密碼欄 `password_hash` 不對外暴露。

### 3.2 商品分類 `categories`

| API 欄位 | DB 欄位 | 類型 |
|----------|---------|------|
| `id` | category_id | INT PK |
| `name` | name | VARCHAR |
| `description` | description | TEXT |

### 3.3 商品 `products`

| API 欄位 | DB 欄位 | 類型 | 說明 |
|----------|---------|------|------|
| `id` | product_id | INT PK | |
| `category_id` | category_id | INT FK | |
| `category_name` | — | VARCHAR | **JOIN 欄位**，列表／詳情建議帶回 |
| `name` | name | VARCHAR | |
| `price` | price | DECIMAL | 目前售價 |
| `stock` | stock | INT | `>= 0` |
| `description` | description | TEXT | |
| `is_active` | is_active | BOOLEAN | |
| `image` | — | VARCHAR NULL | 選用，圖片 URL |

### 3.4 訂單 `orders`

| API 欄位 | DB 欄位 | 類型 |
|----------|---------|------|
| `id` | order_id | INT PK |
| `member_id` | member_id | INT FK |
| `total_amount` | total_amount | DECIMAL |
| `payment_status` | payment_status | ENUM |
| `order_status` | order_status | ENUM |
| `shipping_address` | — | VARCHAR | 結帳當下地址（建議獨立欄位或擴充） |
| `shipping_phone` | — | VARCHAR | 結帳當下電話 |
| `created_at` | created_at | DATETIME |

> 計畫書未單獨列出送貨欄位，建議在 `orders` 表新增 `shipping_address`、`shipping_phone`，或等同語意之欄位名，並在本文保持一致。

### 3.5 訂單明細 `order_details`

| API 欄位 | DB 欄位 | 類型 | 說明 |
|----------|---------|------|------|
| `id` | detail_id | INT PK | 選用於回應 |
| `order_id` | order_id | INT FK | |
| `product_id` | product_id | INT FK | |
| `product_name` | — | VARCHAR | **快照**，JOIN 帶出或寫入時複製 |
| `quantity` | quantity | INT | |
| `unit_price` | unit_price | DECIMAL | **結帳當下單價**（反正規化） |
| `subtotal` | subtotal | DECIMAL | `unit_price * quantity` |

### 3.6 庫存紀錄 `inventory_logs`（管理端為主，下單時由後端寫入）

| API 欄位 | DB 欄位 | 類型 |
|----------|---------|------|
| `id` | log_id | INT PK |
| `product_id` | product_id | INT FK |
| `change_quantity` | change_quantity | INT | 正=增加，負=減少 |
| `change_type` | change_type | ENUM |
| `created_at` | created_at | DATETIME |

---

## 4. 會員端 API 一覽

| # | 方法 | 路徑 | 認證 | 前端函式 | 說明 |
|---|------|------|------|----------|------|
| 1 | POST | `/auth/register` | 否 | `register` | 註冊 |
| 2 | POST | `/auth/login` | 否 | `login` | 登入 |
| 3 | GET | `/categories` | 否 | `fetchCategories` | 分類列表 |
| 4 | GET | `/products` | 否 | `fetchProducts` | 商品列表 |
| 5 | GET | `/products/:id` | 否 | `fetchProductById` | 商品詳情 |
| 6 | POST | `/orders` | **是** | `createOrder` | 建立訂單 |
| 7 | GET | `/orders` | **是** | `fetchOrdersByMember` | 我的訂單列表 |
| 8 | GET | `/orders/:id` | **是** | `fetchOrderById` | 訂單詳情 |
| 9 | POST | `/orders/:id/pay` | **是** | `simulatePayment` | 模擬付款（期末展示） |

---

## 5. API 詳細規格

### 5.1 註冊

```
POST /auth/register
```

**Request Body**

```json
{
  "name": "王小明",
  "email": "user@example.com",
  "password": "secret123",
  "phone": "0912345678",
  "address": "高雄市燕巢區深中路 58 號"
}
```

| 欄位 | 必填 | 驗證 |
|------|------|------|
| name | ✓ | 非空 |
| email | ✓ | 格式正確、唯一 |
| password | ✓ | 建議 ≥ 6 字元 |
| phone | ✓ | 非空 |
| address | ✓ | 非空 |

**Response `201`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 2,
    "name": "王小明",
    "email": "user@example.com",
    "phone": "0912345678",
    "address": "高雄市燕巢區深中路 58 號",
    "created_at": "2026-05-17T06:00:00.000Z"
  }
}
```

**錯誤範例 `409`**

```json
{
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "此電子郵件已被註冊"
  }
}
```

---

### 5.2 登入

```
POST /auth/login
```

**Request Body**

```json
{
  "email": "demo@example.com",
  "password": "demo1234"
}
```

**Response `200`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "示範會員",
    "email": "demo@example.com",
    "phone": "0912345678",
    "address": "高雄市燕巢區深中路 58 號",
    "created_at": "2026-01-15T08:00:00.000Z"
  }
}
```

**錯誤 `401`**：`message`: `電子郵件或密碼錯誤`

---

### 5.3 商品分類列表

```
GET /categories
```

**Response `200`**

```json
[
  {
    "id": 1,
    "name": "服飾",
    "description": "日常穿搭與配件"
  },
  {
    "id": 2,
    "name": "3C 配件",
    "description": "手機、電腦周邊"
  }
]
```

---

### 5.4 商品列表

```
GET /products
```

**Query Parameters**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `category_id` | number | 否 | 篩選分類 |
| `search` | string | 否 | 商品名稱模糊搜尋 |
| `sort` | string | 否 | `price_asc` \| `price_desc`；預設依 `id` 降序（最新） |
| `active_only` | boolean | 否 | 會員端固定傳 `true` 或後端預設只回上架商品 |

**Response `200`**

```json
[
  {
    "id": 1,
    "category_id": 1,
    "category_name": "服飾",
    "name": "純棉素色 T 恤",
    "price": 399,
    "stock": 28,
    "description": "100% 純棉，透氣舒適…",
    "is_active": true,
    "image": null
  }
]
```

**業務規則**

- 會員端僅顯示 `is_active === true` 的商品
- `stock === 0` 仍回傳，前端顯示「已售完」並禁止加入購物車

---

### 5.5 商品詳情

```
GET /products/:id
```

**Response `200`**

```json
{
  "id": 1,
  "category_id": 1,
  "category_name": "服飾",
  "name": "純棉素色 T 恤",
  "price": 399,
  "stock": 28,
  "description": "100% 純棉，透氣舒適…",
  "is_active": true,
  "image": null
}
```

**錯誤 `404`**：商品不存在或已下架（`is_active = false` 時會員端視同找不到）

---

### 5.6 建立訂單（核心：Transaction + 扣庫存）

```
POST /orders
Authorization: Bearer <token>
```

**Request Body**

```json
{
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 3, "quantity": 1 }
  ],
  "shipping_phone": "0912345678",
  "shipping_address": "高雄市燕巢區深中路 58 號"
}
```

| 欄位 | 必填 | 說明 |
|------|------|------|
| items | ✓ | 至少 1 筆 |
| items[].product_id | ✓ | 商品 ID |
| items[].quantity | ✓ | 正整數，且 ≤ 當前庫存 |
| shipping_phone | ✓ | |
| shipping_address | ✓ | |

> `member_id` 由 Token 解析，**不要**信任前端傳入的 member_id。

**後端必須在同一 Transaction 內完成**

1. 鎖定／檢查各商品庫存（建議 `SELECT ... FOR UPDATE`）
2. 寫入 `orders`（`payment_status = unpaid`，`order_status = processing`）
3. 寫入 `order_details`（`unit_price` 取**當下** `products.price`）
4. 扣減 `products.stock`
5. 寫入 `inventory_logs`（`change_type = order_deduct`，`change_quantity` 為負數）

**Response `201`**

```json
{
  "id": 15,
  "member_id": 1,
  "total_amount": 1097,
  "payment_status": "unpaid",
  "order_status": "processing",
  "shipping_phone": "0912345678",
  "shipping_address": "高雄市燕巢區深中路 58 號",
  "created_at": "2026-05-17T14:30:00.000Z",
  "items": [
    {
      "product_id": 1,
      "product_name": "純棉素色 T 恤",
      "quantity": 2,
      "unit_price": 399,
      "subtotal": 798
    },
    {
      "product_id": 3,
      "product_name": "USB-C 快充傳輸線",
      "quantity": 1,
      "unit_price": 299,
      "subtotal": 299
    }
  ]
}
```

**錯誤範例 `400`**

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "純棉素色 T 恤 庫存不足（剩餘 1 件）"
  }
}
```

---

### 5.7 我的訂單列表

```
GET /orders
Authorization: Bearer <token>
```

**Query Parameters（選用，前端可之後再加）**

| 參數 | 說明 |
|------|------|
| `payment_status` | 篩選付款狀態 |
| `order_status` | 篩選訂單狀態 |

**Response `200`**

```json
[
  {
    "id": 15,
    "member_id": 1,
    "total_amount": 1097,
    "payment_status": "unpaid",
    "order_status": "processing",
    "shipping_phone": "0912345678",
    "shipping_address": "高雄市燕巢區深中路 58 號",
    "created_at": "2026-05-17T14:30:00.000Z",
    "items": [
      {
        "product_id": 1,
        "product_name": "純棉素色 T 恤",
        "quantity": 2,
        "unit_price": 399,
        "subtotal": 798
      }
    ]
  }
]
```

**業務規則**

- 僅回傳**當前登入會員**的訂單
- 建議依 `created_at` **降序**
- 列表可含 `items`；若效能考量也可只回訂單主檔，但前端目前假設有 `items`（至少筆數／摘要）。若精簡版請事先告知。

---

### 5.8 訂單詳情

```
GET /orders/:id
Authorization: Bearer <token>
```

**Response `200`**

與「建立訂單」回傳的單筆訂單結構相同。

**錯誤**

| HTTP | 情境 |
|------|------|
| 404 | 訂單不存在 |
| 403 | 訂單屬於其他會員 |

---

### 5.9 模擬付款（期末展示用）

```
POST /orders/:id/pay
Authorization: Bearer <token>
```

**Request Body**：空 `{}` 即可。

**業務規則**

- 僅訂單擁有者可操作
- 僅當 `payment_status === 'unpaid'` 可付款
- 成功後更新為 `payment_status = 'paid'`

**Response `200`**

回傳更新後的完整訂單物件（結構同 5.8）。

**錯誤 `400`**

```json
{
  "error": {
    "code": "ALREADY_PAID",
    "message": "訂單已付款"
  }
}
```

> 此端點模擬金流，之後若接真實金流可改為 webhook 更新狀態，路徑可保留或另開 `/payments`。

---

## 6. 管理端 API 詳細規格

管理端所有 API 建議加上 `/admin` 前綴以與會員端進行路由與權限隔離。請求時均需在 Header 帶上管理端憑證：
```
Authorization: Bearer <admin_token>
```

### 6.1 管理員登入

```
POST /admin/auth/login
```

**Request Body**

```json
{
  "email": "admin@example.com",
  "password": "admin1234"
}
```

**Response `200`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": 1,
    "name": "系統管理員",
    "email": "admin@example.com"
  }
}
```

**錯誤 `401`**：`message`: `管理員帳號或密碼錯誤`

---

### 6.2 儀表板數據

```
GET /admin/dashboard/stats
```

**Response `200`**

```json
{
  "today_order_count": 3,
  "processing_order_count": 5,
  "low_stock_count": 2,
  "monthly_revenue": 45000,
  "recent_orders": [
    {
      "id": 15,
      "member_id": 1,
      "member_name": "王小明",
      "member_email": "user@example.com",
      "total_amount": 1097,
      "payment_status": "unpaid",
      "order_status": "processing",
      "created_at": "2026-05-17T14:30:00.000Z"
    }
  ],
  "low_stock_products": [
    {
      "id": 1,
      "category_id": 1,
      "category_name": "服飾",
      "name": "純棉素色 T 恤",
      "price": 399,
      "stock": 2,
      "description": "100% 純棉，透氣舒適…",
      "is_active": true
    }
  ]
}
```

---

### 6.3 分類管理 API

#### 6.3.1 取得分類列表（含商品數量）

```
GET /admin/categories
```

**Response `200`**

```json
[
  {
    "id": 1,
    "name": "服飾",
    "description": "日常穿搭與配件",
    "product_count": 12
  },
  {
    "id": 2,
    "name": "3C 配件",
    "description": "手機、電腦周邊",
    "product_count": 5
  }
]
```

#### 6.3.2 新增分類

```
POST /admin/categories
```

**Request Body**

```json
{
  "name": "鞋包配件",
  "description": "流行鞋款與雙肩包、側背包"
}
```

**Response `201`**

```json
{
  "id": 3,
  "name": "鞋包配件",
  "description": "流行鞋款與雙肩包、側背包"
}
```

**錯誤範例 `400`**

```json
{
  "error": {
    "code": "CATEGORY_EXISTS",
    "message": "分類名稱已存在"
  }
}
```

#### 6.3.3 編輯分類

```
PUT /admin/categories/:id
```

**Request Body**

```json
{
  "name": "潮流鞋包",
  "description": "更新後的描述內容"
}
```

**Response `200`**

```json
{
  "id": 3,
  "name": "潮流鞋包",
  "description": "更新後的描述內容"
}
```

#### 6.3.4 刪除分類

```
DELETE /admin/categories/:id
```

**Response `204`**：無內容（No Content）

**錯誤範例 `400`**：若分類下有關聯商品，拒絕刪除。

```json
{
  "error": {
    "code": "CATEGORY_HAS_PRODUCTS",
    "message": "此分類下仍有商品，無法刪除"
  }
}
```

---

### 6.4 商品管理 API

#### 6.4.1 取得商品列表（管理端）

```
GET /admin/products
```

**Query Parameters**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `category_id` | number | 否 | 篩選分類 |
| `search` | string | 否 | 商品名稱模糊搜尋 |
| `activeFilter` | string | 否 | `active` (僅上架) \| `inactive` (僅下架)；未傳則顯示全部 |

**Response `200`**

```json
[
  {
    "id": 2,
    "category_id": 1,
    "category_name": "服飾",
    "name": "重磅修身帽 T",
    "price": 890,
    "stock": 15,
    "description": "保暖舒適…",
    "is_active": false,
    "image": null
  },
  {
    "id": 1,
    "category_id": 1,
    "category_name": "服飾",
    "name": "純棉素色 T 恤",
    "price": 399,
    "stock": 28,
    "description": "100% 純棉，透氣舒適…",
    "is_active": true,
    "image": null
  }
]
```

#### 6.4.2 取得商品詳情（管理端）

```
GET /admin/products/:id
```

**Response `200`**：回傳單筆商品詳細結構（同 6.4.1 單筆物件）。

**錯誤 `404`**：`message`: `找不到商品`

#### 6.4.3 新增商品（含初始進貨 Log）

```
POST /admin/products
```

**Request Body**

```json
{
  "category_id": 1,
  "name": "工裝多口袋寬褲",
  "price": 790,
  "stock": 20,
  "description": "耐磨布料，多口袋設計",
  "is_active": true
}
```

**後端必須在同一 Transaction 內完成**

1. 檢查並驗證 `category_id` 是否有效。
2. 寫入 `products` 資料表。
3. 若 `stock > 0`，必須同時寫入 `inventory_logs`（`change_type = 'purchase'`，`change_quantity = stock`）。

**Response `201`**：回傳新增的完整商品物件。

#### 6.4.4 編輯商品

```
PUT /admin/products/:id
```

**Request Body**

```json
{
  "category_id": 1,
  "name": "工裝多口袋寬褲-升級版",
  "price": 850,
  "stock": 18,
  "description": "耐磨防潑水布料",
  "is_active": true
}
```

**Response `200`**：回傳更新後的完整商品物件。

#### 6.4.5 切換商品上/下架狀態

```
PATCH /admin/products/:id/toggle
```

**Response `200`**：回傳更新狀態後的完整商品物件（`is_active` 值會反轉）。

#### 6.4.6 刪除商品

```
DELETE /admin/products/:id
```

**Response `204`**：無內容（No Content）

**錯誤範例 `400`**：若商品已產生過訂單明細，拒絕刪除（防關聯資料遺失）。

```json
{
  "error": {
    "code": "PRODUCT_HAS_ORDERS",
    "message": "此商品已有訂單紀錄，無法刪除"
  }
}
```

---

### 6.5 訂單管理 API

#### 6.5.1 取得訂單列表（管理端）

```
GET /admin/orders
```

**Query Parameters**

| 參數 | 類型 | 說明 |
|------|------|------|
| `search` | string | 模糊搜尋訂單 ID、會員姓名、會員 Email |
| `paymentStatus` | string | 篩選付款狀態 (`unpaid` \| `paid` \| `failed`) |
| `orderStatus` | string | 篩選訂單狀態 (`processing` \| `shipped` \| `completed`) |

**Response `200`**

```json
[
  {
    "id": 15,
    "member_id": 1,
    "member_name": "王小明",
    "member_email": "user@example.com",
    "total_amount": 1097,
    "payment_status": "unpaid",
    "order_status": "processing",
    "shipping_phone": "0912345678",
    "shipping_address": "高雄市燕巢區深中路 58 號",
    "created_at": "2026-05-17T14:30:00.000Z"
  }
]
```

#### 6.5.2 取得訂單詳情（管理端）

```
GET /admin/orders/:id
```

**Response `200`**

```json
{
  "id": 15,
  "member_id": 1,
  "member_name": "王小明",
  "member_email": "user@example.com",
  "total_amount": 1097,
  "payment_status": "unpaid",
  "order_status": "processing",
  "shipping_phone": "0912345678",
  "shipping_address": "高雄市燕巢區深中路 58 號",
  "created_at": "2026-05-17T14:30:00.000Z",
  "member": {
    "id": 1,
    "name": "王小明",
    "email": "user@example.com",
    "phone": "0912345678",
    "address": "高雄市燕巢區深中路 58 號"
  },
  "items": [
    {
      "product_id": 1,
      "product_name": "純棉素色 T 恤",
      "quantity": 2,
      "unit_price": 399,
      "subtotal": 798
    }
  ]
}
```

#### 6.5.3 更新訂單狀態

```
PATCH /admin/orders/:id
```

**Request Body**

```json
{
  "payment_status": "paid",
  "order_status": "shipped"
}
```

* 欄位皆為選填。若僅需變更其中一項狀態，只傳送該欄位即可。

**Response `200`**：更新後的訂單詳情物件（同 6.5.2 結構）。

---

### 6.6 庫存管理 API

#### 6.6.1 取得庫存總覽（管理端）

```
GET /admin/inventory
```

**Response `200`**

```json
[
  {
    "id": 1,
    "category_id": 1,
    "category_name": "服飾",
    "name": "純棉素色 T 恤",
    "price": 399,
    "stock": 28,
    "is_active": true,
    "image": null,
    "last_change_at": "2026-05-17T14:30:00.000Z"
  }
]
```

* `last_change_at` 表示該商品最近一次在 `inventory_logs` 產生的時間（可經由 `LEFT JOIN` 的 `MAX(created_at)` 取得）。

#### 6.6.2 取得庫存異動紀錄

```
GET /admin/inventory/logs
```

**Query Parameters**

| 參數 | 類型 | 說明 |
|------|------|------|
| `productId` | number | 篩選特定商品的異動紀錄 |
| `changeType` | string | 篩選變動類型 (`purchase`進貨 \| `order_deduct`扣庫存 \| `cancel_return`退回) |

**Response `200`**

```json
[
  {
    "id": 4,
    "product_id": 1,
    "product_name": "純棉素色 T 恤",
    "category_name": "服飾",
    "change_quantity": -2,
    "change_type": "order_deduct",
    "created_at": "2026-05-17T14:30:00.000Z"
  },
  {
    "id": 1,
    "product_id": 1,
    "product_name": "純棉素色 T 恤",
    "category_name": "服飾",
    "change_quantity": 30,
    "change_type": "purchase",
    "created_at": "2026-05-17T06:00:00.000Z"
  }
]
```

#### 6.6.3 進貨（增加庫存）

```
POST /admin/inventory/purchase
```

**Request Body**

```json
{
  "product_id": 1,
  "quantity": 50
}
```

**後端必須在同一 Transaction 內完成**

1. 鎖定並驗證商品存在。
2. 檢查 `quantity` 是否為大於 0 的正整數。
3. 增加該商品的庫存：`products.stock = products.stock + quantity`。
4. 寫入 `inventory_logs`（`change_type = 'purchase'`，`change_quantity = quantity`）。

**Response `200`**：回傳進貨更新後之商品詳細物件。

**錯誤範例 `400`**

```json
{
  "error": {
    "code": "INVALID_QUANTITY",
    "message": "進貨數量必須大於 0"
  }
}
```

---

### 6.7 報表分析 API

#### 6.7.1 分類銷售總額統計

```
GET /admin/reports/sales-by-category
```

* 僅加總**已付款 (`payment_status = 'paid'`)** 訂單中各分類商品的累計銷售總額。

**Response `200`**

```json
[
  {
    "category_id": 1,
    "category_name": "服飾",
    "total": 5980
  },
  {
    "category_id": 2,
    "category_name": "3C 配件",
    "total": 1240
  }
]
```

* 資料集依銷售額 `total` 降序排列。

#### 6.7.2 熱銷商品排行

```
GET /admin/reports/top-products
```

* 僅加總**已付款 (`payment_status = 'paid'`)** 訂單中商品的銷售數量與營收。

**Query Parameters**

| 參數 | 類型 | 說明 |
|------|------|------|
| `limit` | number | 限定回傳筆數，預設為 10 |

**Response `200`**

```json
[
  {
    "product_id": 1,
    "product_name": "純棉素色 T 恤",
    "quantity": 15,
    "revenue": 5985
  }
]
```

* 資料集依銷售營收 `revenue` 降序排列。

---

## 7. 前端對接檢查清單

後端完成後，請提供前端組員：

- [ ] 實際 Base URL 與埠號
- [ ] 是否使用 JWT？Token 放在 Header 還是 Cookie？
- [ ] 錯誤回應是否含 `error.message` 字串
- [ ] `POST /orders` 是否已實作 Transaction（防超賣）
- [ ] 訂單回應是否包含 `items[]` 及 `product_name`
- [ ] 商品列表是否回傳 `category_name`
- [ ] 測試帳號（建議：`demo@example.com` / `demo1234`）

前端修改步驟：

1. 設定 `frontend/.env` 的 `VITE_API_URL`
2. 改寫 `frontend/src/services/api.js` 各函式為 `fetch`
3. 登入後將 `token` 存 localStorage，之後請求帶 `Authorization`
4. 將 `createOrder` 請求 body 改為 snake_case（`product_id` 等）

---

## 8. 建議的 SQL 關聯（供後端驗證）

```sql
-- 訂單明細還原（計畫書核心查詢之一）
SELECT
  o.order_id,
  m.name AS member_name,
  p.name AS product_name,
  od.unit_price,
  od.quantity,
  od.subtotal
FROM orders o
JOIN members m ON o.member_id = m.member_id
JOIN order_details od ON o.order_id = od.order_id
JOIN products p ON od.product_id = p.product_id
WHERE o.order_id = ?;
```

---

## 9. 版本紀錄

| 版本 | 日期 | 說明 |
|------|------|------|
| v1.0 | 2026-05-17 | 初版：會員端 9 支 API + 管理端預留 |

---

如有欄位命名或路徑調整，請在實作前與前端組同步，避免完成後大規模修改 `api.js`。
