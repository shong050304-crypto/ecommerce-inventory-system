import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetchInventoryLogs } from '../../../services/adminApi';
import { adminFetchProducts } from '../../../services/adminApi';
import { formatDate } from '../../../utils/format';
import '../admin.css';

const TYPE_LABELS = {
  purchase: '進貨',
  order_deduct: '訂單扣減',
  cancel_return: '取消退回',
};

export default function AdminInventoryLogsPage() {
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [changeType, setChangeType] = useState('');

  useEffect(() => {
    adminFetchProducts({}).then(setProducts);
  }, []);

  useEffect(() => {
    setLoading(true);
    adminFetchInventoryLogs({ productId, changeType })
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [productId, changeType]);

  return (
    <div>
      <header className="admin-page-header">
        <div>
          <h1>庫存異動紀錄</h1>
          <p>追蹤進貨、售出與退回</p>
        </div>
        <Link to="/admin/inventory" className="admin-table__link">
          ← 庫存總覽
        </Link>
      </header>

      <div className="admin-toolbar">
        <select
          className="admin-toolbar__select"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="">全部商品</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="admin-toolbar__select"
          value={changeType}
          onChange={(e) => setChangeType(e.target.value)}
        >
          <option value="">全部類型</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-card">
        {loading ? (
          <p className="page-loading">載入中…</p>
        ) : logs.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--color-neutral-600)' }}>尚無紀錄</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>時間</th>
                <th>商品</th>
                <th>變動數量</th>
                <th>類型</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.created_at)}</td>
                  <td>{log.product_name}</td>
                  <td
                    className={
                      log.change_quantity > 0 ? 'qty-positive' : 'qty-negative'
                    }
                  >
                    {log.change_quantity > 0 ? '+' : ''}
                    {log.change_quantity}
                  </td>
                  <td>{TYPE_LABELS[log.change_type] || log.change_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

