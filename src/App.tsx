import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Task } from './types';
import TaskList from './components/TaskList';
import NextWeekPlanner from './components/NextWeekPlanner';
import CurrentTasks from './components/CurrentTasks';
import TaskModal from './components/TaskModal'; 
import GoalsView from './components/GoalsView';
import TaskDetailsModal from './components/TaskDetailsModal';
import AuthModal from './components/AuthModal';
import MembershipModal from './components/MembershipModal';
import ProfileModal from './components/ProfileModal';
import WeeklySummary from './components/WeeklySummary';
import MonthlyCalendar from './components/MonthlyCalendar';
import YearlyAnalytics from './components/YearlyAnalytics';
import FinancialDashboard from './components/FinancialDashboard';
import { supabase } from './lib/supabase';
import { PlusCircle, Calendar, Clock, ListTodo, ArrowUpCircle, LogOut, LogIn, Crown, Lock, UserCheck, UserX, Wallet, BarChart3, Target } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Subscription, Goal } from './types';

function AppContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | 'all'>('all');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'weekly' | 'monthly' | 'yearly' | 'goals' | 'finances'>('weekly');
  const [isMember, setIsMember] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);

  const handleTaskDelete = async (taskId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;
      setTasks(prev => prev.filter(task => task.id !== taskId));
      setSelectedTask(null);
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task');
    }
  };

  // Load tasks from database
  const loadTasks = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadMembershipStatus(session.user.id);
        loadSubscription(session.user.id);
        loadGoals(session.user.id);
        loadTasks(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadMembershipStatus(session.user.id);
        loadSubscription(session.user.id);
        loadGoals(session.user.id);
        loadTasks(session.user.id);
      } else {
        setSubscription(null);
        setIsMember(false);
        setGoals([]);
        setTasks([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        if (user) {
          loadTasks(user.id);
        }
      })
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
    };
  }, [user?.id]);

  const loadGoals = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (err) {
      console.error('Error loading goals:', err);
    }
  };

  const handleGoalCreate = async (goalData: Omit<Goal, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          ...goalData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => [data, ...prev]);
    } catch (err) {
      console.error('Error creating goal:', err);
      alert('Failed to create goal');
    }
  };

  const handleGoalUpdate = async (updatedGoal: Goal) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          title: updatedGoal.title,
          description: updatedGoal.description,
          progress: updatedGoal.progress,
          status: updatedGoal.status,
          target_date: updatedGoal.target_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedGoal.id)
        .eq('user_id', user?.id);

      if (error) throw error;
      setGoals(prev => prev.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal));
    } catch (err) {
      console.error('Error updating goal:', err);
      alert('Failed to update goal');
    }
  };

  const loadMembershipStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_member')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setIsMember(data?.is_member ?? false);
    } catch (err) {
      console.error('Error loading membership status:', err);
    }
  };

  const toggleMembership = async () => {
    if (!user) return;
    
    try {
      const newStatus = !isMember;
      const { error } = await supabase
        .from('profiles')
        .update({ is_member: newStatus })
        .eq('id', user.id);

      if (error) throw error;
      setIsMember(newStatus);
    } catch (err) {
      console.error('Error toggling membership:', err);
      alert('Failed to update membership status');
    }
  };

  const loadSubscription = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Get the most recent active subscription if any exist
      setSubscription(data?.[0] || null);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setSubscription(null);
    }
  };

  const handleTimeBlockComplete = (duration: number) => {
    console.log(`Time block completed: ${duration} minutes`);
  };

  const handleCreateTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isMember) {
      alert('Only members can create tasks. Please become a member first.');
      return;
    }
    if (!user) return;
    
    setLoading(true);

    // Create task in database
    supabase
      .from('tasks')
      .insert({
        ...taskData,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error creating task:', error);
          alert('Failed to create task');
          return;
        }
        setTasks(prev => [data, ...prev]);
        setIsModalOpen(false);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          status: updatedTask.status,
          priority: updatedTask.priority,
          due_date: updatedTask.dueDate,
          estimated_minutes: updatedTask.estimatedMinutes,
          start_time: updatedTask.startTime,
          completed_at: updatedTask.completedAt,
          progress: updatedTask.progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedTask.id)
        .eq('user_id', user.id);

      if (error) throw error;
      setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task));
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Failed to update task');
    }
  };

  const sortedAndFilteredTasks = useMemo(() => {
    const priorityOrder: Record<Task['priority'], number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    let filteredTasks = tasks;
    if (priorityFilter !== 'all') {
      filteredTasks = tasks.filter(task => task.priority === priorityFilter);
    }

    return filteredTasks.sort((a, b) => {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [tasks, priorityFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">TimeWise</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                      alt="Profile"
                      className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200"
                    />
                  </button>
                  <button
                    onClick={toggleMembership}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      isMember
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    {isMember ? (
                      <>
                        <UserCheck className="w-5 h-5 mr-2" />
                        Member
                      </>
                    ) : (
                      <>
                        <UserX className="w-5 h-5 mr-2" />
                        Not Member
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsMembershipModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-colors"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Premium
                  </button>
                  <button
                    onClick={() => isMember ? setIsModalOpen(true) : alert('Only members can create tasks. Please become a member first.')}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      isMember
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    }`}
                    title={isMember ? 'Create new task' : 'Member feature - Become a member to create tasks'}
                  >
                    {isMember ? (
                      <PlusCircle className="w-5 h-5 mr-2" />
                    ) : (
                      <Lock className="w-5 h-5 mr-2" />
                    )}
                    New Task
                  </button>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="mb-8">
          <ul className="flex flex-wrap gap-1 bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-gray-200 shadow-sm">
            <li className="flex-none">
              <button
                onClick={() => setActiveView('weekly')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                  activeView === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ListTodo className="w-4 h-4 mr-2" />
                Weekly Tasks
              </button>
            </li>
            <li className="flex-none">
              <button
                onClick={() => setActiveView('monthly')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                  activeView === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Monthly View
              </button>
            </li>
            <li className="flex-none">
             <button
                onClick={() => setActiveView('yearly')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                  activeView === 'yearly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Yearly Stats
              </button>
            </li>
            <li className="flex-none">
              <button
                onClick={() => setActiveView('finances')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                  activeView === 'finances'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Finances
              </button>
            </li>
            <li className="flex-none">
              <button
                onClick={() => setActiveView('goals')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                  activeView === 'goals'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Target className="w-4 h-4 mr-2" />
                Goals
              </button>
            </li>
          </ul>
        </nav>

        {activeView === 'weekly' && (
          <div className="grid grid-cols-1">
          <CurrentTasks 
            tasks={tasks}
            onTaskUpdate={handleTaskUpdate}
          />
          <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 mr-2 flex items-center">
                  <ArrowUpCircle className="w-4 h-4 mr-1" />
                  Priority:
                </span>
                <button
                  onClick={() => setPriorityFilter('all')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    priorityFilter === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setPriorityFilter('high')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    priorityFilter === 'high'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  High
                </button>
                <button
                  onClick={() => setPriorityFilter('medium')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    priorityFilter === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => setPriorityFilter('low')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    priorityFilter === 'low'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Low
                </button>
              </div>
            </div>
            <TaskList 
              tasks={sortedAndFilteredTasks} 
              onTaskSelect={setSelectedTask}
              onTaskUpdate={handleTaskUpdate}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 mt-1">
            <NextWeekPlanner
              tasks={tasks}
              onCreateTask={handleCreateTask}
            />
            <WeeklySummary tasks={tasks} />
          </div>
          </div>
        )}

        {activeView === 'monthly' && (
          <MonthlyCalendar
            tasks={tasks}
            onTaskSelect={setSelectedTask}
          />
        )}

        {activeView === 'yearly' && (
          <YearlyAnalytics tasks={tasks} />
        )}
        {activeView === 'finances' && user && (
          <FinancialDashboard userId={user.id} />
        )}
        {activeView === 'goals' && (
          <GoalsView
            goals={goals}
            onGoalCreate={handleGoalCreate}
            onGoalUpdate={handleGoalUpdate}
          />
        )}
      </main>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateTask}
      />
      <TaskDetailsModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setIsAuthModalOpen(false)}
      />
      {user && (
        <MembershipModal
          isOpen={isMembershipModalOpen}
          onClose={() => setIsMembershipModalOpen(false)}
          userId={user.id}
        />
      )}
      {user && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/goals/:goalId/tree" element={<GoalTreeWrapper />} />
      </Routes>
    </Router>
  );
}

function GoalTreeWrapper() {
  const { goalId } = useParams();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  if (!user) return null;

  return <GoalTree rootGoalId={goalId} userId={user.id} />;
}

export default App;