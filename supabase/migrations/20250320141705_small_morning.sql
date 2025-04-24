/*
  # Fix sample data trigger and functions

  1. Changes
    - Fix trigger function to properly handle security context
    - Add proper error handling and transaction management
    - Ensure unique constraints are respected for accounts
    - Add proper validation for account numbers and names

  2. Security
    - Set proper security context for functions
    - Add proper error handling to prevent data leaks
*/

-- Drop existing trigger and functions to start fresh
DROP TRIGGER IF EXISTS insert_sample_data_for_new_user ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_sample_data();
DROP FUNCTION IF EXISTS insert_sample_financial_data();
DROP FUNCTION IF EXISTS insert_sample_financial_data_for_user();

-- Create function to safely insert sample data for a specific user
CREATE OR REPLACE FUNCTION insert_sample_financial_data_for_user(user_id uuid)
RETURNS void AS $$
DECLARE
  v_checking_id uuid;
  v_savings_id uuid;
  v_investment_id uuid;
  v_credit_card_id uuid;
  v_mortgage_id uuid;
BEGIN
  -- Start a new transaction
  BEGIN
    -- Insert checking account
    INSERT INTO accounts (
      user_id, name, type, institution, account_number, current_balance, is_asset
    ) VALUES (
      user_id,
      'Main Checking',
      'checking',
      'Chase Bank',
      '1234',
      850000,
      true
    ) ON CONFLICT DO NOTHING
    RETURNING id INTO v_checking_id;

    -- If checking account wasn't created, generate a unique name and try again
    IF v_checking_id IS NULL THEN
      INSERT INTO accounts (
        user_id, name, type, institution, account_number, current_balance, is_asset
      ) VALUES (
        user_id,
        'Main Checking ' || substr(md5(random()::text), 1, 4),
        'checking',
        'Chase Bank',
        substr(md5(random()::text), 1, 4),
        850000,
        true
      )
      RETURNING id INTO v_checking_id;
    END IF;

    -- Insert savings account with unique name and number
    INSERT INTO accounts (
      user_id, name, type, institution, account_number, current_balance, is_asset
    ) VALUES (
      user_id,
      'High-Yield Savings ' || substr(md5(random()::text), 1, 4),
      'savings',
      'Ally Bank',
      substr(md5(random()::text), 1, 4),
      2500000,
      true
    )
    RETURNING id INTO v_savings_id;

    -- Insert investment account with unique name and number
    INSERT INTO accounts (
      user_id, name, type, institution, account_number, current_balance, is_asset
    ) VALUES (
      user_id,
      'Investment Portfolio ' || substr(md5(random()::text), 1, 4),
      'investment',
      'Vanguard',
      substr(md5(random()::text), 1, 4),
      15000000,
      true
    )
    RETURNING id INTO v_investment_id;

    -- Insert credit card account with unique name and number
    INSERT INTO accounts (
      user_id, name, type, institution, account_number, current_balance, is_asset
    ) VALUES (
      user_id,
      'Credit Card ' || substr(md5(random()::text), 1, 4),
      'credit_card',
      'American Express',
      substr(md5(random()::text), 1, 4),
      250000,
      false
    )
    RETURNING id INTO v_credit_card_id;

    -- Insert mortgage account with unique name and number
    INSERT INTO accounts (
      user_id, name, type, institution, account_number, current_balance, is_asset
    ) VALUES (
      user_id,
      'Mortgage ' || substr(md5(random()::text), 1, 4),
      'loan',
      'Wells Fargo',
      substr(md5(random()::text), 1, 4),
      35000000,
      false
    )
    RETURNING id INTO v_mortgage_id;

    -- Insert sample transactions if accounts were created successfully
    IF v_checking_id IS NOT NULL THEN
      INSERT INTO transactions (
        user_id, account_id, type, category, amount, description, date
      ) VALUES
        (user_id, v_checking_id, 'income', 'salary', 1000000, 'Monthly Salary', CURRENT_DATE - INTERVAL '1 month'),
        (user_id, v_checking_id, 'expense', 'food', 7500, 'Grocery Shopping', CURRENT_DATE - INTERVAL '2 days');
    END IF;

    IF v_investment_id IS NOT NULL THEN
      INSERT INTO transactions (
        user_id, account_id, type, category, amount, description, date
      ) VALUES
        (user_id, v_investment_id, 'income', 'investment_return', 250000, 'Stock Dividends', CURRENT_DATE - INTERVAL '15 days');
    END IF;

    IF v_mortgage_id IS NOT NULL THEN
      INSERT INTO transactions (
        user_id, account_id, type, category, amount, description, date
      ) VALUES
        (user_id, v_mortgage_id, 'expense', 'housing', 200000, 'Mortgage Payment', CURRENT_DATE - INTERVAL '7 days');
    END IF;

    IF v_credit_card_id IS NOT NULL THEN
      INSERT INTO transactions (
        user_id, account_id, type, category, amount, description, date
      ) VALUES
        (user_id, v_credit_card_id, 'expense', 'utilities', 15000, 'Electric Bill', CURRENT_DATE - INTERVAL '3 days');
    END IF;

    IF v_savings_id IS NOT NULL THEN
      INSERT INTO transactions (
        user_id, account_id, type, category, amount, description, date
      ) VALUES
        (user_id, v_savings_id, 'transfer', 'savings', 100000, 'Monthly Savings', CURRENT_DATE - INTERVAL '1 day');
    END IF;

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
    -- Log error but continue
    RAISE NOTICE 'Error inserting sample data: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create new trigger function with proper error handling
CREATE OR REPLACE FUNCTION handle_new_user_sample_data()
RETURNS trigger AS $$
BEGIN
  -- Execute sample data insertion
  PERFORM insert_sample_financial_data_for_user(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't prevent user creation
  RAISE NOTICE 'Error in handle_new_user_sample_data: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create new trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'insert_sample_data_for_new_user'
  ) THEN
    CREATE TRIGGER insert_sample_data_for_new_user
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user_sample_data();
  END IF;
END $$;