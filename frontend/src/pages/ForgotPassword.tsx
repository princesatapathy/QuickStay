import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import AuthLayout from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Form';
import { Banner } from '../components/ui/Display';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword({ email });
      setSent(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Could not send the reset link. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we will send you a link to choose a new one."
      footer={<Link to="/login" className="font-bold text-accent hover:underline">Back to log in</Link>}
    >
      {sent ? (
        <Banner tone="success">If an account exists for {email}, a reset link is on its way. It works once and expires in 30 minutes.</Banner>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Banner tone="error">{error}</Banner>}
          <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" />
          <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
