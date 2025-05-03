import { useState, useEffect } from 'react';
import { supabase, MemoryItem, DatabaseStats, getDashboardStats, getRecentMemoryItems } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Database,
  FileIcon, 
  HardDrive, 
  LayoutGrid,
  Activity,
  Plus, 
  AlertCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

const DashboardPage = () => {
  const [stats, setStats] = useState<DatabaseStats>({
    memory_items_count: 0,
    files_count: 0,
    storage_used: 0,
    recent_activities: []
  });
  const [recentItems, setRecentItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<{ name: string; items: number; }[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check if the user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Fetch dashboard stats and recent items
        const [dashboardStats, recentMemories] = await Promise.all([
          getDashboardStats(),
          getRecentMemoryItems()
        ]);

        setStats(dashboardStats);
        setRecentItems(recentMemories);

        // Fetch activity data for the chart
        const { data: activities } = await supabase
          .from('activities')
          .select('created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // Group activities by day
        const groupedActivities = activities?.reduce((acc: { [key: string]: number }, activity) => {
          const date = new Date(activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {}) || {};

        // Convert to chart data format
        const chartData = Object.entries(groupedActivities).map(([name, items]) => ({
          name,
          items
        }));

        setActivityData(chartData);
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error.message);
        setError(error.message);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
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

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-error-50 border border-error-200 text-error-700 p-4 rounded-md flex items-center">
          <AlertCircle size={24} className="mr-3 text-error-500" />
          <div>
            <h3 className="font-semibold">Error loading dashboard</h3>
            <p className="text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm text-error-600 hover:text-error-800"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-neutral-500">Welcome to your memory vault</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link 
            to="/database"
            className="btn btn-primary"
          >
            <Plus size={18} className="mr-2" />
            Add New Memory
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <motion.div 
          className="card p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-500">Total Memories</p>
              <h3 className="text-2xl font-bold mt-1">{stats.memory_items_count}</h3>
              <p className="text-xs text-neutral-400 mt-1">Across all categories</p>
            </div>
            <div className="bg-primary-100 p-3 rounded-full">
              <Database size={18} className="text-primary-600" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="card p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-500">Stored Files</p>
              <h3 className="text-2xl font-bold mt-1">{stats.files_count}</h3>
              <p className="text-xs text-neutral-400 mt-1">Images, documents, etc.</p>
            </div>
            <div className="bg-accent-100 p-3 rounded-full">
              <FileIcon size={18} className="text-accent-600" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="card p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-500">Storage Used</p>
              <h3 className="text-2xl font-bold mt-1">{formatBytes(stats.storage_used)}</h3>
              <p className="text-xs text-neutral-400 mt-1">Of 100 MB limit</p>
            </div>
            <div className="bg-warning-100 p-3 rounded-full">
              <HardDrive size={18} className="text-warning-600" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="card p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-500">Upcoming Reminders</p>
              <h3 className="text-2xl font-bold mt-1">
                {recentItems.filter(item => item.reminder_at && new Date(item.reminder_at) > new Date()).length}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {recentItems.find(item => item.reminder_at && new Date(item.reminder_at) > new Date())
                  ? `Next: "${recentItems.find(item => item.reminder_at && new Date(item.reminder_at) > new Date())?.title}" (${
                      formatDate(recentItems.find(item => item.reminder_at && new Date(item.reminder_at) > new Date())?.reminder_at || '')
                    })`
                  : 'No upcoming reminders'
                }
              </p>
            </div>
            <div className="bg-error-100 p-3 rounded-full">
              <Clock size={18} className="text-error-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          className="lg:col-span-2 card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="card-header">
            <h2 className="text-lg font-semibold">Activity Overview</h2>
            <p className="text-sm text-neutral-500">Memory items added over time</p>
          </div>
          <div className="card-content h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={activityData}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e5e5e5',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' 
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="items" 
                  stroke="#7C3AED" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6, stroke: '#7C3AED', strokeWidth: 2, fill: 'white' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <Link to="/database" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
            </div>
          </div>
          <div className="card-content pt-2">
            <div className="space-y-4">
              {stats.recent_activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 text-sm">
                  <div className="bg-primary-100 p-2 rounded-full flex-shrink-0">
                    <Activity size={16} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-neutral-500 text-xs">{activity.details}</p>
                    <p className="text-neutral-400 text-xs mt-1">{formatDate(activity.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Memory Items */}
      <motion.div 
        className="mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold">Recent Memory Items</h2>
          <Link to="/database" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentItems.map((item) => (
            <motion.div 
              key={item.id}
              className="card hover:shadow-md transition-shadow cursor-pointer relative group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              {item.is_pinned && (
                <div className="absolute top-3 right-3 h-4 w-4 bg-warning-400 rounded-full" title="Pinned"></div>
              )}
              <div className="p-5">
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`
                    p-2 rounded-full flex-shrink-0
                    ${item.category === 'login' ? 'bg-primary-100 text-primary-600' : 
                      item.category === 'book' ? 'bg-accent-100 text-accent-600' : 
                      'bg-error-100 text-error-600'}
                  `}>
                    {item.category === 'login' ? 
                      <LayoutGrid size={14} /> : 
                      item.category === 'book' ? 
                      <FileIcon size={14} /> : 
                      <Clock size={14} />
                    }
                  </div>
                  <span className="text-xs font-medium uppercase text-neutral-500">
                    {item.category}
                  </span>
                </div>
                <h3 className="font-medium text-neutral-800 mb-1">{item.title}</h3>
                <p className="text-sm text-neutral-600 line-clamp-2">{item.content}</p>
                
                <div className="mt-3 pt-3 border-t border-neutral-100">
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-1">
                      {item.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="inline-block px-2 py-1 text-xs bg-neutral-100 rounded-full text-neutral-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-neutral-400">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                </div>
                
                {item.reminder_at && (
                  <div className="mt-3 pt-2 flex items-center text-xs text-warning-700">
                    <Clock size={12} className="mr-1" />
                    Reminder: {formatDate(item.reminder_at)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;