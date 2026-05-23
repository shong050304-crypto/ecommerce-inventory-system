import pytest
import time
import jwt
import app  # 引入 Flask 後端 app.py

def test_password_hashing():
    """測試密碼雜湊與驗證邏輯是否正常。"""
    raw_password = "secure_test_password123"
    hashed = app._hash_password(raw_password)
    
    # 1. 確保雜湊後的密碼不是明文
    assert hashed != raw_password
    assert len(hashed) > 20
    
    # 2. 驗證正確密碼
    assert app._check_password(raw_password, hashed) is True
    
    # 3. 驗證錯誤密碼
    assert app._check_password("wrong_password", hashed) is False

def test_jwt_token_lifecycle():
    """測試 JWT Token 的簽發、內容解碼與時效驗證。"""
    payload = {"id": 999, "role": "member", "name": "測試人員"}
    
    # 1. 簽發 Token
    token = app._create_token(payload, expires_hours=1)
    assert isinstance(token, str)
    assert len(token) > 20
    
    # 2. 解碼驗證
    decoded = app._decode_token(token)
    assert decoded is not None
    assert decoded["id"] == 999
    assert decoded["role"] == "member"
    assert decoded["name"] == "測試人員"

def test_expired_jwt_token():
    """測試當 Token 過期時，解碼器是否能正確捕捉並回傳 None。"""
    payload = {"id": 999, "role": "member"}
    
    # 為了測試過期，我們手動將過期時間 (exp) 設定為過去的時間
    expired_payload = payload.copy()
    expired_payload["exp"] = int(time.time()) - 3600  # 設為一小時前過期
    
    # 手動簽發過期 Token
    expired_token = jwt.encode(expired_payload, app.JWT_SECRET, algorithm=app.JWT_ALGORITHM)
    
    # 驗證解碼結果應為 None
    assert app._decode_token(expired_token) is None
