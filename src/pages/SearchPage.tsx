import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Search as SearchIcon,
  Database,
  FileText,
  Clock,
  List,
  User,
  Calendar,
  Tag,
  ExternalLink,
  Lightbulb,
  ArrowRight,
  Filter,
  X,
  Trash2,
  Edit,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { FileItem, MemoryItem, setMemoryItemReminder } from "../lib/supabase";
import { checkNotificationPermission, scheduleNotification } from "../utils/notifications";

type SearchResult = {
  id: string;
  type: "memory" | "file";
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  date: string;
  url?: string;
  aiInsight?: string;
};

const searchWithAI = async (query: string, context: string) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ query, context }),
      }
    );

    if (!response.ok) {
      throw new Error("AI search failed");
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("AI search error:", error);
    throw error;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const calculateRelevance = (result: SearchResult, query: string): number => {
  let score = 0;
  const normalizedQuery = query.toLowerCase();
  const normalizedTitle = result.title.toLowerCase();
  const normalizedContent = result.content.toLowerCase();

  // Exact matches in title/name
  if (normalizedTitle === normalizedQuery) score += 10;
  if (normalizedTitle.includes(normalizedQuery)) score += 5;

  // File type matches (for files)
  if (result.type === "file" && normalizedContent.includes(normalizedQuery))
    score += 3;

  // Keywords/tags matches
  if (result.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery)))
    score += 4;

  // Recency bonus (within last 7 days)
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(result.date).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceCreation <= 7) score += (7 - daysSinceCreation) * 0.5;

  return score;
};

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<"relevance" | "date">(
    "relevance"
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // New state variables for modals and selected item
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [moreOptionsItem, setMoreOptionsItem] = useState<SearchResult | null>(null);

  // AI-generated search help
  const aiHelp = [
    {
      query: "important deadlines",
      desc: "Find all your upcoming deadlines and due dates",
    },
    { query: "where did I put my", desc: "Search for items you've misplaced" },
    {
      query: "quotes about success",
      desc: "Find inspirational quotes you've saved",
    },
  ];

  // Handle Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setShowSuggestions(false);
    
    try {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      
      // First, fetch all potential matches from both tables
      const { data: allMemories } = await supabase
        .from('memory_items')
        .select('*');
      
      const { data: allFiles } = await supabase
        .from('files')
        .select('*');
  
      // Process memory results with comprehensive matching
      const memoryResults: SearchResult[] = (allMemories || [])
        .filter(memory => {
          // Check all text fields
          const titleMatch = memory.title?.toLowerCase().includes(normalizedQuery);
          const contentMatch = memory.content?.toLowerCase().includes(normalizedQuery);
          const categoryMatch = memory.category?.toLowerCase().includes(normalizedQuery);
          
          // Check tags array thoroughly
          const tagMatch = Array.isArray(memory.tags) && 
            memory.tags.some((tag: string) => 
              tag?.toLowerCase().includes(normalizedQuery)
            );
          
          // Check if any tag exactly matches the query
          const exactTagMatch = Array.isArray(memory.tags) && 
            memory.tags.some((tag: string) => 
              tag?.toLowerCase() === normalizedQuery
            );
  
          return titleMatch || contentMatch || categoryMatch || tagMatch || exactTagMatch;
        })
        .map(memory => ({
          id: memory.id,
          type: 'memory',
          title: memory.title,
          content: memory.content || '',
          category: memory.category,
          tags: Array.isArray(memory.tags) ? memory.tags : [],
          date: memory.created_at,
          aiInsight: ''
        }));
  
      // Process file results with comprehensive matching
      const fileResults: SearchResult[] = (allFiles || [])
        .filter(file => {
          // Check all text fields
          const nameMatch = file.name?.toLowerCase().includes(normalizedQuery);
          const typeMatch = file.type?.toLowerCase().includes(normalizedQuery);
          
          // Check keywords array thoroughly
          const keywordMatch = Array.isArray(file.keywords) && 
            file.keywords.some((keyword: string) => 
              keyword?.toLowerCase().includes(normalizedQuery)
            );
          
          // Check if any keyword exactly matches the query
          const exactKeywordMatch = Array.isArray(file.keywords) && 
            file.keywords.some((keyword: string) => 
              keyword?.toLowerCase() === normalizedQuery
            );
  
          return nameMatch || typeMatch || keywordMatch || exactKeywordMatch;
        })
        .map(file => ({
          id: file.id,
          type: 'file',
          title: file.name,
          content: '',
          category: file.type,
          tags: Array.isArray(file.keywords) ? file.keywords : [],
          date: file.created_at,
          url: file.file_path
        }));
  
      // Score and combine results
      const scoredResults = [...memoryResults, ...fileResults].map(result => {
        let score = 0;
  
        // Title/name exact match (highest priority)
        if (result.title.toLowerCase() === normalizedQuery) score += 15;
        
        // Title/name contains match
        if (result.title.toLowerCase().includes(normalizedQuery)) score += 10;
        
        // Content match (for memories)
        if (result.type === 'memory' && result.content.toLowerCase().includes(normalizedQuery)) score += 5;
        
        // Tag/keyword exact match
        if (Array.isArray(result.tags) && result.tags.some(tag => tag.toLowerCase() === normalizedQuery)) score += 12;
        
        // Tag/keyword contains match
        if (Array.isArray(result.tags) && result.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))) score += 8;
        
        // Category/type match
        if (result.category?.toLowerCase().includes(normalizedQuery)) score += 3;
  
        // Recency bonus (within last 7 days)
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(result.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCreation <= 7) score += (7 - daysSinceCreation) * 0.5;
  
        return { ...result, score };
      });
  
      // Sort by score
      const sortedResults = scoredResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      setSearchResults(sortedResults);
  
    } catch (error) {
      console.error('Search error details:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch recent searches
  const fetchRecentSearches = async () => {
    try {
      const { data: memories } = await supabase
        .from("memory_items")
        .select("title")
        .order("created_at", { ascending: false })
        .limit(5);

      if (memories) {
        const recentSearches = memories.map((memory) => memory.title);
        setSuggestions(recentSearches);
      }
    } catch (error) {
      console.error("Error fetching recent searches:", error);
    }
  };

  // Add useEffect to fetch suggestions on component mount
  useEffect(() => {
    fetchRecentSearches();
  }, []);

  // Filter results based on active filter
  const filteredResults = searchResults.filter((result) => {
    if (!activeFilter) return true;
    if (activeFilter === "memory" && result.type === "memory") return true;
    if (activeFilter === "file" && result.type === "file") return true;
    if (
      activeFilter === "recent" &&
      new Date(result.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    )
      return true;
    return false;
  });

  // Sort results based on sort option
  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortOption === "date") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    // Default is relevance, which we'll simulate as the original order
    return 0;
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
      }

      // Format options for different cases
      const fullDateOptions: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };

      const recentDateOptions: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
      };

      // Show full date if more than 7 days old
      if (diffDays > 7) {
        return new Intl.DateTimeFormat("en-US", fullDateOptions).format(date);
      }

      // Show relative time for recent dates
      if (diffDays === 0) {
        const hours = Math.abs(now.getHours() - date.getHours());
        if (hours < 1) {
          const minutes = Math.abs(now.getMinutes() - date.getMinutes());
          if (minutes < 1) {
            return "Just now";
          }
          return `${minutes}m ago`;
        }
        return `Today at ${new Intl.DateTimeFormat(
          "en-US",
          recentDateOptions
        ).format(date)}`;
      } else if (diffDays === 1) {
        return `Yesterday at ${new Intl.DateTimeFormat(
          "en-US",
          recentDateOptions
        ).format(date)}`;
      }

      // For 2-7 days ago
      return `${diffDays} days ago`;
    } catch (error) {
      console.error("Date formatting error:", error);
      // Fallback to basic date format if there's an error
      return dateString.split("T")[0];
    }
  };

  // Highlight matching text in search results
  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    try {
      const regex = new RegExp(`(${query})`, "gi");
      return text.replace(
        regex,
        '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>'
      );
    } catch (e) {
      return text;
    }
  };

  // Handle viewing a memory
  const handleView = (item: SearchResult) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  // Handle setting a reminder
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
      scheduleNotification(
        selectedItem.title,
        reminderDateTime
      );

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

  // Handle more options
  const handleMoreOptions = (item: SearchResult) => {
    setMoreOptionsItem(item);
    setMoreOptionsOpen(true);
  };

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">
          AI-Powered Search
        </h1>
        <p className="text-neutral-600 max-w-2xl mx-auto">
          Find anything you've stored in your memory vault, even if you can't
          remember exactly what it was.
        </p>
      </div>

      {/* Search Form */}
      <div className="relative mb-8">
        <form onSubmit={handleSearch} className="relative">
          <div className="flex">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <SearchIcon size={20} className="text-neutral-400" />
              </div>
              <input
                type="text"
                placeholder="Search your memories..."
                className="pl-12 pr-4 py-4 w-full rounded-l-lg border border-neutral-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length > 0) {
                    setShowSuggestions(true);
                  } else {
                    setShowSuggestions(false);
                  }
                }}
              />
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 bg-white rounded-b-lg shadow-lg border border-neutral-200 border-t-0 z-10"
                  >
                    <div className="p-2">
                      {suggestions
                        .filter((s) =>
                          s.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .slice(0, 5)
                        .map((suggestion, index) => (
                          <button
                            key={index}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 rounded-md"
                            onClick={() => {
                              setSearchQuery(suggestion);
                              setShowSuggestions(false);
                              handleSearch();
                            }}
                          >
                            <div className="flex items-center">
                              <Clock
                                size={14}
                                className="mr-2 text-neutral-400"
                              />
                              {suggestion}
                            </div>
                          </button>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 rounded-r-lg font-medium flex items-center"
              disabled={isSearching}
            >
              {isSearching ? (
                <div className="h-5 w-5 rounded-full border-t-2 border-r-2 border-white animate-spin"></div>
              ) : (
                "Search"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* AI Search Help */}
      {!searchResults.length && !isSearching && (
        <div className="mb-8 bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-white p-3 rounded-full shadow-sm">
              <Lightbulb size={24} className="text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                AI-Powered Search Tips
              </h2>
              <p className="text-neutral-700 mb-4">
                Our AI can understand natural language queries and help you find
                exactly what you're looking for.
              </p>
              <div className="space-y-3">
                {aiHelp.map((item, index) => (
                  <button
                    key={index}
                    className="flex items-center justify-between w-full bg-white rounded-md p-3 shadow-sm hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSearchQuery(item.query);
                      handleSearch();
                    }}
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-neutral-800">
                        {item.query}
                      </span>
                      <span className="text-sm text-neutral-500 ml-2">
                        - {item.desc}
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-primary-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {(isSearching || searchResults.length > 0) && (
        <div>
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 relative">
                <div className="absolute inset-0 rounded-full border-4 border-neutral-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-primary-600 animate-spin"></div>
              </div>
              <p className="mt-4 text-neutral-600">
                Searching your memories...
              </p>
            </div>
          ) : (
            <>
              {/* Results Header and Filters */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {filteredResults.length}{" "}
                  {filteredResults.length === 1 ? "result" : "results"} for "
                  {searchQuery}"
                </h2>
                <div className="flex items-center space-x-2 mt-3 md:mt-0">
                  <div className="flex rounded-md border border-neutral-300 overflow-hidden">
                    <button
                      onClick={() => setActiveFilter(null)}
                      className={`px-3 py-1 text-sm ${
                        !activeFilter
                          ? "bg-primary-50 text-primary-700"
                          : "bg-white text-neutral-600"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setActiveFilter("memory")}
                      className={`px-3 py-1 text-sm ${
                        activeFilter === "memory"
                          ? "bg-primary-50 text-primary-700"
                          : "bg-white text-neutral-600"
                      }`}
                    >
                      Memories
                    </button>
                    <button
                      onClick={() => setActiveFilter("file")}
                      className={`px-3 py-1 text-sm ${
                        activeFilter === "file"
                          ? "bg-primary-50 text-primary-700"
                          : "bg-white text-neutral-600"
                      }`}
                    >
                      Files
                    </button>
                    <button
                      onClick={() => setActiveFilter("recent")}
                      className={`px-3 py-1 text-sm ${
                        activeFilter === "recent"
                          ? "bg-primary-50 text-primary-700"
                          : "bg-white text-neutral-600"
                      }`}
                    >
                      Recent
                    </button>
                  </div>
                  <div className="relative group">
                    <button className="flex items-center space-x-1 text-sm px-3 py-1 border border-neutral-300 rounded-md bg-white text-neutral-600">
                      <Filter size={14} />
                      <span>
                        {sortOption === "relevance" ? "Relevance" : "Date"}
                      </span>
                    </button>
                    <div className="absolute right-0 mt-1 bg-white rounded-md shadow-md border border-neutral-200 w-40 z-10 hidden group-hover:block">
                      <button
                        onClick={() => setSortOption("relevance")}
                        className={`block w-full text-left px-3 py-2 text-sm ${
                          sortOption === "relevance"
                            ? "bg-primary-50 text-primary-700"
                            : "hover:bg-neutral-100"
                        }`}
                      >
                        Relevance
                      </button>
                      <button
                        onClick={() => setSortOption("date")}
                        className={`block w-full text-left px-3 py-2 text-sm ${
                          sortOption === "date"
                            ? "bg-primary-50 text-primary-700"
                            : "hover:bg-neutral-100"
                        }`}
                      >
                        Date (newest first)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-6">
                {sortedResults.map((result) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-5">
                      <div className="flex items-center mb-3">
                        <div
                          className={`p-2 rounded-full flex-shrink-0 ${
                            result.type === "memory"
                              ? "bg-primary-100 text-primary-600"
                              : "bg-accent-100 text-accent-600"
                          }`}
                        >
                          {result.type === "memory" ? (
                            <Database size={16} />
                          ) : (
                            <FileText size={16} />
                          )}
                        </div>
                        <span className="text-xs font-medium uppercase text-neutral-500 ml-2">
                          {result.type === "memory" ? "Memory" : "File"}
                        </span>
                        <span className="mx-2 text-neutral-300">•</span>
                        <span className="text-xs text-neutral-500">
                          {formatDate(result.date)}
                        </span>
                      </div>

                      <h3 className="font-medium text-lg text-neutral-800 mb-2">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: highlightText(result.title, searchQuery),
                          }}
                        />
                      </h3>

                      <p className="text-neutral-600 mb-3">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: highlightText(result.content, searchQuery),
                          }}
                        />
                      </p>

                      {result.type === "file" && result.url && (
                        <div className="mb-3">
                          <img
                            src={result.url}
                            alt={result.title}
                            className="rounded-md max-h-40 object-cover"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        {result.category && (
                          <div className="flex items-center text-xs">
                            <Tag size={12} className="mr-1 text-neutral-500" />
                            <span className="text-neutral-600">
                              {result.category}
                            </span>
                          </div>
                        )}

                        {result.tags &&
                          result.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-0.5 text-xs bg-neutral-100 rounded-full text-neutral-700"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-between items-center">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleView(result)}
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <ExternalLink size={14} className="mr-1" />
                            View
                          </button>
                          {result.type === "memory" && (
                            <button 
                              onClick={() => {
                                setSelectedItem(result);
                                setReminderModalOpen(true);
                              }}
                              className="text-sm text-neutral-600 hover:text-neutral-700 flex items-center"
                            >
                              <Calendar size={14} className="mr-1" />
                              Set Reminder
                            </button>
                          )}
                        </div>
                        <button 
                          onClick={() => handleMoreOptions(result)}
                          className="text-sm text-neutral-600 hover:text-neutral-700"
                        >
                          More options
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

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
                <div className="prose max-w-none">
                  <p className="text-neutral-600">{selectedItem.content}</p>
                </div>
                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedItem.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-0.5 text-xs bg-neutral-100 rounded-full text-neutral-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
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

      {/* More Options Modal */}
      <AnimatePresence>
        {moreOptionsOpen && moreOptionsItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4"
            onClick={() => setMoreOptionsOpen(false)}
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
                  <h2 className="text-xl font-semibold">Options</h2>
                  <button
                    onClick={() => setMoreOptionsOpen(false)}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setMoreOptionsOpen(false);
                      setSelectedItem(moreOptionsItem);
                      setDetailModalOpen(true);
                    }}
                    className="w-full flex items-center space-x-2 text-neutral-700 hover:text-neutral-900 p-2 rounded hover:bg-neutral-100"
                  >
                    <ExternalLink size={16} />
                    <span>View Details</span>
                  </button>
                  {moreOptionsItem.type === "memory" && (
                    <button
                      onClick={() => {
                        setMoreOptionsOpen(false);
                        setSelectedItem(moreOptionsItem);
                        setReminderModalOpen(true);
                      }}
                      className="w-full flex items-center space-x-2 text-neutral-700 hover:text-neutral-900 p-2 rounded hover:bg-neutral-100"
                    >
                      <Calendar size={16} />
                      <span>Set Reminder</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMoreOptionsOpen(false);
                      // Add edit functionality here
                    }}
                    className="w-full flex items-center space-x-2 text-neutral-700 hover:text-neutral-900 p-2 rounded hover:bg-neutral-100"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setMoreOptionsOpen(false);
                      // Add delete functionality here
                    }}
                    className="w-full flex items-center space-x-2 text-error-600 hover:text-error-800 p-2 rounded hover:bg-error-50"
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchPage;
