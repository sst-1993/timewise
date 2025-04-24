/*
  # Add Account Constraints

  1. Changes
    - Add unique constraint for account number within each institution
    - Add unique constraint for account name per user
    - Add check constraint for account number format

  2. Security
    - No changes to RLS policies
*/

-- Add unique constraint for account number within each institution
ALTER TABLE accounts
ADD CONSTRAINT unique_account_number_per_institution 
UNIQUE (user_id, institution, account_number);

-- Add unique constraint for account name per user
ALTER TABLE accounts
ADD CONSTRAINT unique_account_name_per_user
UNIQUE (user_id, name);

-- Add check constraint for account number format
ALTER TABLE accounts
ADD CONSTRAINT valid_account_number
CHECK (account_number ~ '^\d{4}$');