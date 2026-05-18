import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../utils/format';
import Button from '../../components/ui/Button';
import QuantityStepper from '../../components/ui/QuantityStepper';
import EmptyState from '../../components/ui/EmptyState';
import './CartPage.css';

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalAmount } = useCart();

  if (items.length === 0) {
    return (
      <EmptyState
        title="購物車是空的"
        description="快去挑選喜歡的商品吧！"
        actionLabel="前往商品列表"
        actionTo="/products"
      />
    );
  }

  return (
    <div className="cart-page">
      <header className="page-header">
        <h1>購物車</h1>
        <p>共 {items.length} 項商品</p>
      </header>

      <div className="cart-layout">
        <div className="cart-items">
          {items.map((item) => (
            <div key={item.productId} className="cart-item">
              <div className="cart-item__thumb">{item.name.charAt(0)}</div>
              <div className="cart-item__info">
                <Link to={`/products/${item.productId}`} className="cart-item__name">
                  {item.name}
                </Link>
                <p className="cart-item__price">{formatPrice(item.price)}</p>
              </div>
              <QuantityStepper
                value={item.quantity}
                max={item.stock}
                onChange={(q) => updateQuantity(item.productId, q)}
              />
              <p className="cart-item__subtotal">{formatPrice(item.price * item.quantity)}</p>
              <button
                type="button"
                className="cart-item__remove"
                onClick={() => removeItem(item.productId)}
              >
                移除
              </button>
            </div>
          ))}
        </div>

        <aside className="cart-summary">
          <h2>訂單摘要</h2>
          <div className="cart-summary__row">
            <span>商品小計</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
          <div className="cart-summary__row">
            <span>運費</span>
            <span>免運</span>
          </div>
          <div className="cart-summary__total">
            <span>合計</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
          <Link to="/checkout">
            <Button fullWidth size="lg">
              前往結帳
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}
