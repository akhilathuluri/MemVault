import { ShareButton } from './ShareButton';
import { File } from '../../types/database.types';

interface FileItemProps {
  file: File;
}

export const FileItem = ({ file }: FileItemProps) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-2">{file.name}</h2>
          <div className="space-y-2 mb-4">
            <p className="text-gray-600 dark:text-gray-300">
              Type: {file.type}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Size: {formatFileSize(file.size)}
            </p>
            <div className="flex flex-wrap gap-2">
              {file.keywords?.map((keyword) => (
                <span
                  key={keyword}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Created: {new Date(file.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <ShareButton itemId={file.id} itemType="file" />
        </div>
      </div>
    </div>
  );
}; 