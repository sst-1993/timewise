/*
  # Fix Sample Data Insertion

  This migration fixes issues with sample data insertion by:
  1. Dropping the old trigger and functions
  2. Creating new functions with proper error handling and unique constraint checks
  3. Adding a new trigger with proper security context

  Changes:
  - Removes old sample data functions
  - Adds new functions with proper constraint handling
  - Updates trigger to use new functions
*/

-- Drop existing trigger and functions
DROP TRIGGER IF EXISTS insert_sample_data_for_new_user ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_sample_data();
DROP FUNCTION IF EXISTS insert_sample_financial_data();
DROP FUNCTION IF EXISTS insert_sample_financial_data_for_user();

-- Create new function to generate unique account numbers
CREATE OR REPLACE FUNCTION generate_unique_account_number(
  p_user_id uuid,
  p_institution text,
  p_attempts int DEFAULT 0
)
RETURNS text AS $$
DECLARE
  v_account_number text;
  v_exists boolean;
BEGIN
  IF p_attempts >= 10 THEN
    RETURN NULL; -- Give up after 10 attempts
  END IF;

  -- Generate a random 4-digit number
  v_account_number := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
  
  -- Check if this number is already used
  SELECT EXISTS (
    SELECT 1 
    FROM accounts 
    WHERE user_id = p_user_id 
    AND institution = p_institution 
    AND account_number = v_account_number
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Recursively try again
    RETURN generate_unique_account_number(p_user_id, p_institution, p_attempts + 1);
  END IF;
  
  RETURN v_account_number;
END;
$$ LANGUAGE plpgsql;

-- Create new function to generate unique account names
CREATE OR REPLACE FUNCTION generate_unique_account_name(
  p_user_id uuid,
  p_base_name text,
  p_attempt int DEFAULT 0
)
RETURNS text AS $$
DECLARE
  v_name text;
  v_exists boolean;
BEGIN
  IF p_attempt = 0 THEN
    v_name := p_base_name;
  ELSE
    v_name := p_base_name || ' ' || p_attempt;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 
    FROM accounts 
    WHERE user_id = p_user_id 
    AND name = v_name
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Recursively try the next number
    RETURN generate_unique_account_name(p_user_id, p_base_name, p_attempt + 1);
  END IF;
  
  RETURN v_name;
END;
$$ LANGUAGE plpgsql;

-- Create new function to insert sample data
CREATE OR REPLACE FUNCTION insert_sample_financial_data_for_user(user_id uuid)
RETURNS void AS $$
DECLARE
  v_checking_id uuid;
  v_savings_id uuid;
  v_investment_id uuid;
  v_credit_card_id uuid;
  v_mortgage_id uuid;
  v_checking_name text;
  v_savings_name text;
  v_investment_name text;
  v_credit_card_name text;
  v_mortgage_name text;
BEGIN
  -- Generate unique account names
  v_checking_name := generate_unique_account_name(user_id, 'Main Checking');
  v_savings_name := generate_unique_account_name(user_id, 'High-Yield Savings');
  v_investment_name := generate_unique_account_name(user_id, 'Investment Portfolio');
  v_credit_card_name := generate_unique_account_name(user_id, 'Credit Card');
  v_mortgage_name := generate_unique_account_name(user_id, 'Mortgage');

  -- Insert accounts with unique account numbers
  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (user_id, v_checking_name, 'checking', 'Chase Bank', 
     generate_unique_account_number(user_id, 'Chase Bank'), 850000, true)
  RETURNING id INTO v_checking_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (user_id, v_savings_name, 'savings', 'Ally Bank',
     generate_unique_account_number(user_id, 'Ally Bank'), 2500000, true)
  RETURNING id INTO v_savings_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (user_id, v_investment_name, 'investment', 'Vanguard',
     generate_unique_account_number(user_id, 'Vanguard'), 15000000, true)
  RETURNING id INTO v_investment_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (user_id, v_credit_card_name, 'credit_card', 'American Express',
     generate_unique_account_number(user_id, 'American Express'), 250000, false)
  RETURNING id INTO v_credit_card_id;

  INSERT INTO accounts (
    user_id, name, type, institution, account_number, current_balance, is_asset
  ) VALUES 
    (user_id, v_mortgage_name, 'loan', 'Wells Fargo',
     generate_unique_account_number(user_id, 'Wells Fargo'), 35000000, false)
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

  -- Insert net worth history
  INSERT INTO net_worth_history (
    user_id, total_assets, total_liabilities, net_worth, snapshot_date
  )
  SELECT
    user_id,
    18350000 + (RANDOM() * 1000000)::bigint,
    35250000 - (ROW_NUMBER() OVER (ORDER BY month) * 100000)::bigint,
    0,
    CURRENT_DATE - (ROW_NUMBER() OVER (ORDER BY month) || ' months')::interval
  FROM generate_series(1, 6) month;

EXCEPTION WHEN OTHERS THEN
  -- Log error and re-raise
  RAISE NOTICE 'Error in insert_sample_financial_data_for_user: %', SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create new trigger function
CREATE OR REPLACE FUNCTION handle_new_user_sample_data()
RETURNS trigger AS $$
BEGIN
  -- Execute sample data insertion in a separate transaction
  PERFORM insert_sample_financial_data_for_user(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't prevent user creation
  RAISE NOTICE 'Error in handle_new_user_sample_data: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create new trigger
CREATE TRIGGER insert_sample_data_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_sample_data();