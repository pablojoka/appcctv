import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Inventory from './pages/Inventory';
import Personnel from './pages/Personnel';
import Reports from './pages/Reports';
import Tutorials from './pages/Tutorials';
import Stats from './pages/Stats';

function PrivateRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="inventory" element={<PrivateRoute adminOnly><Inventory /></PrivateRoute>} />
        <Route path="personnel" element={<PrivateRoute adminOnly><Personnel /></PrivateRoute>} />
        <Route path="reports" element={<Reports />} />
        <Route path="tutorials" element={<Tutorials />} />
        <Route path="stats" element={<PrivateRoute adminOnly><Stats /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      </BrowserRouter>
    </AuthProvider>
  );
}
