import React, { useMemo } from 'react';
import { Task } from '../types';
import { Calendar, ArrowUpCircle, Clock, Plus } from 'lucide-react';

interface NextWeekPlannerProps {
  tasks: Task[];
  onCreateTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export default function NextWeekPlanner({ tasks, onCreateTask }: NextWeekPlannerProps) {
  const nextWeekDays = useMemo(() => {
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (8 - today.getDay())); // Next Monday
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(nextMonday);
      date.setDate(nextMonday.getDate() + i);
      return date;
    });
  }, []);

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const handleQuickAdd = (date: Date) => {
    onCreateTask({
      title: 'New Task',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: date.toISOString().split('T')[0],
      estimatedMinutes: 60,
    });
  };

  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
        <Calendar className="w-6 h-6 mr-2 text-blue-600" />
        Next Week Planning
      </h2>

      <div className="space-y-4">
        {nextWeekDays.map((date) => (
          <div key={date.toISOString()} className="group">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                {date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </h3>
              <button
                onClick={() => handleQuickAdd(date)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded-full"
                title="Quick add task"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg bg-white p-2 min-h-[60px]">
              {getTasksForDate(date).map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 rounded-md bg-gray-50 mb-1 last:mb-0"
                >
                  <div className="flex items-center space-x-2">
                    <ArrowUpCircle
                      className={`w-4 h-4 ${
                        task.priority === 'high'
                          ? 'text-red-500'
                          : task.priority === 'medium'
                          ? 'text-yellow-500'
                          : 'text-green-500'
                      }`}
                    />
                    <span className="text-sm text-gray-800">{task.title}</span>
                  </div>
                  {task.estimatedMinutes && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{task.estimatedMinutes}m</span>
                    </div>
                  )}
                </div>
              ))}
              {getTasksForDate(date).length === 0 && (
                <div className="text-center text-sm text-gray-400 py-2">
                  No tasks planned
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}