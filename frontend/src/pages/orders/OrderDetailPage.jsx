import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchOrderById, simulatePayment, requestCancelOrder } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { formatPrice, formatDate, formatOrderId } from '../../utils/format';
import { PaymentBadge, OrderBadge } from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import './OrderDetailPage.css';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    setLoading(true);
    fetchOrderById(id, user.id)
      .then(setOrder)
      .finally(() => setLoading(false));
  };

  useEffect(load, [id, user.id]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const updated = await simulatePayment(id, user.id);
      setOrder(updated);
      showToast('付款成功！');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('請輸入您申請取消此訂單的原因（必填）：');
    if (reason === null) return; // 使用者點選取消
    const cleanReason = reason.trim();
    if (!cleanReason) {
      showToast('必須輸入取消原因！', 'error');
      return;
    }

    setCancelling(true);
    try {
      const updated = await requestCancelOrder(id, user.id, cleanReason);
      setOrder(updated);
      showToast('已送出取消訂單申請，待管理端審核');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <p className="page-loading">載入中…</p>;
  if (!order) return <p>找不到訂單</p>;

  return (
    <div className="order-detail">
      <Link to="/orders" className="order-detail__back">
        ← 返回我的訂單
      </Link>

      <header className="order-detail__header">
        <div>
          <h1>{formatOrderId(order.id)}</h1>
          <p className="order-detail__date">{formatDate(order.created_at)}</p>
        </div>
        <div className="order-detail__badges">
          <PaymentBadge status={order.payment_status} />
          <OrderBadge status={order.order_status} />
        </div>
      </header>

      <div className="order-detail__grid">
        <section className="order-detail__card">
          <h2>訂單明細</h2>
          <table className="order-table">
            <thead>
              <tr>
                <th>商品</th>
                <th>單價</th>
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
                <td colSpan={3}>總計</td>
                <td>{formatPrice(order.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <aside className="order-detail__sidebar">
          <section className="order-detail__card">
            <h2>收件資訊</h2>
            <p>
              <strong>電話</strong>
              <br />
              {order.shipping_phone}
            </p>
            <p>
              <strong>地址</strong>
              <br />
              {order.shipping_address}
            </p>
          </section>

          {order.payment_status === 'unpaid' && order.order_status === 'processing' && (
            <section className="order-detail__card order-detail__pay">
              <h2>付款</h2>
              <p className="order-detail__pay-hint">期末展示用：點擊模擬完成付款</p>
              <Button fullWidth onClick={handlePay} disabled={paying}>
                {paying ? '處理中…' : '模擬付款'}
              </Button>
            </section>
          )}

          {order.order_status === 'processing' && (
            <section className="order-detail__card" style={{ marginTop: 16 }}>
              <h2>訂單操作</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-neutral-500)', marginBottom: 12 }}>
                在商品出貨前，您可以隨時申請取消這筆訂單。
              </p>
              <Button fullWidth variant="danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? '處理中…' : '申請取消訂單'}
              </Button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
