import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { StatusProvider } from './context/StatusProvider';
import { Layout } from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import FacultyDashboard from './pages/FacultyDashboard';
import Classroom from './pages/Classroom';
import Attendance from './pages/Attendance';
import Updates from './pages/Updates';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black uppercase tracking-[0.4em]">Initializing...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black uppercase tracking-[0.4em]">Initializing...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/locator" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/locator" replace /> : <Register />} />
      <Route path="/" element={<Landing />} />
      
      <Route
        path="/locator"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <Layout>
              <MapView />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/classroom"
        element={
          <ProtectedRoute>
            <Layout>
              <Classroom />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Layout>
              <Attendance />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/updates"
        element={
          <ProtectedRoute>
            <Layout>
              <Updates />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/faculty"
        element={
          <ProtectedRoute>
            {user?.role === 'faculty' ? (
              <Layout>
                <FacultyDashboard />
              </Layout>
            ) : (
              <Navigate to="/locator" replace />
            )}
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={user ? '/locator' : '/'} />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <StatusProvider>
        <Router>
          <AppRoutes />
        </Router>
      </StatusProvider>
    </AuthProvider>
  );
}

export default App;
