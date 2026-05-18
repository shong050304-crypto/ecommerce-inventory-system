import { useEffect, useState } from 'react';
import {
  adminFetchSalesByCategory,
  adminFetchTopProducts,
  adminFetchOrderById,
} from '../../../services/adminApi';
import { formatPrice, formatOrderId } from '../../../utils/format';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import '../admin.css';
import './AdminReportsPage.css';

export default function AdminReportsPage() {
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLookupId, setOrderLookupId] = useState('');
  const [orderDetail, setOrderDetail] = useState(null);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    Promise.all([adminFetchSalesByCategory(), adminFetchTopProducts(10)])
      .then(([sales, top]) => {
        setSalesByCategory(sales);
        setTopProducts(top);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLookup = async () => {
    setLookupError('');
    setOrderDetail(null);
    if (!orderLookupId.trim()) return;
    try {
      const order = await adminFetchOrderById(orderLookupId.trim());
      setOrderDetail(order);
    } catch (e) {
      setLookupError(e.message);
    }
  };

  const maxSales = Math.max(...salesByCategory.map((s) => s.total), 1);

  if (loading) return <p className="page-loading">載入中…</p>;

  return (
    <div>
      <header className="admin-page-header">
        <div>
          <h1>報表分析</h1>
          <p>銷售統計與訂單明細還原</p>
        </div>
      </header>

      <div className="admin-grid-2" style={{ marginBottom: 24 }}>
        <section className="admin-card">
          <div className="admin-card__header">各分類銷售總額（已付款訂單）</div>
          <div className="report-bars" style={{ padding: 20 }}>
            {salesByCategory.map((s) => (
              <div key={s.category_id} className="report-bar-row">
                <span className="report-bar-label">{s.category_name}</span>
                <div className="report-bar-track">
                  <div
                    className="report-bar-fill"
                    style={{ width: `${(s.total / maxSales) * 100}%` }}
                  />
                </div>
                <span className="report-bar-value">{formatPrice(s.total)}</span>
              </div>
            ))}
            {salesByCategory.every((s) => s.total === 0) && (
              <p style={{ color: 'var(--color-neutral-600)' }}>尚無銷售資料</p>
            )}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card__header">熱銷商品 TOP 10</div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>商品</th>
                <th>銷量</th>
                <th>營收</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-neutral-600)' }}>
                    尚無資料
                  </td>
                </tr>
              ) : (
                topProducts.map((p, i) => (
                  <tr key={p.product_id}>
                    <td>{i + 1}</td>
                    <td>{p.product_name}</td>
                    <td>{p.quantity}</td>
                    <td>{formatPrice(p.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>

      <section className="admin-card">
        <div className="admin-card__header">訂單明細還原</div>
        <div className="order-lookup" style={{ padding: 20 }}>
          <div className="order-lookup__form">
            <Input
              label="訂單 ID"
              placeholder="例如：1"
              value={orderLookupId}
              onChange={(e) => setOrderLookupId(e.target.value)}
            />
            <Button onClick={handleLookup}>查詢</Button>
          </div>
          {lookupError && <div className="auth-form__error">{lookupError}</div>}
          {orderDetail && (
            <div className="order-lookup__result">
              <h3>{formatOrderId(orderDetail.id)} — {orderDetail.member_name}</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>商品</th>
                    <th>單價</th>
                    <th>數量</th>
                    <th>小計</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetail.items.map((item, idx) => (
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
                    <td>{formatPrice(orderDetail.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
