import React, { useState } from 'react';
import { X, Loader, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BankCardPayment } from '../types';

interface BankCardPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onSuccess: () => void;
  userId: string;
}

interface CardDetails {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

export default function BankCardPayModal({ isOpen, onClose, amount, onSuccess, userId }: BankCardPayModalProps) {
  const [payment, setPayment] = useState<BankCardPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format card number with spaces
    if (name === 'number') {
      formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    }
    // Format expiry date
    else if (name === 'expiry') {
      formattedValue = value
        .replace(/\D/g, '')
        .replace(/^(\d{2})/, '$1/')
        .substr(0, 5);
    }
    // Limit CVV to 3-4 digits
    else if (name === 'cvv') {
      formattedValue = value.replace(/\D/g, '').substr(0, 4);
    }

    setCardDetails(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanNumber = cardDetails.number.replace(/\s/g, '');
      
      // Basic format validation
      if (!cleanNumber.match(/^\d{16}$/)) {
        throw new Error('Card number must be exactly 16 digits');
      }
      
      // UnionPay validation
      if (!cleanNumber.startsWith('62')) {
        throw new Error('Only UnionPay cards (starting with 62) are accepted');
      }

      // Validate expiry date format
      if (!cardDetails.expiry.match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)) {
        throw new Error('Invalid expiry date format (MM/YY)');
      }

      // Parse and validate expiry date
      const [month, year] = cardDetails.expiry.split('/');
      const currentDate = new Date();
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month));
      expiryDate.setDate(0); // Set to last day of the month
      
      // Set current date to start of month for comparison
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      if (expiryDate < startOfMonth) {
        throw new Error('Card has expired');
      }
      
      if (!cardDetails.cvv.match(/^\d{3,4}$/)) {
        throw new Error('Invalid CVV');
      }
      if (!cardDetails.name.trim()) {
        throw new Error('Cardholder name is required');
      }
      
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found');
      }
      
      // Process payment through Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-bank-card-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          amount,
          userId,
          cardDetails: {
            number: cardDetails.number.replace(/\s/g, ''),
            expiry: cardDetails.expiry,
            cvv: cardDetails.cvv,
            name: cardDetails.name
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment processing failed');
      }

      const paymentData = await response.json();
      setPayment(paymentData);
      onSuccess();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Bank Card Payment</h2>
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
              <p className="mt-4 text-gray-600">Processing payment...</p>
            </div>
          ) : payment?.status === 'completed' ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Payment Successful
              </h3>
              <p className="mt-2 text-gray-600">
                Thank you for your payment
              </p>
            </div>
          ) : payment?.status === 'failed' ? (
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Payment Failed
              </h3>
              <p className="mt-2 text-gray-600">
                Please try again or choose a different payment method
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                  <span className="text-xs text-gray-500 ml-1">(UnionPay card starting with 62)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="number"
                    value={cardDetails.number}
                    onChange={handleInputChange}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pl-10"
                    maxLength={19}
                    required
                  />
                  <CreditCard className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                    <span className="text-xs text-gray-500 ml-1">(MM/YY)</span>
                  </label>
                  <input
                    type="text"
                    name="expiry"
                    value={cardDetails.expiry}
                    onChange={handleInputChange}
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={5}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    name="cvv"
                    value={cardDetails.cvv}
                    onChange={handleInputChange}
                    placeholder="123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={cardDetails.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Pay ${(amount / 100).toFixed(2)}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}