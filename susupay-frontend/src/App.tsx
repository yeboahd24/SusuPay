import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { CollectorLogin } from './pages/auth/CollectorLogin';
import { CollectorRegister } from './pages/auth/CollectorRegister';
import { ClientLogin } from './pages/auth/ClientLogin';
import { ClientJoin } from './pages/auth/ClientJoin';
import { ResetPin } from './pages/auth/ResetPin';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CollectorLayout } from './components/layout/CollectorLayout';
import { ClientLayout } from './components/layout/ClientLayout';
import { CollectorDashboard } from './pages/collector/Dashboard';
import { Transactions } from './pages/collector/Transactions';
import { SubmitSms } from './pages/collector/SubmitSms';
import { Clients } from './pages/collector/Clients';
import { ClientDetail } from './pages/collector/ClientDetail';
import { Profile } from './pages/collector/Profile';
import { ClientDashboard } from './pages/client/Dashboard';
import { SubmitPayment } from './pages/client/SubmitPayment';
import { History } from './pages/client/History';
import { Payouts } from './pages/client/Payouts';
import { ClientProfile } from './pages/client/Profile';
import { MemberHistory } from './pages/client/MemberHistory';
import { Reports } from './pages/collector/Reports';
import { CollectorSchedule } from './pages/collector/Schedule';
import { CollectorPayouts } from './pages/collector/Payouts';
import { ClientSchedule } from './pages/client/Schedule';

export function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/collector/login" element={<CollectorLogin />} />
      <Route path="/collector/register" element={<CollectorRegister />} />
      <Route path="/collector/reset-pin" element={<ResetPin />} />
      <Route path="/client/login" element={<ClientLogin />} />
      <Route path="/join/:inviteCode" element={<ClientJoin />} />

      {/* Protected collector routes */}
      <Route element={<ProtectedRoute requiredRole="COLLECTOR" />}>
        <Route element={<CollectorLayout />}>
          <Route path="/collector/dashboard" element={<CollectorDashboard />} />
          <Route path="/collector/transactions" element={<Transactions />} />
          <Route path="/collector/submit-sms" element={<SubmitSms />} />
          <Route path="/collector/clients" element={<Clients />} />
          <Route path="/collector/clients/:clientId" element={<ClientDetail />} />
          <Route path="/collector/schedule" element={<CollectorSchedule />} />
          <Route path="/collector/payouts" element={<CollectorPayouts />} />
          <Route path="/collector/reports" element={<Reports />} />
          <Route path="/collector/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Protected client routes */}
      <Route element={<ProtectedRoute requiredRole="CLIENT" />}>
        <Route element={<ClientLayout />}>
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/client/submit" element={<SubmitPayment />} />
          <Route path="/client/history" element={<History />} />
          <Route path="/client/group/:memberId" element={<MemberHistory />} />
          <Route path="/client/payouts" element={<Payouts />} />
          <Route path="/client/schedule" element={<ClientSchedule />} />
          <Route path="/client/profile" element={<ClientProfile />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
