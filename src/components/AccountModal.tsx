import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Account } from '../types';
import { supabase } from '../lib/supabase';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account?: Account;
  userId: string;
}

export default function AccountModal({ isOpen, onClose, onSuccess, account, userId }: AccountModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [institution, setInstitution] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [isAsset, setIsAsset] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setInstitution(account.institution || '');
      setAccountNumber(account.account_number || '');
      setCurrentBalance((account.current_balance / 100).toString());
      setIsAsset(account.is_asset);
    } else {
      resetForm();
    }
  }, [account]);

  const resetForm = () => {
    setName('');
    setType('checking');
    setInstitution('');
    setAccountNumber('');
    setCurrentBalance('');
    setIsAsset(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const balanceInCents = Math.round(parseFloat(currentBalance) * 100);
      
      if (isNaN(balanceInCents)) {
        throw new Error('Invalid balance amount');
      }

      // Validate account number format
      if (accountNumber && !/^\d{4}$/.test(accountNumber)) {
        throw new Error('Account number must be exactly 4 digits');
      }

      const accountData = {
        name,
        type,
        institution: institution || null,
        account_number: accountNumber || null,
        current_balance: balanceInCents,
        is_asset: isAsset,
        updated_at: new Date().toISOString()
      };

      if (account) {
        // Update existing account
        const { data, error: updateError } = await supabase
          .from('accounts')
          .update(accountData)
          .eq('id', account.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) throw updateError;
      } else {
        // Create new account
        const { data, error: insertError } = await supabase
          .from('accounts')
          .insert({
            user_id: userId,
            ...accountData
          })
          .select()
          .single();

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      let errorMessage = 'Failed to save account';
      
      if (err instanceof Error) {
        if (err.message.includes('unique_account_name_per_user')) {
          errorMessage = 'An account with this name already exists';
        } else if (err.message.includes('unique_account_number_per_institution')) {
          errorMessage = 'This account number already exists for this institution';
        } else if (err.message.includes('valid_account_number')) {
          errorMessage = 'Account number must be exactly 4 digits';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      console.error('Error saving account:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            {account ? 'Edit Account' : 'New Account'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Account['type'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit_card">Credit Card</option>
              <option value="investment">Investment</option>
              <option value="loan">Loan</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Institution
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number (Last 4 digits)
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              maxLength={4}
              pattern="\d{4}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                step="0.01"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAsset"
              checked={isAsset}
              onChange={(e) => setIsAsset(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isAsset" className="text-sm font-medium text-gray-700">
              This is an asset (not a liability)
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : account ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}