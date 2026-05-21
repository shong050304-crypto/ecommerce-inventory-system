import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { createOrder } from '../../services/api';
import { formatPrice } from '../../utils/format';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { items, totalAmount, clearCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (items.length === 0) {
    return (
      <EmptyState
        title="沒有可結帳的商品"
        description="請先將商品加入購物車"
        actionLabel="前往商品列表"
        actionTo="/products"
      />
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) return setError('請輸入聯絡電話');
    if (!address.trim()) return setError('請輸入送貨地址');

    setLoading(true);
    try {
      const order = await createOrder({
        memberId: user.id,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        phone: phone.trim(),
        address: address.trim(),
      });
      clearCart();
      showToast('訂單已建立！');
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <header className="page-header">
        <h1>結帳</h1>
        <p>確認訂單資訊並送出</p>
      </header>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <section className="checkout-section">
            <h2>收件資訊</h2>
            {error && <div className="checkout-form__error">{error}</div>}
            <Input
              label="聯絡電話"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="送貨地址"
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </section>
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? '處理中…' : '確認下單'}
          </Button>
          <Link to="/cart" className="checkout-back">
            返回購物車
          </Link>
        </form>

        <aside className="checkout-summary">
          <h2>訂單摘要</h2>
          <ul className="checkout-summary__list">
            {items.map((item) => (
              <li key={item.productId}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="checkout-summary__total">
            <span>合計</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
