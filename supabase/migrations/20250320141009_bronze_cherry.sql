/*
  # Fix User Sample Data Trigger

  This migration fixes the trigger function for inserting sample data for new users.
  
  1. Changes
    - Modifies the trigger function to properly handle user context
    - Adds proper security context handling
    - Ensures safe execution of sample data insertion
  
  2. Security
    - Uses security definer for proper permission handling
    - Sets search path explicitly for security
*/

-- Create or replace the trigger function with fixed security context
CREATE OR REPLACE FUNCTION handle_new_user_sample_data()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Store the new user's ID
  v_user_id := NEW.id;
  
  -- Execute sample data insertion as a separate transaction
  PERFORM insert_sample_financial_data_for_user(v_user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create helper function to insert sample data for a specific user
CREATE OR REPLACE FUNCTION insert_sample_financial_data_for_user(user_id uuid)
RETURNS void AS $$
DECLARE
  v_checking_id uuid;
  v_savings_id uuid;
  v_investment_id uuid;
  v_credit_card_id uuid;
  v_mortgage_id uuid;
BEGIN
  -- Insert accounts and store their IDs
  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (user_id, 'Main Checking', 'checking', 'Chase Bank', '1234', 850000, true)
    RETURNING id INTO v_checking_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (user_id, 'High-Yield Savings', 'savings', 'Ally Bank', '5678', 2500000, true)
    RETURNING id INTO v_savings_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (user_id, 'Investment Portfolio', 'investment', 'Vanguard', '9012', 15000000, true)
    RETURNING id INTO v_investment_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (user_id, 'Credit Card', 'credit_card', 'American Express', '3456', 250000, false)
    RETURNING id INTO v_credit_card_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (user_id, 'Mortgage', 'loan', 'Wells Fargo', '7890', 35000000, false)
    RETURNING id INTO v_mortgage_id;

  -- Insert sample transactions
  INSERT INTO transactions (
    user_id, account_id, type, category, amount, description, date
  ) VALUES
    (user_id, v_checking_id, 'income', 'salary', 1000000, 'Monthly Salary', CURRENT_DATE - INTERVAL '1 month'),
    (user_id, v_investment_id, 'income', 'investment_return', 250000, 'Stock Dividends', CURRENT_DATE - INTERVAL '15 days'),
    (user_id, v_mortgage_id, 'expense', 'housing', 200000, 'Mortgage Payment', CURRENT_DATE - INTERVAL '7 days'),
    (user_id, v_credit_card_id, 'expense', 'utilities', 15000, 'Electric Bill', CURRENT_DATE - INTERVAL '3 days'),
    (user_id, v_checking_id, 'expense', 'food', 7500, 'Grocery Shopping', CURRENT_DATE - INTERVAL '2 days'),
    (user_id, v_savings_id, 'transfer', 'savings', 100000, 'Monthly Savings', CURRENT_DATE - INTERVAL '1 day');

  -- Insert net worth history for the past 6 months
  INSERT INTO net_worth_history (
    user_id, total_assets, total_liabilities, net_worth, snapshot_date
  )
  SELECT
    user_id,
    18350000 + (RANDOM() * 1000000)::bigint, -- Assets fluctuating around $183,500
    35250000 - (ROW_NUMBER() OVER (ORDER BY month) * 100000)::bigint, -- Decreasing liabilities
    0, -- Net worth will be calculated by trigger
    CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY month) || ' months')::interval
  FROM generate_series(1, 6) month;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create or replace the trigger
DO $$
BEGIN
  DROP TRIGGER IF EXISTS insert_sample_data_for_new_user ON auth.users;
  
  CREATE TRIGGER insert_sample_data_for_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_sample_data();
END $$;