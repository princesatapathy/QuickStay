import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import AuthLayout from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Form';
import { Banner } from '../components/ui/Display';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword({ email });
      // The email travels in router state, not the URL, so it stays out of history and logs.
      navigate('/reset-password', { state: { email } });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Could not send the code. Try again.');
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we will send you a 6-digit code."
      footer={<Link to="/login" className="font-bold text-accent hover:underline">Back to log in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Banner tone="error">{error}</Banner>}
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" />
        <Button type="submit" size="lg" className="w-full" loading={loading}>Send code</Button>
      </form>
    </AuthLayout>
  );
}
