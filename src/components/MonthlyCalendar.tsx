import React from 'react';
import { Task } from '../types';
import { ArrowUpCircle, Clock } from 'lucide-react';

interface MonthlyCalendarProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
}

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export default function MonthlyCalendar({ tasks, onTaskSelect }: MonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: Date[] = [];
    
    // Add days from previous month
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    
    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Add days from next month
    const remainingDays = 42 - days.length; // 6 rows * 7 days = 42
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.due_date);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();

  const changeMonth = (increment: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1));
  };

  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => changeMonth(-1)}
            className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            Today
          </button>
          <button
            onClick={() => changeMonth(1)}
            className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
        
        {days.map((date, index) => {
          const isToday = date.toDateString() === today.toDateString();
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const dayTasks = getTasksForDate(date);
          
          return (
            <div
              key={index}
              className={`min-h-[120px] p-2 ${
                isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
            >
              <div className={`text-sm font-medium ${
                isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {date.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => onTaskSelect(task)}
                    className={`p-1 rounded text-xs cursor-pointer border ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{task.title}</span>
                      <ArrowUpCircle className="w-3 h-3 ml-1 shrink-0" />
                    </div>
                    {task.estimated_minutes && (
                      <div className="flex items-center mt-1 text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>{task.estimated_minutes}m</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}