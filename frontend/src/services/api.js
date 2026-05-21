/**
 * 會員端 API — Mock + localStorage
 */
import {
  loadUsers,
  saveUsers,
  loadCategories,
  loadProducts,
  saveProducts,
  loadOrders,
  saveOrders,
  enrichProducts,
  enrichProduct,
  nextId,
  addInventoryLog,
} from './dataStore';
import { demoUser } from '../data/mockData';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export function getApiBaseUrl() {
  return BASE_URL;
}

export async function login(email, password) {
  await delay();
  const users = loadUsers();
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) throw new Error('電子郵件或密碼錯誤');
  const { password: _, ...safe } = user;
  return safe;
}

export async function register(data) {
  await delay();
  const users = loadUsers();
  if (users.some((u) => u.email === data.email)) {
    throw new Error('此電子郵件已被註冊');
  }
  const user = {
    id: nextId(users),
    name: data.name,
    email: data.email,
    password: data.password,
    phone: data.phone,
    address: data.address,
    created_at: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  const { password: _, ...safe } = user;
  return safe;
}

export async function fetchCategories() {
  await delay(200);
  return loadCategories();
}

export async function fetchProducts({ categoryId, search, sort } = {}) {
  await delay();
  const categories = loadCategories();
  let list = enrichProducts(loadProducts(), categories).filter((p) => p.is_active);

  if (categoryId) list = list.filter((p) => p.category_id === Number(categoryId));
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
  else list.sort((a, b) => b.id - a.id);

  return list;
}

export async function fetchProductById(id) {
  await delay();
  const categories = loadCategories();
  const product = loadProducts().find((p) => p.id === Number(id));
  if (!product || !product.is_active) throw new Error('找不到商品');
  return enrichProduct(product, categories);
}

export async function createOrder({ memberId, items, address, phone }) {
  await delay(500);
  const productList = loadProducts();
  const orderItems = [];

  for (const item of items) {
    const product = productList.find((p) => p.id === item.productId);
    if (!product) throw new Error(`商品不存在：${item.productId}`);
    if (product.stock < item.quantity) {
      throw new Error(`${product.name} 庫存不足（剩餘 ${product.stock} 件）`);
    }
    const unitPrice = product.price;
    orderItems.push({
      product_id: product.id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price: unitPrice,
      subtotal: unitPrice * item.quantity,
    });
  }

  const total = orderItems.reduce((s, i) => s + i.subtotal, 0);
  const orders = loadOrders();
  const order = {
    id: nextId(orders),
    member_id: memberId,
    total_amount: total,
    payment_status: 'unpaid',
    order_status: 'processing',
    shipping_address: address,
    shipping_phone: phone,
    created_at: new Date().toISOString(),
    items: orderItems,
  };

  for (const item of orderItems) {
    const p = productList.find((x) => x.id === item.product_id);
    p.stock -= item.quantity;
    addInventoryLog({
      productId: p.id,
      changeQuantity: -item.quantity,
      changeType: 'order_deduct',
    });
  }
  saveProducts(productList);

  orders.unshift(order);
  saveOrders(orders);
  return order;
}

export async function fetchOrdersByMember(memberId) {
  await delay();
  return loadOrders().filter((o) => o.member_id === memberId);
}

export async function fetchOrderById(orderId, memberId) {
  await delay();
  const order = loadOrders().find((o) => o.id === Number(orderId));
  if (!order) throw new Error('找不到訂單');
  if (order.member_id !== memberId) throw new Error('無權限查看此訂單');
  return order;
}

export async function simulatePayment(orderId, memberId) {
  await delay(400);
  const orders = loadOrders();
  const order = orders.find((o) => o.id === Number(orderId) && o.member_id === memberId);
  if (!order) throw new Error('找不到訂單');
  if (order.payment_status === 'paid') throw new Error('訂單已付款');
  order.payment_status = 'paid';
  saveOrders(orders);
  return order;
}
