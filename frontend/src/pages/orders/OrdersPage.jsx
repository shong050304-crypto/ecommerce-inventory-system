import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchOrdersByMember } from '../../services/api';
import { formatPrice, formatDate, formatOrderId } from '../../utils/format';
import { PaymentBadge, OrderBadge } from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import './OrdersPage.css';

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'unpaid', label: '未付款' },
  { key: 'processing', label: '處理中' },
  { key: 'completed', label: '已完成' },
];

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrdersByMember(user.id)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user.id]);

  const filtered = orders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'unpaid') return o.payment_status === 'unpaid';
    if (filter === 'processing') return o.order_status === 'processing';
    if (filter === 'completed') return o.order_status === 'completed';
    return true;
  });

  if (loading) return <p className="page-loading">載入訂單中…</p>;

  return (
    <div className="orders-page">
      <header className="page-header">
        <h1>我的訂單</h1>
        <p>查詢訂單狀態與付款進度</p>
      </header>

      <div className="orders-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`orders-filters__btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="尚無訂單"
          description="完成第一筆購物後，訂單會顯示在這裡"
          actionLabel="前往商品列表"
          actionTo="/products"
        />
      ) : (
        <div className="orders-list">
          {filtered.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="order-card">
              <div className="order-card__head">
                <span className="order-card__id">{formatOrderId(order.id)}</span>
                <span className="order-card__date">{formatDate(order.created_at)}</span>
              </div>
              <div className="order-card__badges">
                <PaymentBadge status={order.payment_status} />
                <OrderBadge status={order.order_status} />
              </div>
              <p className="order-card__total">{formatPrice(order.total_amount)}</p>
              <span className="order-card__link">查看詳情 →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
