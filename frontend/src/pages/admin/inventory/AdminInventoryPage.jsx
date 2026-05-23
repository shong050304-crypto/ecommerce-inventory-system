import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetchInventory, adminPurchaseStock, adminAdjustStock } from '../../../services/adminApi';
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
  const [modalType, setModalType] = useState('purchase'); // 'purchase' or 'adjust'
  const [adjustType, setAdjustType] = useState('increase'); // 'increase' or 'decrease'
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
    setModalType('purchase');
    setModalOpen(true);
  };

  const openAdjust = (product) => {
    setSelected(product);
    setQuantity('');
    setModalType('adjust');
    setAdjustType('increase');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const qtyInput = Number(quantity);
    if (!qtyInput || qtyInput <= 0) {
      showToast('請輸入有效數量', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (modalType === 'purchase') {
        await adminPurchaseStock(selected.id, qtyInput);
        showToast(`已為「${selected.name}」進貨 ${qtyInput} 件`);
      } else {
        const qtyAdjust = adjustType === 'increase' ? qtyInput : -qtyInput;
        await adminAdjustStock(selected.id, qtyAdjust);
        showToast(`已為「${selected.name}」進行庫存調整：${qtyAdjust > 0 ? '+' : ''}${qtyAdjust} 件`);
      }
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
          <p>查看庫存並執行進貨與調整</p>
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
                      style={{ marginRight: 12 }}
                    >
                      進貨
                    </button>
                    <button
                      type="button"
                      className="admin-table__link"
                      onClick={() => openAdjust(p)}
                    >
                      調整
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
        title={modalType === 'purchase' ? "商品進貨" : "庫存調整"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '處理中…' : '確認'}
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
            {modalType === 'adjust' && (
              <div style={{ display: 'flex', gap: 24, padding: '4px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="adjustType"
                    value="increase"
                    checked={adjustType === 'increase'}
                    onChange={() => setAdjustType('increase')}
                    style={{ marginRight: 6 }}
                  />
                  調整增加 (+)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="adjustType"
                    value="decrease"
                    checked={adjustType === 'decrease'}
                    onChange={() => setAdjustType('decrease')}
                    style={{ marginRight: 6 }}
                  />
                  調整減少 (-)
                </label>
              </div>
            )}
            <Input
              label={modalType === 'purchase' ? "進貨數量" : "調整數量"}
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
