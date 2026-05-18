import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  adminFetchProducts,
  adminToggleProductActive,
  adminDeleteProduct,
} from '../../../services/adminApi';
import { adminFetchCategories } from '../../../services/adminApi';
import { formatPrice } from '../../../utils/format';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { useToast } from '../../../context/ToastContext';
import '../admin.css';

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      adminFetchProducts({ categoryId, search, activeFilter }),
      adminFetchCategories(),
    ])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [categoryId, search, activeFilter]);

  const handleToggle = async (id) => {
    try {
      await adminToggleProductActive(id);
      showToast('已更新上架狀態');
      load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`確定刪除「${name}」？`)) return;
    try {
      await adminDeleteProduct(id);
      showToast('已刪除商品');
      load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div>
      <header className="admin-page-header">
        <div>
          <h1>商品管理</h1>
          <p>維護商品資料與上架狀態</p>
        </div>
        <Link to="/admin/products/new">
          <Button>+ 新增商品</Button>
        </Link>
      </header>

      <div className="admin-toolbar">
        <input
          className="admin-toolbar__search"
          placeholder="搜尋商品名稱…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-toolbar__select"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">全部分類</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="admin-toolbar__select"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="">全部狀態</option>
          <option value="active">上架中</option>
          <option value="inactive">已下架</option>
        </select>
      </div>

      <div className="admin-card">
        {loading ? (
          <p className="page-loading">載入中…</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>名稱</th>
                <th>分類</th>
                <th>售價</th>
                <th>庫存</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>P{p.id.toString().padStart(3, '0')}</td>
                  <td>{p.name}</td>
                  <td>{p.category_name}</td>
                  <td>{formatPrice(p.price)}</td>
                  <td
                    className={
                      p.stock === 0 ? 'stock--out' : p.stock <= 5 ? 'stock--low' : ''
                    }
                  >
                    {p.stock}
                  </td>
                  <td>
                    <Badge variant={p.is_active ? 'success' : 'neutral'}>
                      {p.is_active ? '上架' : '下架'}
                    </Badge>
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <Link to={`/admin/products/${p.id}/edit`} className="admin-table__link">
                        編輯
                      </Link>
                      <button
                        type="button"
                        className="admin-table__link"
                        onClick={() => handleToggle(p.id)}
                      >
                        {p.is_active ? '下架' : '上架'}
                      </button>
                      <button
                        type="button"
                        className="admin-table__link admin-table__link--danger"
                        onClick={() => handleDelete(p.id, p.name)}
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
