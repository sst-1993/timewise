import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, PiggyBank, CreditCard, LineChart, ArrowUpRight, ArrowDownRight, Plus, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Account, Transaction, NetWorthHistory } from '../types';
import NetWorthModal from './NetWorthModal';
import AccountModal from './AccountModal';
import TransactionModal from './TransactionModal';

interface FinancialDashboardProps {
  userId: string;
}

interface Props extends FinancialDashboardProps {
  onViewEnter?: () => void;
}

export default function FinancialDashboard({ userId }: FinancialDashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isNetWorthModalOpen, setIsNetWorthModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();

  const handleNetWorthUpdate = async () => {
    await loadFinancialData();
  };

  const createSampleTransaction = async () => {
    try {
      let accountId;

      // If no accounts exist, create a checking account first
      if (accounts.length === 0) {
        const { data: newAccount, error: accountError } = await supabase
          .from('accounts')
          .insert({
            user_id: userId,
            name: 'Main Checking',
            type: 'checking',
            current_balance: 0,
            is_asset: true
          })
          .select()
          .single();

        if (accountError) throw accountError;
        accountId = newAccount.id;
      } else {
        accountId = accounts[0].id;
      }

      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          account_id: accountId,
          type: 'income',
          category: 'salary',
          amount: 500000, // $5000.00 in cents
          description: 'Monthly Salary',
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Reload financial data to show the new transaction
      await loadFinancialData();
    } catch (err) {
      console.error('Error creating transaction:', err);
      alert(err instanceof Error ? err.message : 'Failed to create transaction');
    }
  };

  // Load data when component mounts and when it becomes visible
  useEffect(() => {
    loadFinancialData();
  }, [userId, isAccountModalOpen, isTransactionModalOpen, isNetWorthModalOpen]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      // Load accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // Load recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(10);
      
      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Load net worth history
      const { data: netWorthData, error: netWorthError } = await supabase
        .from('net_worth_history')
        .select('*')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: false })
        .limit(12);
      
      if (netWorthError) throw netWorthError;
      setNetWorthHistory(netWorthData || []);

    } catch (err) {
      console.error('Error loading financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getTotalAssets = () => {
    return accounts
      .filter(account => account.is_asset)
      .reduce((sum, account) => sum + account.current_balance, 0);
  };

  const getTotalLiabilities = () => {
    return accounts
      .filter(account => !account.is_asset)
      .reduce((sum, account) => sum + account.current_balance, 0);
  };

  const getNetWorth = () => {
    return getTotalAssets() - getTotalLiabilities();
  };

  const getNetWorthChange = () => {
    if (netWorthHistory.length < 2) return 0;
    return netWorthHistory[0].net_worth - netWorthHistory[1].net_worth;
  };

  return (
    <div className="space-y-6">
      {/* Net Worth Overview */}
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Wallet className="w-6 h-6 mr-2 text-blue-600" />
            Financial Overview
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Net Worth */}
          <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div
                onClick={() => setIsNetWorthModalOpen(true)}
                className="flex-1 cursor-pointer hover:opacity-75 transition-opacity"
              >
                <p className="text-sm font-medium text-gray-600">Net Worth</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(getNetWorth())}
                </h3>
              </div>
              <div className={`flex items-center ${
                getNetWorthChange() >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {getNetWorthChange() >= 0 ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowDownRight className="w-5 h-5" />
                )}
                <span className="ml-1 text-sm">
                  {formatCurrency(Math.abs(getNetWorthChange()))}
                </span>
              </div>
            </div>
          </div>

          {/* Total Assets */}
          <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Assets</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(getTotalAssets())}
                </h3>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Total Liabilities */}
          <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Liabilities</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(getTotalLiabilities())}
                </h3>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <PiggyBank className="w-5 h-5 mr-2 text-green-600" />
            Assets
            <button
              onClick={() => {
                setSelectedAccount(undefined);
                setIsAccountModalOpen(true);
              }}
              className="ml-2 p-1 text-green-600 hover:bg-green-100 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </h3>
          <div className="space-y-4">
            {accounts
              .filter(account => account.is_asset)
              .map(account => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedAccount(account);
                    setIsAccountModalOpen(true);
                  }}
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{account.name}</h4>
                    <p className="text-sm text-gray-500">{account.institution}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(account.current_balance)}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">{account.type}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-red-600" />
            Liabilities
            <button
              onClick={() => {
                setSelectedAccount(undefined);
                setIsAccountModalOpen(true);
              }}
              className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </h3>
          <div className="space-y-4">
            {accounts
              .filter(account => !account.is_asset)
              .map(account => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100"
                  onClick={() => {
                    setSelectedAccount(account);
                    setIsAccountModalOpen(true);
                  }}
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{account.name}</h4>
                    <p className="text-sm text-gray-500">{account.institution}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(account.current_balance)}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">{account.type}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
          Recent Transactions
          <button
            onClick={() => {
              setSelectedTransaction(undefined);
              setIsTransactionModalOpen(true);
            }}
            className="ml-2 p-1 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </h3>
        <div className="space-y-4">
          {transactions.map(transaction => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setSelectedTransaction(transaction);
                setIsTransactionModalOpen(true);
              }}
            >
              <div>
                <h4 className="font-medium text-gray-900">{transaction.description}</h4>
                <div className="flex items-center mt-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    transaction.type === 'income'
                      ? 'bg-green-100 text-green-700'
                      : transaction.type === 'expense'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {transaction.type}
                  </span>
                  <span className="text-xs text-gray-500 ml-2 capitalize">
                    {transaction.category}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-medium ${
                  transaction.type === 'income'
                    ? 'text-green-600'
                    : transaction.type === 'expense'
                    ? 'text-red-600'
                    : 'text-gray-900'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'} {formatCurrency(Math.abs(transaction.amount))}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Net Worth Chart */}
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <LineChart className="w-5 h-5 mr-2 text-purple-600" />
          Net Worth Trend
        </h3>
        <div className="h-64">
          <div className="flex h-full items-end space-x-2">
            {netWorthHistory
              .slice()
              .reverse()
              .map((history, index) => {
                const maxNetWorth = Math.max(...netWorthHistory.map(h => Math.abs(h.net_worth)));
                const height = Math.abs(history.net_worth) / maxNetWorth * 100;
                
                return (
                  <div
                    key={history.id}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div className="w-full flex-1 flex flex-col justify-end">
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          history.net_worth >= 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      {new Date(history.snapshot_date).toLocaleDateString(undefined, {
                        month: 'short',
                        year: '2-digit'
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setSelectedAccount(undefined);
        }}
        onSuccess={loadFinancialData}
        account={selectedAccount}
        userId={userId}
      />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setSelectedTransaction(undefined);
        }}
        onSuccess={loadFinancialData}
        transaction={selectedTransaction}
        userId={userId}
        accounts={accounts} />
      <NetWorthModal
        isOpen={isNetWorthModalOpen}
        onClose={() => setIsNetWorthModalOpen(false)}
        onSuccess={handleNetWorthUpdate}
        userId={userId}
        currentAssets={getTotalAssets()}
        currentLiabilities={getTotalLiabilities()}
      />
    </div>
  );
}