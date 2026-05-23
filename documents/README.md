# 電商訂單與庫存管理系統 — 系統使用說明書 (README.md)

本說明書旨在引導開發者、系統管理員以及期末專題審查人員，快速了解「電商訂單與庫存管理系統」的目錄結構、資料庫初始化、後端 API 伺服器建置、前端 React 介面啟動以及系統整合測試之步驟。

---

## 📂 專案目錄結構

本專案採前後端分離架構，結構如下：

* **`sql/`**：包含所有資料庫建置、測試資料導入、查詢及觸發器/預存程序腳本。
* **`backend/`**：Python Flask 後端主程式與資料庫連接模組。
* **`frontend/`**：基於 React + Vite 建構的現代化前端網頁。
* **`documents/`**：本期末專題的相關規劃與串接指南文件。
  * `資料庫計劃書.pdf`：資料庫的 ERD、Schema 圖與正規化設計。
  * `系統架構與實作說明.md`：系統實體（6 個）、關聯度及商業邏輯說明。
  * `UI設計規格.md`：前端視圖、版面規劃與元件細節。
  * `API契約.md`：所有對外端點的請求體與回應體 JSON 規格。
  * `前端與後端嫁接實作指南.md`：前後端串接的 JWT 傳遞、狀態映射與 CORS 整合說明。
  * `系統更新日誌_v1.0.0.md`：本系統各版本修復與架構重構的詳細歷史紀錄。
  * `README.md`：（本檔案）系統使用說明書。

---

## 🛠️ 第一步：資料庫安裝與初始化 (MySQL)

請依序執行 `sql/` 資料夾下的 SQL 腳本以建立資料庫、表格、測試資料與核心預存機制：

### 1. 執行順序
請使用 MySQL Workbench、命令列或任何 MySQL 管理軟體，**按順序**執行以下腳本：

1. **[01_create_database.sql](file:///c:/NKNU/Sophomore%20second%20semester/Database/Assignment/期末資料庫設計專題報告/電商訂單與庫存管理系統/sql/01_create_database.sql)**：建立 `ecommerce_db` 資料庫。
2. **[02_create_tables.sql](file:///c:/NKNU/Sophomore%20second%20semester/Database/Assignment/期末資料庫設計專題報告/電商訂單與庫存管理系統/sql/02_create_tables.sql)**：建立 6 張核心資料表。
3. **[03_insert_test_data.sql](file:///c:/NKNU/Sophomore%20second%20semester/Database/Assignment/期末資料庫設計專題報告/電商訂單與庫存管理系統/sql/03_insert_test_data.sql)**：匯入基礎測試資料（包含會員、分類、商品與歷史訂單）。
4. **[04_queries.sql](file:///c:/NKNU/Sophomore%20second%20semester/Database/Assignment/期末資料庫設計專題報告/電商訂單與庫存管理系統/sql/04_queries.sql)**：執行專案規劃的 8 大常用 SQL 查詢（如銷售排行、低庫存警示）。
5. **[05_triggers_and_procedures.sql](file:///c:/NKNU/Sophomore%20second%20semester/Database/Assignment/期末資料庫設計專題報告/電商訂單與庫存管理系統/sql/05_triggers_and_procedures.sql)**：建立資料庫的核心觸發器（自動更新總金額、自動增減庫存）與預存程序（下單事務處理 `sp_create_order`、進貨 `sp_restock_product`）。
6. **[06_verification.sql](file:///c:/NKNU/Sophomore%20second%20semester/Database/Assignment/期末資料庫設計專題報告/電商訂單與庫存管理系統/sql/06_verification.sql)**：驗證觸發器及約束條件是否工作正常。

> [!IMPORTANT]
> **庫存自動異動機制**：
> 本系統採用「單一入口更新庫存」之資料庫設計。所有庫存的增減一律藉由寫入 `INVENTORY_LOGS` 表格，來激發 `trg_after_inventory_log_insert` 觸發器自動異動 `PRODUCTS` 中的 `stock_quantity`。因此在預存程序或後端程式中，**無須**手動執行 `UPDATE PRODUCTS`，以避免庫存雙重加減 (Double-counting)。

---

## 🐍 第二步：後端環境架設與啟動 (Flask)

後端基於 Python Flask 提供 RESTful API，並使用 JWT 處理身分驗證。

### 1. 建立虛擬環境與安裝相依套件
進入 `backend/` 目錄，初始化虛擬環境並安裝所需套件：
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows 啟動虛擬環境 (macOS/Linux 請使用: source venv/bin/activate)
pip install -r requirements.txt
```

### 2. 設定環境變數 (.env)
在 `backend/` 下建立 `.env` 檔案，可複製 `.env.example` 並依您的 MySQL 連線設定調整：
```env
PORT=3000
JWT_SECRET=dev_jwt_secret_key_2026

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=您的資料庫密碼
DB_NAME=ecommerce_db
```

### 3. 啟動伺服器

> [!IMPORTANT]
> **執行命令時的工作目錄 (CWD)**：
> 請確保您的命令列終端機目前已切換至 `backend/` 資料夾內（即執行過 `cd backend`）。如果您直接在專案的根目錄下執行 `python app.py`，會因為找不到檔案而噴錯。

在 `backend/` 目錄下且虛擬環境啟用狀態下，執行：
```bash
python app.py
```
伺服器將會啟動於 `http://localhost:3000`。後端 API 的基礎路徑為 `http://localhost:3000/api`。

---

## ⚛️ 第三步：前端環境架設與啟動 (React + Vite)

前端採用 React 框架及 Vite 開發建置工具。

### 1. 安裝套件
進入 `frontend/` 目錄並安裝 NPM 相依套件：
```bash
cd frontend
npm install
```

### 2. 設定前端環境變數 (.env)
在 `frontend/` 下建立 `.env` 檔案（或修改 `.env.local`），設定後端 API 的串接地址：
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. 啟動開發伺服器
執行以下指令啟動前端網頁：
```bash
npm run dev
```
瀏覽器將自動或手動開啟 `http://localhost:5173`。

---

## 🧪 第四步：自動化整合測試與驗證

為了確保資料庫的欄位增減（如 `shipping_phone` 與 `shipping_address`）及後端修正運行無誤，可執行驗證腳本：

1. 確保 MySQL 資料庫服務已啟動。
2. 確保後端 Flask 伺服器正在 Port 3000 運行。
3. 在 `backend/` 目錄下執行以下指令（需已激活虛擬環境）：
   ```bash
   python -m pip install requests  # 確保安裝 requests 測試相依套件
   python ../C:\Users\user\.gemini\antigravity-ide\brain\8264c7ad-5f08-477c-8915-1e315d2be715\scratch\test_api.py
   ```

若測試通過，將會在終端機看到包含 `[OK]` 的完整測試通過日誌（驗證包括會員註冊、下單包含送貨資訊、歷史訂單查詢帶回送貨資訊、管理員登入，以及商品庫存無重複計算之驗證）。

---

## 📖 開發與串接參考手冊

* **API 設計細節**：請參閱 [API契約.md](file:///c:/NKNU/Sophomore second semester/Database/Assignment/期末資料庫設計專題報告/電商訂單與庫存管理系統/documents/API契約.md)。
* **前端嫁接細節**：請參閱 [前端與後端嫁接實作指南.md](file:///c:/NKNU/Sophomore second semester/Database/Assignment/期末資料庫設計專題報告/電商訂單與庫存管理系統/documents/前端與後端嫁接實作指南.md)。裡面詳細說明了如何將 API 契約規格（如 `unpaid` 狀態）映射至資料庫中文狀態（如 `未付款`）。
* **UI 元件規劃**：請參閱 [UI設計規格.md](file:///c:/NKNU/Sophomore second semester/Database/Assignment/期末資料庫設計專題報告/電商訂單與庫存管理系統/documents/UI設計規格.md)。
* **系統更新與重構歷史**：請參閱 [系統更新日誌_v1.0.0.md](file:///c:/NKNU/Sophomore second semester/Database/Assignment/期末資料庫設計專題報告/電商訂單與庫存管理系統/documents/系統更新日誌_v1.0.0.md)。
