/*
  # Add WeChat Payment Support (Fixed)

  1. New Tables
    - `wechat_payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `order_id` (text, unique)
      - `amount` (integer)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `notify_data` (jsonb)
      - `qr_code_url` (text)

  2. Security
    - Enable RLS on `wechat_payments` table
    - Add policy for users to read their own payments (if not exists)
*/

-- Create wechat_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS wechat_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  order_id text UNIQUE NOT NULL,
  amount integer NOT NULL,
  status text CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notify_data jsonb,
  qr_code_url text
);

-- Enable RLS if not already enabled
ALTER TABLE wechat_payments ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wechat_payments' 
    AND policyname = 'Users can read own payments'
  ) THEN
    CREATE POLICY "Users can read own payments"
      ON wechat_payments
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create update trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_wechat_payments_updated_at'
  ) THEN
    CREATE TRIGGER update_wechat_payments_updated_at
      BEFORE UPDATE ON wechat_payments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;