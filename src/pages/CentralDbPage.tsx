import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, MemoryItem, createMemoryItem, updateMemoryItem, deleteMemoryItem, getAllMemoryItems, setMemoryItemReminder } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  X,
  Tag,
  Clock,
  Trash2,
  Edit,
  Pin,
  PinOff,
  Calendar,
  Loader2,
  Filter,
  Grid,
  List as ListIcon,
  AlertCircle,
} from 'lucide-react';
import { checkNotificationPermission, scheduleNotification } from '../utils/notifications';
import { ShareButton } from '../components/common/ShareButton';

type Category = 'login' | 'book' | 'quote' | 'reminder' | 'other';

const categories = [
  { id: 'login', name: 'Login Credentials' },
  { id: 'book', name: 'Books & Reading' },
  { id: 'quote', name: 'Quotes & Notes' },
  { id: 'reminder', name: 'Reminders' },
  { id: 'other', name: 'Other' },
];

type ActiveReminder = {
  id: string;
  timeoutId: number;
};

const CentralDbPage = () => {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MemoryItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MemoryItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState<string>('');
  const [reminderTime, setReminderTime] = useState<string>('');
  const [activeReminders, setActiveReminders] = useState<ActiveReminder[]>([]);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [tags, setTags] = useState<string>('');
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    // Clear existing reminders when component unmounts
    return () => {
      activeReminders.forEach(reminder => clearTimeout(reminder.timeoutId));
    };
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const items = await getAllMemoryItems();
      setItems(items);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching items:', error);
      setError(error.message);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      
      if (editingItem) {
        await updateMemoryItem(editingItem.id, {
          title,
          content,
          category,
          tags: tagArray,
          is_pinned: isPinned,
        });
        toast.success('Item updated successfully');
      } else {
        await createMemoryItem({
          title,
          content,
          category,
          tags: tagArray,
          is_pinned: isPinned,
        });
        toast.success('Item added successfully');
      }
      
      resetForm();
      setAddModalOpen(false);
      fetchItems();
    } catch (error: any) {
      console.error('Error saving item:', error);
      toast.error(error.message || 'Failed to save item');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemoryItem(id);
      cleanupReminder(id);
      await fetchItems();
      toast.success('Item deleted successfully');
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error(error.message || 'Failed to delete item');
    }
  };

  const handleEdit = (item: MemoryItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setCategory(item.category as Category);
    setTags(item.tags.join(', '));
    setIsPinned(item.is_pinned);
    setAddModalOpen(true);
  };

  const handleSetReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem) return;
    
    try {
      // Check notification permission first
      const hasPermission = await checkNotificationPermission();
      if (!hasPermission) {
        toast.error('Please enable notifications to set reminders');
        return;
      }

      const reminderDateTime = new Date(`${reminderDate}T${reminderTime}`);
      
      // Validate that the reminder time is in the future
      if (reminderDateTime.getTime() <= Date.now()) {
        toast.error('Please select a future date and time');
        return;
      }

      // Save reminder in database
      await setMemoryItemReminder(selectedItem.id, reminderDateTime.toISOString());
      
      // Schedule the notification
      const timeoutId = scheduleNotification(
        selectedItem.title,
        reminderDateTime
      );

      // Store the active reminder
      setActiveReminders(prev => [
        ...prev.filter(r => r.id !== selectedItem.id),
        { id: selectedItem.id, timeoutId }
      ]);

      await fetchItems();
      setReminderModalOpen(false);
      toast.success('Reminder set successfully');

      // Reset form
      setReminderDate('');
      setReminderTime('');
      setSelectedItem(null);

    } catch (error: any) {
      console.error('Error setting reminder:', error);
      toast.error(error.message || 'Failed to set reminder');
    }
  };

  const cleanupReminder = (itemId: string) => {
    const reminder = activeReminders.find(r => r.id === itemId);
    if (reminder) {
      clearTimeout(reminder.timeoutId);
      setActiveReminders(prev => prev.filter(r => r.id !== itemId));
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('other');
    setTags('');
    setIsPinned(false);
    setEditingItem(null);
  };

  const handleCardClick = (item: MemoryItem) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  const filteredItems = items
    .filter(item => {
      const matchesSearch = 
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.title.localeCompare(b.title);
    });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-neutral-600">Loading your memories...</p>
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
            <h3 className="font-semibold">Error loading data</h3>
            <p className="text-sm">{error}</p>
            <button 
              onClick={fetchItems} 
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
          <h1 className="text-2xl font-bold text-neutral-900">Central Database</h1>
          <p className="text-neutral-500">Store and manage all your important information</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => {
              resetForm();
              setAddModalOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={18} className="mr-2" />
            Add New Memory
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-200 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Search memories..."
              className="pl-10 input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setSearchQuery('')}
              >
                <X size={16} className="text-neutral-400 hover:text-neutral-700" />
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              >
                <Filter size={16} className="mr-2" />
                {categoryFilter ? categories.find(c => c.id === categoryFilter)?.name : 'All Categories'}
              </button>
              
              {categoryDropdownOpen && (
                <div className="absolute top-12 right-0 w-48 bg-white rounded-md shadow-lg border border-neutral-200 z-10 p-2">
                  <button
                    onClick={() => {
                      setCategoryFilter(null);
                      setCategoryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      !categoryFilter ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-100'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setCategoryFilter(cat.id);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                        categoryFilter === cat.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-100'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex border border-neutral-200 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'bg-white text-neutral-500'}`}
                aria-label="Grid view"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'bg-white text-neutral-500'}`}
                aria-label="List view"
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Items Grid/List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
          <div className="mx-auto w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-neutral-400" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-1">No items found</h3>
          <p className="text-neutral-600 mb-4">
            {searchQuery || categoryFilter
              ? "Try adjusting your search or filters"
              : "Start by adding your first memory"}
          </p>
          <button
            onClick={() => {
              if (searchQuery || categoryFilter) {
                setSearchQuery('');
                setCategoryFilter(null);
              } else {
                setAddModalOpen(true);
              }
            }}
            className="btn btn-primary"
          >
            {searchQuery || categoryFilter ? (
              'Clear Filters'
            ) : (
              <>
                <Plus size={18} className="mr-2" />
                Add New Memory
              </>
            )}
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" 
          : "space-y-3"
        }>
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-shadow relative ${
                viewMode === 'list' ? 'flex items-center p-4' : ''
              }`}
            >
              {viewMode === 'list' ? (
                <>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleCardClick(item)}>
                    <div className="flex items-center mb-1">
                      <span className="text-sm font-medium text-neutral-900 truncate">
                        {item.title}
                      </span>
                      {item.is_pinned && (
                        <Pin size={14} className="ml-2 text-warning-500" />
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 line-clamp-1">{item.content}</p>
                    <div className="flex items-center mt-1 space-x-2 text-xs text-neutral-500">
                      <span>{categories.find(c => c.id === item.category)?.name}</span>
                      <span>•</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setReminderModalOpen(true);
                      }}
                      className="p-1 text-neutral-500 hover:text-neutral-700"
                    >
                      <Calendar size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                      className="p-1 text-neutral-500 hover:text-neutral-700"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="p-1 text-error-500 hover:text-error-700"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="p-1">
                      <ShareButton itemId={item.id} itemType="memory" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 cursor-pointer" onClick={() => handleCardClick(item)}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium px-2 py-1 bg-neutral-100 rounded-full text-neutral-700">
                      {categories.find(c => c.id === item.category)?.name}
                    </span>
                    {item.is_pinned && (
                      <Pin size={16} className="text-warning-500" />
                    )}
                  </div>
                  <h3 className="font-medium text-neutral-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-neutral-600 line-clamp-3 mb-3">{item.content}</p>
                  
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-0.5 text-xs bg-neutral-100 rounded-full text-neutral-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {item.reminder_at && (
                    <div className="flex items-center text-xs text-warning-600 mb-3">
                      <Clock size={12} className="mr-1" />
                      Reminder: {formatDate(item.reminder_at)}
                    </div>
                  )}

                  <div className="pt-3 border-t border-neutral-100 flex justify-between items-center">
                    <span className="text-xs text-neutral-500">
                      {formatDate(item.created_at)}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setReminderModalOpen(true);
                        }}
                        className="p-1 text-neutral-500 hover:text-neutral-700"
                        title="Set reminder"
                      >
                        <Calendar size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                        className="p-1 text-neutral-500 hover:text-neutral-700"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="p-1 text-error-500 hover:text-error-700"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="p-1">
                        <ShareButton itemId={item.id} itemType="memory" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4"
            onClick={() => setAddModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    {editingItem ? 'Edit Memory' : 'Add New Memory'}
                  </h2>
                  <button
                    onClick={() => setAddModalOpen(false)}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">
                      Title
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="input"
                      placeholder="Enter a title"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-neutral-700 mb-1">
                      Content
                    </label>
                    <textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="textarea"
                      placeholder="Enter the content"
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-1">
                      Category
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="input"
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-neutral-700 mb-1">
                      Tags
                    </label>
                    <input
                      id="tags"
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="input"
                      placeholder="Enter tags separated by commas"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Example: work, important, follow-up
                    </p>
                  </div>

                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setIsPinned(!isPinned)}
                      className={`flex items-center text-sm ${
                        isPinned ? 'text-warning-600' : 'text-neutral-600'
                      }`}
                    >
                      {isPinned ? (
                        <>
                          <Pin size={16} className="mr-2" />
                          Pinned
                        </>
                      ) : (
                        <>
                          <PinOff size={16} className="mr-2" />
                          Pin this memory
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    {editingItem ? 'Update Memory' : 'Add Memory'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reminder Modal */}
      <AnimatePresence>
        {reminderModalOpen && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4"
            onClick={() => setReminderModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Set Reminder</h2>
                  <button
                    onClick={() => setReminderModalOpen(false)}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSetReminder} className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-neutral-600 mb-4">
                      Set a reminder for "{selectedItem.title}"
                    </p>
                  </div>

                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-neutral-700 mb-1">
                      Date
                    </label>
                    <input
                      id="date"
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="input"
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-neutral-700 mb-1">
                      Time
                    </label>
                    <input
                      id="time"
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setReminderModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Set Reminder
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailModalOpen && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDetailModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">{selectedItem.title}</h2>
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium px-2 py-1 bg-neutral-100 rounded-full text-neutral-700">
                    {categories.find(c => c.id === selectedItem.category)?.name}
                  </span>
                  {selectedItem.is_pinned && (
                    <Pin size={16} className="text-warning-500" />
                  )}
                </div>

                <div className="prose max-w-none mb-6">
                  <p className="whitespace-pre-wrap">{selectedItem.content}</p>
                </div>

                {selectedItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedItem.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block px-3 py-1 text-sm bg-neutral-100 rounded-full text-neutral-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {selectedItem.reminder_at && (
                  <div className="flex items-center text-sm text-warning-600 mb-6">
                    <Clock size={16} className="mr-2" />
                    Reminder: {formatDate(selectedItem.reminder_at)}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-neutral-500">
                  <span>Created: {formatDate(selectedItem.created_at)}</span>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setDetailModalOpen(false);
                        setSelectedItem(selectedItem);
                        setReminderModalOpen(true);
                      }}
                      className="text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      <Calendar size={16} className="mr-1" />
                      Set Reminder
                    </button>
                    <button
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleEdit(selectedItem);
                      }}
                      className="text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      <Edit size={16} className="mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleDelete(selectedItem.id);
                      }}
                      className="text-error-600 hover:text-error-700 flex items-center"
                    >
                      <Trash2 size={16} className="mr-1" />
                      Delete
                    </button>
                    <div className="p-1">
                      <ShareButton itemId={selectedItem.id} itemType="memory" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CentralDbPage;