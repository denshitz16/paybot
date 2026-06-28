import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { client } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import {
  Wallet, DollarSign, ArrowUpFromLine, ArrowDownToLine, Send, Bitcoin,
  Loader2, ChevronRight, Clock, CheckCircle, XCircle, Building2, Landmark,
  CreditCard, Receipt, AlertCircle, ArrowRight
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────
interface WalletBalance {
  balance: number;
  currency: string;
  updated_at?: string;
}

interface WalletTxn {
  id: number;
  type: 'deposit' | 'withdraw' | 'receive' | 'sent' | 'crypto_topup' | 'usdt_send' | 'disbursement' | 'refund';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  description?: string;
  created_at: string;
  reference?: string;
}

interface BankOption {
  code: string;
  name: string;
}

interface WithdrawRequest {
  id: number;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  created_at: string;
  processed_at?: string;
  processed_by?: string;
  rejection_reason?: string;
}

// ─── Constants ───────────────────────────────────────────────────────
const BANKS: string[] = [
  'BDO', 'BPI', 'Metrobank', 'UnionBank', 'Landbank', 'PNB',
  'Chinabank', 'RCBC', 'Security Bank', 'EastWest', 'GCash', 'Maya'
];

const txnMeta: Record<string, { label: string; color: string; icon: React.ReactNode; sign: string }> = {
  deposit:       { label: 'Deposit', color: 'text-emerald-600 dark:text-emerald-400', icon: <ArrowDownToLine className="h-4 w-4" />, sign: '+' },
  withdraw:      { label: 'Withdrawal', color: 'text-amber-600 dark:text-amber-400', icon: <ArrowUpFromLine className="h-4 w-4" />, sign: '-' },
  receive:       { label: 'Received', color: 'text-emerald-600 dark:text-emerald-400', icon: <ArrowDownToLine className="h-4 w-4" />, sign: '+' },
  sent:          { label: 'Sent', color: 'text-red-600 dark:text-red-400', icon: <Send className="h-4 w-4" />, sign: '-' },
  crypto_topup:  { label: 'Crypto Top Up', color: 'text-teal-600 dark:text-teal-400', icon: <Bitcoin className="h-4 w-4" />, sign: '+' },
  usdt_send:     { label: 'Sent USDT', color: 'text-red-600 dark:text-red-400', icon: <Send className="h-4 w-4" />, sign: '-' },
  disbursement:  { label: 'Disbursement', color: 'text-red-600 dark:text-red-400', icon: <Send className="h-4 w-4" />, sign: '-' },
  refund:        { label: 'Refund', color: 'text-emerald-600 dark:text-emerald-400', icon: <Receipt className="h-4 w-4" />, sign: '+' },
};

const statusMeta: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: <Clock className="h-3.5 w-3.5" /> },
  approved:  { label: 'Approved', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  processing:{ label: 'Processing', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  completed: { label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  rejected:  { label: 'Rejected', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', icon: <XCircle className="h-3.5 w-3.5" /> },
  failed:    { label: 'Failed', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', icon: <XCircle className="h-3.5 w-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900', icon: <XCircle className="h-3.5 w-3.5" /> },
};

const fmt = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
const fmtUsd = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Component ───────────────────────────────────────────────────────
export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const [phpBalance, setPhpBalance] = useState<WalletBalance | null>(null);
  const [usdBalance, setUsdBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);

  // Withdraw request form state
  const [wrAmount, setWrAmount] = useState('');
  const [wrBank, setWrBank] = useState('');
  const [wrAccount, setWrAccount] = useState('');
  const [wrName, setWrName] = useState('');
  const [wrNote, setWrNote] = useState('');
  const [wrLoading, setWrLoading] = useState(false);

  // USDT Send state
  const [usdtAmount, setUsdtAmount] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [usdtNetwork, setUsdtNetwork] = useState('TRC20');
  const [usdtLoading, setUsdtLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [phpRes, usdRes, txnRes, banksRes, wrRes] = await Promise.allSettled([
        client.apiCall.invoke({ url: '/api/v1/wallet/balance?currency=PHP', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/wallet/balance?currency=USD', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/wallet/transactions?limit=20', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/gateway/banks', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/wallet/withdraw-requests', method: 'GET', data: {} }),
      ]);

      if (phpRes.status === 'fulfilled' && phpRes.value?.data?.balance != null) {
        setPhpBalance({ balance: phpRes.value.data.balance, currency: 'PHP' });
      }
      if (usdRes.status === 'fulfilled' && usdRes.value?.data?.balance != null) {
        setUsdBalance({ balance: usdRes.value.data.balance, currency: 'USD' });
      }
      if (txnRes.status === 'fulfilled' && txnRes.value?.data?.items) {
        setTransactions(txnRes.value.data.items);
      }
      if (banksRes.status === 'fulfilled' && banksRes.value?.data?.banks) {
        setBankOptions(banksRes.value.data.banks);
      }
      if (wrRes.status === 'fulfilled' && wrRes.value?.data?.requests) {
        setWithdrawRequests(wrRes.value.data.requests);
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(wrAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (!wrBank) { toast.error('Select a bank'); return; }
    if (!wrAccount.trim()) { toast.error('Enter account number'); return; }
    if (!wrName.trim()) { toast.error('Enter account holder name'); return; }
    if (phpBalance && amount > phpBalance.balance) { toast.error('Insufficient balance'); return; }

    setWrLoading(true);
    try {
      const res = await fetch('/api/v1/wallet/withdraw-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          bank_name: wrBank,
          account_number: wrAccount.trim(),
          account_name: wrName.trim(),
          note: wrNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Withdrawal request submitted for admin approval');
        setWrAmount(''); setWrBank(''); setWrAccount(''); setWrName(''); setWrNote('');
        await fetchData();
      } else {
        toast.error(data.message || 'Failed to submit request');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally { setWrLoading(false); }
  };

  const handleUsdtSend = async () => {
    const amount = parseFloat(usdtAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (!usdtAddress.trim()) { toast.error('Enter recipient address'); return; }
    if (usdBalance && amount > usdBalance.balance) { toast.error('Insufficient USDT balance'); return; }

    setUsdtLoading(true);
    try {
      const res = await fetch('/api/v1/wallet/send-usdt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, address: usdtAddress.trim(), network: usdtNetwork }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('USDT sent successfully');
        setUsdtAmount(''); setUsdtAddress('');
        await fetchData();
      } else {
        toast.error(data.message || 'Failed to send USDT');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally { setUsdtLoading(false); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 dark:border-slate-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Please log in to view your wallet.</p>
      </div>
    );
  }

  const bankList = bankOptions.length > 0 ? bankOptions : BANKS.map(b => ({ code: b, name: b }));

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            Wallet
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your PHP and USDT balances, request withdrawals, and view transaction history.
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* PHP Balance */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">PHP Wallet</span>
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Landmark className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {loading ? (
                  <span className="inline-block w-28 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                ) : `₱${fmt(phpBalance?.balance || 0)}`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Philippine Peso</p>
            </CardContent>
          </Card>

          {/* USD Balance */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">USD Wallet</span>
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {loading ? (
                  <span className="inline-block w-28 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                ) : `$${fmtUsd(usdBalance?.balance || 0)}`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">US Dollar · via Crypto Topup</p>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Requests</span>
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                ) : withdrawRequests.filter(r => r.status === 'pending').length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Awaiting admin approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="withdraw" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1">
            <TabsTrigger value="withdraw" className="text-xs font-medium data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">
              <ArrowUpFromLine className="h-3.5 w-3.5 mr-1.5" />
              Withdraw
            </TabsTrigger>
            <TabsTrigger value="usdt" className="text-xs font-medium data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send USDT
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs font-medium data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              History
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs font-medium data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              My Requests
            </TabsTrigger>
          </TabsList>

          {/* ─── WITHDRAW TAB ─── */}
          <TabsContent value="withdraw" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Withdraw Form */}
              <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    Request Withdrawal to Bank
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Info Banner */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Admin Approval Required</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Your withdrawal request will be sent to the Super Admin for review and approval. 
                        Processing typically takes 1-2 business days.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Amount (₱)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={wrAmount}
                        onChange={e => setWrAmount(e.target.value)}
                        min="1"
                        step="0.01"
                        className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                      {phpBalance && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Available: ₱{fmt(phpBalance.balance)}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Bank</Label>
                      <Select value={wrBank} onValueChange={setWrBank}>
                        <SelectTrigger className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                          <SelectValue placeholder="Select bank…" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                          {bankList.map(b => (
                            <SelectItem key={b.code} value={b.code} className="text-slate-900 dark:text-slate-100">
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Account Number</Label>
                      <Input
                        placeholder="1234567890"
                        value={wrAccount}
                        onChange={e => setWrAccount(e.target.value)}
                        className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Account Holder Name</Label>
                      <Input
                        placeholder="Juan Dela Cruz"
                        value={wrName}
                        onChange={e => setWrName(e.target.value)}
                        className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Note (optional)</Label>
                      <Input
                        placeholder="Additional instructions for admin..."
                        value={wrNote}
                        onChange={e => setWrNote(e.target.value)}
                        className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleWithdrawRequest}
                    disabled={wrLoading}
                    className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 h-10 rounded-lg font-medium"
                  >
                    {wrLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting Request...</>
                    ) : (
                      <><ArrowUpFromLine className="h-4 w-4 mr-2" />Submit Withdrawal Request</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Supported Banks */}
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    Supported Banks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {BANKS.slice(0, 8).map(bank => (
                      <div key={bank} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        {bank}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    Including GCash and Maya e-wallets
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── USDT TAB ─── */}
          <TabsContent value="usdt" className="mt-0">
            <Card className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Send className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  Send USDT
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Amount (USDT)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={usdtAmount}
                      onChange={e => setUsdtAmount(e.target.value)}
                      min="1"
                      step="0.01"
                      className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                    {usdBalance && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Available: ${fmtUsd(usdBalance.balance)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Network</Label>
                    <Select value={usdtNetwork} onValueChange={setUsdtNetwork}>
                      <SelectTrigger className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <SelectItem value="TRC20" className="text-slate-900 dark:text-slate-100">TRC20 (Tron)</SelectItem>
                        <SelectItem value="ERC20" className="text-slate-900 dark:text-slate-100">ERC20 (Ethereum)</SelectItem>
                        <SelectItem value="BEP20" className="text-slate-900 dark:text-slate-100">BEP20 (BSC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Recipient Address</Label>
                    <Input
                      placeholder="TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      value={usdtAddress}
                      onChange={e => setUsdtAddress(e.target.value)}
                      className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-sm"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleUsdtSend}
                  disabled={usdtLoading}
                  className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 h-10 rounded-lg font-medium"
                >
                  {usdtLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" />Send USDT</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── HISTORY TAB ─── */}
          <TabsContent value="history" className="mt-0">
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 animate-pulse">
                        <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                          <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                        </div>
                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">No transactions yet</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your transaction history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {transactions.map(txn => {
                      const meta = txnMeta[txn.type] || txnMeta.deposit;
                      const st = statusMeta[txn.status] || statusMeta.pending;
                      return (
                        <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${meta.color}`}>
                              {meta.icon}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{meta.label}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {txn.description || txn.reference || `#${txn.id}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${meta.color}`}>
                              {meta.sign}{txn.currency === 'USD' ? '$' : '₱'}{fmt(Math.abs(txn.amount))}
                            </p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${st.bg} ${st.color} ${st.bg.replace('bg-', 'border-').replace('50', '200').replace('950/30', '800')}`}>
                              {st.icon}
                              {st.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── MY REQUESTS TAB ─── */}
          <TabsContent value="requests" className="mt-0">
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  My Withdrawal Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 animate-pulse">
                        <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                          <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : withdrawRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">No withdrawal requests</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Submit a withdrawal request from the Withdraw tab</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {withdrawRequests.map(req => {
                      const st = statusMeta[req.status] || statusMeta.pending;
                      return (
                        <div key={req.id} className="p-4 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${st.bg} ${st.color}`}>
                                {st.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    ₱{fmt(req.amount)}
                                  </p>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${st.bg} ${st.color} ${st.bg.replace('bg-', 'border-').replace('50', '200').replace('950/30', '800')}`}>
                                    {st.label}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {req.bank_name} · {req.account_number}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {req.account_name}
                                </p>
                                {req.note && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                                    Note: {req.note}
                                  </p>
                                )}
                                {req.rejection_reason && (
                                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    Reason: {req.rejection_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {new Date(req.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              {req.processed_at && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  Processed: {new Date(req.processed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
