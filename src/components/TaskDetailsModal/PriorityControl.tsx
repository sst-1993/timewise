import React from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { Task } from '../../types';

interface PriorityControlProps {
  priority: Task['priority'];
  onChange: (priority: Task['priority']) => void;
}

export default function PriorityControl({ priority, onChange }: PriorityControlProps) {
  const priorities: Task['priority'][] = ['high', 'medium', 'low'];

  return (
    <div className="flex items-center space-x-4">
      {priorities.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
            priority === p
              ? p === 'high'
                ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                : p === 'medium'
                ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-500'
                : 'bg-green-100 text-green-700 ring-2 ring-green-500'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ArrowUpCircle className={`w-5 h-5 ${
            priority === p
              ? p === 'high'
                ? 'text-red-600'
                : p === 'medium'
                ? 'text-yellow-600'
                : 'text-green-600'
              : ''
          }`} />
          <span className="text-sm font-medium">{p.charAt(0).toUpperCase() + p.slice(1)} Priority</span>
        </button>
      ))}
    </div>
  );
}