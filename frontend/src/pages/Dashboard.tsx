import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { usePaymentEvents } from '@/hooks/usePaymentEvents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { fmt, fmtUsd } from '@/lib/format';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  RefreshCw,
  Sun,
  Sunset,
  Moon,
  Wallet,
  XCircle,
} from 'lucide-react';

interface Stats {
  total_count: number;
  paid_count: number;
  pending_count: number;
  expired_count: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
}

interface Transaction {
  id: number;
  transaction_type: string;
  external_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
}

const defaultStats: Stats = {
  total_count: 0,
  paid_count: 0,
  pending_count: 0,
  expired_count: 0,
  total_amount: 0,
  paid_amount: 0,
  pending_amount: 0,
};

// More conservative, fintech-friendly status colors
const statusConfig: Record<string, { color: string; label: string }> = {
  paid: { color: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Settled' },
  pending: { color: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Pending' },
  expired: { color: 'bg-rose-50 text-rose-700 border-rose-100', label: 'Expired' },
};

const typeConfig: Record<string, { icon: ReactNode; bg: string }> = {
  invoice: { icon: <FileText className="h-4 w-4 text-gray-700" />, bg: 'bg-gray-100' },
  qr_code: { icon: <CreditCard className="h-4 w-4 text-gray-700" />, bg: 'bg-gray-100' },
  payment_link: { icon: <ArrowRight className="h-4 w-4 text-gray-700" />, bg: 'bg-gray-100' },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: <Sun className="h-5 w-5 text-amber-500" /> };
  if (hour < 18) return { text: 'Good afternoon', icon: <Sunset className="h-5 w-5 text-orange-500" /> };
  return { text: 'Good evening', icon: <Moon className="h-5 w-5 text-gray-400" /> };
}

function formatTxnDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function StatCard({ label, value, note, loading }: { label: string; value: string; note: string; loading: boolean }) {
  return (
    <Card className="border border-gray-200 bg-white shadow-sm rounded-md">
      <CardContent className="p-5">
        <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
        <p className="mt-3 text-2xl font-semibold text-gray-900 tracking-tight">{loading ? '...' : value}</p>
        <p className="mt-2 text-sm text-gray-500">{note}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<'healthy' | 'degrading' | 'offline'>('healthy');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [usdWalletBalance, setUsdWalletBalance] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(58.2);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [statsRes, txnsRes, walletRes, usdRes, rateRes] = await Promise.allSettled([
        client.apiCall.invoke({ url: '/api/v1/xendit/transaction-stats', method: 'GET', data: {} }),
        client.entities.transactions.query({ query: {}, sort: '-created_at', limit: 8 }),
        client.apiCall.invoke({ url: '/api/v1/wallet/balance?currency=PHP', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/wallet/balance?currency=USD', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/topup/rate', method: 'GET', data: {} }),
      ]);

      if (statsRes.status === 'fulfilled') {
        const data = statsRes.value?.data;
        if (data) setStats({ ...defaultStats, ...data });
      }

      if (txnsRes.status === 'fulfilled') {
        const items = txnsRes.value?.data?.items;
        if (Array.isArray(items)) setRecentTxns(items);
      }

      if (walletRes.status === 'fulfilled') {
        const data = walletRes.value?.data;
        if (data?.balance != null) setWalletBalance(data.balance);
      }

      if (usdRes.status === 'fulfilled') {
        const data = usdRes.value?.data;
        if (data?.balance != null) setUsdWalletBalance(data.balance);
      }

      if (rateRes.status === 'fulfilled') {
        const data = rateRes.value?.data;
        if (data?.usdt_php_rate) setExchangeRate(Number(data.usdt_php_rate));
      }

      setApiStatus('healthy');
    } catch (err) {
      console.error(err);
      setApiStatus('degrading');
    }
  }, [user]);

  const { connected } = usePaymentEvents({
    enabled: !!user,
    onStatusChange: useCallback(() => { fetchData(); }, [fetchData]),
    onWalletUpdate: useCallback(() => { fetchData(); }, [fetchData]),
    pollInterval: 15000,
  });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [user, fetchData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-t-gray-700 border-gray-300 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/home" replace />;
  }

  const successRate = stats.total_count > 0 ? Math.round((stats.paid_count / stats.total_count) * 100) : 0;
  const greeting = getGreeting();
  const userName = (user as { name?: string; telegram_username?: string } | null)?.name || (user as { telegram_username?: string } | null)?.telegram_username || 'Operator';

  return (
    <Layout connected={connected}>
      <div className="space-y-8 max-w-[1400px] mx-auto px-4 py-8 sm:px-6 xl:px-8">
        <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{greeting.text}, {userName}</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">Accounts overview — payments, settlements, and available funds.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:w-full">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="mt-3 text-xl font-semibold text-gray-900">{loading ? '...' : stats.total_count}</p>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Settled</p>
                <p className="mt-3 text-xl font-semibold text-emerald-700">{loading ? '...' : stats.paid_count}</p>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Success rate</p>
                <p className="mt-3 text-xl font-semibold text-gray-900">{loading ? '...' : `${successRate}%`}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total volume" value={`₱${fmt(stats.total_amount || 0)}`} note="Transaction volume (PHP)" loading={loading} />
          <StatCard label="Settled amount" value={`₱${fmt(stats.paid_amount || 0)}`} note="Confirmed settlements" loading={loading} />
          <StatCard label="Pending count" value={`${stats.pending_count}`} note="Awaiting action" loading={loading} />
          <StatCard label="Available balance" value={`₱${fmt(walletBalance || 0)}`} note={`USD: $${fmtUsd(usdWalletBalance || 0)} • FX ₱${exchangeRate.toFixed(2)}`} loading={loading} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <Card className="border border-gray-200 bg-white shadow-md rounded-md">
            <CardHeader className="px-6 py-5 border-b border-gray-200">
              <CardTitle className="text-sm font-semibold text-gray-700">Recent transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {recentTxns.length > 0 ? (
                recentTxns.map((txn) => {
                  const status = statusConfig[txn.status] || statusConfig.pending;
                  const type = typeConfig[txn.transaction_type] || { icon: <FileText className="h-4 w-4 text-gray-700" />, bg: 'bg-gray-100' };
                  return (
                    <div key={txn.id} className="flex items-center justify-between gap-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`h-12 w-12 rounded-md ${type.bg} flex items-center justify-center`}>
                          {type.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{txn.description || txn.transaction_type}</p>
                          <p className="mt-1 text-xs text-gray-500">{formatTxnDate(txn.created_at)} · {txn.currency}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₱{fmt(txn.amount)}</p>
                        <span className={`mt-2 inline-flex rounded-full border ${status.color} px-3 py-1 text-[11px] font-semibold uppercase tracking-wider`}>{status.label}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-12 text-center text-sm text-gray-500">
                  No recent transactions to display.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border border-gray-200 bg-white shadow-sm rounded-md">
              <CardHeader className="px-6 py-5 border-b border-gray-200">
                <CardTitle className="text-sm font-semibold text-gray-700">Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-6">
                {[
                  { label: 'Initiate Payment', href: '/create-payment', icon: <CreditCard className="h-4 w-4 text-gray-700" /> },
                  { label: 'Accounts', href: '/wallet', icon: <Wallet className="h-4 w-4 text-gray-700" /> },
                  { label: 'Transactions', href: '/transactions', icon: <ArrowRight className="h-4 w-4 text-gray-700" /> },
                  { label: 'Refresh', href: '#', icon: <RefreshCw className="h-4 w-4 text-gray-700" /> },
                ].map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-4 text-sm font-medium text-gray-800 transition hover:border-gray-300 hover:shadow-sm"
                    onClick={(e) => item.label === 'Refresh' && (e.preventDefault(), setLoading(true), fetchData().finally(() => setLoading(false)))}
                  >
                    <span>{item.label}</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white border border-gray-200 text-gray-700">{item.icon}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm rounded-md">
              <CardHeader className="px-6 py-5 border-b border-gray-200">
                <CardTitle className="text-sm font-semibold text-gray-700">System health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">API status</p>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-lg font-medium text-gray-900">{apiStatus === 'healthy' ? 'Healthy' : apiStatus === 'degrading' ? 'Degrading' : 'Offline'}</p>
                    <span className={`h-3.5 w-3.5 rounded-full ${apiStatus === 'healthy' ? 'bg-emerald-500' : apiStatus === 'degrading' ? 'bg-amber-400' : 'bg-rose-500'}`} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Current balance</p>
                    <p className="mt-3 text-xl font-semibold text-gray-900">₱{loading ? '...' : fmt(walletBalance || 0)}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">FX rate</p>
                    <p className="mt-3 text-xl font-semibold text-gray-900">₱{exchangeRate.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </Layout>
  );
}
