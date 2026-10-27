import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Analytics from './pages/Analytics.jsx';
import Patients from './pages/Patients.jsx';
import PatientNew from './pages/PatientNew.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import Appointments from './pages/Appointments.jsx';
import Payments from './pages/Payments.jsx';
import Inquiries from './pages/Inquiries.jsx';
import Lookup from './pages/Lookup.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/inquiries" element={<Inquiries />} />
            <Route path="/lookup" element={<Lookup />} />
            <Route path="/lookup/:id" element={<PatientDetail />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/new" element={<PatientNew />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/payments" element={<Payments />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
