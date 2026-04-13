import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.post('/api/auth/verify-email', { token });
        // Auto-login with the returned token
        if (res.data.token && loginWithToken) {
          loginWithToken(res.data.token, res.data.user);
        }
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err.response?.data?.detail || 'Verification failed. The link may be expired or invalid.'
        );
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-8">
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
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 bg-blue/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg
                  className="animate-spin w-8 h-8 text-blue"
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
              </div>
              <h2 className="text-xl font-semibold text-navy mb-3">Verifying Your Email</h2>
              <p className="text-sm text-gray-500">Please wait while we verify your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircleIcon className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-navy mb-3">Email Verified!</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your email has been verified successfully. You can now access all features.
              </p>
              <Link
                to="/vendor-profile"
                className="inline-block bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all shadow-sm no-underline"
              >
                Complete Your Vendor Profile
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-navy mb-3">Verification Failed</h2>
              <p className="text-sm text-red-600 mb-6">{errorMessage}</p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="inline-block bg-navy hover:bg-navy-light text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all shadow-sm no-underline"
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
