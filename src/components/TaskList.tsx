import React from 'react';
import { Task } from '../types';
import { ArrowUpCircle, GripVertical, Clock, Play, Pause, StopCircle, ListTodo } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  onTaskUpdate: (updatedTask: Task) => void;
}

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'high':
      return 'text-red-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-green-600';
    default:
      return 'text-gray-500';
  }
};

const getTaskCardColor = (task: Task) => {
  switch (task.status) {
    case 'completed':
      return 'bg-green-50 hover:bg-green-100 border-green-200';
    case 'todo':
      return 'bg-blue-50 hover:bg-blue-100 border-blue-200';
    case 'in-progress':
      return 'bg-red-50 hover:bg-red-100 border-red-200';
    default:
      return 'bg-white hover:bg-gray-50 border-gray-200';
  }
};

const getWeekDays = () => {
  const days = [];
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    days.push(date);
  }
  return days;
};

export default function TaskList({ tasks, onTaskSelect, onTaskUpdate }: TaskListProps) {
  const weekDays = getWeekDays();

  const getTasksForDate = (date: Date) => {
    return tasks
      .filter(task => {
        const taskDate = new Date(task.due_date);
        return (
          taskDate.getDate() === date.getDate() &&
          taskDate.getMonth() === date.getMonth() &&
          taskDate.getFullYear() === date.getFullYear()
        );
      });
  };

  const sortTasks = (tasks: Task[]) => {
    return tasks.sort((a, b) => {
        // First sort by status (in-progress first)
        if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
        if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;

        // First sort by priority
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then sort by start time
        if (!a.start_time && !b.start_time) return 0;
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.setData('taskId', task.id);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-gray-50');
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('bg-gray-50');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, date: Date) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-gray-50');

    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);

    if (!task) return;

    const newDueDate = new Date(date);
    newDueDate.setHours(0, 0, 0, 0);

    onTaskUpdate({
      ...task,
      due_date: newDueDate.toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    });
  };

  const getTasksByStatus = (date: Date, status: Task['status']) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear() &&
        task.status === status
      );
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1024px]">
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <ListTodo className="w-6 h-6 mr-2 text-blue-600" />
            Weekly Schedule
          </h2>
        </div>

        {/* Timeline Header */}
        <div className="flex">
          <div className="flex-1 grid grid-cols-7 gap-1 bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-gray-200 shadow-sm">
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`text-center p-3 rounded-lg border ${
                  day.toDateString() === new Date().toDateString()
                    ? 'bg-blue-600 text-white'
                    : 'bg-white'
                }`}
              >
                <div className="font-medium">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-sm text-gray-500">
                  {day.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Task Columns */}
        <div className="grid grid-cols-7 gap-1 bg-white/50 backdrop-blur-sm p-1 mt-1 rounded-lg border border-gray-200 shadow-sm">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className="min-h-[480px] bg-white p-2 rounded-lg"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
            >
              {sortTasks(getTasksForDate(day)).map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onTaskSelect(task)}
                  className={`rounded-lg p-3 mb-1 cursor-move hover:shadow-md transition-all border ${
                    task.status === 'in-progress'
                      ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 shadow-sm'
                      : getTaskCardColor(task)
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex items-center space-x-1">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      {task.status === 'in-progress' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskUpdate({
                              ...task,
                              status: 'todo',
                              start_time: undefined,
                              updated_at: new Date().toISOString()
                            });
                          }}
                          className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                        >
                          <Pause className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!task.estimated_minutes) {
                              alert('Please set estimated time before starting the task');
                              return;
                            }
                            onTaskUpdate({
                              ...task,
                              status: 'in-progress',
                              start_time: new Date().toISOString(),
                              updated_at: new Date().toISOString()
                            });
                          }}
                          className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-gray-800 truncate flex-1">
                      {task.title}
                    </h4>
                    <ArrowUpCircle 
                      className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${getPriorityColor(task.priority)}`} 
                    />
                  </div>
                  {task.status === 'in-progress' && task.start_time && task.estimated_minutes && (
                    <div className="flex items-center text-xs text-gray-500 mb-1">
                      <Clock className="w-3 h-3 mr-1" />
                      <span className="font-mono">
                        {(() => {
                          const now = Date.now();
                          const start = new Date(task.start_time).getTime();
                          const total = task.estimated_minutes * 60 * 1000;
                          const remaining = Math.max(0, total - (now - start));
                          if (remaining <= 0) return '00:00.00';
                          const minutes = Math.floor(remaining / 60000);
                          const seconds = Math.floor((remaining % 60000) / 1000);
                          const milliseconds = Math.floor((remaining % 1000) / 10);
                          return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
                        })()}
                      </span>
                      {task.status === 'in-progress' && task.start_time && (
                        <span className="ml-2 text-blue-600 font-medium animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 truncate">{task.description}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}