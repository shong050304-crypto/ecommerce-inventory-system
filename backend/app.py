"""
app.py — 電商訂單與庫存管理系統 Flask 後端主程式
=================================================
依據 API契約.md 實作完整的會員端 + 管理端 REST API。
"""

import os
import datetime
from decimal import Decimal
from functools import wraps

from dotenv import load_dotenv

# 載入 .env 檔案（必須在 import db 之前）
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import bcrypt

import db

# ===================================================================
# Flask 初始化
# ===================================================================
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])  # 允許前端開發伺服器的跨來源請求

JWT_SECRET = os.getenv("JWT_SECRET", "dev_jwt_secret_key_2026")
JWT_ALGORITHM = "HS256"

# 管理員帳號（寫在程式中，正式環境應存資料庫）
ADMIN_ACCOUNTS = {
    "admin@example.com": {
        "id": 0,
        "name": "系統管理員",
        "password": "admin1234",
    }
}

# ---------------------------------------------------------------------------
# 資料庫狀態值對照表
# API 契約使用英文，資料庫儲存中文
# ---------------------------------------------------------------------------
PAYMENT_STATUS_MAP = {"unpaid": "未付款", "paid": "已付款", "failed": "失敗"}
PAYMENT_STATUS_REVERSE = {v: k for k, v in PAYMENT_STATUS_MAP.items()}

ORDER_STATUS_MAP = {"processing": "處理中", "shipped": "已出貨", "completed": "已完成"}
ORDER_STATUS_REVERSE = {v: k for k, v in ORDER_STATUS_MAP.items()}

CHANGE_TYPE_MAP = {"purchase": "進貨", "order_deduct": "訂單扣減", "cancel_return": "取消退回"}
CHANGE_TYPE_REVERSE = {v: k for k, v in CHANGE_TYPE_MAP.items()}


# ===================================================================
# 工具函數
# ===================================================================

def _json_serial(obj):
    """JSON 序列化輔助：處理 Decimal 與 datetime。"""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def _clean_row(row):
    """將查詢結果中的 Decimal/datetime 轉為 JSON 相容格式。"""
    if row is None:
        return None
    cleaned = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            cleaned[k] = float(v)
        elif isinstance(v, (datetime.datetime, datetime.date)):
            cleaned[k] = v.isoformat()
        elif isinstance(v, bytes):
            cleaned[k] = v.decode("utf-8", errors="replace")
        else:
            cleaned[k] = v
    return cleaned


def _clean_rows(rows):
    """批次清理查詢結果列表。"""
    return [_clean_row(r) for r in rows]


def _error(code, message, status=400):
    """統一錯誤回應格式。"""
    return jsonify({"error": {"code": code, "message": message}}), status


def _hash_password(password):
    """使用 bcrypt 產生密碼雜湊值。"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check_password(password, hashed):
    """驗證密碼是否與雜湊值相符。支援 bcrypt 與舊版 SHA256。"""
    if hashed.startswith("$2"):
        # bcrypt 格式
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    else:
        # 舊版 SHA256 格式（相容測試資料）
        import hashlib
        return hashlib.sha256(password.encode("utf-8")).hexdigest() == hashed


def _create_token(payload, expires_hours=24):
    """建立 JWT Token。"""
    payload["exp"] = datetime.datetime.utcnow() + datetime.timedelta(hours=expires_hours)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token):
    """解碼 JWT Token，回傳 payload 或 None。"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ---------------------------------------------------------------------------
# 認證裝飾器
# ---------------------------------------------------------------------------

def require_member(f):
    """需要會員登入的 API 裝飾器。"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return _error("UNAUTHORIZED", "未登入或 Token 無效", 401)
        token = auth.split(" ", 1)[1]
        payload = _decode_token(token)
        if not payload or payload.get("role") != "member":
            return _error("UNAUTHORIZED", "未登入或 Token 無效", 401)
        request.member_id = payload["id"]
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    """需要管理員登入的 API 裝飾器。"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return _error("UNAUTHORIZED", "未登入或 Token 無效", 401)
        token = auth.split(" ", 1)[1]
        payload = _decode_token(token)
        if not payload or payload.get("role") != "admin":
            return _error("UNAUTHORIZED", "管理員帳號或密碼錯誤", 401)
        request.admin_id = payload["id"]
        return f(*args, **kwargs)
    return decorated


# ===================================================================
# 會員端 API
# ===================================================================

# -------------------------------------------------------------------
# 5.1 註冊
# -------------------------------------------------------------------
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()

    if not all([name, email, password, phone, address]):
        return _error("VALIDATION_ERROR", "所有欄位皆為必填")
    if len(password) < 6:
        return _error("VALIDATION_ERROR", "密碼長度須至少 6 個字元")

    # 檢查 email 是否已存在
    existing = db.query_one("SELECT member_id FROM MEMBERS WHERE email = %s", (email,))
    if existing:
        return _error("EMAIL_EXISTS", "此電子郵件已被註冊", 409)

    hashed = _hash_password(password)
    new_id = db.execute(
        """INSERT INTO MEMBERS (name, email, password_hash, phone, address)
           VALUES (%s, %s, %s, %s, %s)""",
        (name, email, hashed, phone, address),
    )

    user = _clean_row(db.query_one(
        "SELECT member_id AS id, name, email, phone, address, created_at FROM MEMBERS WHERE member_id = %s",
        (new_id,),
    ))
    token = _create_token({"id": new_id, "role": "member"})
    return jsonify({"token": token, "user": user}), 201


# -------------------------------------------------------------------
# 5.2 登入
# -------------------------------------------------------------------
@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    member = db.query_one(
        "SELECT member_id AS id, name, email, password_hash, phone, address, created_at FROM MEMBERS WHERE email = %s",
        (email,),
    )
    if not member or not _check_password(password, member["password_hash"]):
        return _error("INVALID_CREDENTIALS", "電子郵件或密碼錯誤", 401)

    token = _create_token({"id": member["id"], "role": "member"})
    user = _clean_row(member)
    user.pop("password_hash", None)
    return jsonify({"token": token, "user": user})


# -------------------------------------------------------------------
# 5.3 商品分類列表
# -------------------------------------------------------------------
@app.route("/api/categories", methods=["GET"])
def get_categories():
    rows = db.query_all("SELECT category_id AS id, name, description FROM CATEGORIES ORDER BY category_id")
    return jsonify(_clean_rows(rows))


# -------------------------------------------------------------------
# 5.4 商品列表（會員端：僅上架商品）
# -------------------------------------------------------------------
@app.route("/api/products", methods=["GET"])
def get_products():
    category_id = request.args.get("category_id")
    search = request.args.get("search", "").strip()
    sort = request.args.get("sort", "")

    sql = """
        SELECT p.product_id AS id, p.category_id, c.name AS category_name,
               p.name, p.price, p.stock_quantity AS stock, p.description,
               p.is_active, NULL AS image
        FROM PRODUCTS p
        JOIN CATEGORIES c ON p.category_id = c.category_id
        WHERE p.is_active = TRUE
    """
    params = []

    if category_id:
        sql += " AND p.category_id = %s"
        params.append(int(category_id))
    if search:
        sql += " AND p.name LIKE %s"
        params.append(f"%{search}%")

    if sort == "price_asc":
        sql += " ORDER BY p.price ASC"
    elif sort == "price_desc":
        sql += " ORDER BY p.price DESC"
    else:
        sql += " ORDER BY p.product_id DESC"

    rows = db.query_all(sql, tuple(params))
    result = _clean_rows(rows)
    for r in result:
        r["is_active"] = bool(r["is_active"])
    return jsonify(result)


# -------------------------------------------------------------------
# 5.5 商品詳情
# -------------------------------------------------------------------
@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product_detail(product_id):
    row = db.query_one(
        """SELECT p.product_id AS id, p.category_id, c.name AS category_name,
                  p.name, p.price, p.stock_quantity AS stock, p.description,
                  p.is_active, NULL AS image
           FROM PRODUCTS p
           JOIN CATEGORIES c ON p.category_id = c.category_id
           WHERE p.product_id = %s AND p.is_active = TRUE""",
        (product_id,),
    )
    if not row:
        return _error("NOT_FOUND", "找不到商品", 404)
    result = _clean_row(row)
    result["is_active"] = bool(result["is_active"])
    return jsonify(result)


# -------------------------------------------------------------------
# 5.6 建立訂單（核心 Transaction）+ 5.7 我的訂單列表
# Flask 不允許同一路徑註冊兩個不同函數，故合併為一個 dispatch
# -------------------------------------------------------------------
@app.route("/api/orders", methods=["GET", "POST"])
@require_member
def orders_dispatch():
    if request.method == "POST":
        return _create_order()
    else:
        return _get_member_orders()


def _create_order():
    data = request.get_json(silent=True) or {}
    items = data.get("items", [])
    shipping_phone = (data.get("shipping_phone") or "").strip()
    shipping_address = (data.get("shipping_address") or "").strip()

    if not items:
        return _error("VALIDATION_ERROR", "至少需要一筆商品")
    if not shipping_phone or not shipping_address:
        return _error("VALIDATION_ERROR", "送貨電話與地址為必填")

    member_id = request.member_id
    conn = db.get_connection()

    try:
        cursor = conn.cursor(dictionary=True)

        # 1. 鎖定並檢查所有商品庫存
        order_items = []
        total_amount = Decimal("0")

        for item in items:
            pid = item.get("product_id")
            qty = item.get("quantity", 0)
            if not pid or qty <= 0:
                conn.rollback()
                return _error("VALIDATION_ERROR", "商品 ID 與數量須為正整數")

            cursor.execute(
                """SELECT product_id, name, price, stock_quantity
                   FROM PRODUCTS
                   WHERE product_id = %s AND is_active = TRUE
                   FOR UPDATE""",
                (pid,),
            )
            product = cursor.fetchone()
            if not product:
                conn.rollback()
                return _error("NOT_FOUND", f"商品不存在或已下架 (ID: {pid})", 400)
            if product["stock_quantity"] < qty:
                conn.rollback()
                return _error(
                    "INSUFFICIENT_STOCK",
                    f"{product['name']} 庫存不足（剩餘 {product['stock_quantity']} 件）",
                )

            subtotal = product["price"] * qty
            total_amount += subtotal
            order_items.append({
                "product_id": product["product_id"],
                "product_name": product["name"],
                "quantity": qty,
                "unit_price": product["price"],
                "subtotal": subtotal,
            })

        # 2. 建立訂單
        cursor.execute(
            """INSERT INTO ORDERS (member_id, total_amount, payment_status, order_status)
               VALUES (%s, %s, %s, %s)""",
            (member_id, total_amount, "未付款", "處理中"),
        )
        order_id = cursor.lastrowid

        # 3. 寫入訂單明細 + 庫存異動
        for oi in order_items:
            cursor.execute(
                """INSERT INTO ORDER_DETAILS (order_id, product_id, quantity, unit_price, subtotal)
                   VALUES (%s, %s, %s, %s, %s)""",
                (order_id, oi["product_id"], oi["quantity"], oi["unit_price"], oi["subtotal"]),
            )
            # 寫入庫存異動（觸發器會自動扣減 PRODUCTS.stock_quantity）
            cursor.execute(
                """INSERT INTO INVENTORY_LOGS (product_id, change_quantity, change_type)
                   VALUES (%s, %s, %s)""",
                (oi["product_id"], -oi["quantity"], "訂單扣減"),
            )

        conn.commit()
        cursor.close()

        # 4. 回傳訂單資訊
        result = {
            "id": order_id,
            "member_id": member_id,
            "total_amount": float(total_amount),
            "payment_status": "unpaid",
            "order_status": "processing",
            "shipping_phone": shipping_phone,
            "shipping_address": shipping_address,
            "created_at": datetime.datetime.now().isoformat(),
            "items": [
                {
                    "product_id": oi["product_id"],
                    "product_name": oi["product_name"],
                    "quantity": oi["quantity"],
                    "unit_price": float(oi["unit_price"]),
                    "subtotal": float(oi["subtotal"]),
                }
                for oi in order_items
            ],
        }
        return jsonify(result), 201

    except Exception as e:
        conn.rollback()
        return _error("SERVER_ERROR", f"訂單建立失敗：{str(e)}", 500)
    finally:
        conn.close()


def _get_member_orders():
    member_id = request.member_id

    orders = _clean_rows(db.query_all(
        """SELECT order_id AS id, member_id, total_amount,
                  payment_status, order_status, created_at
           FROM ORDERS WHERE member_id = %s
           ORDER BY created_at DESC""",
        (member_id,),
    ))

    for order in orders:
        order["payment_status"] = PAYMENT_STATUS_REVERSE.get(order["payment_status"], order["payment_status"])
        order["order_status"] = ORDER_STATUS_REVERSE.get(order["order_status"], order["order_status"])

        items = _clean_rows(db.query_all(
            """SELECT od.product_id, p.name AS product_name,
                      od.quantity, od.unit_price, od.subtotal
               FROM ORDER_DETAILS od
               JOIN PRODUCTS p ON od.product_id = p.product_id
               WHERE od.order_id = %s""",
            (order["id"],),
        ))
        order["items"] = items

    return jsonify(orders)


# -------------------------------------------------------------------
# 5.8 訂單詳情
# -------------------------------------------------------------------
@app.route("/api/orders/<int:order_id>", methods=["GET"])
@require_member
def get_order_detail(order_id):
    member_id = request.member_id

    order = db.query_one(
        """SELECT order_id AS id, member_id, total_amount,
                  payment_status, order_status, created_at
           FROM ORDERS WHERE order_id = %s""",
        (order_id,),
    )
    if not order:
        return _error("NOT_FOUND", "找不到訂單", 404)
    if order["member_id"] != member_id:
        return _error("FORBIDDEN", "無權限查看此訂單", 403)

    order = _clean_row(order)
    order["payment_status"] = PAYMENT_STATUS_REVERSE.get(order["payment_status"], order["payment_status"])
    order["order_status"] = ORDER_STATUS_REVERSE.get(order["order_status"], order["order_status"])

    items = _clean_rows(db.query_all(
        """SELECT od.product_id, p.name AS product_name,
                  od.quantity, od.unit_price, od.subtotal
           FROM ORDER_DETAILS od
           JOIN PRODUCTS p ON od.product_id = p.product_id
           WHERE od.order_id = %s""",
        (order["id"],),
    ))
    order["items"] = items
    return jsonify(order)


# -------------------------------------------------------------------
# 5.9 模擬付款
# -------------------------------------------------------------------
@app.route("/api/orders/<int:order_id>/pay", methods=["POST"])
@require_member
def simulate_payment(order_id):
    member_id = request.member_id

    order = db.query_one(
        "SELECT order_id, member_id, payment_status FROM ORDERS WHERE order_id = %s",
        (order_id,),
    )
    if not order:
        return _error("NOT_FOUND", "找不到訂單", 404)
    if order["member_id"] != member_id:
        return _error("FORBIDDEN", "無權限操作此訂單", 403)
    if order["payment_status"] != "未付款":
        return _error("ALREADY_PAID", "訂單已付款", 400)

    db.execute(
        "UPDATE ORDERS SET payment_status = %s WHERE order_id = %s",
        ("已付款", order_id),
    )

    # 回傳更新後的訂單
    return get_order_detail(order_id)


# ===================================================================
# 管理端 API
# ===================================================================

# -------------------------------------------------------------------
# 6.1 管理員登入
# -------------------------------------------------------------------
@app.route("/api/admin/auth/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    admin = ADMIN_ACCOUNTS.get(email)
    if not admin or admin["password"] != password:
        return _error("INVALID_CREDENTIALS", "管理員帳號或密碼錯誤", 401)

    token = _create_token({"id": admin["id"], "role": "admin"})
    return jsonify({
        "token": token,
        "admin": {"id": admin["id"], "name": admin["name"], "email": email},
    })


# -------------------------------------------------------------------
# 6.2 儀表板數據
# -------------------------------------------------------------------
@app.route("/api/admin/dashboard/stats", methods=["GET"])
@require_admin
def dashboard_stats():
    today = datetime.date.today().isoformat()

    today_orders = db.query_one(
        "SELECT COUNT(*) AS cnt FROM ORDERS WHERE DATE(created_at) = %s", (today,)
    )
    processing = db.query_one(
        "SELECT COUNT(*) AS cnt FROM ORDERS WHERE order_status = %s", ("處理中",)
    )
    low_stock = db.query_one(
        "SELECT COUNT(*) AS cnt FROM PRODUCTS WHERE stock_quantity <= 5 AND is_active = TRUE"
    )
    monthly_rev = db.query_one(
        """SELECT COALESCE(SUM(total_amount), 0) AS total
           FROM ORDERS
           WHERE payment_status = %s
             AND YEAR(created_at) = YEAR(CURDATE())
             AND MONTH(created_at) = MONTH(CURDATE())""",
        ("已付款",),
    )

    recent = _clean_rows(db.query_all(
        """SELECT o.order_id AS id, o.member_id, m.name AS member_name,
                  m.email AS member_email, o.total_amount,
                  o.payment_status, o.order_status, o.created_at
           FROM ORDERS o JOIN MEMBERS m ON o.member_id = m.member_id
           ORDER BY o.created_at DESC LIMIT 5"""
    ))
    for r in recent:
        r["payment_status"] = PAYMENT_STATUS_REVERSE.get(r["payment_status"], r["payment_status"])
        r["order_status"] = ORDER_STATUS_REVERSE.get(r["order_status"], r["order_status"])

    low_products = _clean_rows(db.query_all(
        """SELECT p.product_id AS id, p.category_id, c.name AS category_name,
                  p.name, p.price, p.stock_quantity AS stock, p.description, p.is_active
           FROM PRODUCTS p
           JOIN CATEGORIES c ON p.category_id = c.category_id
           WHERE p.stock_quantity <= 5 AND p.is_active = TRUE
           ORDER BY p.stock_quantity ASC"""
    ))
    for lp in low_products:
        lp["is_active"] = bool(lp["is_active"])

    return jsonify({
        "today_order_count": today_orders["cnt"] if today_orders else 0,
        "processing_order_count": processing["cnt"] if processing else 0,
        "low_stock_count": low_stock["cnt"] if low_stock else 0,
        "monthly_revenue": float(monthly_rev["total"]) if monthly_rev else 0,
        "recent_orders": recent,
        "low_stock_products": low_products,
    })


# -------------------------------------------------------------------
# 6.3 分類管理
# -------------------------------------------------------------------
@app.route("/api/admin/categories", methods=["GET"])
@require_admin
def admin_get_categories():
    rows = _clean_rows(db.query_all(
        """SELECT c.category_id AS id, c.name, c.description,
                  COUNT(p.product_id) AS product_count
           FROM CATEGORIES c
           LEFT JOIN PRODUCTS p ON c.category_id = p.category_id
           GROUP BY c.category_id, c.name, c.description
           ORDER BY c.category_id"""
    ))
    return jsonify(rows)


@app.route("/api/admin/categories", methods=["POST"])
@require_admin
def admin_create_category():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()

    if not name:
        return _error("VALIDATION_ERROR", "分類名稱為必填")

    existing = db.query_one("SELECT category_id FROM CATEGORIES WHERE name = %s", (name,))
    if existing:
        return _error("CATEGORY_EXISTS", "分類名稱已存在", 400)

    new_id = db.execute(
        "INSERT INTO CATEGORIES (name, description) VALUES (%s, %s)",
        (name, description),
    )
    return jsonify({"id": new_id, "name": name, "description": description}), 201


@app.route("/api/admin/categories/<int:cid>", methods=["PUT"])
@require_admin
def admin_update_category(cid):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()

    if not name:
        return _error("VALIDATION_ERROR", "分類名稱為必填")

    cat = db.query_one("SELECT category_id FROM CATEGORIES WHERE category_id = %s", (cid,))
    if not cat:
        return _error("NOT_FOUND", "找不到分類", 404)

    dup = db.query_one(
        "SELECT category_id FROM CATEGORIES WHERE name = %s AND category_id != %s",
        (name, cid),
    )
    if dup:
        return _error("CATEGORY_EXISTS", "分類名稱已存在", 400)

    db.execute(
        "UPDATE CATEGORIES SET name = %s, description = %s WHERE category_id = %s",
        (name, description, cid),
    )
    return jsonify({"id": cid, "name": name, "description": description})


@app.route("/api/admin/categories/<int:cid>", methods=["DELETE"])
@require_admin
def admin_delete_category(cid):
    has_products = db.query_one(
        "SELECT COUNT(*) AS cnt FROM PRODUCTS WHERE category_id = %s", (cid,)
    )
    if has_products and has_products["cnt"] > 0:
        return _error("CATEGORY_HAS_PRODUCTS", "此分類下仍有商品，無法刪除", 400)

    db.execute("DELETE FROM CATEGORIES WHERE category_id = %s", (cid,))
    return "", 204


# -------------------------------------------------------------------
# 6.4 商品管理
# -------------------------------------------------------------------
def _product_query(where="1=1", params=()):
    """通用商品查詢。"""
    rows = _clean_rows(db.query_all(
        f"""SELECT p.product_id AS id, p.category_id, c.name AS category_name,
                   p.name, p.price, p.stock_quantity AS stock, p.description,
                   p.is_active, NULL AS image
            FROM PRODUCTS p
            JOIN CATEGORIES c ON p.category_id = c.category_id
            WHERE {where}
            ORDER BY p.product_id DESC""",
        params,
    ))
    for r in rows:
        r["is_active"] = bool(r["is_active"])
    return rows


@app.route("/api/admin/products", methods=["GET"])
@require_admin
def admin_get_products():
    category_id = request.args.get("category_id")
    search = request.args.get("search", "").strip()
    active_filter = request.args.get("activeFilter", "")

    conditions = ["1=1"]
    params = []

    if category_id:
        conditions.append("p.category_id = %s")
        params.append(int(category_id))
    if search:
        conditions.append("p.name LIKE %s")
        params.append(f"%{search}%")
    if active_filter == "active":
        conditions.append("p.is_active = TRUE")
    elif active_filter == "inactive":
        conditions.append("p.is_active = FALSE")

    return jsonify(_product_query(" AND ".join(conditions), tuple(params)))


@app.route("/api/admin/products/<int:pid>", methods=["GET"])
@require_admin
def admin_get_product(pid):
    rows = _product_query("p.product_id = %s", (pid,))
    if not rows:
        return _error("NOT_FOUND", "找不到商品", 404)
    return jsonify(rows[0])


@app.route("/api/admin/products", methods=["POST"])
@require_admin
def admin_create_product():
    data = request.get_json(silent=True) or {}
    category_id = data.get("category_id")
    name = (data.get("name") or "").strip()
    price = data.get("price", 0)
    stock = data.get("stock", 0)
    description = (data.get("description") or "").strip()
    is_active = data.get("is_active", True)

    if not name or not category_id:
        return _error("VALIDATION_ERROR", "商品名稱與分類為必填")
    if price <= 0:
        return _error("VALIDATION_ERROR", "售價必須大於 0")

    cat = db.query_one("SELECT category_id FROM CATEGORIES WHERE category_id = %s", (category_id,))
    if not cat:
        return _error("NOT_FOUND", "分類不存在", 400)

    conn = db.get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO PRODUCTS (category_id, name, price, stock_quantity, description, is_active)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (category_id, name, price, stock, description, is_active),
        )
        new_id = cursor.lastrowid

        # 若有初始庫存，寫入進貨記錄
        if stock > 0:
            cursor.execute(
                """INSERT INTO INVENTORY_LOGS (product_id, change_quantity, change_type)
                   VALUES (%s, %s, %s)""",
                (new_id, stock, "進貨"),
            )

        conn.commit()
        cursor.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    rows = _product_query("p.product_id = %s", (new_id,))
    return jsonify(rows[0]), 201


@app.route("/api/admin/products/<int:pid>", methods=["PUT"])
@require_admin
def admin_update_product(pid):
    data = request.get_json(silent=True) or {}
    category_id = data.get("category_id")
    name = (data.get("name") or "").strip()
    price = data.get("price", 0)
    description = (data.get("description") or "").strip()
    is_active = data.get("is_active", True)

    if not name or not category_id:
        return _error("VALIDATION_ERROR", "商品名稱與分類為必填")

    existing = db.query_one("SELECT product_id FROM PRODUCTS WHERE product_id = %s", (pid,))
    if not existing:
        return _error("NOT_FOUND", "找不到商品", 404)

    db.execute(
        """UPDATE PRODUCTS
           SET category_id = %s, name = %s, price = %s,
               description = %s, is_active = %s
           WHERE product_id = %s""",
        (category_id, name, price, description, is_active, pid),
    )

    rows = _product_query("p.product_id = %s", (pid,))
    return jsonify(rows[0])


@app.route("/api/admin/products/<int:pid>/toggle", methods=["PATCH"])
@require_admin
def admin_toggle_product(pid):
    existing = db.query_one(
        "SELECT product_id, is_active FROM PRODUCTS WHERE product_id = %s", (pid,)
    )
    if not existing:
        return _error("NOT_FOUND", "找不到商品", 404)

    new_active = not bool(existing["is_active"])
    db.execute(
        "UPDATE PRODUCTS SET is_active = %s WHERE product_id = %s", (new_active, pid)
    )

    rows = _product_query("p.product_id = %s", (pid,))
    return jsonify(rows[0])


@app.route("/api/admin/products/<int:pid>", methods=["DELETE"])
@require_admin
def admin_delete_product(pid):
    has_orders = db.query_one(
        "SELECT COUNT(*) AS cnt FROM ORDER_DETAILS WHERE product_id = %s", (pid,)
    )
    if has_orders and has_orders["cnt"] > 0:
        return _error("PRODUCT_HAS_ORDERS", "此商品已有訂單紀錄，無法刪除", 400)

    db.execute("DELETE FROM INVENTORY_LOGS WHERE product_id = %s", (pid,))
    db.execute("DELETE FROM PRODUCTS WHERE product_id = %s", (pid,))
    return "", 204


# -------------------------------------------------------------------
# 6.5 訂單管理
# -------------------------------------------------------------------
@app.route("/api/admin/orders", methods=["GET"])
@require_admin
def admin_get_orders():
    search = request.args.get("search", "").strip()
    payment = request.args.get("paymentStatus", "").strip()
    status = request.args.get("orderStatus", "").strip()

    conditions = ["1=1"]
    params = []

    if search:
        conditions.append(
            "(CAST(o.order_id AS CHAR) LIKE %s OR m.name LIKE %s OR m.email LIKE %s)"
        )
        like = f"%{search}%"
        params.extend([like, like, like])

    if payment and payment in PAYMENT_STATUS_MAP:
        conditions.append("o.payment_status = %s")
        params.append(PAYMENT_STATUS_MAP[payment])

    if status and status in ORDER_STATUS_MAP:
        conditions.append("o.order_status = %s")
        params.append(ORDER_STATUS_MAP[status])

    rows = _clean_rows(db.query_all(
        f"""SELECT o.order_id AS id, o.member_id, m.name AS member_name,
                   m.email AS member_email, o.total_amount,
                   o.payment_status, o.order_status, o.created_at
            FROM ORDERS o
            JOIN MEMBERS m ON o.member_id = m.member_id
            WHERE {' AND '.join(conditions)}
            ORDER BY o.created_at DESC""",
        tuple(params),
    ))
    for r in rows:
        r["payment_status"] = PAYMENT_STATUS_REVERSE.get(r["payment_status"], r["payment_status"])
        r["order_status"] = ORDER_STATUS_REVERSE.get(r["order_status"], r["order_status"])

    return jsonify(rows)


@app.route("/api/admin/orders/<int:oid>", methods=["GET"])
@require_admin
def admin_get_order_detail(oid):
    order = db.query_one(
        """SELECT o.order_id AS id, o.member_id, m.name AS member_name,
                  m.email AS member_email, o.total_amount,
                  o.payment_status, o.order_status, o.created_at
           FROM ORDERS o
           JOIN MEMBERS m ON o.member_id = m.member_id
           WHERE o.order_id = %s""",
        (oid,),
    )
    if not order:
        return _error("NOT_FOUND", "找不到訂單", 404)

    order = _clean_row(order)
    order["payment_status"] = PAYMENT_STATUS_REVERSE.get(order["payment_status"], order["payment_status"])
    order["order_status"] = ORDER_STATUS_REVERSE.get(order["order_status"], order["order_status"])

    # 會員資訊
    member = _clean_row(db.query_one(
        """SELECT member_id AS id, name, email, phone, address
           FROM MEMBERS WHERE member_id = %s""",
        (order["member_id"],),
    ))
    order["member"] = member

    # 訂單明細
    items = _clean_rows(db.query_all(
        """SELECT od.product_id, p.name AS product_name,
                  od.quantity, od.unit_price, od.subtotal
           FROM ORDER_DETAILS od
           JOIN PRODUCTS p ON od.product_id = p.product_id
           WHERE od.order_id = %s""",
        (oid,),
    ))
    order["items"] = items

    return jsonify(order)


@app.route("/api/admin/orders/<int:oid>", methods=["PATCH"])
@require_admin
def admin_update_order_status(oid):
    data = request.get_json(silent=True) or {}
    payment = data.get("payment_status")
    status = data.get("order_status")

    order = db.query_one("SELECT order_id FROM ORDERS WHERE order_id = %s", (oid,))
    if not order:
        return _error("NOT_FOUND", "找不到訂單", 404)

    updates = []
    params = []
    if payment and payment in PAYMENT_STATUS_MAP:
        updates.append("payment_status = %s")
        params.append(PAYMENT_STATUS_MAP[payment])
    if status and status in ORDER_STATUS_MAP:
        updates.append("order_status = %s")
        params.append(ORDER_STATUS_MAP[status])

    if not updates:
        return _error("VALIDATION_ERROR", "請提供要更新的狀態欄位")

    params.append(oid)
    db.execute(f"UPDATE ORDERS SET {', '.join(updates)} WHERE order_id = %s", tuple(params))

    return admin_get_order_detail(oid)


# -------------------------------------------------------------------
# 6.6 庫存管理
# -------------------------------------------------------------------
@app.route("/api/admin/inventory", methods=["GET"])
@require_admin
def admin_get_inventory():
    rows = _clean_rows(db.query_all(
        """SELECT p.product_id AS id, p.category_id, c.name AS category_name,
                  p.name, p.price, p.stock_quantity AS stock,
                  p.is_active, NULL AS image,
                  (SELECT MAX(il.created_at) FROM INVENTORY_LOGS il
                   WHERE il.product_id = p.product_id) AS last_change_at
           FROM PRODUCTS p
           JOIN CATEGORIES c ON p.category_id = c.category_id
           ORDER BY p.product_id"""
    ))
    for r in rows:
        r["is_active"] = bool(r["is_active"])
    return jsonify(rows)


@app.route("/api/admin/inventory/logs", methods=["GET"])
@require_admin
def admin_get_inventory_logs():
    product_id = request.args.get("productId")
    change_type = request.args.get("changeType", "").strip()

    conditions = ["1=1"]
    params = []

    if product_id:
        conditions.append("il.product_id = %s")
        params.append(int(product_id))
    if change_type and change_type in CHANGE_TYPE_MAP:
        conditions.append("il.change_type = %s")
        params.append(CHANGE_TYPE_MAP[change_type])

    rows = _clean_rows(db.query_all(
        f"""SELECT il.log_id AS id, il.product_id, p.name AS product_name,
                   c.name AS category_name, il.change_quantity, il.change_type,
                   il.created_at
            FROM INVENTORY_LOGS il
            JOIN PRODUCTS p ON il.product_id = p.product_id
            JOIN CATEGORIES c ON p.category_id = c.category_id
            WHERE {' AND '.join(conditions)}
            ORDER BY il.created_at DESC""",
        tuple(params),
    ))
    for r in rows:
        r["change_type"] = CHANGE_TYPE_REVERSE.get(r["change_type"], r["change_type"])
    return jsonify(rows)


@app.route("/api/admin/inventory/purchase", methods=["POST"])
@require_admin
def admin_purchase_stock():
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    quantity = data.get("quantity", 0)

    if not product_id or quantity <= 0:
        return _error("INVALID_QUANTITY", "進貨數量必須大於 0")

    product = db.query_one(
        "SELECT product_id, name FROM PRODUCTS WHERE product_id = %s", (product_id,)
    )
    if not product:
        return _error("NOT_FOUND", "商品不存在", 404)

    # 呼叫預存程序 sp_restock_product
    result = db.call_procedure("sp_restock_product", (product_id, quantity, ""))
    result_msg = result[2] if len(result) > 2 else ""

    if "錯誤" in str(result_msg):
        return _error("RESTOCK_FAILED", result_msg, 400)

    # 回傳更新後的商品
    rows = _product_query("p.product_id = %s", (product_id,))
    return jsonify(rows[0])


# -------------------------------------------------------------------
# 6.7 報表分析
# -------------------------------------------------------------------
@app.route("/api/admin/reports/sales-by-category", methods=["GET"])
@require_admin
def report_sales_by_category():
    rows = _clean_rows(db.query_all(
        """SELECT c.category_id, c.name AS category_name,
                  COALESCE(SUM(od.subtotal), 0) AS total
           FROM CATEGORIES c
           LEFT JOIN PRODUCTS p ON c.category_id = p.category_id
           LEFT JOIN ORDER_DETAILS od ON p.product_id = od.product_id
           LEFT JOIN ORDERS o ON od.order_id = o.order_id AND o.payment_status = '已付款'
           GROUP BY c.category_id, c.name
           ORDER BY total DESC"""
    ))
    return jsonify(rows)


@app.route("/api/admin/reports/top-products", methods=["GET"])
@require_admin
def report_top_products():
    limit = request.args.get("limit", 10, type=int)
    rows = _clean_rows(db.query_all(
        """SELECT p.product_id, p.name AS product_name,
                  COALESCE(SUM(od.quantity), 0) AS quantity,
                  COALESCE(SUM(od.subtotal), 0) AS revenue
           FROM PRODUCTS p
           JOIN ORDER_DETAILS od ON p.product_id = od.product_id
           JOIN ORDERS o ON od.order_id = o.order_id
           WHERE o.payment_status = '已付款'
           GROUP BY p.product_id, p.name
           ORDER BY revenue DESC
           LIMIT %s""",
        (limit,),
    ))
    return jsonify(rows)


# ===================================================================
# 啟動伺服器
# ===================================================================
if __name__ == "__main__":
    port = int(os.getenv("PORT", "3000"))

    print("=" * 60)
    print("  電商訂單與庫存管理系統 — Flask 後端 API")
    print("=" * 60)

    # 測試資料庫連線
    if db.test_connection():
        print(f"  [OK] MySQL 連線成功 ({os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')})")
    else:
        print("  [X] MySQL 連線失敗，請檢查 .env 設定")

    print(f"  [i] API Base URL: http://localhost:{port}/api")
    print(f"  [i] 前端 CORS 允許: http://localhost:5173")
    print("=" * 60)

    app.run(host="0.0.0.0", port=port, debug=True)
