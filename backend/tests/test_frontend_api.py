import pytest
import json
import app  # 引入 Flask 後端

@pytest.fixture
def client():
    """建立 Flask 測試用戶端 (Flask Test Client)。"""
    app.app.config["TESTING"] = True
    with app.app.test_client() as client:
        yield client

def test_get_categories_api(client):
    """測試「商品分類列表」API 是否能正常取得數據，且格式符合預期。"""
    response = client.get("/api/categories")
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert isinstance(data, list)
    if len(data) > 0:
        assert "id" in data[0]
        assert "name" in data[0]
        assert "description" in data[0]

def test_get_products_api(client):
    """測試「商品列表」API 是否正常工作。"""
    response = client.get("/api/products")
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert isinstance(data, list)
    if len(data) > 0:
        assert "id" in data[0]
        assert "name" in data[0]
        assert "price" in data[0]
        assert "stock" in data[0]
        assert "category_name" in data[0]

def test_get_nonexistent_product_api(client):
    """測試查詢「不存在的商品」是否能正確回傳 404 與錯誤代碼。"""
    response = client.get("/api/products/99999")
    assert response.status_code == 404
    
    data = json.loads(response.data)
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"

def test_unauthorized_orders_access(client):
    """測試「未攜帶 Token」存取訂單 API 時，是否會被安全阻擋並回傳 401。"""
    # 1. 查詢訂單列表
    response = client.get("/api/orders")
    assert response.status_code == 401
    data = json.loads(response.data)
    assert data["error"]["code"] == "UNAUTHORIZED"
    
    # 2. 建立新訂單
    response = client.post("/api/orders", json={
        "items": [{"product_id": 1, "quantity": 1}],
        "shipping_phone": "0912345678",
        "shipping_address": "高雄市燕巢區"
    })
    assert response.status_code == 401

def test_admin_api_permission_control(client):
    """測試管理端 API 的權限管控是否落實。"""
    # 1. 未帶 Token 存取儀表板 API ➔ 應回傳 401
    response = client.get("/api/admin/dashboard/stats")
    assert response.status_code == 401
    
    # 2. 攜帶「一般會員」Token 存取管理端 API ➔ 應回傳 401（因為 require_admin 檢查 role != 'admin' 會阻擋）
    member_token = app._create_token({"id": 1, "role": "member"})
    headers = {"Authorization": f"Bearer {member_token}"}
    
    response = client.get("/api/admin/dashboard/stats", headers=headers)
    assert response.status_code == 401


def test_inventory_adjustment(client):
    """測試管理端庫存調整 API。"""
    import db
    
    # 1. 取得一個現有的商品 ID
    product = db.query_one("SELECT product_id, stock_quantity FROM PRODUCTS LIMIT 1")
    assert product is not None, "資料庫中必須至少有一個商品"
    pid = product["product_id"]
    initial_stock = product["stock_quantity"]

    # 2. 建立 admin 驗證 Header
    admin_token = app._create_token({"id": 1, "role": "admin"})
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. 測試庫存調增 (例如增加 5 件)
    adjust_up_resp = client.post("/api/admin/inventory/adjust", json={
        "product_id": pid,
        "quantity": 5
    }, headers=headers)
    assert adjust_up_resp.status_code == 200
    res_up = json.loads(adjust_up_resp.data)
    assert res_up["stock"] == initial_stock + 5

    # 4. 測試庫存調減 (例如減少 3 件)
    adjust_down_resp = client.post("/api/admin/inventory/adjust", json={
        "product_id": pid,
        "quantity": -3
    }, headers=headers)
    assert adjust_down_resp.status_code == 200
    res_down = json.loads(adjust_down_resp.data)
    assert res_down["stock"] == initial_stock + 2

    # 5. 測試庫存調減至負數 (應報錯並且庫存不變)
    huge_decrease = -(initial_stock + 2 + 100)
    adjust_fail_resp = client.post("/api/admin/inventory/adjust", json={
        "product_id": pid,
        "quantity": huge_decrease
    }, headers=headers)
    assert adjust_fail_resp.status_code == 400
    res_fail = json.loads(adjust_fail_resp.data)
    assert res_fail["error"]["code"] == "INVALID_QUANTITY"

    # 6. 驗證最終庫存依然為 initial_stock + 2
    final_prod = db.query_one("SELECT stock_quantity FROM PRODUCTS WHERE product_id = %s", (pid,))
    assert final_prod["stock_quantity"] == initial_stock + 2

    # 7. 驗證庫存日誌中是否有記錄
    log = db.query_one(
        "SELECT change_quantity, change_type FROM INVENTORY_LOGS WHERE product_id = %s ORDER BY log_id DESC LIMIT 1",
        (pid,)
    )
    # 最後一筆應該是我們調減 3 件的紀錄
    assert log["change_quantity"] == -3
    assert log["change_type"] == "庫存調整"

