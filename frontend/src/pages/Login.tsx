import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../api/users';
import { Mail, Lock, BedDouble } from 'lucide-react';

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
    setLoading(true); setError('');
    try {
      const res = await login({ email, password });
      const token = res.data?.data?.accessToken;
      if (token) {
        localStorage.setItem('accessToken', token);
        const profileRes = await getProfile();
        setUser(profileRes.data?.data);
        navigate(redirect, { replace: true });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left: hotel photo ──────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80"
          alt="Luxury hotel"
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
            Your perfect stay<br />starts here
          </h2>
          <p className="text-white/70 text-sm">
            Thousands of hotels. Instant booking. Real-time pricing.
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

          <h1 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-8">Sign in to your QuickStay account</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-200 transition-all">
                <Mail size={16} className="text-gray-400 shrink-0" />
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-200 transition-all">
                <Lock size={16} className="text-gray-400 shrink-0" />
                <input
                  type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="flex-1 outline-none text-sm text-gray-800 bg-transparent"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-[#ff385c] text-white rounded-xl font-semibold hover:bg-[#e21e4a] disabled:opacity-60 transition-colors text-sm mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-gray-900 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
