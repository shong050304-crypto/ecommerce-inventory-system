/**
 * 管理端 API — 串接 Flask 後端 API (MySQL 資料庫)
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = '請求失敗';
    try {
      const data = await response.json();
      errMsg = data.error?.message || data.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function getAdminAuthHeader() {
  const raw = localStorage.getItem('ecommerce_admin');
  if (raw) {
    try {
      const admin = JSON.parse(raw);
      if (admin?.token) {
        return { 'Authorization': `Bearer ${admin.token}` };
      }
    } catch {
      // ignore
    }
  }
  return {};
}

// ——— 儀表板 ———
export async function fetchDashboardStats() {
  return request('/admin/dashboard/stats', {
    headers: getAdminAuthHeader(),
  });
}

// ——— 分類 ———
export async function adminFetchCategories() {
  return request('/admin/categories', {
    headers: getAdminAuthHeader(),
  });
}

export async function adminCreateCategory(data) {
  return request('/admin/categories', {
    method: 'POST',
    headers: getAdminAuthHeader(),
    body: JSON.stringify({
      name: data.name,
      description: data.description,
    }),
  });
}

export async function adminUpdateCategory(id, data) {
  return request(`/admin/categories/${id}`, {
    method: 'PUT',
    headers: getAdminAuthHeader(),
    body: JSON.stringify({
      name: data.name,
      description: data.description,
    }),
  });
}

export async function adminDeleteCategory(id) {
  return request(`/admin/categories/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeader(),
  });
}

// ——— 商品 ———
export async function adminFetchProducts({ categoryId, search, activeFilter } = {}) {
  const params = new URLSearchParams();
  if (categoryId) params.append('category_id', categoryId);
  if (search) params.append('search', search);
  if (activeFilter) params.append('activeFilter', activeFilter);
  const query = params.toString();
  return request(`/admin/products${query ? `?${query}` : ''}`, {
    headers: getAdminAuthHeader(),
  });
}

export async function adminFetchProductById(id) {
  return request(`/admin/products/${id}`, {
    headers: getAdminAuthHeader(),
  });
}

export async function adminCreateProduct(data) {
  return request('/admin/products', {
    method: 'POST',
    headers: getAdminAuthHeader(),
    body: JSON.stringify({
      category_id: data.category_id,
      name: data.name,
      price: data.price,
      stock: data.stock,
      description: data.description,
      is_active: data.is_active,
    }),
  });
}

export async function adminUpdateProduct(id, data) {
  return request(`/admin/products/${id}`, {
    method: 'PUT',
    headers: getAdminAuthHeader(),
    body: JSON.stringify({
      category_id: data.category_id,
      name: data.name,
      price: data.price,
      description: data.description,
      is_active: data.is_active,
    }),
  });
}

export async function adminToggleProductActive(id) {
  return request(`/admin/products/${id}/toggle`, {
    method: 'PATCH',
    headers: getAdminAuthHeader(),
  });
}

export async function adminDeleteProduct(id) {
  return request(`/admin/products/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeader(),
  });
}

// ——— 訂單 ———
export async function adminFetchOrders({ search, paymentStatus, orderStatus } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (paymentStatus) params.append('paymentStatus', paymentStatus);
  if (orderStatus) params.append('orderStatus', orderStatus);
  const query = params.toString();
  return request(`/admin/orders${query ? `?${query}` : ''}`, {
    headers: getAdminAuthHeader(),
  });
}

export async function adminFetchOrderById(id) {
  return request(`/admin/orders/${id}`, {
    headers: getAdminAuthHeader(),
  });
}

export async function adminUpdateOrderStatus(id, { payment_status, order_status }) {
  return request(`/admin/orders/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeader(),
    body: JSON.stringify({
      payment_status,
      order_status,
    }),
  });
}

// ——— 庫存 ———
export async function adminFetchInventory() {
  return request('/admin/inventory', {
    headers: getAdminAuthHeader(),
  });
}

export async function adminFetchInventoryLogs({ productId, changeType } = {}) {
  const params = new URLSearchParams();
  if (productId) params.append('productId', productId);
  if (changeType) params.append('changeType', changeType);
  const query = params.toString();
  return request(`/admin/inventory/logs${query ? `?${query}` : ''}`, {
    headers: getAdminAuthHeader(),
  });
}

export async function adminPurchaseStock(productId, quantity) {
  return request('/admin/inventory/purchase', {
    method: 'POST',
    headers: getAdminAuthHeader(),
    body: JSON.stringify({
      product_id: productId,
      quantity: quantity,
    }),
  });
}

// ——— 報表 ———
export async function adminFetchSalesByCategory() {
  return request('/admin/reports/sales-by-category', {
    headers: getAdminAuthHeader(),
  });
}

export async function adminFetchTopProducts(limit = 10) {
  return request(`/admin/reports/top-products?limit=${limit}`, {
    headers: getAdminAuthHeader(),
  });
}

// ——— 管理員登入 ———
export async function adminLogin(email, password) {
  const res = await request('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { ...res.admin, token: res.token };
}

