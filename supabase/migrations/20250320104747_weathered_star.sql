/*
  # Create WeChat Payments Table and Related Objects

  1. New Tables
    - `wechat_payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `order_id` (text, unique)
      - `amount` (integer)
      - `status` (text, check constraint)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `notify_data` (jsonb)
      - `qr_code_url` (text)

  2. Security
    - Enable RLS on `wechat_payments` table
    - Add policy for authenticated users to read their own payments
*/

DO $$ BEGIN
  -- Create enum type for payment status if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create wechat_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS wechat_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  status payment_status DEFAULT 'pending'::payment_status NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  notify_data jsonb,
  qr_code_url text,
  CONSTRAINT wechat_payments_order_id_key UNIQUE (order_id),
  CONSTRAINT wechat_payments_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS wechat_payments_user_id_idx ON wechat_payments(user_id);
CREATE INDEX IF NOT EXISTS wechat_payments_status_idx ON wechat_payments(status);
CREATE INDEX IF NOT EXISTS wechat_payments_created_at_idx ON wechat_payments(created_at);

-- Enable RLS
ALTER TABLE wechat_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read own payments" ON wechat_payments;
  DROP POLICY IF EXISTS "Users can insert own payments" ON wechat_payments;
  DROP POLICY IF EXISTS "Users can update own payments" ON wechat_payments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies
CREATE POLICY "Users can read own payments"
  ON wechat_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON wechat_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments"
  ON wechat_payments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger if it doesn't exist
DO $$ BEGIN
  CREATE TRIGGER update_wechat_payments_updated_at
    BEFORE UPDATE ON wechat_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;