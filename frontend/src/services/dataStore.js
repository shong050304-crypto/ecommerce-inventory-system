import { categories as defaultCategories, products as defaultProducts, demoUser } from '../data/mockData';

export const KEYS = {
  users: 'ecommerce_users',
  products: 'ecommerce_products',
  categories: 'ecommerce_categories',
  orders: 'ecommerce_orders',
  inventoryLogs: 'ecommerce_inventory_logs',
};

export function nextId(items) {
  return items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

export function loadUsers() {
  const raw = localStorage.getItem(KEYS.users);
  if (raw) return JSON.parse(raw);
  const initial = [{ ...demoUser, password: demoUser.password }];
  localStorage.setItem(KEYS.users, JSON.stringify(initial));
  return initial;
}

export function saveUsers(users) {
  localStorage.setItem(KEYS.users, JSON.stringify(users));
}

export function loadCategories() {
  const raw = localStorage.getItem(KEYS.categories);
  if (raw) return JSON.parse(raw);
  localStorage.setItem(KEYS.categories, JSON.stringify(defaultCategories));
  return [...defaultCategories];
}

export function saveCategories(list) {
  localStorage.setItem(KEYS.categories, JSON.stringify(list));
}

export function loadProducts() {
  const raw = localStorage.getItem(KEYS.products);
  if (raw) return JSON.parse(raw);
  localStorage.setItem(KEYS.products, JSON.stringify(defaultProducts));
  return [...defaultProducts];
}

export function saveProducts(list) {
  localStorage.setItem(KEYS.products, JSON.stringify(list));
}

export function loadOrders() {
  const raw = localStorage.getItem(KEYS.orders);
  return raw ? JSON.parse(raw) : [];
}

export function saveOrders(orders) {
  localStorage.setItem(KEYS.orders, JSON.stringify(orders));
}

export function loadInventoryLogs() {
  const raw = localStorage.getItem(KEYS.inventoryLogs);
  return raw ? JSON.parse(raw) : [];
}

export function saveInventoryLogs(logs) {
  localStorage.setItem(KEYS.inventoryLogs, JSON.stringify(logs));
}

export function getCategoryName(categories, categoryId) {
  return categories.find((c) => c.id === categoryId)?.name ?? '';
}

export function enrichProduct(product, categories) {
  return {
    ...product,
    category_name: getCategoryName(categories, product.category_id),
  };
}

export function enrichProducts(products, categories) {
  return products.map((p) => enrichProduct(p, categories));
}

export function getMemberById(memberId) {
  const users = loadUsers();
  const user = users.find((u) => u.id === memberId);
  if (!user) return null;
  const { password: _, ...safe } = user;
  return safe;
}

export function addInventoryLog({ productId, changeQuantity, changeType }) {
  const logs = loadInventoryLogs();
  const log = {
    id: nextId(logs),
    product_id: productId,
    change_quantity: changeQuantity,
    change_type: changeType,
    created_at: new Date().toISOString(),
  };
  logs.unshift(log);
  saveInventoryLogs(logs);
  return log;
}
