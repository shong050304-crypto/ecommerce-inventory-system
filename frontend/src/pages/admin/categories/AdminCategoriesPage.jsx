import { useEffect, useState } from 'react';
import {
  adminFetchCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
} from '../../../services/adminApi';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../context/ToastContext';
import '../admin.css';

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    adminFetchCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || '' });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) return setError('請輸入分類名稱');
    try {
      if (editing) {
        await adminUpdateCategory(editing.id, form);
        showToast('分類已更新');
      } else {
        await adminCreateCategory(form);
        showToast('分類已建立');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`確定刪除「${cat.name}」？`)) return;
    try {
      await adminDeleteCategory(cat.id);
      showToast('已刪除分類');
      load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div>
      <header className="admin-page-header">
        <div>
          <h1>分類管理</h1>
          <p>維護商品分類</p>
        </div>
        <Button onClick={openCreate}>+ 新增分類</Button>
      </header>

      <div className="admin-card">
        {loading ? (
          <p className="page-loading">載入中…</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>名稱</th>
                <th>描述</th>
                <th>商品數</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td>{c.description || '—'}</td>
                  <td>{c.product_count}</td>
                  <td>
                    <div className="admin-table__actions">
                      <button
                        type="button"
                        className="admin-table__link"
                        onClick={() => openEdit(c)}
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        className="admin-table__link admin-table__link--danger"
                        onClick={() => handleDelete(c)}
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

      <Modal
        open={modalOpen}
        title={editing ? '編輯分類' : '新增分類'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>儲存</Button>
          </>
        }
      >
        {error && <div className="auth-form__error">{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="分類名稱"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="描述"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
