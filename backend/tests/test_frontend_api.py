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
