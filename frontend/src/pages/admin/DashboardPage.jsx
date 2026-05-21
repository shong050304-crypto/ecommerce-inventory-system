import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardStats } from '../../services/adminApi';
import { formatPrice, formatDate, formatOrderId } from '../../utils/format';
import StatCard from '../../components/ui/StatCard';
import { PaymentBadge, OrderBadge } from '../../components/ui/StatusBadge';
import './admin.css';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="page-loading">載入中…</p>;
  if (!stats) return null;

  return (
    <div>
      <header className="admin-page-header">
        <div>
          <h1>儀表板</h1>
          <p>營運概況一目了然</p>
        </div>
      </header>

      <div className="admin-stats">
        <StatCard label="今日訂單" value={stats.today_order_count} variant="primary" />
        <StatCard label="待處理訂單" value={stats.processing_order_count} variant="warning" />
        <StatCard label="低庫存商品" value={stats.low_stock_count} variant="danger" />
        <StatCard label="本月營業額" value={formatPrice(stats.monthly_revenue)} />
      </div>

      <div className="admin-grid-2">
        <section className="admin-card">
          <div className="admin-card__header">最近訂單</div>
          {stats.recent_orders.length === 0 ? (
            <p style={{ padding: 20, color: 'var(--color-neutral-600)' }}>尚無訂單</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>訂單</th>
                  <th>會員</th>
                  <th>金額</th>
                  <th>狀態</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_orders.map((o) => (
                  <tr key={o.id}>
                    <td>{formatOrderId(o.id)}</td>
                    <td>{o.member_name}</td>
                    <td>{formatPrice(o.total_amount)}</td>
                    <td>
                      <PaymentBadge status={o.payment_status} />
                    </td>
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
        </section>

        <section className="admin-card">
          <div className="admin-card__header">低庫存警示</div>
          {stats.low_stock_products.length === 0 ? (
            <p style={{ padding: 20, color: 'var(--color-neutral-600)' }}>庫存狀況良好</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>商品</th>
                  <th>庫存</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stats.low_stock_products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className={p.stock === 0 ? 'stock--out' : 'stock--low'}>{p.stock}</td>
                    <td>
                      <Link to="/admin/inventory" className="admin-table__link">
                        進貨
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
