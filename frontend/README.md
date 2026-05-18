# 電商訂單與庫存管理 — 會員端前端

React + Vite 實作的會員購物前台 UI。目前使用 **Mock API + localStorage** 模擬資料，待後端 MySQL API 完成後只需替換 `src/services/api.js`。

## 啟動

```bash
cd frontend
npm install
npm run dev
```

瀏覽器開啟 http://localhost:5173

## 示範帳號

- 電子郵件：`demo@example.com`
- 密碼：`demo1234`

## 頁面路由

### 會員商城

| 路徑 | 說明 | 需登入 |
|------|------|--------|
| `/products` | 商品列表 | 否 |
| `/products/:id` | 商品詳情 | 否 |
| `/login` | 登入 | 否 |
| `/register` | 註冊 | 否 |
| `/cart` | 購物車 | 是 |
| `/checkout` | 結帳 | 是 |
| `/orders` | 我的訂單 | 是 |
| `/orders/:id` | 訂單詳情 | 是 |

### 管理後台

| 路徑 | 說明 |
|------|------|
| `/admin/login` | 管理員登入 |
| `/admin/dashboard` | 儀表板 |
| `/admin/products` | 商品列表 |
| `/admin/products/new` | 新增商品 |
| `/admin/products/:id/edit` | 編輯商品 |
| `/admin/categories` | 分類管理 |
| `/admin/orders` | 訂單列表 |
| `/admin/orders/:id` | 訂單詳情／狀態更新 |
| `/admin/inventory` | 庫存總覽／進貨 |
| `/admin/inventory/logs` | 庫存異動紀錄 |
| `/admin/reports` | 報表分析 |

**管理員示範帳號**：`admin@example.com` / `admin1234`

## 對接後端

完整 API 規格見專案根目錄：**[../API契約.md](../API契約.md)**（請交給後端組員）

1. 複製 `.env.example` 為 `.env`，設定 `VITE_API_URL`
2. 修改 `src/services/api.js`，將各函式改為 `fetch(`${BASE_URL}/...`)`
3. 回應 JSON 欄位建議與 mock 一致（snake_case）：`member_id`, `payment_status`, `order_status` 等

## 專案結構

```
src/
  components/   # UI 元件與版面
  context/      # 登入、購物車、Toast
  pages/        # 各頁面
  services/     # API 層（對接點）
  data/         # Mock 示範資料
```
