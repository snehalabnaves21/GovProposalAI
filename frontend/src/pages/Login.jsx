import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DocumentTextIcon, ExclamationTriangleIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResendVerification = async () => {
    setResending(true);
    setResendMessage('');
    try {
      const res = await api.post('/api/auth/resend-verification', { email });
      setResendMessage(res.data.message || 'Verification email resent.');
    } catch {
      setResendMessage('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || '';
      if (err.response?.status === 403 && detail.startsWith('PASSWORD_EXPIRED|')) {
        // Password expired — redirect to reset page with token
        const resetToken = detail.split('|')[1];
        navigate(`/reset-password?token=${resetToken}&expired=1`);
        return;
      } else if (err.response?.status === 403 && detail.toLowerCase().includes('verify')) {
        setNeedsVerification(true);
        setError(detail);
      } else {
        setError(detail || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2.5 mb-4">
            <div className="bg-accent rounded-lg p-2">
              <DocumentTextIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-navy">
            GovProposal <span className="text-accent">AI</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            AI-powered government proposal generation
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-navy mb-6 text-center">
            Sign in to your account
          </h2>

          {/* Error */}
          {error && (
            <div className={`border rounded-lg p-3 mb-5 flex items-start gap-2 ${needsVerification ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
              {needsVerification ? (
                <EnvelopeIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm ${needsVerification ? 'text-amber-700' : 'text-red-700'}`}>{error}</p>
                {needsVerification && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resending}
                      className="text-xs font-medium text-blue hover:text-blue-light transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {resending ? 'Sending...' : 'Resend verification email'}
                    </button>
                    {resendMessage && (
                      <p className="text-xs text-accent font-medium mt-1">{resendMessage}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-blue hover:text-blue-light no-underline font-medium"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-blue hover:text-blue-light no-underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}