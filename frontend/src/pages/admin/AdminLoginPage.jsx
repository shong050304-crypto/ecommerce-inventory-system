import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import '../auth/AuthPages.css';
import './AdminLoginPage.css';

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="auth-card admin-login-card">
        <h1>管理後台登入</h1>
        <p className="auth-card__subtitle">電商訂單與庫存管理系統</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-form__error">{error}</div>}
          <Input
            label="管理員帳號"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
          <Input
            label="密碼"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? '登入中…' : '登入後台'}
          </Button>
        </form>
        <div className="auth-card__demo">示範帳號：admin@example.com / admin1234</div>
        <p className="auth-card__footer">
          <Link to="/products">← 返回會員商城</Link>
        </p>
      </div>
    </div>
  );
}
