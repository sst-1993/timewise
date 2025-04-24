import React from 'react';
import { Task } from '../../types';
import { getProgress } from './utils';

interface ProgressControlProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

export default function ProgressControl({ task, onUpdate }: ProgressControlProps) {
  const handleProgressUpdate = (progress: number) => {
    onUpdate({
      ...task,
      progress: Math.max(0, Math.min(100, progress)),
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Progress</span>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min="0"
            max="100"
            value={getProgress(task)}
            onChange={(e) => handleProgressUpdate(parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-sm text-gray-600">%</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div 
          className="h-2 bg-gray-100 rounded-full overflow-hidden relative cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const progress = Math.round((x / rect.width) * 100);
            handleProgressUpdate(progress);
          }}
        >
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${getProgress(task)}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={getProgress(task)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
            onChange={(e) => handleProgressUpdate(parseInt(e.target.value))}
          />
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={() => handleProgressUpdate(0)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            0%
          </button>
          <button
            onClick={() => handleProgressUpdate(25)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            25%
          </button>
          <button
            onClick={() => handleProgressUpdate(50)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            50%
          </button>
          <button
            onClick={() => handleProgressUpdate(75)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            75%
          </button>
          <button
            onClick={() => handleProgressUpdate(100)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            100%
          </button>
        </div>
      </div>
    </div>
  );
}