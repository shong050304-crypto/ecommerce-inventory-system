import pytest
import json
import concurrent.futures
import db
import app  # 引入 Flask 後端

@pytest.fixture
def client():
    """建立 Flask 測試用戶端。"""
    app.app.config["TESTING"] = True
    with app.app.test_client() as client:
        yield client

@pytest.fixture
def test_product():
    """在資料庫中建立一個 [測試專用] 的商品，回傳其 ID 與分類 ID。"""
    # 1. 取得現有的第一個分類 ID
    cat = db.query_one("SELECT category_id FROM CATEGORIES LIMIT 1")
    assert cat is not None, "資料庫中必須至少有一個分類"
    cat_id = cat["category_id"]
    
    # 2. 插入測試商品，初始庫存設為 10
    product_id = db.execute(
        """INSERT INTO PRODUCTS (category_id, name, price, stock_quantity, description, is_active)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (cat_id, "[測試專用]自動化測試睡袋", 1000.00, 0, "用於單元測試與功能測試", True)
    )
    
    # 3. 寫入初始進貨日誌
    db.execute(
        """INSERT INTO INVENTORY_LOGS (product_id, change_quantity, change_type)
           VALUES (%s, %s, %s)""",
        (product_id, 10, "進貨")
    )
    
    yield {"product_id": product_id, "category_id": cat_id}

# ===================================================================
# 故事一：新會員的完整購物下單流程
# ===================================================================
def test_new_member_shopping_flow(client, test_product):
    pid = test_product["product_id"]
    
    # 1. 註冊新測試帳號
    reg_data = {
        "name": "測試買家",
        "email": "test_buyer_01@example.com",
        "password": "buyerpassword123",
        "phone": "test_phone_001",  # 加上 test_ 作為唯一限制與防衝突
        "address": "高雄市燕巢區深中路58號"
    }
    reg_resp = client.post("/api/auth/register", json=reg_data)
    assert reg_resp.status_code == 201
    
    reg_res = json.loads(reg_resp.data)
    assert "token" in reg_res
    token = reg_res["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. 前台查詢商品，確認此商品存在且庫存為 10
    prod_resp = client.get(f"/api/products/{pid}")
    assert prod_resp.status_code == 200
    prod_res = json.loads(prod_resp.data)
    assert prod_res["stock"] == 10
    
    # 3. 下單購買 2 件
    order_data = {
        "items": [{"product_id": pid, "quantity": 2}],
        "shipping_phone": "0912345678",
        "shipping_address": "高雄市燕巢區深中路58號"
    }
    order_resp = client.post("/api/orders", json=order_data, headers=headers)
    assert order_resp.status_code == 201
    
    order_res = json.loads(order_resp.data)
    order_id = order_res["id"]
    assert order_res["payment_status"] == "unpaid"
    
    # 4. 驗證資料庫庫存是否已自動扣減至 8
    prod_after = db.query_one("SELECT stock_quantity FROM PRODUCTS WHERE product_id = %s", (pid,))
    assert prod_after["stock_quantity"] == 8
    
    # 5. 驗證庫存日誌是否自動新增了一筆 -2 記錄
    log = db.query_one(
        "SELECT change_quantity, change_type FROM INVENTORY_LOGS WHERE product_id = %s ORDER BY log_id DESC LIMIT 1",
        (pid,)
    )
    assert log["change_quantity"] == -2
    assert log["change_type"] == "訂單扣減"
    
    # 6. 模擬付款
    pay_resp = client.post(f"/api/orders/{order_id}/pay", headers=headers)
    assert pay_resp.status_code == 200
    pay_res = json.loads(pay_resp.data)
    assert pay_res["payment_status"] == "paid"  # 付款狀態應更新為 paid

# ===================================================================
# 故事二：高併發搶購與防超賣測試
# ===================================================================
def test_concurrency_anti_overselling(client):
    """測試高併發下搶購僅剩 1 件庫存的商品，驗證防超賣機制。"""
    # 1. 建立一個只有 1 件庫存的熱門測試商品
    cat = db.query_one("SELECT category_id FROM CATEGORIES LIMIT 1")
    cat_id = cat["category_id"]
    
    pid = db.execute(
        """INSERT INTO PRODUCTS (category_id, name, price, stock_quantity, description, is_active)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (cat_id, "[測試專用]限量秒殺商品", 99.00, 0, "限量搶購商品", True)
    )
    db.execute(
        "INSERT INTO INVENTORY_LOGS (product_id, change_quantity, change_type) VALUES (%s, 1, '進貨')",
        (pid,)
    )
    
    # 2. 建立兩個不同的測試買家並取得各自的 JWT Token
    tokens = []
    for i in range(2):
        reg_resp = client.post("/api/auth/register", json={
            "name": f"搶購者{i}",
            "email": f"test_buyer_concurrent_{i}@example.com",
            "password": "concurrentpass123",
            "phone": f"test_con_{i}",
            "address": "搶購測試地址"
        })
        tokens.append(json.loads(reg_resp.data)["token"])
        
    # 3. 定義下單任務函數
    def submit_order(token):
        # 因為 client 不是執行緒安全的，我們在執行緒內部直接使用 Flask 測試用戶端發送
        with app.app.test_client() as thr_client:
            headers = {"Authorization": f"Bearer {token}"}
            return thr_client.post("/api/orders", json={
                "items": [{"product_id": pid, "quantity": 1}],
                "shipping_phone": "0911222333",
                "shipping_address": "搶購測試地址"
            }, headers=headers)

    # 4. 使用 ThreadPoolExecutor 同時啟動 2 個執行緒發送下單請求
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(submit_order, tk) for tk in tokens]
        results = [fut.result() for fut in concurrent.futures.as_completed(futures)]
        
    # 5. 驗證結果：必須且只能有 1 個成功 (201 Created)，另一個失敗 (400 Bad Request)
    status_codes = [r.status_code for r in results]
    assert 201 in status_codes
    assert 400 in status_codes
    
    # 6. 驗證資料庫最終庫存是否為 0，且絕不可為負數
    final_prod = db.query_one("SELECT stock_quantity FROM PRODUCTS WHERE product_id = %s", (pid,))
    assert final_prod["stock_quantity"] == 0
