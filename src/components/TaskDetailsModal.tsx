import React, { useEffect, useState } from 'react';
import { X, Clock, Calendar, ArrowUpCircle, Timer, CheckCircle, AlarmClock, Trash2 } from 'lucide-react';
import { Task } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface TaskDetailsModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'high':
      return 'text-red-500 bg-red-50';
    case 'medium':
      return 'text-yellow-500 bg-yellow-50';
    case 'low':
      return 'text-green-500 bg-green-50';
    default:
      return 'text-gray-500 bg-gray-50';
  }
};

const getStatusColor = (status: Task['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'in-progress':
      return 'bg-blue-100 text-blue-700';
    case 'todo':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export default function TaskDetailsModal({ task, onClose, onUpdate, onDelete }: TaskDetailsModalProps) {
  const [remainingTime, setRemainingTime] = useState('00:00');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const handleStatusChange = (newStatus: Task['status']) => {
    const now = new Date().toISOString();
    onClose();
    onUpdate({
      ...task,
      start_time: newStatus === 'in-progress' ? now : undefined,
      completed_at: newStatus === 'completed' ? now : task.completed_at,
      status: newStatus,
      updated_at: new Date().toISOString()
    });
  };

  const handleCompletionTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const completed_at = new Date(e.target.value).toISOString();
    onUpdate({
      ...task,
      completed_at,
      updated_at: new Date().toISOString()
    });
  };

  const handleEstimatedTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^\d]/g, '');
    const estimated_minutes = value ? Math.min(Math.max(parseInt(value, 10), 1), 1440) : undefined;
    
    onUpdate({
      ...task,
      estimated_minutes,
      updated_at: new Date().toISOString()
    });
  };

  const handlePriorityChange = (newPriority: Task['priority']) => {
    onUpdate({
      ...task,
      priority: newPriority as Task['priority'],
      updatedAt: new Date().toISOString()
    });
  };

  const handleEstimatedMinutesChange = (minutes: number | undefined) => {
    onUpdate({
      ...task,
      estimatedMinutes: minutes,
      updatedAt: new Date().toISOString()
    });
  };

  const getRemainingTime = () => {
    if (!task.start_time || !task.estimated_minutes) return '00:00';
    
    const startTime = new Date(task.start_time).getTime();
    const endTime = startTime + (task.estimated_minutes * 60 * 1000);
    const now = Date.now();
    
    if (now >= endTime) return '00:00';
    
    const remaining = endTime - now;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const milliseconds = Math.floor((remaining % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let animationFrameId: number;

    const updateTimer = () => {
      setRemainingTime(getRemainingTime());
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    if (task?.status === 'in-progress' && task?.estimated_minutes) {
      animationFrameId = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [task?.status, task?.estimated_minutes, task?.start_time]);

  if (!task) return null;

  const getProgress = () => {
    switch (task.status) {
      case 'completed':
        return 100;
      case 'in-progress':
        return 50;
      case 'todo':
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 m-4">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">{task.title}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Task Details */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowUpCircle className={`w-4 h-4 ${getPriorityColor(task.priority).split(' ')[0]}`} />
              <select
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value as Task['priority'])}
                className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <AlarmClock className="w-4 h-4 text-gray-500" />
              <select
                value={task.estimatedMinutes || 'default'}
                onChange={(e) => {
                  const minutes = e.target.value === 'default' ? undefined : parseInt(e.target.value, 10);
                  handleEstimatedMinutesChange(minutes);
                }}
                className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="default">Set time</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="240">4 hours</option>
                <option value="480">8 hours</option>
              </select>
            </div>
          </div>

          {/* Countdown Timer */}
          {task.status === 'in-progress' && task.estimated_minutes && (
            <div className="flex items-center space-x-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg">
              <Timer className="w-5 h-5" />
              <span className="font-mono text-lg" id="countdown">{remainingTime}</span>
              <span className="text-sm">remaining</span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-gray-700">{getProgress()}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Due: {new Date(task.due_date).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Created: {new Date(task.created_at).toLocaleString()}</span>
            </div>
            {task.status === 'completed' && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Completed: {task.completed_at ? new Date(task.completed_at).toLocaleString() : ''}</span>
              </div>
            )}
          </div>

          {/* Status Buttons */}
          <div className="flex justify-center space-x-6 pt-4 border-t"> 
            {task.status !== 'completed' && (
              <>
                <button
                  onClick={() => {
                    if (!task.estimated_minutes) {
                      alert('Please set the estimated completion time (in minutes) before starting the task');
                      return;
                    }
                    if (task.estimated_minutes > 1440) {
                      alert('Estimated time cannot exceed 24 hours (1440 minutes)');
                      return;
                    }
                    onClose();
                    handleStatusChange('in-progress');
                  }}
                  className={`px-6 py-3 rounded-lg text-sm font-medium ${
                    task.status === 'in-progress' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Start Task
                </button>
                <button
                  onClick={() => {
                    onClose();
                    handleStatusChange('completed');
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700"
                >
                  Complete Task
                </button>
                <button
                  onClick={() => setIsConfirmDialogOpen(true)}
                  className="px-6 py-3 rounded-lg text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200"
                >
                  Delete Task
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={() => onDelete(task.id)}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}