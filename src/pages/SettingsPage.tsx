import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Lock,
  Database,
  Bell,
  Power,
  Trash2,
  Loader2,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  HardDrive,
  Share2,
} from "lucide-react";
import { settingsService } from "../services/settingsService";
import type {
  UserProfile,
  StorageStats,
  LoginActivity,
} from "../types/settings";
import { notificationService, NotificationPreferences } from '../services/notificationService';
import { shareService } from '../services/shareService';
import { SharedItem } from '../types/database.types';

const SettingsPage = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] =
    useState(true);
  const [loginLogsOpen, setLoginLogsOpen] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    browser_notifications_enabled: false,
    email_notifications_enabled: true
  });
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('No user found');

        // Load user profile with error handling
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error loading profile:', profileError);
        }

        // Load login activity with error handling
        const { data: sessions, error: sessionsError } = await supabase
          .from('auth_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (sessionsError) {
          console.error('Error loading sessions:', sessionsError);
        }

        // Load notification preferences
        const preferences = await notificationService.getPreferences(user.id);
        setNotificationPreferences(preferences);

        setUser({ ...user, ...profile });
        setLoginActivity(sessions || []);

        // Load storage stats
        const stats = await settingsService.getStorageStats(user.id);
        setStorageStats(stats);

      } catch (error: any) {
        console.error('Error loading user data:', error);
        toast.error(error.message || 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    loadSharedItems();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setChangingPassword(true);

      // In a real app, we would verify the current password first

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // The auth state listener in App.tsx will handle the redirect
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast.error(error.message || "Failed to sign out");
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const renderDatabaseDetails = () => (
    <div className="bg-neutral-50 rounded-md p-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-neutral-500">Provider</p>
          <p className="font-medium">
            {user?.app_metadata?.provider || "Supabase"}
          </p>
        </div>
        <div>
          <p className="text-neutral-500">Region</p>
          <p className="font-medium">
            {import.meta.env.VITE_SUPABASE_REGION || "us-west-1"}
          </p>
        </div>
        <div>
          <p className="text-neutral-500">Memory Items</p>
          <p className="font-medium">{storageStats?.item_count || 0} items</p>
        </div>
        <div>
          <p className="text-neutral-500">Files</p>
          <p className="font-medium">{storageStats?.file_count || 0} files</p>
        </div>
      </div>
    </div>
  );

  const renderLoginActivity = () => (
    <div className="mt-3 bg-neutral-50 rounded-md p-4 text-sm">
      {loginActivity.length === 0 ? (
        <div className="text-neutral-500 text-center py-4">
          No login activity found
        </div>
      ) : (
        <div className="space-y-3">
          {loginActivity.map((session, index) => (
            <div key={session.id} className="flex justify-between items-start">
              <div>
                <div className="font-medium">
                  {index === 0 ? 'Current session' : 'Previous login'}
                </div>
                <div className="text-neutral-500">
                  {session.user_agent} • {session.ip_address}
                </div>
                <div className="text-xs text-neutral-400">
                  {session.location}
                </div>
              </div>
              <div className={index === 0 ? 'text-success-600 flex items-center' : 'text-neutral-500'}>
                {index === 0 ? (
                  <>
                    <Check size={14} className="mr-1" />
                    Active now
                  </>
                ) : (
                  <span className="text-sm">
                    {new Date(session.timestamp).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Add this to your SettingsPage component
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      // Delete user's files
      const { error: storageError } = await supabase.storage
        .from("files")
        .remove([`${user?.id}/*`]);

      if (storageError) throw storageError;

      // Delete user's memory items
      const { error: itemsError } = await supabase
        .from("memory_items")
        .delete()
        .eq("user_id", user?.id);

      if (itemsError) throw itemsError;

      // Delete user's sessions
      const { error: sessionsError } = await supabase
        .from("auth_sessions")
        .delete()
        .eq("user_id", user?.id);

      if (sessionsError) throw sessionsError;

      // Delete user account
      const { error: userError } = await supabase.auth.admin.deleteUser(
        user?.id as string
      );

      if (userError) throw userError;

      toast.success("Account deleted successfully");
      // Redirect to sign-in page
      window.location.href = "/signin";
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account");
    }
  };

  const renderStorageUsage = () => {
    const usedSpace = storageStats?.used_space || 0;
    const totalSpace = storageStats?.total_space || 100 * 1024 * 1024;
    const percentageUsed = (usedSpace / totalSpace) * 100;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3">Storage Usage</h3>
        <div className="flex items-center mb-2">
          <HardDrive size={20} className="text-neutral-500 mr-2" />
          <span className="text-neutral-800 font-medium">
            {formatBytes(usedSpace)}
          </span>
          <span className="text-neutral-500 mx-1">of</span>
          <span className="text-neutral-800 font-medium">
            {formatBytes(totalSpace)}
          </span>
          <span className="text-neutral-500 ml-1">used</span>
        </div>
        <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full"
            style={{ width: `${percentageUsed}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const handleBrowserNotificationToggle = async () => {
    try {
      if (!notificationPreferences.browser_notifications_enabled) {
        setRequestingPermission(true);
        const granted = await notificationService.requestBrowserNotificationPermission();
        setRequestingPermission(false);
        
        if (!granted) {
          toast.error('Please enable browser notifications in your browser settings');
          return;
        }
      }

      const newPreferences = {
        ...notificationPreferences,
        browser_notifications_enabled: !notificationPreferences.browser_notifications_enabled
      };

      await notificationService.updatePreferences(user?.id as string, newPreferences);
      setNotificationPreferences(newPreferences);
      
      if (newPreferences.browser_notifications_enabled) {
        toast.success('Browser notifications enabled');
      } else {
        toast.success('Browser notifications disabled');
      }
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      toast.error(error.message || 'Failed to update notification preferences');
    }
  };

  const handleEmailNotificationToggle = async () => {
    try {
      const newPreferences = {
        ...notificationPreferences,
        email_notifications_enabled: !notificationPreferences.email_notifications_enabled
      };

      await notificationService.updatePreferences(user?.id as string, newPreferences);
      setNotificationPreferences(newPreferences);
      
      if (newPreferences.email_notifications_enabled) {
        toast.success('Email notifications enabled');
      } else {
        toast.success('Email notifications disabled');
      }
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      toast.error(error.message || 'Failed to update notification preferences');
    }
  };

  const loadSharedItems = async () => {
    try {
      setIsLoading(true);
      const items = await shareService.getUserShares();
      setSharedItems(items);
    } catch (error) {
      toast.error('Failed to load shared items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    try {
      await shareService.deleteShare(shareId);
      setSharedItems(items => items.filter(item => item.id !== shareId));
      toast.success('Share link deleted');
    } catch (error) {
      toast.error('Failed to delete share link');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-32 bg-neutral-200 rounded mb-4"></div>
          <div className="h-48 w-full max-w-4xl bg-neutral-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-500">Manage your account and preferences</p>
      </div>

      <div className="space-y-8">
        {/* Account Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden"
        >
          <div className="border-b border-neutral-200 px-6 py-4">
            <h2 className="font-semibold text-neutral-800 flex items-center">
              <User size={18} className="mr-2 text-primary-600" />
              Account Information
            </h2>
          </div>
          <div className="p-6">
            <div className="max-w-xl">
              <div className="mb-8 flex items-center">
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-semibold mr-4">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <h3 className="font-medium text-lg">
                    {user?.email?.split("@")[0]}
                  </h3>
                  <p className="text-neutral-500">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Email Address</h3>
                  <div className="flex items-center">
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="input mr-3 flex-1 bg-neutral-50"
                    />
                    <button className="btn btn-secondary" disabled>
                      Change
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Email changes require verification and are not currently
                    supported
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Account Created</h3>
                  <p className="text-neutral-700">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Password Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden"
        >
          <div className="border-b border-neutral-200 px-6 py-4">
            <h2 className="font-semibold text-neutral-800 flex items-center">
              <Lock size={18} className="mr-2 text-primary-600" />
              Password &amp; Security
            </h2>
          </div>
          <div className="p-6">
            <div className="max-w-xl">
              <form onSubmit={handlePasswordChange} className="space-y-5">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    required
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={
                      changingPassword ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                    className="btn btn-primary"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Login Activity</h3>
                  <button
                    onClick={() => setLoginLogsOpen(!loginLogsOpen)}
                    className="text-primary-600 hover:text-primary-700 text-sm flex items-center"
                  >
                    {loginLogsOpen ? 'Hide' : 'View'} recent login activity
                  </button>
                </div>

                <AnimatePresence>
                  {loginLogsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {renderLoginActivity()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Storage & Database Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden"
        >
          <div className="border-b border-neutral-200 px-6 py-4">
            <h2 className="font-semibold text-neutral-800 flex items-center">
              <Database size={18} className="mr-2 text-primary-600" />
              Storage &amp; Database
            </h2>
          </div>
          <div className="p-6">
            <div className="max-w-xl">
              {renderStorageUsage()}

              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Database Status</h3>
                <div className="bg-success-50 text-success-700 px-3 py-2 rounded-md flex items-center">
                  <Check size={16} className="mr-2" />
                  Connected to Supabase
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Database Details</h3>
                {renderDatabaseDetails()}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Notifications Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden"
        >
          <div className="border-b border-neutral-200 px-6 py-4">
            <h2 className="font-semibold text-neutral-800 flex items-center">
              <Bell size={18} className="mr-2 text-primary-600" />
              Notifications
            </h2>
          </div>
          <div className="p-6">
            <div className="max-w-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Browser Notifications</h3>
                  <p className="text-neutral-500 text-sm">
                    Receive notifications for reminders in your browser
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      notificationPreferences.browser_notifications_enabled ? "bg-primary-600" : "bg-neutral-200"
                    }`}
                    onClick={handleBrowserNotificationToggle}
                    disabled={requestingPermission}
                  >
                    <span className="sr-only">Enable notifications</span>
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        notificationPreferences.browser_notifications_enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-neutral-500 text-sm">
                    Receive important reminders via email
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      notificationPreferences.email_notifications_enabled ? "bg-primary-600" : "bg-neutral-200"
                    }`}
                    onClick={handleEmailNotificationToggle}
                  >
                    <span className="sr-only">Enable email notifications</span>
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        notificationPreferences.email_notifications_enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {!notificationPreferences.browser_notifications_enabled && (
                <div className="pt-4">
                  <div className="p-4 border border-warning-200 rounded-md bg-warning-50 flex items-start">
                    <AlertCircle
                      size={18}
                      className="text-warning-600 mr-3 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-warning-700 text-sm">
                        Browser notifications require permission from your browser.
                      </p>
                      <button 
                        className="text-sm text-warning-700 font-medium underline mt-1"
                        onClick={handleBrowserNotificationToggle}
                        disabled={requestingPermission}
                      >
                        {requestingPermission ? 'Requesting...' : 'Request Permission'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Account Management Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden"
        >
          <div className="border-b border-neutral-200 px-6 py-4">
            <h2 className="font-semibold text-neutral-800 flex items-center">
              <Power size={18} className="mr-2 text-primary-600" />
              Account Management
            </h2>
          </div>
          <div className="p-6">
            <div className="max-w-xl space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Sign Out</h3>
                <button onClick={handleSignOut} className="btn btn-secondary">
                  Sign out of all devices
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Shared Items Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden"
        >
          <div className="border-b border-neutral-200 px-6 py-4">
            <h2 className="font-semibold text-neutral-800 flex items-center">
              <Share2 size={18} className="mr-2 text-primary-600" />
              Shared Items
            </h2>
          </div>
          <div className="p-6">
            <div className="max-w-xl">
              {isLoading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : sharedItems.length === 0 ? (
                <p className="text-neutral-500 text-center">No shared items yet</p>
              ) : (
                <div className="space-y-4">
                  {sharedItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-lg border border-neutral-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-neutral-200">
                            <Share2 className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900">
                              {item.item_type === 'memory' ? 'Memory' : 'File'} Share
                            </p>
                            <p className="text-sm text-neutral-500">
                              Created {new Date(item.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-neutral-500 mt-1">
                              {window.location.origin}/shared/{item.share_token}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={`/shared/${item.share_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary flex items-center"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View
                          </a>
                          <button
                            onClick={() => handleDeleteShare(item.id)}
                            className="btn btn-error flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default SettingsPage;
