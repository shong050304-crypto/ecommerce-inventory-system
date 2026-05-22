import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchProductById } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { formatPrice } from '../../utils/format';
import Button from '../../components/ui/Button';
import QuantityStepper from '../../components/ui/QuantityStepper';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetchProductById(id)
      .then((p) => {
        setProduct(p);
        setQuantity(1);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="page-loading">載入中…</p>;
  if (error) {
    return (
      <div>
        <p className="product-detail__error">{error}</p>
        <Link to="/products">返回商品列表</Link>
      </div>
    );
  }

  const soldOut = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  const handleAdd = () => {
    if (!isAuthenticated) {
      showToast('請先登入會員以使用購物車功能！', 'error');
      navigate('/login');
      return;
    }
    addItem(product, quantity);
    showToast(`已將 ${quantity} 件「${product.name}」加入購物車`);
  };

  return (
    <div className="product-detail">
      <Link to="/products" className="product-detail__back">
        ← 返回商品列表
      </Link>
      <div className="product-detail__grid">
        <div className="product-detail__image">
          <span>{product.name.charAt(0)}</span>
        </div>
        <div className="product-detail__info">
          <span className="product-detail__category">{product.category_name}</span>
          <h1>{product.name}</h1>
          <p className="product-detail__price">{formatPrice(product.price)}</p>
          {soldOut ? (
            <p className="product-detail__stock product-detail__stock--out">已售完</p>
          ) : (
            <>
              <p className="product-detail__stock">
                剩餘 {product.stock} 件
                {lowStock && <span className="product-detail__low"> · 庫存偏低</span>}
              </p>
              <div className="product-detail__actions">
                <QuantityStepper
                  value={quantity}
                  min={1}
                  max={product.stock}
                  onChange={setQuantity}
                />
                <Button onClick={handleAdd}>加入購物車</Button>
              </div>
            </>
          )}
          <div className="product-detail__desc">
            <h3>商品描述</h3>
            <p>{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
