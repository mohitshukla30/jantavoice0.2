import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import { AnimatePresence, motion } from 'framer-motion';
import { Map } from 'lucide-react';

// Smooth fade and slide transition for better performance
export function PageContainer({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -15 }}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1] // Apple-like ease-out curve
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

import HomePage from './pages/HomePage';
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
import AQIMonitorPage from './pages/AQIMonitorPage';

import BottomNav from './components/BottomNav';
import ChatBot from './components/ChatBot';
import AQIWidget from './components/AQIWidget';
import VoiceFAB from './components/VoiceFAB';

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

      <div className="flex pt-[80px] w-full max-w-7xl mx-auto">
        {/* Main Content Area - Full Width */}
        <main className={`flex-1 w-full p-4 lg:p-6 pb-24 md:pb-6 min-h-[calc(100vh-80px)]`}>
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageContainer><HomePage /></PageContainer>} />
              <Route path="/landing" element={<PageContainer><LandingPage /></PageContainer>} />
              <Route path="/login" element={<PageContainer><PublicOnlyRoute><LoginPage /></PublicOnlyRoute></PageContainer>} />
              <Route path="/register" element={<PageContainer><PublicOnlyRoute><RegisterPage /></PublicOnlyRoute></PageContainer>} />
              <Route path="/feed" element={<PageContainer><FeedPage /></PageContainer>} />
              <Route path="/complaint/:id" element={<PageContainer><ComplaintDetailPage /></PageContainer>} />
              <Route path="/report" element={<PageContainer><ProtectedRoute><ReportPage /></ProtectedRoute></PageContainer>} />
              <Route path="/my-complaints" element={<PageContainer><ProtectedRoute><MyComplaintsPage /></ProtectedRoute></PageContainer>} />
              <Route path="/gov-tracking" element={<PageContainer><ProtectedRoute><GovTrackingPage /></ProtectedRoute></PageContainer>} />
              <Route path="/notifications" element={<PageContainer><ProtectedRoute><NotificationsPage /></ProtectedRoute></PageContainer>} />
              <Route path="/letters" element={<PageContainer><ProtectedRoute><LettersPage /></ProtectedRoute></PageContainer>} />
              <Route path="/automation-admin" element={<PageContainer><AdminRoute><AutomationAdminPage /></AdminRoute></PageContainer>} />
              <Route path="/admin" element={<PageContainer><AdminRoute><AdminPage /></AdminRoute></PageContainer>} />
              <Route path="/aqi-monitor" element={<PageContainer><AQIMonitorPage /></PageContainer>} />
              <Route path="*" element={
                <PageContainer>
                  <div className="pt-20 min-h-screen flex flex-col items-center justify-center text-center px-4">
                    <div className="flex justify-center mb-6 text-primary"><Map size={80} strokeWidth={1} /></div>
                    <h2 className="font-heading font-bold text-3xl text-gray-600 mb-2">Page Not Found</h2>
                    <p className="text-gray-400 mb-5">The page you're looking for doesn't exist.</p>
                    <a href="/" className="inline-flex items-center gap-2 btn-primary">
                      ← Go Home
                    </a>
                  </div>
                </PageContainer>
              } />
            </Routes>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {!hideSidebar && <BottomNav />}

      {/* Global Widgets */}
      <ChatBot onOpenReport={() => window.location.href = '/report?tab=voice'} />
      <AQIWidget onReportPollution={() => window.location.href = '/report?tab=quick'} />
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
