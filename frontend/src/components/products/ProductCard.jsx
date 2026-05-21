import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/format';
import Button from '../ui/Button';
import './ProductCard.css';

export default function ProductCard({ product, onAddToCart }) {
  const soldOut = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card__image-link">
        <div className="product-card__image">
          <span className="product-card__placeholder">{product.name.charAt(0)}</span>
        </div>
      </Link>
      <div className="product-card__body">
        <span className="product-card__category">{product.category_name}</span>
        <Link to={`/products/${product.id}`} className="product-card__title">
          {product.name}
        </Link>
        <p className="product-card__price">{formatPrice(product.price)}</p>
        {soldOut ? (
          <span className="product-card__stock product-card__stock--out">已售完</span>
        ) : lowStock ? (
          <span className="product-card__stock product-card__stock--low">剩餘 {product.stock} 件</span>
        ) : null}
        <Button
          fullWidth
          size="sm"
          disabled={soldOut}
          onClick={() => onAddToCart(product)}
        >
          {soldOut ? '無法購買' : '加入購物車'}
        </Button>
      </div>
    </article>
  );
}
