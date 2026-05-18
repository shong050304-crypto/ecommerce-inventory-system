import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminFetchOrderById, adminUpdateOrderStatus } from '../../../services/adminApi';
import { formatPrice, formatDate, formatOrderId } from '../../../utils/format';
import { PaymentBadge, OrderBadge } from '../../../components/ui/StatusBadge';
import { PAYMENT_STATUS, ORDER_STATUS } from '../../../constants/status';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';
import '../admin.css';
import './AdminOrderDetailPage.css';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminFetchOrderById(id)
      .then((o) => {
        setOrder(o);
        setPaymentStatus(o.payment_status);
        setOrderStatus(o.order_status);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await adminUpdateOrderStatus(id, {
        payment_status: paymentStatus,
        order_status: orderStatus,
      });
      setOrder(updated);
      showToast('訂單狀態已更新');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="page-loading">載入中…</p>;
  if (!order) return <p>找不到訂單</p>;

  return (
    <div>
      <Link to="/admin/orders" className="admin-table__link">
        ← 返回訂單列表
      </Link>

      <header className="admin-order-header">
        <div>
          <h1>{formatOrderId(order.id)}</h1>
          <p>{formatDate(order.created_at)}</p>
        </div>
        <div className="admin-order-badges">
          <PaymentBadge status={order.payment_status} />
          <OrderBadge status={order.order_status} />
        </div>
      </header>

      <div className="admin-order-grid">
        <section className="admin-card admin-order-panel">
          <div className="admin-card__header">會員資訊</div>
          <div style={{ padding: 20 }}>
            <p>
              <strong>姓名</strong> {order.member?.name}
            </p>
            <p>
              <strong>Email</strong> {order.member?.email}
            </p>
            <p>
              <strong>電話</strong> {order.shipping_phone}
            </p>
            <p>
              <strong>地址</strong> {order.shipping_address}
            </p>
          </div>
        </section>

        <section className="admin-card admin-order-panel admin-order-panel--wide">
          <div className="admin-card__header">訂單明細</div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>商品</th>
                <th>結帳單價</th>
                <th>數量</th>
                <th>小計</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.product_name}</td>
                  <td>{formatPrice(item.unit_price)}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>
                  <strong>總計</strong>
                </td>
                <td>
                  <strong>{formatPrice(order.total_amount)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="admin-card admin-order-panel">
          <div className="admin-card__header">狀態操作</div>
          <div className="admin-status-form">
            <div className="field">
              <label className="field__label">付款狀態</label>
              <select
                className="admin-toolbar__select"
                style={{ width: '100%' }}
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label">訂單狀態</label>
              <select
                className="admin-toolbar__select"
                style={{ width: '100%' }}
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
              >
                {Object.entries(ORDER_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <Button fullWidth onClick={handleSave} disabled={saving}>
              {saving ? '儲存中…' : '儲存狀態'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
