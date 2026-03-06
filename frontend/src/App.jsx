import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FeedPage from './pages/FeedPage';
import ReportPage from './pages/ReportPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';
import MyComplaintsPage from './pages/MyComplaintsPage';
import GovTrackingPage from './pages/GovTrackingPage';
import AdminPage from './pages/AdminPage';
import AutomationAdminPage from './pages/AutomationAdminPage';
import NotificationsPage from './pages/NotificationsPage';
import LettersPage from './pages/LettersPage';

import Sidebar from './components/Sidebar';
import ChatBot from './components/ChatBot';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-saffron border-t-transparent rounded-full" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || user?.role !== 'admin') return <Navigate to="/feed" replace />;
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/feed" replace />;
  return children;
};

function AppContent() {
  const location = useLocation();

  // Don't show sidebar on public pages like login/register
  const hideSidebar = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-screen font-body text-gray-800" style={{ position: 'relative', zIndex: 1 }}>
      <Navbar />

      <div className="flex pt-[60px]">
        {/* Sidebar only on larger screens if not on auth pages */}
        {!hideSidebar && (
          <div className="hidden md:block w-60 shrink-0">
            <Sidebar />
          </div>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 w-full p-4 lg:p-6 min-h-[calc(100vh-60px)]`}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/complaint/:id" element={<ComplaintDetailPage />} />
            <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
            <Route path="/my-complaints" element={<ProtectedRoute><MyComplaintsPage /></ProtectedRoute>} />
            <Route path="/gov-tracking" element={<ProtectedRoute><GovTrackingPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/letters" element={<ProtectedRoute><LettersPage /></ProtectedRoute>} />
            <Route path="/automation-admin" element={<AdminRoute><AutomationAdminPage /></AdminRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="*" element={
              <div className="pt-20 min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
                <div className="text-7xl opacity-30 mb-4">🗺️</div>
                <h2 className="font-heading font-bold text-3xl text-gray-600 mb-2">Page Not Found</h2>
                <p className="text-gray-400 mb-5">The page you're looking for doesn't exist.</p>
                <a href="/" className="bg-saffron text-white font-bold px-6 py-3 rounded-xl hover:bg-saffron-dark transition-colors inline-flex">← Go Home</a>
              </div>
            } />
          </Routes>
        </main>
      </div>

      {/* Global ChatBot Widget */}
      <ChatBot />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AnimatedBackground />
        <BrowserRouter>
          <AppContent />
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 3500,
              style: { fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: '14px' },
              success: { iconTheme: { primary: '#138808', secondary: '#fff' } },
              error: { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
            }}
          />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
