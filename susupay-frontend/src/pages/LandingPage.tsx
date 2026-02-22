import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export function LandingPage() {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated) {
    const path = role === 'COLLECTOR' ? '/collector/dashboard' : '/client/dashboard';
    return <Navigate to={path} replace />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-primary-600 mb-2">SusuPay</h1>
        <p className="text-gray-500">Digital savings made simple</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Link
          to="/collector/login"
          className="block w-full rounded-xl border-2 border-primary-600 bg-primary-50 p-6 text-center transition-colors hover:bg-primary-100"
        >
          <div className="mb-2">
            <svg className="w-10 h-10 mx-auto text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-primary-700">I'm a Collector</span>
          <p className="text-sm text-gray-500 mt-1">Manage your susu group</p>
        </Link>

        <Link
          to="/client/login"
          className="block w-full rounded-xl border-2 border-accent-600 bg-amber-50 p-6 text-center transition-colors hover:bg-amber-100"
        >
          <div className="mb-2">
            <svg className="w-10 h-10 mx-auto text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-accent-700">I'm a Client</span>
          <p className="text-sm text-gray-500 mt-1">Check your savings</p>
        </Link>
      </div>
    </div>
  );
}
