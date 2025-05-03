import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, FileItem, uploadFile, getAllFiles, deleteFile } from '../lib/supabase';
import { registerDevice, isDeviceRegistered } from '../lib/webauthn';
import { toast } from 'sonner';
import { 
  Upload, 
  File, 
  Image,
  FileText,
  FilePlus,
  Trash2,
  Search,
  X,
  Filter,
  Grid,
  List as ListIcon,
  Lock,
  Download,
  ExternalLink,
  Info,
  Loader2,
  AlertCircle,
  Fingerprint,
} from 'lucide-react';
import { ShareButton } from '../components/common/ShareButton';

// File type definitions
const FILE_TYPES = [
  { id: 'image', name: 'Images', icon: <Image size={16} /> },
  { id: 'document', name: 'Documents', icon: <FileText size={16} /> },
  { id: 'other', name: 'Others', icon: <File size={16} /> },
];

const FilesPage = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [authenticated, setAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Upload form states
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const isRegistered = await isDeviceRegistered();
        setAuthenticated(isRegistered);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setError('Failed to check authentication status');
    }
  };

  // Fetch files when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchFiles();
    }
  }, [authenticated]);

  const handleDeviceRegistration = async () => {
    try {
      setIsRegistering(true);
      setError(null);

      if (!deviceName.trim()) {
        throw new Error('Please enter a device name');
      }

      await registerDevice(deviceName);
      setAuthenticated(true);
      toast.success('Device registered successfully');
    } catch (error: any) {
      console.error('Error registering device:', error);
      setError(error.message || 'Failed to register device');
      toast.error('Failed to register device');
    } finally {
      setIsRegistering(false);
    }
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const files = await getAllFiles();
      setFiles(files);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      setError(error.message);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10 MB
        toast.error('File size exceeds the 10MB limit');
        e.target.value = '';
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!fileName.trim()) {
      toast.error('Please enter a file name');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Process keywords
      const keywordArray = keywords.split(',').map(kw => kw.trim()).filter(Boolean);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file to Supabase
      const newFile = await uploadFile(file, fileName, keywordArray);
      
      // Update UI
      setFiles(prev => [newFile, ...prev]);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reset form
      resetUploadForm();
      setUploadModalOpen(false);
      toast.success('File uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      await deleteFile(id, filePath);
      setFiles(prev => prev.filter(file => file.id !== id));
      setDetailModalOpen(false);
      setSelectedFile(null);
      toast.success('File deleted successfully');
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error(error.message || 'Failed to delete file');
    }
  };

  const resetUploadForm = () => {
    setFile(null);
    setFileName('');
    setKeywords('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileTypeIcon = (type: string) => {
    switch(type) {
      case 'image':
        return <Image size={24} className="text-accent-600" />;
      case 'document':
        return <FileText size={24} className="text-primary-600" />;
      default:
        return <File size={24} className="text-neutral-600" />;
    }
  };

  // Filter files based on search and type
  const filteredFiles = files.filter(file => {
    const matchesSearch = 
      searchQuery === '' || 
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      file.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === null || file.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Render authentication screen if not authenticated
  if (!authenticated) {
    return (
      <div className="p-5 md:p-8 h-full flex flex-col items-center justify-center max-w-md mx-auto text-center">
        <div className="bg-neutral-100 p-6 rounded-full mb-6">
          <Fingerprint size={32} className="text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">Protected Files</h1>
        <p className="text-neutral-600 mb-8">
          For security reasons, this section requires device authentication.
        </p>
        <div className="w-full max-w-xs space-y-4">
          <div>
            <input
              type="text"
              placeholder="Enter device name"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="input w-full"
            />
            {error && (
              <p className="mt-2 text-sm text-error-600">{error}</p>
            )}
          </div>
          <button 
            onClick={handleDeviceRegistration}
            disabled={isRegistering || !deviceName.trim()}
            className="btn btn-primary w-full"
          >
            {isRegistering ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Registering Device...
              </>
            ) : (
              <>
                <Fingerprint size={18} className="mr-2" />
                Register Device
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Files</h1>
          <p className="text-neutral-500">Store and manage your important files</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="btn btn-primary"
          >
            <Upload size={18} className="mr-2" />
            Upload File
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-200 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Search files..."
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
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              >
                <Filter size={16} className="mr-2" />
                {typeFilter ? `Filter: ${typeFilter}` : 'Filter'}
              </button>
              
              {filterDropdownOpen && (
                <div className="absolute top-12 right-0 w-64 bg-white rounded-md shadow-lg border border-neutral-200 z-10 p-2">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setTypeFilter(null);
                        setFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                        typeFilter === null ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-100'
                      }`}
                    >
                      All Files
                    </button>
                    {FILE_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          setTypeFilter(type.id);
                          setFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center ${
                          typeFilter === type.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-100'
                        }`}
                      >
                        <span className="mr-2">{type.icon}</span>
                        {type.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex border border-neutral-200 rounded-md">
              <button
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'bg-white text-neutral-500'}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <Grid size={18} />
              </button>
              <button
                className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'bg-white text-neutral-500'}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="p-8">
          <div className="bg-error-50 border border-error-200 text-error-700 p-4 rounded-md flex items-center">
            <AlertCircle size={24} className="mr-3 text-error-500" />
            <div>
              <h3 className="font-semibold">Error loading files</h3>
              <p className="text-sm">{error}</p>
              <button 
                onClick={fetchFiles} 
                className="mt-2 text-sm text-error-600 hover:text-error-800"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : filteredFiles.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-neutral-200 rounded-lg">
          <div className="bg-neutral-100 p-4 rounded-full mb-4">
            <FilePlus size={24} className="text-neutral-500" />
          </div>
          <h3 className="text-xl font-medium text-neutral-700">No files found</h3>
          <p className="text-neutral-500 mt-2 text-center max-w-md">
            {searchQuery || typeFilter 
              ? "No files match your current filters. Try adjusting your search or filters."
              : "You haven't uploaded any files yet. Start by uploading your first file."}
          </p>
          <button
            onClick={() => {
              if (searchQuery || typeFilter) {
                setSearchQuery('');
                setTypeFilter(null);
              } else {
                setUploadModalOpen(true);
              }
            }}
            className="btn btn-primary mt-4"
          >
            {searchQuery || typeFilter ? 'Clear Filters' : 'Upload Your First File'}
          </button>
        </div>
      ) : (
        // Files Grid/List
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" 
          : "space-y-3"
        }>
          {filteredFiles.map((file) => (
            <motion.div 
              key={file.id}
              className={`card hover:shadow-md transition-all cursor-pointer ${
                viewMode === 'list' ? 'flex items-center p-4' : ''
              }`}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setSelectedFile(file);
                setDetailModalOpen(true);
              }}
            >
              {viewMode === 'grid' ? (
                <>
                  <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center">
                      {getFileTypeIcon(file.type)}
                      <span className="ml-2 text-sm font-medium text-neutral-700 truncate max-w-[150px]">
                        {file.name}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <div className="p-4">
                    {file.type === 'image' && file.file_path.startsWith('http') && (
                      <div className="aspect-video bg-neutral-100 rounded-md mb-3 overflow-hidden">
                        <img 
                          src={file.file_path}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {file.keywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="inline-block px-2 py-0.5 text-xs bg-neutral-100 rounded-full text-neutral-700"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Uploaded on {new Date(file.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-shrink-0 mr-4">
                    {file.type === 'image' && file.file_path.startsWith('http') ? (
                      <div className="w-12 h-12 rounded bg-neutral-100 overflow-hidden">
                        <img 
                          src={file.file_path}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded bg-neutral-100 flex items-center justify-center">
                        {getFileTypeIcon(file.type)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-neutral-900 truncate">{file.name}</h3>
                    <div className="flex items-center text-xs text-neutral-500 mt-1">
                      <span>{formatFileSize(file.size)}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <Download size={16} className="text-neutral-400 hover:text-neutral-700" />
                  </div>
                </>
              )}
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.id, file.file_path);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="p-2">
                  <ShareButton itemId={file.id} itemType="file" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4"
            onClick={() => !isUploading && setUploadModalOpen(false)}
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
                  <h2 className="text-xl font-semibold">Upload File</h2>
                  {!isUploading && (
                    <button
                      onClick={() => setUploadModalOpen(false)}
                      className="text-neutral-500 hover:text-neutral-700"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleUpload} className="p-6">
                <div className="space-y-5">
                  {!file ? (
                    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <Upload size={32} className="mx-auto text-neutral-400 mb-3" />
                      <p className="text-sm text-neutral-600 mb-2">
                        Drag and drop your file here, or 
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-primary-600 hover:text-primary-700 font-medium ml-1"
                          disabled={isUploading}
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-xs text-neutral-500">
                        Max file size: 10MB
                      </p>
                    </div>
                  ) : (
                    <div className="bg-neutral-50 rounded-lg p-4 flex items-start">
                      {file.type.includes('image') ? (
                        <Image size={24} className="text-neutral-500 mt-1" />
                      ) : (
                        <FileText size={24} className="text-neutral-500 mt-1" />
                      )}
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-neutral-700">{file.name}</p>
                        <p className="text-xs text-neutral-500 mt-1">{formatFileSize(file.size)}</p>
                        {!isUploading && (
                          <button
                            type="button"
                            onClick={() => {
                              setFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="text-xs text-error-600 hover:text-error-700 mt-2"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-700">Uploading...</span>
                        <span className="text-neutral-700">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-600 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="fileName" className="block text-sm font-medium text-neutral-700 mb-1">
                      File Name
                    </label>
                    <input
                      type="text"
                      id="fileName"
                      className="input w-full"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="Enter a name for your file"
                      disabled={isUploading}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="keywords" className="block text-sm font-medium text-neutral-700 mb-1">
                      Keywords (comma separated)
                    </label>
                    <input
                      type="text"
                      id="keywords"
                      className="input w-full"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="e.g. invoice, Q1, report"
                      disabled={isUploading}
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Add keywords to help you search for this file later
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => setUploadModalOpen(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!file || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={18} className="mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={18} className="mr-2" />
                        Upload File
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Detail Modal */}
      <AnimatePresence>
        {detailModalOpen && selectedFile && (
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
              <div className="p-6 border-b border-neutral-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold">File Details</h2>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    {selectedFile.type === 'image' && selectedFile.file_path.startsWith('http') ? (
                      <div className="w-64 h-64 rounded-lg bg-neutral-100 overflow-hidden border border-neutral-200">
                        <img
                          src={selectedFile.file_path}
                          alt={selectedFile.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-64 h-64 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                        {getFileTypeIcon(selectedFile.type)}
                        <span className="text-xs text-neutral-500 mt-2">
                          {selectedFile.type.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium">{selectedFile.name}</h3>
                        <p className="text-sm text-neutral-500">
                          Uploaded on {new Date(selectedFile.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-neutral-500">File Type</p>
                          <p className="font-medium">{selectedFile.type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500">File Size</p>
                          <p className="font-medium">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>

                      {selectedFile.keywords.length > 0 && (
                        <div>
                          <p className="text-sm text-neutral-500 mb-2">Keywords</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedFile.keywords.map((keyword, index) => (
                              <span
                                key={index}
                                className="inline-block px-2 py-1 text-xs bg-neutral-100 rounded-full text-neutral-700"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-3 pt-4">
                        <a
                          href={selectedFile.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                        >
                          <ExternalLink size={16} className="mr-2" />
                          Open
                        </a>
                        <a
                          href={selectedFile.file_path}
                          download={selectedFile.name}
                          className="btn btn-primary"
                        >
                          <Download size={16} className="mr-2" />
                          Download
                        </a>
                        <button
                          onClick={() => handleDelete(selectedFile.id, selectedFile.file_path)}
                          className="btn btn-error"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Delete
                        </button>
                      </div>
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

export default FilesPage;