import os
import sys
import pytest
from dotenv import load_dotenv

# 1. 載入 backend/.env 檔案
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_dir, ".env"))

# 2. 將 backend 目錄加入 sys.path 以便 import db 與 app
sys.path.append(backend_dir)

import db

def clean_database():
    """執行特徵標記的 SQL 清除，徹底移除測試產生的髒資料。
    由於外鍵約束限制，必須按照嚴格的逆向順序刪除。
    """
    print("\n[Cleanup] 開始清理測試資料...")
    conn = db.get_connection()
    try:
        # 使用 dictionary=True 確保與 db.py 取得的連線模式一致
        cursor = conn.cursor(dictionary=True)
        
        # 1. 查出測試會員的 IDs
        cursor.execute("SELECT member_id FROM MEMBERS WHERE email LIKE 'test_%'")
        member_ids = [r['member_id'] for r in cursor.fetchall()]
        
        # 2. 查出測試商品的 IDs
        cursor.execute("SELECT product_id FROM PRODUCTS WHERE name LIKE '[測試專用]%'")
        product_ids = [r['product_id'] for r in cursor.fetchall()]
        
        if member_ids:
            # 查出這些會員的所有訂單 IDs
            member_ids_str = ",".join(map(str, member_ids))
            cursor.execute(f"SELECT order_id FROM ORDERS WHERE member_id IN ({member_ids_str})")
            order_ids = [r['order_id'] for r in cursor.fetchall()]
        else:
            order_ids = []

        # 3. 刪除相關的庫存日誌 (INVENTORY_LOGS)
        # 只要是與測試商品關聯，或是測試訂單明細對應的商品，一律刪除其日誌
        all_pids = set(product_ids)
        if order_ids:
            order_ids_str = ",".join(map(str, order_ids))
            cursor.execute(f"SELECT DISTINCT product_id FROM ORDER_DETAILS WHERE order_id IN ({order_ids_str})")
            detail_pids = [r['product_id'] for r in cursor.fetchall()]
            all_pids.update(detail_pids)
            
        if all_pids:
            pids_str = ",".join(map(str, all_pids))
            cursor.execute(f"DELETE FROM INVENTORY_LOGS WHERE product_id IN ({pids_str})")

        # 4. 刪除訂單明細 (ORDER_DETAILS)
        if order_ids:
            order_ids_str = ",".join(map(str, order_ids))
            cursor.execute(f"DELETE FROM ORDER_DETAILS WHERE order_id IN ({order_ids_str})")
            
        # 5. 刪除訂單 (ORDERS)
        if member_ids:
            member_ids_str = ",".join(map(str, member_ids))
            cursor.execute(f"DELETE FROM ORDERS WHERE member_id IN ({member_ids_str})")
            
        # 6. 刪除會員 (MEMBERS)
        cursor.execute("DELETE FROM MEMBERS WHERE email LIKE 'test_%'")
        
        # 7. 刪除商品 (PRODUCTS)
        cursor.execute("DELETE FROM PRODUCTS WHERE name LIKE '[測試專用]%'")
        
        conn.commit()
        cursor.close()
        print("[Cleanup] 測試資料清理完成，資料庫已復原。")
    except Exception as e:
        conn.rollback()
        print(f"[Cleanup 錯誤] 清理失敗: {e}")
    finally:
        conn.close()

@pytest.fixture(scope="session", autouse=True)
def db_session_cleanup():
    """全域自動 Fixture：在整個測試 Session 開始前與結束後，自動執行資料庫清理。"""
    # 測試前先清理一次，防止上次遺留
    clean_database()
    
    yield
    
    # 測試完後再清理一次
    clean_database()
