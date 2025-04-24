import React, { useMemo } from 'react';
import { Task } from '../types';
import { BarChart3, Clock, CheckCircle2, Timer, TrendingUp, ListChecks } from 'lucide-react';

interface YearlyAnalyticsProps {
  tasks: Task[];
}

export default function YearlyAnalytics({ tasks }: YearlyAnalyticsProps) {
  const analytics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearTasks = tasks.filter(task => {
      const taskYear = new Date(task.due_date).getFullYear();
      return taskYear === currentYear;
    });

    const totalTasks = yearTasks.length;
    const completedTasks = yearTasks.filter(task => task.status === 'completed').length;
    const totalEstimatedTime = yearTasks.reduce((acc, task) => acc + (task.estimated_minutes || 0), 0);
    const completionRate = totalTasks ? (completedTasks / totalTasks) * 100 : 0;
    const averageTime = completedTasks ? totalEstimatedTime / completedTasks : 0;

    const monthlyStats = Array.from({ length: 12 }, (_, month) => {
      const monthTasks = yearTasks.filter(task => {
        const taskDate = new Date(task.due_date);
        return taskDate.getMonth() === month;
      });

      return {
        month,
        total: monthTasks.length,
        completed: monthTasks.filter(task => task.status === 'completed').length,
        time: monthTasks.reduce((acc, task) => acc + (task.estimated_minutes || 0), 0),
      };
    });

    const priorityDistribution = {
      high: yearTasks.filter(task => task.priority === 'high').length,
      medium: yearTasks.filter(task => task.priority === 'medium').length,
      low: yearTasks.filter(task => task.priority === 'low').length,
    };

    return {
      totalTasks,
      completedTasks,
      totalEstimatedTime,
      completionRate,
      averageTime,
      monthlyStats,
      priorityDistribution,
    };
  }, [tasks]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalTasks}</h3>
            </div>
            <ListChecks className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.completionRate.toFixed(1)}%
              </h3>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Time</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {formatTime(analytics.totalEstimatedTime)}
              </h3>
            </div>
            <Timer className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Monthly Distribution
        </h3>
        <div className="h-64">
          <div className="flex h-full items-end space-x-2">
            {analytics.monthlyStats.map((stat, index) => (
              <div
                key={index}
                className="flex-1 flex flex-col items-center"
                style={{ height: '100%' }}
              >
                <div className="w-full flex-1 flex flex-col justify-end">
                  <div
                    className="w-full bg-blue-200 rounded-t"
                    style={{
                      height: `${(stat.total / Math.max(...analytics.monthlyStats.map(s => s.total))) * 100}%`,
                      minHeight: stat.total ? '8px' : '0',
                    }}
                  >
                    <div
                      className="w-full bg-blue-600 rounded-t transition-all duration-300"
                      style={{
                        height: `${(stat.completed / stat.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {new Date(2024, index).toLocaleString('default', { month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Priority Distribution</h3>
          <div className="space-y-4">
            {Object.entries(analytics.priorityDistribution).map(([priority, count]) => (
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
                      width: `${(count / analytics.totalTasks) * 100}%`,
                    }}
                  />
                </div>
                <div className="w-12 text-right text-sm text-gray-600">{count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Time Analysis</h3>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Average Time per Task</span>
                <span>{formatTime(analytics.averageTime)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Completion Rate</span>
                <span>{analytics.completionRate.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${analytics.completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}