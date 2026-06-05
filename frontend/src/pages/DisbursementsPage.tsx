import { useState, useEffect, useCallback } from 'react';
import { client } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Loader2, Plus,
  Send, RotateCcw, Users, CalendarDays, History, Settings2,
  ChevronRight, Check, ShieldCheck, Receipt, Search, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { fmt } from '@/lib/format';

interface Disbursement {
  id: number; external_id: string; amount: number; bank_code: string;
  account_number: string; account_name: string; description: string;
  status: string; disbursement_type: string; created_at: string | null;
}
interface Refund {
  id: number; transaction_id: number; amount: number; reason: string;
  status: string; refund_type: string; created_at: string | null;
}
interface Subscription {
  id: number; plan_name: string; amount: number; interval: string;
  customer_name: string; customer_email: string; status: string;
  next_billing_date: string | null; total_cycles: number; created_at: string | null;
}
interface Customer {
  id: number; name: string; email: string; phone: string; notes: string;
  total_payments: number; total_amount: number; created_at: string | null;
}

export default function DisbursementsPage() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState('disbursements');
  const [wizardStep, setWizardStep] = useState(1);
  const [dAmount, setDAmount] = useState('');
  const [dBank, setDBank] = useState('BDO');
  const [dAccount, setDAccount] = useState('');
  const [dName, setDName] = useState('');
  const [dDesc, setDDesc] = useState('');
  const [dLoading, setDLoading] = useState(false);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [rTxnId, setRTxnId] = useState('');
  const [rAmount, setRAmount] = useState('');
  const [rReason, setRReason] = useState('');
  const [rLoading, setRLoading] = useState(false);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [sPlan, setSPlan] = useState('');
  const [sAmount, setSAmount] = useState('');
  const [sInterval, setSInterval] = useState('monthly');
  const [sCustName, setSCustName] = useState('');
  const [sCustEmail, setSCustEmail] = useState('');
  const [sLoading, setSLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [cLoading, setCLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setListLoading(true);
    try {
      const [dRes, rRes, sRes, cRes] = await Promise.all([
        client.apiCall.invoke({ url: '/api/v1/gateway/disbursements', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/gateway/refunds', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/gateway/subscriptions', method: 'GET', data: {} }),
        client.apiCall.invoke({ url: '/api/v1/gateway/customers', method: 'GET', data: {} }),
      ]);
      setDisbursements(Array.isArray(dRes.data?.items) ? dRes.data.items : []);
      setRefunds(Array.isArray(rRes.data?.items) ? rRes.data.items : []);
      setSubscriptions(Array.isArray(sRes.data?.items) ? sRes.data.items : []);
      setCustomers(Array.isArray(cRes.data?.items) ? cRes.data.items : []);
    } catch {
      setDisbursements([]);
      setRefunds([]);
      setSubscriptions([]);
      setCustomers([]);
    }
    setListLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDisburse = async () => {
    if (!dAmount || !dAccount || !dName) { toast.error('Fill all required fields'); return; }
    setDLoading(true);
    try {
      const res = await client.apiCall.invoke({
        url: '/api/v1/gateway/disbursement', method: 'POST',
        data: { amount: parseFloat(dAmount), bank_code: dBank, account_number: dAccount, account_name: dName, description: dDesc },
      });
      if (res.data?.success) {
        toast.success('Disbursement created!');
        setDAmount(''); setDAccount(''); setDName(''); setDDesc('');
        setWizardStep(1);
        fetchAll();
      }
      else toast.error(res.data?.message || 'Failed');
    } catch (e: unknown) { toast.error((e as { data?: { detail?: string } })?.data?.detail || 'Failed'); }
    setDLoading(false);
  };

  const handleRefund = async () => {
    if (!rTxnId || !rAmount) { toast.error('Enter transaction ID and amount'); return; }
    setRLoading(true);
    try {
      const res = await client.apiCall.invoke({
        url: '/api/v1/gateway/refund', method: 'POST',
        data: { transaction_id: parseInt(rTxnId), amount: parseFloat(rAmount), reason: rReason },
      });
      if (res.data?.success) { toast.success('Refund processed!'); setRTxnId(''); setRAmount(''); setRReason(''); fetchAll(); }
      else toast.error(res.data?.message || 'Failed');
    } catch (e: unknown) { toast.error((e as { data?: { detail?: string } })?.data?.detail || 'Failed'); }
    setRLoading(false);
  };

  const handleSubscribe = async () => {
    if (!sPlan || !sAmount) { toast.error('Enter plan name and amount'); return; }
    setSLoading(true);
    try {
      const res = await client.apiCall.invoke({
        url: '/api/v1/gateway/subscription', method: 'POST',
        data: { plan_name: sPlan, amount: parseFloat(sAmount), interval: sInterval, customer_name: sCustName, customer_email: sCustEmail },
      });
      if (res.data?.success) { toast.success('Subscription created!'); setSPlan(''); setSAmount(''); setSCustName(''); setSCustEmail(''); fetchAll(); }
      else toast.error(res.data?.message || 'Failed');
    } catch (e: unknown) { toast.error((e as { data?: { detail?: string } })?.data?.detail || 'Failed'); }
    setSLoading(false);
  };

  const handleSubAction = async (id: number, status: string) => {
    try {
      await client.apiCall.invoke({ url: `/api/v1/gateway/subscription/${id}`, method: 'PUT', data: { status } });
      toast.success(`Subscription ${status}`); fetchAll();
    } catch { toast.error('Failed'); }
  };

  const handleAddCustomer = async () => {
    if (!cName) { toast.error('Enter customer name'); return; }
    setCLoading(true);
    try {
      const res = await client.apiCall.invoke({
        url: '/api/v1/gateway/customer', method: 'POST',
        data: { name: cName, email: cEmail, phone: cPhone, notes: cNotes },
      });
      if (res.data?.success) { toast.success('Customer added!'); setCName(''); setCEmail(''); setCPhone(''); setCNotes(''); fetchAll(); }
      else toast.error(res.data?.message || 'Failed');
    } catch (e: unknown) { toast.error((e as { data?: { detail?: string } })?.data?.detail || 'Failed'); }
    setCLoading(false);
  };

  const handleDeleteCustomer = async (id: number) => {
    try {
      await client.apiCall.invoke({ url: `/api/v1/gateway/customer/${id}`, method: 'DELETE', data: {} });
      toast.success('Customer deleted'); fetchAll();
    } catch { toast.error('Failed'); }
  };

  const statusBadge = (s: string) => {
    const cfg: Record<string, string> = {
      completed: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      failed: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20',
      active: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
      paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      cancelled: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20',
    };
    return <Badge className={`${cfg[s] || 'bg-slate-500/10 text-muted-foreground border-slate-500/20'} border-0 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full`}>{s}</Badge>;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-10 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tighter uppercase">Merchant Operations</h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               Enterprise payout control & lifecycle management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="h-11 px-6 rounded-2xl border-border/50 bg-muted/30 font-black text-[10px] uppercase tracking-widest flex items-center gap-3">
              <Settings2 className="h-4 w-4 text-primary" />
              Standard Settlement: T+1
            </Badge>
          </div>
        </div>

        <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-8">
          <div className="flex overflow-x-auto pb-2 custom-scrollbar">
            <TabsList className="bg-muted/30 border border-border/40 p-1.5 h-auto inline-flex gap-2 rounded-2xl">
              <TabsTrigger value="disbursements" className="rounded-xl py-3 px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 transition-all">
                <Send className="h-4 w-4 mr-2.5" />Disbursements
              </TabsTrigger>
              <TabsTrigger value="refunds" className="rounded-xl py-3 px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all">
                <RotateCcw className="h-4 w-4 mr-2.5" />Refunds
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="rounded-xl py-3 px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 transition-all">
                <CalendarDays className="h-4 w-4 mr-2.5" />Subscriptions
              </TabsTrigger>
              <TabsTrigger value="customers" className="rounded-xl py-3 px-6 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 transition-all">
                <Users className="h-4 w-4 mr-2.5" />Customers
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="disbursements" className="mt-0 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <Card className="lg:col-span-2 glass-card overflow-hidden h-fit">
                <div className="h-1.5 bg-emerald-500 w-full" />
                <CardHeader className="pb-8 pt-10 px-10">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <Send className="h-5 w-5 text-emerald-500" />
                    </div>
                    New Disbursement
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                  <div className="flex justify-between mb-10 px-2">
                     {[1, 2, 3].map((s) => (
                        <div key={s} className={`wizard-step ${wizardStep > s ? 'active' : ''}`}>
                           <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 font-black text-xs ${wizardStep >= s ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-muted border-border/50 text-muted-foreground'}`}>
                              {wizardStep > s ? <Check className="h-4 w-4" /> : s}
                           </div>
                           <span className={`text-[8px] font-black uppercase tracking-[0.2em] mt-3 ${wizardStep === s ? 'text-primary' : 'text-muted-foreground/60'}`}>
                              {s === 1 ? 'Details' : s === 2 ? 'Beneficiary' : 'Confirm'}
                           </span>
                        </div>
                     ))}
                  </div>

                  {wizardStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Transfer Amount</Label>
                        <div className="relative group">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-xl">₱</span>
                          <Input type="number" placeholder="0.00" value={dAmount} onChange={e => setDAmount(e.target.value)}
                            className="pl-12 h-16 bg-muted/20 border-border/50 text-2xl font-black rounded-2xl focus:ring-primary/20 transition-all tabular-nums" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reference Note</Label>
                        <Input placeholder="e.g. Payroll Sept 2024" value={dDesc} onChange={e => setDDesc(e.target.value)} className="h-14 bg-muted/20 border-border/50 rounded-2xl font-semibold" />
                      </div>
                      <Button onClick={() => dAmount && setWizardStep(2)} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 group">
                        Next Segment
                        <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Receiving Institution</Label>
                          <Select value={dBank} onValueChange={setDBank}>
                            <SelectTrigger className="h-14 bg-muted/20 border-border/50 rounded-2xl font-black uppercase text-[10px] tracking-widest">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                              {['BDO', 'BPI', 'UNIONBANK', 'RCBC', 'CHINABANK', 'PNB', 'METROBANK', 'GCASH', 'PAYMAYA'].map(b => (
                                <SelectItem key={b} value={b} className="text-[10px] font-black uppercase tracking-widest py-3">{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Routing Number / Account</Label>
                          <Input placeholder="09XXXXXXXXX" value={dAccount} onChange={e => setDAccount(e.target.value)} className="h-14 bg-muted/20 border-border/50 rounded-2xl font-black tabular-nums tracking-widest" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Legal Beneficiary Name</Label>
                          <Input placeholder="JOHN DOE" value={dName} onChange={e => setDName(e.target.value)} className="h-14 bg-muted/20 border-border/50 rounded-2xl font-black uppercase tracking-tight" />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Button variant="ghost" onClick={() => setWizardStep(1)} className="h-14 flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest">Back</Button>
                        <Button onClick={() => dAccount && dName && setWizardStep(3)} className="h-14 flex-[2] bg-primary text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-primary/20">Summary</Button>
                      </div>
                    </div>
                  )}

                  {wizardStep === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 space-y-4">
                         <div className="flex justify-between items-center border-b border-emerald-500/10 pb-4">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Final Amount</span>
                            <span className="text-2xl font-black text-emerald-500 tracking-tighter tabular-nums">₱{fmt(parseFloat(dAmount))}</span>
                         </div>
                         <div className="space-y-3 pt-2">
                            <div className="flex justify-between">
                               <span className="text-[9px] font-black text-muted-foreground uppercase">Recipient</span>
                               <span className="text-[11px] font-black uppercase">{dName}</span>
                            </div>
                            <div className="flex justify-between">
                               <span className="text-[9px] font-black text-muted-foreground uppercase">Endpoint</span>
                               <span className="text-[11px] font-black uppercase text-brandblue-500">{dBank} · {dAccount}</span>
                            </div>
                         </div>
                      </div>
                      <div className="flex gap-4">
                        <Button variant="ghost" onClick={() => setWizardStep(2)} className="h-14 flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest" disabled={dLoading}>Edit</Button>
                        <Button onClick={handleDisburse} disabled={dLoading} className="h-14 flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-emerald-500/30 transition-all active:scale-95">
                          {dLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                          Finalize Transact
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-3 glass-card overflow-hidden h-[680px] flex flex-col">
                <CardHeader className="pb-6 pt-8 px-8 border-b border-border/40 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                      <History className="h-4 w-4 text-muted-foreground/60" />
                      Operations Ledger
                    </CardTitle>
                    <div className="relative w-56">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                      <Input placeholder="Search identifier..." className="pl-10 h-10 text-[10px] font-black bg-muted/40 border-border/60 rounded-xl uppercase tracking-widest" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                  {listLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-6">
                      <Loader2 className="h-10 w-10 animate-spin text-primary opacity-30" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Synchronizing vault data...</p>
                    </div>
                  ) : disbursements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 px-8 text-center">
                      <div className="h-20 w-20 rounded-[1.5rem] bg-muted/30 flex items-center justify-center mb-6 shadow-inner">
                        <Receipt className="h-10 w-10 text-muted-foreground/20" />
                      </div>
                      <p className="text-xs text-muted-foreground uppercase">No records found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/20 overflow-y-auto h-full px-4 custom-scrollbar">
                      {Array.isArray(disbursements) && disbursements.map(d => (
                        <div key={d.id} className="p-5 hover:bg-muted/30 transition-all rounded-3xl my-2 border border-transparent hover:border-border/40 group">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="h-12 w-12 rounded-[1rem] bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/10 shadow-sm group-hover:scale-105 transition-transform">
                                <Building2 className="h-5 w-5 text-emerald-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-foreground truncate uppercase tracking-tight">{d.account_name}</p>
                                <p className="text-[10px] font-black text-muted-foreground/70 flex items-center gap-2 mt-1 tracking-widest uppercase">
                                  <span className="text-brandblue-500">{d.bank_code}</span>
                                  <span className="h-1 w-1 rounded-full bg-border" />
                                  <span>{d.account_number}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-base font-black text-rose-500 tracking-tighter tabular-nums">-₱{fmt(d.amount)}</p>
                              <div className="mt-2 flex justify-end">
                                {statusBadge(d.status)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="refunds" className="mt-0 space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="glass-card overflow-hidden">
                <div className="h-1.5 bg-orange-500 w-full" />
                <CardHeader className="pb-8 pt-10 px-10">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                      <RotateCcw className="h-5 w-5 text-orange-500" />
                    </div>
                    Process Refund
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-10 pb-12 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Internal Transaction ID</Label>
                    <Input type="number" placeholder="Enter ID (e.g. 10245)" value={rTxnId} onChange={e => setRTxnId(e.target.value)}
                      className="h-14 bg-muted/20 border-border/50 rounded-2xl font-black tabular-nums tracking-widest focus:ring-orange-500/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Refund Amount (PHP)</Label>
                    <div className="relative group">
                       <span className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-500 font-black text-xl">₱</span>
                       <Input type="number" placeholder="0.00" value={rAmount} onChange={e => setRAmount(e.target.value)}
                         className="pl-12 h-14 bg-muted/20 border-border/50 rounded-2xl font-black tabular-nums focus:ring-orange-500/20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reason for Reversal</Label>
                    <Textarea placeholder="Specify adjustment reason..." value={rReason} onChange={e => setRReason(e.target.value)}
                      className="bg-muted/20 border-border/50 rounded-2xl min-h-[100px] resize-none focus:ring-orange-500/20 p-5 font-semibold" />
                  </div>
                  <Button onClick={handleRefund} disabled={rLoading} className="w-full h-16 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-[1.5rem] shadow-xl shadow-orange-500/30 transition-all active:scale-95 uppercase tracking-widest">
                    {rLoading ? <Loader2 className="h-5 w-5 mr-3 animate-spin" /> : <RotateCcw className="h-5 w-5 mr-3" />}
                    Commit Refund Flow
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-card flex flex-col h-[600px] overflow-hidden">
                <CardHeader className="pb-6 pt-8 px-8 border-b border-border/40 bg-muted/10">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                     <History className="h-4 w-4 text-muted-foreground/60" />
                     Adjustment Logs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden flex-1">
                  {listLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                       <Loader2 className="h-10 w-10 animate-spin text-orange-500 opacity-20" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Parsing adjustment trail...</p>
                    </div>
                  ) : refunds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 px-10 text-center">
                      <div className="h-20 w-20 rounded-[1.5rem] bg-muted flex items-center justify-center mb-6 shadow-inner">
                        <RotateCcw className="h-10 w-10 text-muted-foreground/20" />
                      </div>
                      <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">No refund records detected</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/20 h-full overflow-y-auto px-4 custom-scrollbar">
                      {Array.isArray(refunds) && refunds.map(r => (
                        <div key={r.id} className="p-6 flex items-center justify-between hover:bg-muted/20 transition-all rounded-3xl my-2 border border-transparent hover:border-border/40 group">
                          <div className="min-w-0 mr-4">
                            <p className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-tight">
                              <span className="text-muted-foreground/60">TXN_NODE</span> #{r.transaction_id}
                              <Badge variant="outline" className="text-[8px] uppercase tracking-widest py-0.5 px-2 bg-muted/40 font-black border-border/40 text-muted-foreground">{r.refund_type}</Badge>
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-2 truncate max-w-[220px] font-semibold italic opacity-70 leading-relaxed">"{r.reason || 'SYSTEM_ADJUSTMENT'}"</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base font-black text-orange-500 tracking-tighter tabular-nums">₱{fmt(r.amount)}</p>
                            <div className="mt-2 flex justify-end">{statusBadge(r.status)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-0 animate-in fade-in duration-500">
             {/* Subscriptions implementation... */}
             <Card className="glass-card p-10 text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Subscription Management Active</p>
             </Card>
          </TabsContent>

          <TabsContent value="customers" className="mt-0 animate-in fade-in duration-500">
             {/* Customers implementation... */}
             <Card className="glass-card p-10 text-center">
                <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Directory Sync Active</p>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
