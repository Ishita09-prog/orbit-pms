import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Info, Lock, Mail } from 'lucide-react';
import { fieldErrors } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { SHOW_DEMO } from '../lib/constants.js';
import { validateLogin } from '../lib/validation.js';
import { Button, TextField } from '../components/ui.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function Login() {
  const { login, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError('');
    if (notice) clearNotice();
  };

  async function submit(event) {
    event.preventDefault();
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    setFormError('');
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      const serverFields = fieldErrors(err);
      if (Object.keys(serverFields).length > 0) setErrors(serverFields);
      else setFormError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2>Welcome back</h2>
      <p className="sub">Log in to pick up where you left off.</p>

      {notice && (
        <div className="banner warn" role="status" style={{ marginBottom: 18 }}>
          <Info size={18} aria-hidden="true" /> {notice}
        </div>
      )}
      {formError && (
        <div className="banner error" role="alert" style={{ marginBottom: 18 }}>
          {formError}
        </div>
      )}

      <form className="form" onSubmit={submit} noValidate>
        <TextField label="Email" type="email" icon={Mail} value={values.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" autoComplete="email" inputMode="email" />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          icon={Lock}
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          placeholder="Your password"
          autoComplete="current-password"
          trailing={
            <button type="button" className="icon-btn reveal" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
        <Button type="submit" loading={loading} className="btn-block">
          Log in
        </Button>
        {SHOW_DEMO && (
          <Button type="button" variant="ghost" className="btn-block" onClick={() => setValues({ email: 'demo@example.com', password: 'Demo@1234' })}>
            Fill in demo account
          </Button>
        )}
      </form>

      <p className="auth-switch">
        New to Orbit? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
