import React, { useState, useEffect } from 'react';
import { X, CreditCard, Loader, Building2, GoalIcon as PaypalIcon, ChevronRight, QrCode, Wallet, ArrowLeft } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';
import WeChatPayModal from './WeChatPayModal';
import BankCardPayModal from './BankCardPayModal';
import StripePaymentForm from './StripePaymentForm';
import type { Price, Subscription } from '../types';
import type { User } from '@supabase/supabase-js';

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

export default function MembershipModal({ isOpen, onClose, userId }: MembershipModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prices, setPrices] = useState<Price[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);
  const [paymentStep, setPaymentStep] = useState<'prices' | 'payment-method' | 'wechat' | 'bank-card' | 'credit-card'>('prices');
  const [isWeChatModalOpen, setIsWeChatModalOpen] = useState(false);
  const [isBankCardModalOpen, setIsBankCardModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPricesAndSubscription();
      supabase.auth.getSession().then(({ data: { session } }) => {
        setCurrentUser(session?.user ?? null);
      });
    }
  }, [isOpen, userId]);

  const loadPricesAndSubscription = async () => {
    try {
      setLoading(true);
      setError('');

      // Load prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('prices')
        .select('*')
        .eq('active', true)
        .order('unit_amount', { ascending: true });

      if (pricesError) throw pricesError;
      setPrices(pricesData || []);

      // Load subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (subscriptionError) throw subscriptionError;
      setSubscription(subscriptionData?.[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load membership information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (paymentMethod: 'card' | 'bank_transfer' | 'paypal' | 'alipay') => {
    try {
      setLoading(true);
      setError('');

      if (!selectedPrice) throw new Error('Please select a plan first');
      setPaymentStep('credit-card');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start subscription process');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setLoading(true);
      setError('');

      const { error: cancelError } = await supabase.functions.invoke('cancel-subscription', {
        body: JSON.stringify({ subscription_id: subscription?.id })
      });

      if (cancelError) throw cancelError;

      await loadPricesAndSubscription();
    } catch (err) {
      setError('Failed to cancel subscription');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceSelect = (price: Price) => {
    setSelectedPrice(price);
    setPaymentStep('payment-method');
  };

  const handleWeChatPay = () => {
    if (!selectedPrice) {
      setError('Please select a plan first');
      return;
    }
    if (!currentUser) {
      setError('Please sign in to continue');
      return;
    }
    setPaymentStep('wechat');
    setIsWeChatModalOpen(true);
  };

  const handleBankCardPay = () => {
    if (!selectedPrice) {
      setError('Please select a plan first');
      return;
    }
    if (!currentUser) {
      setError('Please sign in to continue');
      return;
    }
    setPaymentStep('bank-card');
    setIsBankCardModalOpen(true);
  };

  const handleWeChatSuccess = async () => {
    setIsWeChatModalOpen(false);
    await loadPricesAndSubscription();
    onClose();
  };

  const handleBankCardSuccess = async () => {
    setIsBankCardModalOpen(false);
    await loadPricesAndSubscription();
    onClose();
  };

  const PaymentMethodButton = ({ 
    method, 
    icon, 
    label 
  }: { 
    method: 'card' | 'bank_transfer' | 'paypal', 
    icon: React.ReactNode, 
    label: string 
  }) => (
    <button
      onClick={() => handleSubscribe(method)}
      disabled={loading}
      className="flex items-center justify-between w-full p-4 border rounded-lg hover:border-blue-500 transition-colors"
    >
      <div className="flex items-center space-x-3">
        {icon}
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Premium Membership</h2>
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
          {loading && (
            <div className="flex justify-center py-8">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}

          {subscription?.status === 'active' ? (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-green-800">Active Membership</h3>
              <p className="text-sm text-green-600 mt-1">
                Your membership is active until{' '}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
              {subscription.cancel_at_period_end ? (
                <p className="text-sm text-yellow-600 mt-2">
                  Your membership will end at the current period end.
                </p>
              ) : (
                <button
                  onClick={handleCancelSubscription}
                  disabled={loading}
                  className="mt-3 text-sm text-red-600 hover:text-red-700"
                >
                  Cancel membership
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="prose">
                <h3 className="text-lg font-medium text-gray-900">Premium Features</h3>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>Unlimited task tracking</li>
                  <li>Advanced analytics and reports</li>
                  <li>Priority support</li>
                  <li>Team collaboration features</li>
                </ul>
              </div>

              {paymentStep === 'prices' ? (
                <div className={`space-y-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {prices.map((price) => (
                    <div
                      key={price.id}
                      className="border rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
                      onClick={() => handlePriceSelect(price)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            ${(price.unit_amount / 100).toFixed(2)}/{price.interval}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Billed {price.interval_count === 1 ? 'monthly' : 'annually'}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 className="text-sm font-medium text-gray-700">Selected Plan</h4>
                    <p className="text-lg font-medium text-gray-900 mt-1">
                      ${((selectedPrice?.unit_amount || 0) / 100).toFixed(2)}/{selectedPrice?.interval}
                    </p>
                    <button
                      onClick={() => setPaymentStep('prices')}
                      className="text-sm text-blue-600 hover:text-blue-700 mt-2"
                    >
                      Change plan
                    </button>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Payment Method</h3>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => handleSubscribe('card')}
                      className="flex items-center justify-between w-full p-4 border rounded-lg hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                        <span className="font-medium text-gray-900">Credit Card (International)</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                    
                    <button
                      onClick={handleBankCardPay}
                      disabled={loading}
                      className="flex items-center justify-between w-full p-4 border rounded-lg hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Building2 className="w-6 h-6 text-green-600" />
                        <span className="font-medium text-gray-900">Bank Card (UnionPay)</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                    
                    <PaymentMethodButton
                      method="paypal"
                      icon={<PaypalIcon className="w-6 h-6 text-[#003087]" />}
                      label="PayPal"
                    />
                    
                    <button
                      onClick={handleWeChatPay}
                      disabled={loading}
                      className="flex items-center justify-between w-full p-4 border rounded-lg hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <QrCode className="w-6 h-6 text-[#07C160]" />
                        <span className="font-medium text-gray-900">WeChat Pay</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                    
                    <PaymentMethodButton
                      method="alipay"
                      icon={<Wallet className="w-6 h-6 text-[#1677FF]" />}
                      label="Alipay"
                    />
                  </div>

                  {loading && (
                    <div className="flex justify-center">
                      <Loader className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {paymentStep === 'credit-card' && selectedPrice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setPaymentStep('payment-method')}
                className="text-gray-500 hover:text-gray-700 flex items-center"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back
              </button>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900">Credit Card Payment</h3>
              <p className="text-sm text-gray-500 mt-1">
                Enter your card details to complete the payment
              </p>
            </div>

            {error && (
              <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <StripePaymentForm
              amount={selectedPrice.unit_amount}
              onSuccess={() => {
                loadPricesAndSubscription();
                onClose();
              }}
              onError={setError}
            />
          </div>
        </div>
      )}
      
      {selectedPrice && (
        <WeChatPayModal
          isOpen={isWeChatModalOpen}
          onClose={() => setIsWeChatModalOpen(false)}
          amount={selectedPrice.unit_amount || 0}
          onSuccess={handleWeChatSuccess}
          userId={userId}
        />
      )}
      {selectedPrice && (
        <BankCardPayModal
          isOpen={isBankCardModalOpen}
          onClose={() => setIsBankCardModalOpen(false)}
          amount={selectedPrice?.unit_amount || 0}
          onSuccess={handleBankCardSuccess}
          userId={userId}
        />
      )}
    </div>
  );
}