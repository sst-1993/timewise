import React, { useMemo } from 'react';
import { Task } from '../types';
import { Clock, CheckCircle2, Timer, TrendingUp, ListChecks, AlertCircle } from 'lucide-react';

interface WeeklySummaryProps {
  tasks: Task[];
}

export default function WeeklySummary({ tasks }: WeeklySummaryProps) {
  const summary = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    const weekTasks = tasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate >= startOfWeek && taskDate <= endOfWeek;
    });

    const totalTasks = weekTasks.length;
    const completedTasks = weekTasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = weekTasks.filter(task => task.status === 'in-progress').length;
    const totalEstimatedTime = weekTasks.reduce((acc, task) => acc + (task.estimatedMinutes || 0), 0);
    const completionRate = totalTasks ? (completedTasks / totalTasks) * 100 : 0;

    const priorityDistribution = {
      high: weekTasks.filter(task => task.priority === 'high').length,
      medium: weekTasks.filter(task => task.priority === 'medium').length,
      low: weekTasks.filter(task => task.priority === 'low').length,
    };

    const overdueTasks = weekTasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate < now && task.status !== 'completed';
    });

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      totalEstimatedTime,
      completionRate,
      priorityDistribution,
      overdueTasks,
      startOfWeek,
      endOfWeek,
    };
  }, [tasks]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
        <Clock className="w-6 h-6 mr-2 text-blue-600" />
        Weekly Summary
        <span className="text-sm font-normal text-gray-500 ml-2">
          ({summary.startOfWeek.toLocaleDateString()} - {summary.endOfWeek.toLocaleDateString()})
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.totalTasks}</h3>
            </div>
            <ListChecks className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {summary.completionRate.toFixed(1)}%
              </h3>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Time</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {formatTime(summary.totalEstimatedTime)}
              </h3>
            </div>
            <Timer className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.inProgressTasks}</h3>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Priority Distribution</h3>
          <div className="space-y-4">
            {Object.entries(summary.priorityDistribution).map(([priority, count]) => (
              <div key={priority} className="flex items-center">
                <div className="w-24 text-sm text-gray-600 capitalize">{priority}</div>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      priority === 'high'
                        ? 'bg-red-500'
                        : priority === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${(count / summary.totalTasks) * 100}%`,
                    }}
                  />
                </div>
                <div className="w-12 text-right text-sm text-gray-600">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            Overdue Tasks
          </h3>
          {summary.overdueTasks.length > 0 ? (
            <div className="space-y-2">
              {summary.overdueTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100"
                >
                  <div className="flex items-center">
                    <div className="ml-2">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-500">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    task.priority === 'high'
                      ? 'bg-red-100 text-red-700'
                      : task.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p>No overdue tasks!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}