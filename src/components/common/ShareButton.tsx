import { useState } from 'react';
import { shareService } from '../../services/shareService';
import { toast } from 'react-hot-toast';
import { Share2, Copy, Check } from 'lucide-react';

interface ShareButtonProps {
  itemId: string;
  itemType: 'memory' | 'file';
}

export const ShareButton = ({ itemId, itemType }: ShareButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async () => {
    try {
      setIsLoading(true);
      const share = await shareService.createShare(itemId, itemType);
      const shareUrl = `${window.location.origin}/shared/${share.share_token}`;
      
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast.success('Share link copied to clipboard!');
      
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to create share link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isLoading}
      className="p-2 rounded-full"
      title="Share"
    >
      {isCopied ? (
        <Check className="w-5 h-5 text-green-500" />
      ) : (
        <Share2 className="w-5 h-5" />
      )}
    </button>
  );
}; 