import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  FileIcon, 
  Search, 
  Settings,
  PlusCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard size={20} /> 
    },
    { 
      path: '/database', 
      label: 'Central Database', 
      icon: <Database size={20} /> 
    },
    { 
      path: '/files', 
      label: 'Files', 
      icon: <FileIcon size={20} /> 
    },
    { 
      path: '/search', 
      label: 'AI Search', 
      icon: <Search size={20} /> 
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: <Settings size={20} /> 
    },
  ];

  return (
    <div className="flex flex-col h-full py-6">
      <div className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`mr-3 ${isActive ? 'text-primary-600' : ''}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    className="absolute left-0 w-1 h-8 bg-primary-600 rounded-r-full"
                    layoutId="sidebar-indicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="px-4 mt-6">
        <button
          className="w-full flex items-center justify-center px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <PlusCircle size={18} className="mr-2" />
          <span>New Memory</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;