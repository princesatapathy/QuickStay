import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { signup, signupManager, login } from '../api/auth';
import { getProfile } from '../api/users';
import { setAccessToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input, PasswordInput } from '../components/ui/Form';
import { Banner } from '../components/ui/Display';

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'guest' | 'manager'>('guest');
  const [managerCode, setManagerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (accountType === 'manager') {
        await signupManager({ name, email, password, managerCode });
      } else {
        await signup({ name, email, password });
      }
      const loginRes = await login({ email, password });
      const token = loginRes.data?.data?.accessToken;
      if (token) {
        setAccessToken(token);
        const profileRes = await getProfile();
        const profile = profileRes.data?.data;
        setUser(profile);
        const isManager = profile?.roles?.some((role: string) => role === 'HOTEL_MANAGER' || role === 'ROLE_HOTEL_MANAGER');
        navigate(isManager ? '/admin' : '/', { replace: true });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: { message?: string } } } };
      setError(e.response?.data?.error?.message || e.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Book in a few taps. Your room is held while you pay."
      footer={<>Already have an account? <Link to="/login" className="font-bold text-accent hover:underline">Log in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1">
          {(['guest', 'manager'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={accountType === t}
              onClick={() => setAccountType(t)}
              className="relative rounded-lg py-2 text-sm font-medium"
            >
              {accountType === t && (
                <motion.span layoutId="acct-pill" className="absolute inset-0 rounded-lg bg-accent" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
              )}
              <span className={`relative ${accountType === t ? 'text-on-accent' : 'text-ink-muted'}`}>
                {t === 'guest' ? 'Guest' : 'Hotel manager'}
              </span>
            </button>
          ))}
        </div>

        {error && <Banner tone="error">{error}</Banner>}
        <Input label="Full name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <PasswordInput label="Password" autoComplete="new-password" required minLength={8} helper="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} />
        {accountType === 'manager' && (
          <Input label="Manager code" required value={managerCode} onChange={(e) => setManagerCode(e.target.value)} helper="Given to you by QuickStay." />
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading}>{loading ? 'Creating account' : 'Create account'}</Button>
      </form>
    </AuthLayout>
  );
}
