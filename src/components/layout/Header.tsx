import { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { MenuIcon, BellIcon, X, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService } from '../../services/notificationService';
import type { MemoryNotification } from '../../types/notifications';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

type HeaderProps = {
  user: User;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

const Header = ({ user, sidebarOpen, setSidebarOpen }: HeaderProps) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<MemoryNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const data = await notificationService.getActiveReminders(user.id);
        setNotifications(data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    // Refresh notifications every minute
    const interval = setInterval(fetchNotifications, 60000);

    return () => clearInterval(interval);
  }, [user.id]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfileOpen(false);
      // The auth state listener in App.tsx will handle the redirect
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast.error(error.message || "Failed to sign out");
    }
  };

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 focus:outline-none"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <MenuIcon size={20} />}
            </button>
            <Link to="/dashboard" className="flex items-center space-x-2 ml-2 lg:ml-0">
              <span className="h-8 w-8 flex items-center justify-center rounded-md bg-primary-600 text-white">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 12.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8.5"></path>
                  <path d="M16 2v4"></path>
                  <path d="M8 2v4"></path>
                  <path d="M3 10h18"></path>
                  <circle cx="18" cy="18" r="3"></circle>
                  <path d="m21 21-1.5-1.5"></path>
                </svg>
              </span>
              <span className="text-lg font-semibold text-primary-600">MemVault</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications dropdown */}
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                className="p-2 rounded-full text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 focus:outline-none relative"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
                aria-label="Notifications"
              >
                <BellIcon size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-error-500 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-3 border-b border-neutral-200">
                      <h3 className="text-sm font-medium text-neutral-700">Upcoming Reminders</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {loading ? (
                        <div className="p-4 text-center text-sm text-neutral-500">
                          Loading reminders...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-neutral-500">
                          No upcoming reminders
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="p-3 border-l-4 border-warning-500 hover:bg-neutral-50"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-neutral-700">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-neutral-500 mt-1">
                                  <Clock size={12} className="inline-block mr-1" />
                                  {new Date(notification.reminder_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <span className="text-xs font-medium px-2 py-1 bg-neutral-100 rounded-full">
                                {notification.category}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-2 border-t border-neutral-200">
                        <Link
                          to="/central-db"
                          className="block w-full text-center text-sm text-primary-600 hover:text-primary-700 p-1"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          View all reminders
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                className="flex items-center space-x-2 focus:outline-none"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                aria-label="Open user menu"
              >
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:block text-sm text-neutral-700 font-medium">
                  {user.email?.split('@')[0]}
                </span>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="py-1">
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        onClick={() => setProfileOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-neutral-100"
                        onClick={handleSignOut}
                      >
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;