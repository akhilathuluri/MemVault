import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import Sidebar from './Sidebar';
import Header from './Header';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type MainLayoutProps = {
  session: Session | null;
};

const MainLayout = ({ session }: MainLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Close sidebar when changing routes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // If user is not logged in, redirect to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header 
        user={session.user} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              className="fixed inset-0 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-0 bg-neutral-900/50" onClick={() => setSidebarOpen(false)} />
              <motion.div 
                className="absolute inset-y-0 left-0 z-40 w-64 bg-white shadow-xl"
                initial={{ x: -100 + '%' }}
                animate={{ x: 0 }}
                exit={{ x: -100 + '%' }}
                transition={{ duration: 0.2 }}
              >
                <Sidebar />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="w-64 border-r border-neutral-200 bg-white">
            <Sidebar />
          </div>
        </div>

        {/* Main content */}
        <motion.main 
          className="flex-1 overflow-auto pb-10"
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
};

export default MainLayout;