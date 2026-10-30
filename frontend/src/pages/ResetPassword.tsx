import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import AuthLayout from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { PasswordInput } from '../components/ui/Form';
import { Banner } from '../components/ui/Display';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
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
      await resetPassword({ token: token ?? '', newPassword });
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
      title="Choose a new password"
      subtitle="Use at least 8 characters."
      footer={done ? null : logInLink}
    >
      {!token ? (
        <div className="space-y-4">
          <Banner tone="error">This reset link is missing or incomplete.</Banner>
          <Link to="/forgot-password" className="font-bold text-accent hover:underline">Request a new link</Link>
        </div>
      ) : done ? (
        <div className="space-y-4">
          <Banner tone="success">Your password has been changed.</Banner>
          {logInLink}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Banner tone="error">{error}</Banner>}
          <PasswordInput label="New password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(''); }} />
          <PasswordInput label="Confirm new password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(e) => { setConfirmation(e.target.value); setError(''); }} />
          <Button type="submit" size="lg" className="w-full" loading={loading}>Set new password</Button>
        </form>
      )}
    </AuthLayout>
  );
}
