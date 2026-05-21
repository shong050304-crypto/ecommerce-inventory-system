import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetchInventory, adminPurchaseStock } from '../../../services/adminApi';
import { formatDate } from '../../../utils/format';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../context/ToastContext';
import '../admin.css';

export default function AdminInventoryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    adminFetchInventory()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openPurchase = (product) => {
    setSelected(product);
    setQuantity('');
    setModalOpen(true);
  };

  const handlePurchase = async () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      showToast('請輸入有效進貨數量', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await adminPurchaseStock(selected.id, qty);
      showToast(`已為「${selected.name}」進貨 ${qty} 件`);
      setModalOpen(false);
      load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <header className="admin-page-header">
        <div>
          <h1>庫存總覽</h1>
          <p>查看庫存並執行進貨</p>
        </div>
        <Link to="/admin/inventory/logs" className="admin-table__link">
          查看異動紀錄 →
        </Link>
      </header>

      <div className="admin-card">
        {loading ? (
          <p className="page-loading">載入中…</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>商品</th>
                <th>分類</th>
                <th>當前庫存</th>
                <th>最近異動</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.category_name}</td>
                  <td
                    className={
                      p.stock === 0 ? 'stock--out' : p.stock <= 5 ? 'stock--low' : ''
                    }
                  >
                    {p.stock}
                  </td>
                  <td>{p.last_change_at ? formatDate(p.last_change_at) : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-table__link"
                      onClick={() => openPurchase(p)}
                    >
                      進貨
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        title="商品進貨"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handlePurchase} disabled={submitting}>
              {submitting ? '處理中…' : '確認進貨'}
            </Button>
          </>
        }
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p>
              <strong>商品</strong> {selected.name}
              <br />
              <strong>目前庫存</strong> {selected.stock} 件
            </p>
            <Input
              label="進貨數量"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
