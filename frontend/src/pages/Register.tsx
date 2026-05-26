import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup, signupManager, login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../api/users';
import { Mail, Lock, User, BedDouble, KeyRound } from 'lucide-react';

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
    setLoading(true); setError('');
    try {
      if (accountType === 'manager') {
        await signupManager({ name, email, password, managerCode });
      } else {
        await signup({ name, email, password });
      }
      const loginRes = await login({ email, password });
      const token = loginRes.data?.data?.accessToken;
      if (token) {
        localStorage.setItem('accessToken', token);
        const profileRes = await getProfile();
        const profile = profileRes.data?.data;
        setUser(profile);
        const isManager = profile?.roles?.some((role: string) => role === 'HOTEL_MANAGER' || role === 'ROLE_HOTEL_MANAGER');
        navigate(isManager ? '/admin' : '/', { replace: true });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: { message?: string } } } };
      setError(e.response?.data?.error?.message || e.response?.data?.message || 'Registration failed. Try again.');
    } finally { setLoading(false); }
  };

  const inp = 'flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-200 transition-all';

  return (
    <div className="min-h-screen flex">
      {/* ── Left: hotel photo ──────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80"
          alt="Luxury resort"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-12 left-10 right-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <BedDouble size={16} className="text-gray-900" />
            </div>
            <span className="text-white font-bold text-xl">QuickStay</span>
          </div>
          <h2 className="text-white text-3xl font-bold leading-tight mb-2">
            Join millions of<br />happy travelers
          </h2>
          <p className="text-white/70 text-sm">
            Book exclusive deals at the world's finest hotels.
          </p>
        </div>
      </div>

      {/* ── Right: form ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <BedDouble size={16} className="text-white" />
            </div>
            QuickStay
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-1">Create account</h1>
          <p className="text-gray-500 text-sm mb-8">Join QuickStay today — it's free</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 rounded-xl border border-gray-200 p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setAccountType('guest')}
                className={`rounded-lg py-2 transition-colors ${accountType === 'guest' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Guest
              </button>
              <button
                type="button"
                onClick={() => setAccountType('manager')}
                className={`rounded-lg py-2 transition-colors ${accountType === 'manager' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Manager
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className={inp}>
                <User size={16} className="text-gray-400 shrink-0" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe" required
                  className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className={inp}>
                <Mail size={16} className="text-gray-400 shrink-0" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className={inp}>
                <Lock size={16} className="text-gray-400 shrink-0" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters" minLength={8} required
                  className="flex-1 outline-none text-sm text-gray-800 bg-transparent" />
              </div>
            </div>

            {accountType === 'manager' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Manager Code</label>
                <div className={inp}>
                  <KeyRound size={16} className="text-gray-400 shrink-0" />
                  <input type="password" value={managerCode} onChange={(e) => setManagerCode(e.target.value)}
                    placeholder="Invite code" required
                    className="flex-1 outline-none text-sm text-gray-800 bg-transparent" />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#ff385c] text-white rounded-xl font-semibold hover:bg-[#e21e4a] disabled:opacity-60 transition-colors text-sm mt-2">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-gray-900 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
