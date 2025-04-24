/*
  # Insert Sample Financial Data

  1. Sample Data
    - Creates sample accounts with initial balances
    - Adds sample transactions
    - Generates net worth history

  2. Account Types
    - Checking account
    - Savings account
    - Investment account
    - Credit card
    - Mortgage loan

  3. Transaction Categories
    - Income (salary, investment returns)
    - Expenses (housing, utilities, food)
    - Transfers
*/

-- Create function to safely insert sample data for the current user
CREATE OR REPLACE FUNCTION insert_sample_financial_data()
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_checking_id uuid;
  v_savings_id uuid;
  v_investment_id uuid;
  v_credit_card_id uuid;
  v_mortgage_id uuid;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;

  -- Insert accounts and store their IDs
  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (v_user_id, 'Main Checking', 'checking', 'Chase Bank', '1234', 850000, true)
    RETURNING id INTO v_checking_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (v_user_id, 'High-Yield Savings', 'savings', 'Ally Bank', '5678', 2500000, true)
    RETURNING id INTO v_savings_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (v_user_id, 'Investment Portfolio', 'investment', 'Vanguard', '9012', 15000000, true)
    RETURNING id INTO v_investment_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (v_user_id, 'Credit Card', 'credit_card', 'American Express', '3456', 250000, false)
    RETURNING id INTO v_credit_card_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (v_user_id, 'Mortgage', 'loan', 'Wells Fargo', '7890', 35000000, false)
    RETURNING id INTO v_mortgage_id;

  -- Insert sample transactions
  INSERT INTO transactions (
    user_id, account_id, type, category, amount, description, date
  ) VALUES
    (v_user_id, v_checking_id, 'income', 'salary', 1000000, 'Monthly Salary', CURRENT_DATE - INTERVAL '1 month'),
    (v_user_id, v_investment_id, 'income', 'investment_return', 250000, 'Stock Dividends', CURRENT_DATE - INTERVAL '15 days'),
    (v_user_id, v_mortgage_id, 'expense', 'housing', 200000, 'Mortgage Payment', CURRENT_DATE - INTERVAL '7 days'),
    (v_user_id, v_credit_card_id, 'expense', 'utilities', 15000, 'Electric Bill', CURRENT_DATE - INTERVAL '3 days'),
    (v_user_id, v_checking_id, 'expense', 'food', 7500, 'Grocery Shopping', CURRENT_DATE - INTERVAL '2 days'),
    (v_user_id, v_savings_id, 'transfer', 'savings', 100000, 'Monthly Savings', CURRENT_DATE - INTERVAL '1 day');

  -- Insert net worth history for the past 6 months
  INSERT INTO net_worth_history (
    user_id, total_assets, total_liabilities, net_worth, snapshot_date
  )
  SELECT
    v_user_id,
    18350000 + (RANDOM() * 1000000)::bigint,
    35250000 - (ROW_NUMBER() OVER (ORDER BY month) * 100000)::bigint,
    0,
    CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY month) || ' months')::interval
  FROM generate_series(1, 6) month;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;