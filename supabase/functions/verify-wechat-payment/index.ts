import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { WxPay } from 'https://esm.sh/wx-js-utils';

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

    const { paymentId } = await req.json();

    // Get payment details from database
    const { data: payment, error: fetchError } = await supabaseClient
      .from('wechat_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError) throw fetchError;
    if (!payment) throw new Error('Payment not found');

    // Initialize WeChat Pay
    const wxpay = new WxPay({
      appid: Deno.env.get('WECHAT_APP_ID'),
      mchid: Deno.env.get('WECHAT_MCH_ID'),
      key: Deno.env.get('WECHAT_API_KEY'),
    });

    // Query order status
    const orderQuery = await wxpay.orderQuery({
      out_trade_no: payment.order_id,
    });

    // Update payment status based on WeChat response
    const status = orderQuery.trade_state === 'SUCCESS' ? 'completed' : 
                  orderQuery.trade_state === 'NOTPAY' ? 'pending' : 'failed';

    const { error: updateError } = await supabaseClient
      .from('wechat_payments')
      .update({ 
        status,
        notify_data: orderQuery 
      })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ status }),
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