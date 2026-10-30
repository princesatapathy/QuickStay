import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '../api/auth';
import { getProfile } from '../api/users';
import { setAccessToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input, PasswordInput } from '../components/ui/Form';
import { Banner } from '../components/ui/Display';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login({ email, password });
      const token = res.data?.data?.accessToken;
      if (token) {
        setAccessToken(token);
        const profileRes = await getProfile();
        setUser(profileRes.data?.data);
        navigate(redirect, { replace: true });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your bookings and reserve your next stay."
      footer={<>New here? <Link to="/register" className="font-bold text-accent hover:underline">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Banner tone="error">{error}</Banner>}
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" />
        <PasswordInput label="Password" autoComplete="current-password" required value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>{loading ? 'Logging in' : 'Log in'}</Button>
      </form>
    </AuthLayout>
  );
}
