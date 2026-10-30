import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import AuthLayout from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input, PasswordInput } from '../components/ui/Form';
import { Banner } from '../components/ui/Display';

export default function ResetPassword() {
  const location = useLocation();
  const emailFromPreviousStep = (location.state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(emailFromPreviousStep);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmation) {
      setError('The two passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword({ email, otp: code, newPassword });
      setDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Could not reset the password. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const logInLink = <Link to="/login" className="font-bold text-accent hover:underline">Log in</Link>;

  return (
    <AuthLayout
      title="Enter your code"
      subtitle="Type the 6-digit code from your email and choose a new password."
      footer={done ? null : <>No code? <Link to="/forgot-password" className="font-bold text-accent hover:underline">Send a new code</Link></>}
    >
      {done ? (
        <div className="space-y-4">
          <Banner tone="success">Your password has been changed.</Banner>
          {logInLink}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {emailFromPreviousStep && (
            <p className="text-sm text-ink-muted">If an account exists for {emailFromPreviousStep}, a code is on its way. It works once and expires in 10 minutes.</p>
          )}
          {error && <Banner tone="error">{error}</Banner>}
          <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} />
          <Input
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
          />
          <PasswordInput label="New password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(''); }} />
          <PasswordInput label="Confirm new password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(e) => { setConfirmation(e.target.value); setError(''); }} />
          <Button type="submit" size="lg" className="w-full" loading={loading}>Set new password</Button>
        </form>
      )}
    </AuthLayout>
  );
}
