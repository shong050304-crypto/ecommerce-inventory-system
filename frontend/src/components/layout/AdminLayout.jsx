import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import './AdminLayout.css';

const NAV = [
  { to: '/admin/dashboard', label: '儀表板', icon: '▣', end: true },
  { to: '/admin/products', label: '商品管理', icon: '◇' },
  { to: '/admin/categories', label: '分類管理', icon: '◎', end: true },
  { to: '/admin/orders', label: '訂單管理', icon: '▤' },
  { to: '/admin/inventory', label: '庫存管理', icon: '▥', end: true },
  { to: '/admin/inventory/logs', label: '庫存紀錄', icon: '▦', end: true },
  { to: '/admin/reports', label: '報表分析', icon: '▧', end: true },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/admin/dashboard" className="admin-sidebar__brand">
          管理後台
        </Link>
        <nav className="admin-sidebar__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'active' : ''}`
              }
              end={item.end}
            >
              <span className="admin-sidebar__icon" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <Link to="/products" className="admin-sidebar__store-link" target="_blank">
            前往商城 →
          </Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <h1 className="admin-topbar__title">電商訂單與庫存管理</h1>
          <div className="admin-topbar__user">
            <span>{admin?.name}</span>
            <button type="button" onClick={handleLogout}>
              登出
            </button>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
