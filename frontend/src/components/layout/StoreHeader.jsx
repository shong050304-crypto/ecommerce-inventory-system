import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import './StoreHeader.css';

export default function StoreHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/products');
  };

  return (
    <header className="store-header">
      <div className="store-header__inner">
        <Link to="/products" className="store-header__logo">
          商品商城
        </Link>
        <nav className="store-header__nav">
          <NavLink to="/products" className={({ isActive }) => (isActive ? 'active' : '')}>
            商品
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/cart" className={({ isActive }) => (isActive ? 'active' : '')}>
                購物車
                {totalCount > 0 && <span className="store-header__badge">{totalCount}</span>}
              </NavLink>
              <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
                我的訂單
              </NavLink>
            </>
          )}
        </nav>
        <div className="store-header__actions">
          {isAuthenticated ? (
            <div className="store-header__user">
              <span className="store-header__name">{user.name}</span>
              <button type="button" className="store-header__logout" onClick={handleLogout}>
                登出
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="store-header__link">
                登入
              </Link>
              <Link to="/register" className="store-header__btn-register">
                註冊
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
