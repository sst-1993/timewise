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

    const { amount, userId, description } = await req.json();

    // Initialize WeChat Pay
    const wxpay = new WxPay({
      appid: Deno.env.get('WECHAT_APP_ID'),
      mchid: Deno.env.get('WECHAT_MCH_ID'),
      key: Deno.env.get('WECHAT_API_KEY'),
      notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/wechat-payment-notify`,
      trade_type: 'NATIVE', // For QR code payment
    });

    // Generate unique order ID
    const orderId = `WX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create unified order
    const unifiedOrder = await wxpay.unifiedOrder({
      out_trade_no: orderId,
      body: description,
      total_fee: amount,
      spbill_create_ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    if (!unifiedOrder.code_url) {
      throw new Error('Failed to generate QR code URL');
    }

    // Create payment record in database
    const { data: payment, error: dbError } = await supabaseClient
      .from('wechat_payments')
      .insert({
        user_id: userId,
        order_id: orderId,
        amount,
        qr_code_url: unifiedOrder.code_url,
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