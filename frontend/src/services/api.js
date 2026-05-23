/**
 * 會員端 API — 串接 Flask 後端 API (MySQL 資料庫)
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

function getAuthHeader() {
  const raw = localStorage.getItem('ecommerce_current_user');
  if (raw) {
    try {
      const user = JSON.parse(raw);
      if (user?.token) {
        return { 'Authorization': `Bearer ${user.token}` };
      }
    } catch {
      // ignore
    }
  }
  return {};
}

export function getApiBaseUrl() {
  return BASE_URL;
}

export async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { ...res.user, token: res.token };
}

export async function register(data) {
  const res = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      address: data.address,
    }),
  });
  return { ...res.user, token: res.token };
}

export async function fetchCategories() {
  return request('/categories');
}

export async function fetchProducts({ categoryId, search, sort } = {}) {
  const params = new URLSearchParams();
  if (categoryId) params.append('category_id', categoryId);
  if (search) params.append('search', search);
  if (sort) params.append('sort', sort);
  const query = params.toString();
  return request(`/products${query ? `?${query}` : ''}`);
}

export async function fetchProductById(id) {
  return request(`/products/${id}`);
}

export async function createOrder({ memberId, items, address, phone }) {
  const formattedItems = items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }));
  const res = await request('/orders', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      items: formattedItems,
      shipping_phone: phone,
      shipping_address: address,
    }),
  });
  return {
    ...res,
    items: res.items?.map((i) => ({
      ...i,
      productId: i.product_id,
    })),
  };
}

export async function fetchOrdersByMember(memberId) {
  const res = await request('/orders', {
    headers: getAuthHeader(),
  });
  return res.map((order) => ({
    ...order,
    items: order.items?.map((i) => ({
      ...i,
      productId: i.product_id,
    })),
  }));
}

export async function fetchOrderById(orderId, memberId) {
  const res = await request(`/orders/${orderId}`, {
    headers: getAuthHeader(),
  });
  return {
    ...res,
    items: res.items?.map((i) => ({
      ...i,
      productId: i.product_id,
    })),
  };
}

export async function simulatePayment(orderId, memberId) {
  const res = await request(`/orders/${orderId}/pay`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  return {
    ...res,
    items: res.items?.map((i) => ({
      ...i,
      productId: i.product_id,
    })),
  };
}

export async function requestCancelOrder(orderId, memberId, cancelReason) {
  const res = await request(`/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      cancel_reason: cancelReason,
    }),
  });
  return {
    ...res,
    items: res.items?.map((i) => ({
      ...i,
      productId: i.product_id,
    })),
  };
}

