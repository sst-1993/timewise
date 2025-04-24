/*
  # Add Financial Tracking Tables

  1. New Tables
    - `accounts`
      - Bank accounts, credit cards, investment accounts, etc.
      - Tracks account type, balance, and institution
    - `transactions`
      - Records all financial transactions
      - Includes amount, type, category, and description
    - `financial_goals`
      - Tracks financial targets and progress
      - Separate from general goals for specialized financial tracking
    - `net_worth_history`
      - Monthly snapshots of total assets and liabilities
      - Used for trend analysis

  2. Security
    - Enable RLS on all tables
    - Users can only access their own financial data
    - Strict policies for financial privacy

  3. Changes
    - Added financial tracking capabilities
    - Support for multiple account types
    - Transaction categorization
    - Financial goal tracking
    - Net worth history
*/

-- Create account_type enum
CREATE TYPE account_type AS ENUM (
  'checking',
  'savings',
  'credit_card',
  'investment',
  'loan',
  'other'
);

-- Create transaction_type enum
CREATE TYPE transaction_type AS ENUM (
  'income',
  'expense',
  'transfer',
  'investment'
);

-- Create transaction_category enum
CREATE TYPE transaction_category AS ENUM (
  'salary',
  'bonus',
  'investment_return',
  'housing',
  'transportation',
  'food',
  'utilities',
  'healthcare',
  'entertainment',
  'education',
  'shopping',
  'debt_payment',
  'savings',
  'other'
);

-- Create accounts table
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type account_type NOT NULL,
  institution text,
  account_number text,
  current_balance bigint NOT NULL DEFAULT 0, -- Stored in cents
  is_asset boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_balance CHECK (current_balance >= -999999999999) -- Prevent unreasonable balances
);

-- Create transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  category transaction_category NOT NULL,
  amount bigint NOT NULL, -- Stored in cents
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create financial_goals table
CREATE TABLE financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  target_amount bigint NOT NULL, -- Stored in cents
  current_amount bigint NOT NULL DEFAULT 0, -- Stored in cents
  target_date date NOT NULL,
  category transaction_category,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_amounts CHECK (
    target_amount > 0 AND
    current_amount >= 0 AND
    current_amount <= target_amount
  )
);

-- Create net_worth_history table
CREATE TABLE net_worth_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_assets bigint NOT NULL DEFAULT 0, -- Stored in cents
  total_liabilities bigint NOT NULL DEFAULT 0, -- Stored in cents
  net_worth bigint NOT NULL DEFAULT 0, -- Stored in cents
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_amounts CHECK (
    total_assets >= 0 AND
    total_liabilities >= 0 AND
    net_worth = total_assets - total_liabilities
  )
);

-- Create indexes
CREATE INDEX accounts_user_id_idx ON accounts(user_id);
CREATE INDEX accounts_type_idx ON accounts(type);
CREATE INDEX transactions_user_id_idx ON transactions(user_id);
CREATE INDEX transactions_account_id_idx ON transactions(account_id);
CREATE INDEX transactions_date_idx ON transactions(date);
CREATE INDEX transactions_type_idx ON transactions(type);
CREATE INDEX transactions_category_idx ON transactions(category);
CREATE INDEX financial_goals_user_id_idx ON financial_goals(user_id);
CREATE INDEX financial_goals_category_idx ON financial_goals(category);
CREATE INDEX net_worth_history_user_id_idx ON net_worth_history(user_id);
CREATE INDEX net_worth_history_snapshot_date_idx ON net_worth_history(snapshot_date);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own accounts"
  ON accounts
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own transactions"
  ON transactions
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own financial goals"
  ON financial_goals
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own net worth history"
  ON net_worth_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_goals_updated_at
  BEFORE UPDATE ON financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update account balance
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- For new transactions
    UPDATE accounts
    SET current_balance = current_balance + 
      CASE 
        WHEN NEW.type = 'income' THEN NEW.amount
        WHEN NEW.type = 'expense' THEN -NEW.amount
        ELSE 0
      END
    WHERE id = NEW.account_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- For deleted transactions
    UPDATE accounts
    SET current_balance = current_balance - 
      CASE 
        WHEN OLD.type = 'income' THEN OLD.amount
        WHEN OLD.type = 'expense' THEN -OLD.amount
        ELSE 0
      END
    WHERE id = OLD.account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- For updated transactions
    UPDATE accounts
    SET current_balance = current_balance - 
      CASE 
        WHEN OLD.type = 'income' THEN OLD.amount
        WHEN OLD.type = 'expense' THEN -OLD.amount
        ELSE 0
      END
      +
      CASE 
        WHEN NEW.type = 'income' THEN NEW.amount
        WHEN NEW.type = 'expense' THEN -NEW.amount
        ELSE 0
      END
    WHERE id = NEW.account_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for account balance updates
CREATE TRIGGER update_account_balance_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- Create function to update net worth history
CREATE OR REPLACE FUNCTION update_net_worth_history()
RETURNS TRIGGER AS $$
DECLARE
  v_total_assets bigint;
  v_total_liabilities bigint;
  v_net_worth bigint;
BEGIN
  -- Calculate totals
  SELECT 
    COALESCE(SUM(CASE WHEN is_asset THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN NOT is_asset THEN current_balance ELSE 0 END), 0)
  INTO v_total_assets, v_total_liabilities
  FROM accounts
  WHERE user_id = NEW.user_id;

  v_net_worth := v_total_assets - v_total_liabilities;

  -- Update or insert net worth history
  INSERT INTO net_worth_history (
    user_id,
    total_assets,
    total_liabilities,
    net_worth,
    snapshot_date
  )
  VALUES (
    NEW.user_id,
    v_total_assets,
    v_total_liabilities,
    v_net_worth,
    CURRENT_DATE
  )
  ON CONFLICT (user_id, snapshot_date)
  DO UPDATE SET
    total_assets = EXCLUDED.total_assets,
    total_liabilities = EXCLUDED.total_liabilities,
    net_worth = EXCLUDED.net_worth;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for net worth history updates
CREATE TRIGGER update_net_worth_history_on_balance_change
  AFTER INSERT OR UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_net_worth_history();