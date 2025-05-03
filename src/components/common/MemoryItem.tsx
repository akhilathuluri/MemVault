import { ShareButton } from './ShareButton';
import { Memory } from '../../types/database.types';

interface MemoryItemProps {
  memory: Memory;
}

export const MemoryItem = ({ memory }: MemoryItemProps) => {
  return (
    <div className="bg-white dark:bg-white-800 rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-2">{memory.title}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{memory.content}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {memory.tags?.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Created: {new Date(memory.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <ShareButton itemId={memory.id} itemType="memory" />
        </div>
      </div>
    </div>
  );
}; 