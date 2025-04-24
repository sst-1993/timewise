/*
  # Add avatar URL to profiles

  1. Changes
    - Add avatar_url column to profiles table
    - Add default avatar URL
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg';