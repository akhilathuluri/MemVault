import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import AuthLayout from './components/layout/AuthLayout';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CentralDbPage from './pages/CentralDbPage';
import FilesPage from './pages/FilesPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import LoadingScreen from './components/common/LoadingScreen';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { SharedItemPage } from './pages/SharedItemPage';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_IN') {
        toast.success('Successfully signed in');
      }
      if (_event === 'SIGNED_OUT') {
        toast.info('Signed out');
      }
    });

    // Clean up on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<AuthLayout session={session} />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<MainLayout session={session} />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/database" element={<CentralDbPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/shared/:token" element={<SharedItemPage />} />
      </Route>

      {/* Redirect to login or dashboard based on auth status */}
      <Route 
        path="*" 
        element={<Navigate to={session ? "/dashboard" : "/login"} replace />} 
      />
    </Routes>
  );
}

export default App;