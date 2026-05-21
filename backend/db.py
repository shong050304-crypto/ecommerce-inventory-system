"""
db.py — MySQL 資料庫連線模組
=============================
提供連線池管理、通用查詢封裝與預存程序呼叫。
所有與 MySQL 的互動都透過此模組進行。
"""

import os
import mysql.connector
from mysql.connector import pooling, Error as MySQLError

# ---------------------------------------------------------------------------
# 連線池初始化
# ---------------------------------------------------------------------------
_pool = None


def _get_pool():
    """取得或建立連線池（Lazy Initialization）。"""
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="ecommerce_pool",
            pool_size=10,
            pool_reset_session=True,
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "ecommerce_db"),
            charset="utf8mb4",
            collation="utf8mb4_unicode_ci",
            autocommit=False,
        )
    return _pool


def get_connection():
    """從連線池取得一個資料庫連線。"""
    return _get_pool().get_connection()


# ---------------------------------------------------------------------------
# 通用查詢封裝
# ---------------------------------------------------------------------------
def query_all(sql, params=None):
    """
    執行 SELECT 查詢，回傳所有結果列（list of dict）。

    用法:
        rows = query_all("SELECT * FROM PRODUCTS WHERE is_active = %s", (True,))
    """
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params or ())
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()


def query_one(sql, params=None):
    """
    執行 SELECT 查詢，回傳第一筆結果（dict）或 None。

    用法:
        member = query_one("SELECT * FROM MEMBERS WHERE email = %s", (email,))
    """
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params or ())
        row = cursor.fetchone()
        cursor.close()
        return row
    finally:
        conn.close()


def execute(sql, params=None):
    """
    執行 INSERT / UPDATE / DELETE，自動 commit，回傳 lastrowid。

    用法:
        new_id = execute("INSERT INTO MEMBERS (...) VALUES (%s, ...)", (val,))
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params or ())
        conn.commit()
        last_id = cursor.lastrowid
        cursor.close()
        return last_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def call_procedure(name, args=()):
    """
    呼叫預存程序，回傳 OUT 參數的結果。

    用法:
        result = call_procedure("sp_restock_product", (product_id, qty, ""))
        # result[-1] 為 OUT 參數 p_result_message
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        result = cursor.callproc(name, args)
        conn.commit()
        cursor.close()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def test_connection():
    """測試資料庫連線是否正常。啟動時呼叫。"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return True
    except MySQLError as e:
        print(f"[DB] 連線失敗: {e}")
        return False
