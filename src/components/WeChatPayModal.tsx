import React, { useState, useEffect } from 'react';
import { X, Loader, QrCode, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { WeChatPayment } from '../types';

interface WeChatPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onSuccess: () => void;
  userId: string;
}

export default function WeChatPayModal({ isOpen, onClose, amount, onSuccess, userId }: WeChatPayModalProps) {
  const [payment, setPayment] = useState<WeChatPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const createPayment = async () => {
      try {
        setLoading(true);
        setError('');
      
      // Create payment record in database first
      const { data: paymentData, error: createError } = await supabase
        .from('wechat_payments')
        .insert({
          user_id: userId,
          order_id: `WX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount,
          status: 'pending',
          qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=wechat://pay/test/${Date.now()}`
        })
        .select()
        .single();

      if (createError) throw createError;
      if (!paymentData) throw new Error('Failed to create payment record');

      setPayment(paymentData);

        // Start polling for payment status
        pollInterval = setInterval(async () => {
          const { data, error } = await supabase
            .from('wechat_payments')
            .select()
            .eq('id', paymentData.id)
            .single();

          if (error) {
            console.error('Error polling payment status:', error);
            return;
          }

          if (data.status === 'completed') {
            clearInterval(pollInterval);
            onSuccess();
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setError('Payment failed. Please try again.');
          }

          setPayment(data);
        }, 3000);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create payment');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      createPayment();
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isOpen, amount, userId, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">WeChat Pay</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <p className="mt-4 text-gray-600">Generating QR code...</p>
            </div>
          ) : payment ? (
            <div className="flex flex-col items-center">
              {payment.status === 'pending' && (
                <>
                  {payment.qr_code_url ? (
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                      <img
                        src={payment.qr_code_url}
                        alt="WeChat Pay QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                  ) : (
                    <QrCode className="w-64 h-64 text-gray-300" />
                  )}
                  <p className="mt-4 text-gray-600">
                    Scan with WeChat to pay ¥{(amount / 100).toFixed(2)}
                  </p>
                  <div className="mt-2 text-sm text-gray-500">
                    Order ID: {payment.order_id}
                  </div>
                </>
              )}

              {payment.status === 'completed' && (
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Payment Successful
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Thank you for your payment
                  </p>
                </div>
              )}

              {payment.status === 'failed' && (
                <div className="text-center">
                  <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Payment Failed
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Please try again or choose a different payment method
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}