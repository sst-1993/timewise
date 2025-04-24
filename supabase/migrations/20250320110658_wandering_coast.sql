/*
  # Add bank card payments support

  1. New Tables
    - `bank_card_payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `order_id` (text, unique)
      - `amount` (integer)
      - `status` (payment_status enum)
      - `card_type` (text)
      - `last_four` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `notify_data` (jsonb)

  2. Security
    - Enable RLS on `bank_card_payments` table
    - Add policies for authenticated users to:
      - Read their own payments
      - Insert new payments
      - Update their own payments

  3. Indexes
    - On user_id for faster lookups
    - On status for filtering
    - On created_at for sorting
*/

-- Create bank_card_payments table
CREATE TABLE IF NOT EXISTS bank_card_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  status payment_status DEFAULT 'pending'::payment_status NOT NULL,
  card_type text,
  last_four text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  notify_data jsonb,
  CONSTRAINT bank_card_payments_order_id_key UNIQUE (order_id),
  CONSTRAINT bank_card_payments_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS bank_card_payments_user_id_idx ON bank_card_payments(user_id);
CREATE INDEX IF NOT EXISTS bank_card_payments_status_idx ON bank_card_payments(status);
CREATE INDEX IF NOT EXISTS bank_card_payments_created_at_idx ON bank_card_payments(created_at);

-- Enable RLS
ALTER TABLE bank_card_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own bank card payments"
  ON bank_card_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank card payments"
  ON bank_card_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank card payments"
  ON bank_card_payments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create update trigger
DO $$ BEGIN
  CREATE TRIGGER update_bank_card_payments_updated_at
    BEFORE UPDATE ON bank_card_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;