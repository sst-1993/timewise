import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { WxPay } from 'https://esm.sh/wx-js-utils';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const wxpay = new WxPay({
      appid: Deno.env.get('WECHAT_APP_ID'),
      mchid: Deno.env.get('WECHAT_MCH_ID'),
      key: Deno.env.get('WECHAT_API_KEY'),
    });

    // Parse and verify notification
    const notifyData = await wxpay.parseNotify(req);
    if (!notifyData) {
      throw new Error('Invalid notification data');
    }

    // Update payment status in database
    const { error: updateError } = await supabaseClient
      .from('wechat_payments')
      .update({ 
        status: notifyData.result_code === 'SUCCESS' ? 'completed' : 'failed',
        notify_data: notifyData
      })
      .eq('order_id', notifyData.out_trade_no);

    if (updateError) throw updateError;

    // Return success response to WeChat
    return new Response(
      '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>',
      { headers: { 'Content-Type': 'text/xml' } }
    );

  } catch (error) {
    console.error('WeChat payment notification error:', error);
    return new Response(
      '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[' + error.message + ']]></return_msg></xml>',
      { 
        status: 400,
        headers: { 'Content-Type': 'text/xml' }
      }
    );
  }
});