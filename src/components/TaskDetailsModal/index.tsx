import React from 'react';
import { X, Clock, Calendar, Timer, CheckCircle, ArrowUpCircle } from 'lucide-react';
import { Task } from '../../types';
import { getStatusColor } from './styles';
import ProgressControl from './ProgressControl';
import PriorityControl from './PriorityControl';
import TimeControl from './TimeControl';
import { useRemainingTime } from './hooks';
import { validateEstimatedTime } from './utils';

interface TaskDetailsModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (task: Task) => void;
}

export default function TaskDetailsModal({ task, onClose, onUpdate }: TaskDetailsModalProps) {
  const remainingTime = useRemainingTime(task);

  const handleStatusChange = (newStatus: Task['status']) => {
    const now = new Date().toISOString();
    onClose();
    onUpdate({
      ...task,
      startTime: newStatus === 'in-progress' ? now : undefined,
      completedAt: newStatus === 'completed' ? now : task.completedAt,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  };

  const handleCompletionTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const completedAt = new Date(e.target.value).toISOString();
    onUpdate({
      ...task,
      completedAt,
      updatedAt: new Date().toISOString()
    });
  };

  const handlePriorityChange = (newPriority: Task['priority']) => {
    onUpdate({
      ...task,
      priority: newPriority,
      status: task.status,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      estimatedMinutes: task.estimatedMinutes,
      startTime: task.startTime,
      completedAt: task.completedAt,
      progress: task.progress,
      createdAt: task.createdAt,
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

  if (!task) return null;

  const handleStartTask = () => {
    const error = validateEstimatedTime(task.estimatedMinutes);
    if (error) {
      alert(error);
      return;
    }
    onClose();
    handleStatusChange('in-progress');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 m-4">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">{task.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
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
          </div>

          {/* Priority Control */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <PriorityControl
              priority={task.priority}
              onChange={handlePriorityChange}
            />
          </div>

          {/* Time Control */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Estimated Time</label>
            <TimeControl
              value={task.estimatedMinutes}
              onChange={handleEstimatedMinutesChange}
            />
          </div>

          {/* Countdown Timer */}
          {task.status === 'in-progress' && task.estimatedMinutes && (
            <div className="flex items-center justify-between bg-red-50 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
              <Timer className="w-5 h-5" />
              <span className="font-mono text-lg" id="countdown">{remainingTime}</span>
              <span className="text-sm">remaining</span>
              </div>
              <button
                onClick={() => handleStatusChange('in-progress')}
                className="flex items-center space-x-1 px-3 py-1 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                <Timer className="w-4 h-4" />
                <span className="text-sm font-medium">Restart Timer</span>
              </button>
            </div>
          )}

          {/* Progress Bar */}
          <ProgressControl task={task} onUpdate={onUpdate} />

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Due: {new Date(task.dueDate).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
            </div>
            {task.status === 'completed' && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Completed:</span>
                <input
                  type="datetime-local"
                  value={task.completedAt ? new Date(task.completedAt).toISOString().slice(0, 16) : ''}
                  onChange={handleCompletionTimeChange}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            )}
          </div>

          {/* Status Buttons */}
          <div className="flex justify-center space-x-6 pt-4 border-t">
            <button
              onClick={() => {
                if (task.status === 'in-progress') {
                  handleStatusChange('todo');
                } else {
                  handleStartTask();
                }
              }}
              className={`px-6 py-3 rounded-lg text-sm font-medium ${
                task.status === 'in-progress' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {task.status === 'in-progress' ? 'Restart Task' : 'Start Task'}
            </button>
            <button
              onClick={() => {
                onClose();
                handleStatusChange('completed');
              }}
              className={`px-6 py-3 rounded-lg text-sm font-medium ${
                task.status === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              Complete Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}