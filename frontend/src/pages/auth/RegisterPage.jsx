import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import './AuthPages.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('請輸入姓名');
    if (!form.email.trim()) return setError('請輸入電子郵件');
    if (form.password.length < 6) return setError('密碼至少 6 個字元');
    if (form.password !== form.confirmPassword) return setError('兩次密碼不一致');
    if (!form.phone.trim()) return setError('請輸入聯絡電話');
    if (!form.address.trim()) return setError('請輸入送貨地址');

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      navigate('/products', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>會員註冊</h1>
        <p className="auth-card__subtitle">建立帳號開始購物</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-form__error">{error}</div>}
          <Input label="姓名" name="name" value={form.name} onChange={update('name')} />
          <Input
            label="電子郵件"
            name="email"
            type="email"
            value={form.email}
            onChange={update('email')}
          />
          <Input
            label="密碼"
            name="password"
            type="password"
            value={form.password}
            onChange={update('password')}
            hint="至少 6 個字元"
          />
          <Input
            label="確認密碼"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
          />
          <Input label="聯絡電話" name="phone" value={form.phone} onChange={update('phone')} />
          <Input label="送貨地址" name="address" value={form.address} onChange={update('address')} />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? '註冊中…' : '註冊'}
          </Button>
        </form>
        <p className="auth-card__footer">
          已有帳號？<Link to="/login">前往登入</Link>
        </p>
      </div>
    </div>
  );
}
