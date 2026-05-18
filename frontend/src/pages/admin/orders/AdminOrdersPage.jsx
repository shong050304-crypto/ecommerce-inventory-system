import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetchOrders } from '../../../services/adminApi';
import { formatPrice, formatDate, formatOrderId } from '../../../utils/format';
import { PaymentBadge, OrderBadge } from '../../../components/ui/StatusBadge';
import { PAYMENT_STATUS, ORDER_STATUS } from '../../../constants/status';
import '../admin.css';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [orderStatus, setOrderStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    adminFetchOrders({ search, paymentStatus, orderStatus })
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [search, paymentStatus, orderStatus]);

  return (
    <div>
      <header className="admin-page-header">
        <div>
          <h1>訂單管理</h1>
          <p>查詢與處理訂單</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <input
          className="admin-toolbar__search"
          placeholder="訂單編號、會員名稱或 email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-toolbar__select"
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
        >
          <option value="">付款狀態</option>
          {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select
          className="admin-toolbar__select"
          value={orderStatus}
          onChange={(e) => setOrderStatus(e.target.value)}
        >
          <option value="">訂單狀態</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-card">
        {loading ? (
          <p className="page-loading">載入中…</p>
        ) : orders.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--color-neutral-600)' }}>沒有符合條件的訂單</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>訂單ID</th>
                <th>會員</th>
                <th>總額</th>
                <th>付款</th>
                <th>訂單狀態</th>
                <th>時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{formatOrderId(o.id)}</td>
                  <td>
                    {o.member_name}
                    <br />
                    <small style={{ color: 'var(--color-neutral-600)' }}>{o.member_email}</small>
                  </td>
                  <td>{formatPrice(o.total_amount)}</td>
                  <td>
                    <PaymentBadge status={o.payment_status} />
                  </td>
                  <td>
                    <OrderBadge status={o.order_status} />
                  </td>
                  <td>{formatDate(o.created_at)}</td>
                  <td>
                    <Link to={`/admin/orders/${o.id}`} className="admin-table__link">
                      詳情
                    </Link>
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
