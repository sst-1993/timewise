/*
  # Add membership tables

  1. New Tables
    - `subscriptions`
      - Stores user subscription information
      - Links to Stripe subscription data
    - `prices`
      - Stores product price information
      - Links to Stripe price data

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create prices table
CREATE TABLE IF NOT EXISTS prices (
  id text PRIMARY KEY,
  product_id text NOT NULL,
  active boolean DEFAULT true,
  currency text NOT NULL,
  interval text CHECK (interval IN ('month', 'year')),
  interval_count integer DEFAULT 1,
  unit_amount integer NOT NULL,
  type text CHECK (type IN ('recurring', 'one_time')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  status text CHECK (status IN ('active', 'canceled', 'past_due')),
  price_id text REFERENCES prices(id),
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, price_id)
);

-- Enable RLS
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Prices policies
CREATE POLICY "Anyone can read active prices"
  ON prices
  FOR SELECT
  USING (active = true);

-- Subscriptions policies
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Update trigger for prices
CREATE TRIGGER update_prices_updated_at
  BEFORE UPDATE ON prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default price
INSERT INTO prices (id, product_id, currency, interval, unit_amount, type)
VALUES ('price_monthly', 'prod_membership', 'usd', 'month', 590, 'recurring')
ON CONFLICT (id) DO NOTHING;