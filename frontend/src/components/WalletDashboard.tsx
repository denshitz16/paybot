import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface BalanceData {
  user_id: string;
  available_balance_php: number;
  pending_balance_php: number;
  total_balance_php: number;
  usd_balance: number;
  usdt_address: string | null;
  kyc_verified: boolean;
  is_active: boolean;
  created_at: string;
}

interface LedgerEntry {
  id: number;
  transaction_id: string;
  transaction_type: string;
  amount_php: number;
  balance_after_php: number;
  settlement_status: string;
  payment_method: string | null;
  external_reference: string | null;
  created_at: string;
  settled_at: string | null;
  description: string | null;
}

interface WalletDashboardProps {
  userId: string;
  apiUrl: string;
}

export function WalletDashboard({ userId, apiUrl }: WalletDashboardProps) {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankCode, setBankCode] = useState('BDO');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Fetch wallet balance and history
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch balance
        const balanceRes = await fetch(`${apiUrl}/api/v1/wallet/balance/${userId}`);
        if (!balanceRes.ok) throw new Error('Failed to fetch balance');
        const balanceData: BalanceData = await balanceRes.json();
        setBalance(balanceData);

        // Fetch history
        const historyRes = await fetch(`${apiUrl}/api/v1/wallet/history/${userId}?limit=20`);
        if (!historyRes.ok) throw new Error('Failed to fetch history');
        const historyData: LedgerEntry[] = await historyRes.json();
        setHistory(historyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [userId, apiUrl]);

  // Handle withdrawal
  const handleWithdraw = async () => {
    if (!withdrawAmount || !accountNumber || !recipientName) {
      alert('Please fill all fields');
      return;
    }

    try {
      setWithdrawing(true);
      const res = await fetch(`${apiUrl}/api/v1/wallet/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          amount_php: parseFloat(withdrawAmount),
          bank_code: bankCode,
          account_number: accountNumber,
          recipient_name: recipientName,
        }),
      });

      if (!res.ok) throw new Error('Withdrawal failed');
      alert('Withdrawal processed successfully!');
      setWithdrawAmount('');
      setAccountNumber('');
      setRecipientName('');

      // Refresh balance
      const balanceRes = await fetch(`${apiUrl}/api/v1/wallet/balance/${userId}`);
      const balanceData: BalanceData = await balanceRes.json();
      setBalance(balanceData);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error || !balance) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error || 'Failed to load wallet'}</p>
        </CardContent>
      </Card>
    );
  }

  const statusColor = (status: string) => {
    if (status === 'INSTANT' || status === 'T0_SETTLEMENT' || status === 'SETTLED')
      return 'text-green-600';
    if (status === 'PENDING_T1') return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Available Balance (Spendable)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              ₱{balance.available_balance_php.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">Ready for withdrawal/transfer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Balance (T+1 Cards)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              ₱{balance.pending_balance_php.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">Card settlements clearing tomorrow</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              ₱{balance.total_balance_php.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">Available + Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Form */}
      <Card>
        <CardHeader>
          <CardTitle>InstaPay Withdrawal</CardTitle>
          <CardDescription>Send money to a Philippine bank account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount (PHP)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={withdrawing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bank</label>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                disabled={withdrawing}
              >
                <option value="BDO">BDO</option>
                <option value="BPI">BPI</option>
                <option value="UNIONBANK">UnionBank</option>
                <option value="RCBC">RCBC</option>
                <option value="METROBANK">Metrobank</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Account Number</label>
            <Input
              type="text"
              placeholder="1234567890"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              disabled={withdrawing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Recipient Name</label>
            <Input
              type="text"
              placeholder="Juan dela Cruz"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              disabled={withdrawing}
            />
          </div>
          <Button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="w-full"
          >
            {withdrawing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Withdraw Now'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your wallet ledger history</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="flex justify-between items-start border-b pb-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{entry.transaction_type}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                    {entry.external_reference && (
                      <p className="text-xs text-gray-400">Ref: {entry.external_reference}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold">₱{entry.amount_php.toFixed(2)}</p>
                    <p className={`text-xs font-medium ${statusColor(entry.settlement_status)}`}>
                      {entry.settlement_status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
