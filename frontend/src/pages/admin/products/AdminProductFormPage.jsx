import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  adminFetchProductById,
  adminCreateProduct,
  adminUpdateProduct,
  adminFetchCategories,
} from '../../../services/adminApi';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';
import '../admin.css';
import './AdminProductFormPage.css';

const empty = {
  name: '',
  category_id: '',
  price: '',
  stock: '',
  description: '',
  is_active: true,
};

export default function AdminProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    adminFetchCategories().then(setCategories);
    if (isEdit) {
      adminFetchProductById(id)
        .then((p) =>
          setForm({
            name: p.name,
            category_id: String(p.category_id),
            price: String(p.price),
            stock: String(p.stock),
            description: p.description || '',
            is_active: p.is_active,
          }),
        )
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const update = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('請輸入商品名稱');
    if (!form.category_id) return setError('請選擇分類');

    try {
      if (isEdit) {
        await adminUpdateProduct(id, form);
        showToast('商品已更新');
      } else {
        await adminCreateProduct(form);
        showToast('商品已建立');
      }
      navigate('/admin/products');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="page-loading">載入中…</p>;

  return (
    <div>
      <header className="admin-page-header">
        <div>
          <h1>{isEdit ? '編輯商品' : '新增商品'}</h1>
          <Link to="/admin/products" className="admin-table__link">
            ← 返回列表
          </Link>
        </div>
      </header>

      <form className="admin-form-card" onSubmit={handleSubmit}>
        {error && <div className="auth-form__error">{error}</div>}
        <Input label="商品名稱" value={form.name} onChange={update('name')} required />
        <div className="field">
          <label className="field__label">分類</label>
          <select
            className="admin-toolbar__select"
            style={{ width: '100%' }}
            value={form.category_id}
            onChange={update('category_id')}
            required
          >
            <option value="">請選擇</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-form-row">
          <Input
            label="售價 (NT$)"
            type="number"
            min="0"
            value={form.price}
            onChange={update('price')}
            required
          />
          <Input
            label="庫存數量"
            type="number"
            min="0"
            value={form.stock}
            onChange={update('stock')}
            hint={isEdit ? '唯讀欄位，變動庫存請至「庫存管理」進行進貨或調整' : ''}
            disabled={isEdit}
            required
          />
        </div>
        <div className="field">
          <label className="field__label">商品描述</label>
          <textarea
            className="admin-textarea"
            rows={4}
            value={form.description}
            onChange={update('description')}
          />
        </div>
        <label className="admin-toggle">
          <input type="checkbox" checked={form.is_active} onChange={update('is_active')} />
          上架中
        </label>
        <div className="admin-form-actions">
          <Button type="submit">{isEdit ? '儲存變更' : '建立商品'}</Button>
          <Link to="/admin/products">
            <Button type="button" variant="secondary">
              取消
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
