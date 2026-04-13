import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import OpportunitySearch from './pages/OpportunitySearch';
import VendorProfile from './pages/VendorProfile';
import ProposalGenerator from './pages/ProposalGenerator';
import ProposalEditor from './pages/ProposalEditor';
import Proposals from './pages/Proposals';
import Admin from './pages/Admin';
import Templates from './pages/Templates';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import Billing from './pages/Billing';
import MarketResearch from './pages/MarketResearch';
import AuditLog from './pages/AuditLog';
import SharedProposal from './pages/SharedProposal';
import VerifyEmail from './pages/VerifyEmail';
import RfpDeconstructor from './pages/RfpDeconstructor';
import ContractManager from './pages/ContractManager';
import ComplianceMatrix from './pages/ComplianceMatrix';
import WinProbability from './pages/WinProbability';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Expertise from './pages/Expertise';
import Knowledgebase from './pages/Knowledgebase';
import PastPerformance from './pages/PastPerformance';
import ComplianceDashboard from './pages/ComplianceDashboard';
import NaicsExplorer from './pages/NaicsExplorer';
import ComplianceRequirements from './pages/ComplianceRequirements';
import ContractVehicles from './pages/ContractVehicles';
import CompanyCompliance from './pages/CompanyCompliance';
import ComplianceRecommendations from './pages/ComplianceRecommendations';
import N8NAutomation from './pages/N8NAutomation';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin w-10 h-10 text-navy mx-auto mb-4"
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
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin w-10 h-10 text-navy mx-auto mb-4"
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
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users away from login/register
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function LandingOrDashboard() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <svg className="animate-spin w-10 h-10 text-navy" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing page — shown to unauthenticated visitors */}
      <Route path="/" element={<LandingOrDashboard />} />

      {/* Public routes — no sidebar/header layout */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Public routes — no auth required */}
      <Route path="/shared/:token" element={<SharedProposal />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />

      {/* Protected routes — inside Layout with sidebar/header */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/opportunities" element={<OpportunitySearch />} />
        <Route path="/market-research" element={<MarketResearch />} />
        <Route path="/vendor-profile" element={<VendorProfile />} />
        <Route path="/new-proposal" element={<ProposalGenerator />} />
        <Route path="/proposal-editor" element={<ProposalEditor />} />
        <Route path="/proposals" element={<Proposals />} />
        <Route path="/rfp-deconstructor" element={<RfpDeconstructor />} />
        <Route path="/contracts" element={<ContractManager />} />
        <Route path="/compliance-matrix" element={<ComplianceMatrix />} />
        <Route path="/win-probability" element={<WinProbability />} />
        <Route path="/expertise" element={<Expertise />} />
        <Route path="/knowledgebase" element={<Knowledgebase />} />
        <Route path="/past-performance" element={<PastPerformance />} />
        <Route path="/compliance" element={<ComplianceDashboard />} />
        <Route path="/compliance/naics" element={<NaicsExplorer />} />
        <Route path="/compliance/requirements" element={<ComplianceRequirements />} />
        <Route path="/compliance/vehicles" element={<ContractVehicles />} />
        <Route path="/compliance/company" element={<CompanyCompliance />} />
        <Route path="/compliance/recommendations" element={<ComplianceRecommendations />} />
        <Route path="/n8n" element={<N8NAutomation />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/admin" element={<Admin />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
