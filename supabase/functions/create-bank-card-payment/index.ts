import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { amount, userId, cardDetails } = await req.json();

    // Validate card details
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
      throw new Error('Missing required card details');
    }

    // In a real implementation, you would:
    // 1. Call your bank's API to process the payment
    // 2. Handle the response
    // 3. Update the payment record accordingly

    // For demo purposes, we'll simulate a successful payment
    const orderId = `BANK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create payment record
    const { data: payment, error: dbError } = await supabaseClient
      .from('bank_card_payments')
      .insert({
        user_id: userId,
        order_id: orderId,
        amount,
        card_type: getCardType(cardDetails.number),
        last_four: cardDetails.number.slice(-4),
        status: 'completed',
        notify_data: {
          transaction_id: `TX_${Date.now()}`,
          payment_method: 'bank_card',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify(payment),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getCardType(number: string): string {
  const firstDigit = number.charAt(0);
  switch (firstDigit) {
    case '4':
      return 'visa';
    case '5':
      return 'mastercard';
    case '3':
      return 'amex';
    case '6':
      return 'unionpay';
    default:
      return 'unknown';
  }
}