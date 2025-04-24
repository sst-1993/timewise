import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NetWorthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  currentAssets: number;
  currentLiabilities: number;
}

export default function NetWorthModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  currentAssets,
  currentLiabilities
}: NetWorthModalProps) {
  const [totalAssets, setTotalAssets] = useState((currentAssets / 100).toString());
  const [totalLiabilities, setTotalLiabilities] = useState((currentLiabilities / 100).toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const assetsInCents = Math.round(parseFloat(totalAssets) * 100);
      const liabilitiesInCents = Math.round(parseFloat(totalLiabilities) * 100);
      
      if (isNaN(assetsInCents) || isNaN(liabilitiesInCents)) {
        throw new Error('Invalid amount');
      }

      // Insert new net worth record
      const { error: insertError } = await supabase
        .from('net_worth_history')
        .insert({
          user_id: userId,
          total_assets: assetsInCents,
          total_liabilities: liabilitiesInCents,
          net_worth: assetsInCents - liabilitiesInCents,
          snapshot_date: new Date().toISOString().split('T')[0]
        });

      if (insertError) throw insertError;

      setSuccess(true);
      onSuccess();
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update net worth');
      console.error('Error updating net worth:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Update Net Worth</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 text-green-600 text-sm bg-green-50 p-3 rounded-md">
            Net worth updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Assets
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={totalAssets}
                onChange={(e) => setTotalAssets(e.target.value)}
                step="0.01"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Liabilities
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={totalLiabilities}
                onChange={(e) => setTotalLiabilities(e.target.value)}
                step="0.01"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="mt-2 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">Net Worth:</span>
              <span className={`font-bold ${
                parseFloat(totalAssets) - parseFloat(totalLiabilities) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                ${(parseFloat(totalAssets) - parseFloat(totalLiabilities)).toFixed(2)}
              </span>
            </div>
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
              {loading ? 'Updating...' : 'Update Net Worth'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}