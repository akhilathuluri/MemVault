import { Outlet, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { SearchIcon } from 'lucide-react';

type AuthLayoutProps = {
  session: Session | null;
};

const AuthLayout = ({ session }: AuthLayoutProps) => {
  // If user is logged in, redirect to dashboard
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Left side - Brand/Logo section */}
      <motion.div 
        className="bg-primary-600 text-white md:w-1/2 p-8 flex flex-col justify-center items-center"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-md mx-auto text-center">
          <div className="mb-6 inline-flex items-center justify-center p-2 bg-primary-500 rounded-full">
            <SearchIcon size={32} strokeWidth={2} />
          </div>
          <h1 className="text-4xl font-bold mb-4">MemVault</h1>
          <p className="text-primary-100 text-lg mb-8">
            Your personal memory assistant. Store, organize, and recall everything that matters.
          </p>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-primary-500 p-2 rounded-full flex-shrink-0">
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-medium">Never forget important details</h3>
                <p className="text-primary-200 text-sm">Store usernames, book names, quotes, and more.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-primary-500 p-2 rounded-full flex-shrink-0">
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-medium">Set reminders for important tasks</h3>
                <p className="text-primary-200 text-sm">Get notified when you need to remember something.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-primary-500 p-2 rounded-full flex-shrink-0">
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-medium">AI-powered search</h3>
                <p className="text-primary-200 text-sm">Find exactly what you need, even when you're not sure what to look for.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right side - Auth form */}
      <motion.div 
        className="flex-1 flex items-center justify-center p-8"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLayout;