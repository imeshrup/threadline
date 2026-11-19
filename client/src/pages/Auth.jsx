import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/ui';

function AuthForm({ mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;
  const isLogin = mode === 'login';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="container auth">
      <form className="panel auth-card" onSubmit={submit}>
        <h1>{isLogin ? 'Welcome back' : 'Create account'}</h1>
        <p className="muted">{isLogin ? 'Sign in to check out faster and track orders.' : 'Join for order tracking, wishlists and early access.'}</p>
        {!isLogin && (
          <label className="field"><span>Name</span><input required autoComplete="name" value={form.name} onChange={set('name')} /></label>
        )}
        <label className="field"><span>Email</span><input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label className="field"><span>Password</span><input type="password" required minLength={6} autoComplete={isLogin ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} /></label>
        <Alert>{error}</Alert>
        <button className="btn btn-block btn-lg" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
        <p className="center small">
          {isLogin ? <>New here? <Link to="/register" state={location.state}>Create an account</Link></> : <>Already have an account? <Link to="/login" state={location.state}>Sign in</Link></>}
        </p>
        {isLogin && <p className="center muted small">Demo: customer@threadline.test / password123 · admin@threadline.test / admin123</p>}
      </form>
    </div>
  );
}

export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
