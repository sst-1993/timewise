/*
  # Add membership status to profiles

  1. Changes
    - Add `is_member` column to profiles table with default false
    - Add RLS policy for users to read and update their own membership status

  2. Security
    - Enable RLS on profiles table (already enabled)
    - Add policy for users to update their own membership status
*/

-- Add is_member column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_member boolean DEFAULT false;

-- Add policy for users to update their own membership status
CREATE POLICY "Users can update own membership status" 
ON profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);