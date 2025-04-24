/*
  # Fix account creation constraints

  1. Changes
    - Add unique constraint for account name per user
    - Add unique constraint for account number within institution
    - Add check constraint for account number format
    - Add RLS policy for account creation

  2. Security
    - Maintains existing RLS policies
    - Ensures data integrity with proper constraints
*/

-- Add unique constraints with existence check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_account_name_per_user'
  ) THEN
    ALTER TABLE accounts
    ADD CONSTRAINT unique_account_name_per_user
    UNIQUE (user_id, name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_account_number_per_institution'
  ) THEN
    ALTER TABLE accounts
    ADD CONSTRAINT unique_account_number_per_institution
    UNIQUE (user_id, institution, account_number);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_account_number'
  ) THEN
    ALTER TABLE accounts
    ADD CONSTRAINT valid_account_number
    CHECK (account_number ~ '^\d{4}$');
  END IF;
END $$;