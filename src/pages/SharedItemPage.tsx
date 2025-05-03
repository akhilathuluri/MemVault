import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shareService } from '../services/shareService';
import { SharedItem, Memory, File } from '../types/database.types';
import { MemoryItem } from '../components/common/MemoryItem';
import { FileItem } from '../components/common/FileItem';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Share2, Copy, Clock, Calendar, ExternalLink, Download, FileText, Image, File as FileIcon } from 'lucide-react';

export const SharedItemPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [sharedItem, setSharedItem] = useState<SharedItem | null>(null);
  const [itemData, setItemData] = useState<Memory | File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (token) {
      setShareUrl(`${window.location.origin}/shared/${token}`);
    }
  }, [token]);

  useEffect(() => {
    const loadSharedItem = async () => {
      try {
        if (!token) return;
        
        // Get shared item without authentication
        const { data: shareData, error: shareError } = await supabase
          .from('shared_items')
          .select('*')
          .eq('share_token', token)
          .eq('is_active', true)
          .single();

        if (shareError || !shareData) {
          toast.error('Shared item not found or expired');
          return;
        }

        setSharedItem(shareData);

        // Fetch the actual item data based on type
        const { data, error } = await supabase
          .from(shareData.item_type === 'memory' ? 'memory_items' : 'files')
          .select('*')
          .eq('id', shareData.item_id)
          .single();

        if (error) throw error;
        setItemData(data);
      } catch (error) {
        toast.error('Failed to load shared item');
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedItem();
  }, [token]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading shared item...</p>
        </div>
      </div>
    );
  }

  if (!sharedItem || !itemData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Item Not Found</h1>
            <p className="text-gray-600 mb-6">
              The shared item may have expired or been deleted.
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200">
                  <Share2 className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Shared {sharedItem.item_type === 'memory' ? 'Memory' : 'File'}
                  </h2>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>Created {new Date(sharedItem.created_at).toLocaleDateString()}</span>
                    </div>
                    {sharedItem.expires_at && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>Expires {new Date(sharedItem.expires_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCopyLink}
                className="btn btn-secondary flex items-center bg-white hover:bg-gray-50"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </button>
            </div>
          </div>

          <div className="p-6">
            {sharedItem.item_type === 'memory' ? (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <MemoryItem memory={itemData as Memory} />
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                    {(itemData as File).type === 'document' ? (
                      <FileText className="w-8 h-8 text-primary-600" />
                    ) : (itemData as File).type === 'image' ? (
                      <Image className="w-8 h-8 text-primary-600" />
                    ) : (
                      <FileIcon className="w-8 h-8 text-primary-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{(itemData as File).name}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <div className="flex items-center">
                        <span className="font-medium">Type:</span>
                        <span className="ml-2 capitalize">{(itemData as File).type}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium">Size:</span>
                        <span className="ml-2">{(itemData as File).size}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium">Created:</span>
                        <span className="ml-2">{new Date((itemData as File).created_at).toLocaleDateString()}</span>
                      </div>
                      {(itemData as File).keywords && (itemData as File).keywords.length > 0 && (
                        <div className="flex items-center">
                          <span className="font-medium">Keywords:</span>
                          <span className="ml-2">{(itemData as File).keywords.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <a
                        href={(itemData as File).file_path}
                        download={(itemData as File).name}
                        className="btn btn-primary inline-flex items-center"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download File
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 