export interface Task {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  created_at: string;
  updated_at: string;
  start_time?: string;
  estimated_minutes?: number;
  completed_at?: string;
  progress?: number;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'other';
  institution: string;
  account_number: string;
  current_balance: number;
  is_asset: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  type: 'income' | 'expense' | 'transfer' | 'investment';
  category: 'salary' | 'bonus' | 'investment_return' | 'housing' | 'transportation' | 'food' | 'utilities' | 'healthcare' | 'entertainment' | 'education' | 'shopping' | 'debt_payment' | 'savings' | 'other';
  amount: number;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: Transaction['category'];
  description: string;
  created_at: string;
  updated_at: string;
}

export interface NetWorthHistory {
  id: string;
  user_id: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  snapshot_date: string;
  created_at: string;
}

export interface TimeBlock {
  id: string;
  taskId: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
}

export interface Subscription {
  id: string;
  user_id: string;
  status: 'active' | 'canceled' | 'past_due';
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface Price {
  id: string;
  product_id: string;
  active: boolean;
  currency: string;
  interval: 'month' | 'year';
  interval_count: number;
  unit_amount: number;
  type: 'recurring' | 'one_time';
}

export interface WeChatPayment {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  qr_code_url?: string;
}

export interface BankCardPayment {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  card_type: string;
  last_four: string;
  created_at: string;
  updated_at: string;
  notify_data?: any;
}

export interface GoalNode {
  id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  implementation?: string;
  progress: number;
  goal_type: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  completed_at?: string;
  prerequisites: string[];
  improvements?: string;
  summary?: string;
  created_at: string;
  updated_at: string;
  goal_id?: string;
  is_root: boolean;
}

export type GoalDimension = 'personal' | 'financial' | 'social' | 'lifestyle' | 'family';
export type GoalPeriod = 'yearly' | 'quarterly' | 'monthly';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  dimension: GoalDimension;
  period: GoalPeriod;
  target_date: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}