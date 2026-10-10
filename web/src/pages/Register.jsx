import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { fieldErrors } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { validateRegister } from '../lib/validation.js';
import { Button, TextField } from '../components/ui.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError('');
  };

  async function submit(event) {
    event.preventDefault();
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    setFormError('');
    try {
      await register({ fullName: values.fullName.trim(), email: values.email.trim(), password: values.password });
      navigate('/', { replace: true });
    } catch (err) {
      const serverFields = fieldErrors(err);
      if (err.code === 'EMAIL_TAKEN') setErrors({ email: 'An account with this email already exists. Try logging in.' });
      else if (Object.keys(serverFields).length > 0) setErrors(serverFields);
      else setFormError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2>Create your account</h2>
      <p className="sub">One account for the web and the mobile app.</p>

      {formError && (
        <div className="banner error" role="alert" style={{ marginBottom: 18 }}>
          {formError}
        </div>
      )}

      <form className="form" onSubmit={submit} noValidate>
        <TextField label="Full name" icon={User} value={values.fullName} onChange={set('fullName')} error={errors.fullName} placeholder="Ada Lovelace" autoComplete="name" />
        <TextField label="Email" type="email" icon={Mail} value={values.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" autoComplete="email" inputMode="email" />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          icon={Lock}
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
          placeholder="Create a password"
          autoComplete="new-password"
          trailing={
            <button type="button" className="icon-btn reveal" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
        <Button type="submit" loading={loading} className="btn-block">
          Create account
        </Button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
