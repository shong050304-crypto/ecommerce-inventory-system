/**
 * 管理端 API — Mock + localStorage（與會員端共用資料）
 */
import {
  loadCategories,
  saveCategories,
  loadProducts,
  saveProducts,
  loadOrders,
  saveOrders,
  loadInventoryLogs,
  enrichProducts,
  enrichProduct,
  getMemberById,
  getCategoryName,
  nextId,
  addInventoryLog,
} from './dataStore';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

const demoAdmin = {
  id: 1,
  name: '系統管理員',
  email: 'admin@example.com',
  password: 'admin1234',
};

// ——— 儀表板 ———
export async function fetchDashboardStats() {
  await delay();
  const orders = loadOrders();
  const products = loadProducts();
  const today = new Date().toDateString();

  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const processingOrders = orders.filter((o) => o.order_status === 'processing');
  const lowStockProducts = products.filter((p) => p.stock <= 5);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyRevenue = orders
    .filter((o) => o.payment_status === 'paid' && new Date(o.created_at) >= monthStart)
    .reduce((s, o) => s + o.total_amount, 0);

  return {
    today_order_count: todayOrders.length,
    processing_order_count: processingOrders.length,
    low_stock_count: lowStockProducts.length,
    monthly_revenue: monthlyRevenue,
    recent_orders: orders.slice(0, 5).map(enrichOrder),
    low_stock_products: enrichProducts(
      lowStockProducts.sort((a, b) => a.stock - b.stock),
      loadCategories(),
    ),
  };
}

function enrichOrder(order) {
  const member = getMemberById(order.member_id);
  return {
    ...order,
    member_name: member?.name ?? '未知會員',
    member_email: member?.email ?? '',
  };
}

// ——— 分類 ———
export async function adminFetchCategories() {
  await delay(200);
  const categories = loadCategories();
  const products = loadProducts();
  return categories.map((c) => ({
    ...c,
    product_count: products.filter((p) => p.category_id === c.id).length,
  }));
}

export async function adminCreateCategory(data) {
  await delay();
  const list = loadCategories();
  if (list.some((c) => c.name === data.name.trim())) {
    throw new Error('分類名稱已存在');
  }
  const category = {
    id: nextId(list),
    name: data.name.trim(),
    description: data.description?.trim() || '',
  };
  list.push(category);
  saveCategories(list);
  return category;
}

export async function adminUpdateCategory(id, data) {
  await delay();
  const list = loadCategories();
  const idx = list.findIndex((c) => c.id === Number(id));
  if (idx === -1) throw new Error('找不到分類');
  list[idx] = {
    ...list[idx],
    name: data.name.trim(),
    description: data.description?.trim() || '',
  };
  saveCategories(list);
  return list[idx];
}

export async function adminDeleteCategory(id) {
  await delay();
  const list = loadCategories();
  const products = loadProducts();
  if (products.some((p) => p.category_id === Number(id))) {
    throw new Error('此分類下仍有商品，無法刪除');
  }
  saveCategories(list.filter((c) => c.id !== Number(id)));
}

// ——— 商品 ———
export async function adminFetchProducts({ categoryId, search, activeFilter } = {}) {
  await delay();
  const categories = loadCategories();
  let list = enrichProducts(loadProducts(), categories);

  if (categoryId) list = list.filter((p) => p.category_id === Number(categoryId));
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (activeFilter === 'active') list = list.filter((p) => p.is_active);
  if (activeFilter === 'inactive') list = list.filter((p) => !p.is_active);

  return list.sort((a, b) => b.id - a.id);
}

export async function adminFetchProductById(id) {
  await delay();
  const categories = loadCategories();
  const product = loadProducts().find((p) => p.id === Number(id));
  if (!product) throw new Error('找不到商品');
  return enrichProduct(product, categories);
}

export async function adminCreateProduct(data) {
  await delay();
  const list = loadProducts();
  const categories = loadCategories();
  if (!categories.find((c) => c.id === Number(data.category_id))) {
    throw new Error('請選擇有效分類');
  }
  const product = {
    id: nextId(list),
    category_id: Number(data.category_id),
    name: data.name.trim(),
    price: Number(data.price),
    stock: Number(data.stock) || 0,
    description: data.description?.trim() || '',
    is_active: Boolean(data.is_active),
    image: null,
  };
  list.push(product);
  saveProducts(list);
  if (product.stock > 0) {
    addInventoryLog({
      productId: product.id,
      changeQuantity: product.stock,
      changeType: 'purchase',
    });
  }
  return enrichProduct(product, categories);
}

export async function adminUpdateProduct(id, data) {
  await delay();
  const list = loadProducts();
  const categories = loadCategories();
  const idx = list.findIndex((p) => p.id === Number(id));
  if (idx === -1) throw new Error('找不到商品');
  list[idx] = {
    ...list[idx],
    category_id: Number(data.category_id),
    name: data.name.trim(),
    price: Number(data.price),
    stock: Number(data.stock),
    description: data.description?.trim() || '',
    is_active: Boolean(data.is_active),
  };
  saveProducts(list);
  return enrichProduct(list[idx], categories);
}

export async function adminToggleProductActive(id) {
  await delay();
  const list = loadProducts();
  const categories = loadCategories();
  const product = list.find((p) => p.id === Number(id));
  if (!product) throw new Error('找不到商品');
  product.is_active = !product.is_active;
  saveProducts(list);
  return enrichProduct(product, categories);
}

export async function adminDeleteProduct(id) {
  await delay();
  const orders = loadOrders();
  const hasOrder = orders.some((o) => o.items?.some((i) => i.product_id === Number(id)));
  if (hasOrder) throw new Error('此商品已有訂單紀錄，無法刪除');
  const list = loadProducts().filter((p) => p.id !== Number(id));
  saveProducts(list);
}

// ——— 訂單 ———
export async function adminFetchOrders({ search, paymentStatus, orderStatus } = {}) {
  await delay();
  let list = loadOrders().map(enrichOrder);

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (o) =>
        String(o.id).includes(q) ||
        o.member_name?.toLowerCase().includes(q) ||
        o.member_email?.toLowerCase().includes(q),
    );
  }
  if (paymentStatus) list = list.filter((o) => o.payment_status === paymentStatus);
  if (orderStatus) list = list.filter((o) => o.order_status === orderStatus);

  return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function adminFetchOrderById(id) {
  await delay();
  const order = loadOrders().find((o) => o.id === Number(id));
  if (!order) throw new Error('找不到訂單');
  const member = getMemberById(order.member_id);
  return {
    ...enrichOrder(order),
    member,
  };
}

export async function adminUpdateOrderStatus(id, { payment_status, order_status }) {
  await delay();
  const orders = loadOrders();
  const order = orders.find((o) => o.id === Number(id));
  if (!order) throw new Error('找不到訂單');
  if (payment_status) order.payment_status = payment_status;
  if (order_status) order.order_status = order_status;
  saveOrders(orders);
  return adminFetchOrderById(id);
}

// ——— 庫存 ———
export async function adminFetchInventory() {
  await delay();
  const categories = loadCategories();
  const products = enrichProducts(loadProducts(), categories);
  const logs = loadInventoryLogs();

  return products.map((p) => {
    const productLogs = logs.filter((l) => l.product_id === p.id);
    const lastLog = productLogs[0];
    return {
      ...p,
      last_change_at: lastLog?.created_at ?? null,
    };
  });
}

export async function adminFetchInventoryLogs({ productId, changeType } = {}) {
  await delay();
  const categories = loadCategories();
  const products = loadProducts();
  let logs = loadInventoryLogs();

  if (productId) logs = logs.filter((l) => l.product_id === Number(productId));
  if (changeType) logs = logs.filter((l) => l.change_type === changeType);

  return logs.map((log) => {
    const product = products.find((p) => p.id === log.product_id);
    return {
      ...log,
      product_name: product?.name ?? '未知商品',
      category_name: getCategoryName(categories, product?.category_id),
    };
  });
}

export async function adminPurchaseStock(productId, quantity) {
  await delay();
  const qty = Number(quantity);
  if (!qty || qty <= 0) throw new Error('進貨數量必須大於 0');

  const list = loadProducts();
  const product = list.find((p) => p.id === Number(productId));
  if (!product) throw new Error('找不到商品');

  product.stock += qty;
  saveProducts(list);
  addInventoryLog({
    productId: product.id,
    changeQuantity: qty,
    changeType: 'purchase',
  });

  const categories = loadCategories();
  return enrichProduct(product, categories);
}

// ——— 報表 ———
export async function adminFetchSalesByCategory() {
  await delay();
  const categories = loadCategories();
  const orders = loadOrders().filter((o) => o.payment_status === 'paid');
  const map = Object.fromEntries(categories.map((c) => [c.id, { category_id: c.id, category_name: c.name, total: 0 }]));

  const products = loadProducts();
  for (const order of orders) {
    for (const item of order.items || []) {
      const product = products.find((p) => p.id === item.product_id);
      if (product && map[product.category_id]) {
        map[product.category_id].total += item.subtotal;
      }
    }
  }

  return Object.values(map).sort((a, b) => b.total - a.total);
}

export async function adminFetchTopProducts(limit = 10) {
  await delay();
  const products = loadProducts();
  const orders = loadOrders().filter((o) => o.payment_status === 'paid');
  const sales = {};

  for (const order of orders) {
    for (const item of order.items || []) {
      if (!sales[item.product_id]) {
        sales[item.product_id] = { product_id: item.product_id, product_name: item.product_name, quantity: 0, revenue: 0 };
      }
      sales[item.product_id].quantity += item.quantity;
      sales[item.product_id].revenue += item.subtotal;
    }
  }

  return Object.values(sales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// ——— 管理員登入 ———
export async function adminLogin(email, password) {
  await delay();
  if (email === demoAdmin.email && password === demoAdmin.password) {
    const { password: _, ...safe } = demoAdmin;
    return safe;
  }
  throw new Error('管理員帳號或密碼錯誤');
}
