import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/forgot-password', { email: email.trim() });
      const data = response.data;

      if (data.reset_token) {
        // No SMTP configured — redirect directly to reset page with token
        navigate(`/reset-password?token=${data.reset_token}`);
      } else {
        // SMTP configured — show "check your email" message
        setSent(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col items-center justify-center px-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-3">
          <EnvelopeIcon className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-navy">Reset Your Password</h1>
        <p className="text-gray-500 text-sm mt-1">
          Enter your email and we'll help you reset your password
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <EnvelopeIcon className="w-7 h-7 text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-sm text-gray-500 mb-6">
              If an account exists with {email}, you'll receive a password reset link shortly.
            </p>
            <Link
              to="/login"
              className="text-sm font-medium text-blue hover:text-blue-light no-underline"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 bg-accent hover:bg-accent-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-gray-500 hover:text-gray-700 no-underline inline-flex items-center gap-1"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}