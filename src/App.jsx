import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Chat from './pages/Chat.jsx'; // 🟢 Import your new Chat component

// --- ROLE-BASED HUB ---
const DashboardHub = () => {
  const { user } = useSelector((state) => state.auth);

  if (user.role === 'admin') return <Navigate to="/admin-dash" />;

  // Both Lawyer and User now go to the same Chat Interface
  // The Chat component handles the role-based logic internally
  return <Navigate to="/chat" />;
};

// --- SECURITY GATEKEEPER ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <DashboardHub />;

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Intelligent Redirector */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><DashboardHub /></ProtectedRoute>}
        />

        {/* 🟢 Unified Chat Screen (Replaces Dashboard) */}
        <Route path="/chat" element={
          <ProtectedRoute allowedRoles={['user', 'lawyer']}>
            <Chat />
          </ProtectedRoute>
        } />

        {/* Admin Dashboard */}
        <Route path="/admin-dash" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <div className="min-h-screen bg-zinc-950 text-white p-8">
              <h1 className="text-3xl font-bold text-red-500">Admin Panel</h1>
              <p className="text-zinc-400 mt-2">Lawyer verification and platform stats.</p>
            </div>
          </ProtectedRoute>
        } />

        {/* Global Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}