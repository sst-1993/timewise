/*
  # Add insert policy for net worth history

  1. Changes
    - Add RLS policy to allow authenticated users to insert their own net worth records
    - Ensures users can only insert records with their own user_id

  2. Security
    - Maintains existing read-only policy
    - Adds new insert policy with proper user validation
*/

-- Create policy to allow users to insert their own net worth records
CREATE POLICY "Users can insert own net worth records"
  ON net_worth_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);