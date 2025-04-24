/*
  # Create subscriptions table

  1. New Tables
    - `subscriptions`
      - `id` (text, primary key)
      - `user_id` (uuid, references auth.users)
      - `status` (text, check constraint for valid values)
      - `price_id` (text, references prices)
      - `current_period_end` (timestamptz)
      - `cancel_at_period_end` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on subscriptions table
    - Add policy for authenticated users to read their own subscriptions
*/

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  status text CHECK (status = ANY (ARRAY['active', 'canceled', 'past_due'])),
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint on user_id and price_id
CREATE UNIQUE INDEX subscriptions_user_id_price_id_key ON subscriptions(user_id, price_id);
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_price_id_key UNIQUE USING INDEX subscriptions_user_id_price_id_key;

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();