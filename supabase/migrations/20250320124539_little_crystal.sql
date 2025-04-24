/*
  # Create Stripe payments schema

  1. New Tables
    - `users` (if not exists)
      - `id` (uuid, primary key)
      - `email` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `stripe_payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `payment_intent_id` (text, unique)
      - `amount` (integer)
      - `currency` (text)
      - `status` (payment_status)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to:
      - Create their own payments
      - Read their own payments
      - Update their own payments
*/

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create payment_status type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create stripe_payments table
CREATE TABLE IF NOT EXISTS stripe_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  payment_intent_id text UNIQUE NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  status payment_status DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  metadata jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS stripe_payments_user_id_idx ON stripe_payments(user_id);
CREATE INDEX IF NOT EXISTS stripe_payments_status_idx ON stripe_payments(status);
CREATE INDEX IF NOT EXISTS stripe_payments_created_at_idx ON stripe_payments(created_at);

-- Enable RLS
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create own payments"
  ON stripe_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own payments"
  ON stripe_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own payments"
  ON stripe_payments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stripe_payments_updated_at
  BEFORE UPDATE ON stripe_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();