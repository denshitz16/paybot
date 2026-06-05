import { useEffect, useState, useCallback } from 'react';
import { client } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Loader2,
  CheckCircle,
  XCircle,
  Send,
  Webhook,
  Info,
  Zap,
  Radio,
  FlaskConical,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  ChevronRight,
  ChevronLeft,
  X,
  MessageSquare,
  Sparkles,
  Key,
  Settings,
  ToggleLeft,
  Terminal,
  Save,
  RotateCcw,
  Power,
  Wrench,
  ShieldCheck,
  Globe,
  Hash,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { fmt } from '@/lib/format';

const TUTORIAL_KEY = 'bot_settings_tutorial_done_v1';

interface BotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

interface TestCheck {
  name: string;
  passed: boolean;
  detail: string;
}

interface WebhookInfo {
  webhook_url: string;
  is_registered: boolean;
  pending_update_count: number;
  last_error_message: string;
  message: string;
  token_configured: boolean;
}

interface CloneBotInfo {
  configured: boolean;
  bot_name?: string;
  bot_username?: string;
  bot_id?: string;
  webhook_url?: string;
  webhook_secret?: string;
}

interface BotConfig {
  id?: number;
  bot_status: string;
  maintenance_mode: string;
  welcome_message_en: string;
  welcome_message_zh: string;
  payment_success_message: string;
  payment_failed_message: string;
  payment_pending_message: string;
  maintenance_message: string;
  commands_enabled: string;
  whatsapp_number: string;
}

const BOT_COMMANDS = [
  { cmd: '/start',      emoji: '🚀', category: 'General',   desc: 'Welcome message + language selection' },
  { cmd: '/help',       emoji: '❓', category: 'General',   desc: 'Full command reference guide' },
  { cmd: '/balance',    emoji: '💰', category: 'Wallet',    desc: 'View PHP wallet balance & history' },
  { cmd: '/wallet',     emoji: '💳', category: 'Wallet',    desc: 'Manage your wallet (Send, Top-up, Withdraw)' },
  { cmd: '/invoice',    emoji: '📄', category: 'Payments',  desc: 'Create a payment invoice' },
  { cmd: '/qr',         emoji: '📱', category: 'Payments',  desc: 'Generate a QR code payment' },
  { cmd: '/pay',        emoji: '💳', category: 'Payments',  desc: 'Interactive payment menu' },
  { cmd: '/disburse',   emoji: '💸', category: 'Transfers', desc: 'Send money to bank account' },
  { cmd: '/send',       emoji: '📤', category: 'Transfers', desc: 'Send PHP to another user' },
  { cmd: '/topup',      emoji: '⬆️', category: 'Transfers', desc: 'Top up PHP wallet via USDT' },
  { cmd: '/status',     emoji: '🔍', category: 'Tools',     desc: 'Check a payment status by ID' },
  { cmd: '/list',       emoji: '📋', category: 'Tools',     desc: 'Recent transactions list' },
  { cmd: '/report',     emoji: '📊', category: 'Tools',     desc: 'Daily / weekly / monthly report' },
];

const COMMAND_CATEGORIES = ['General', 'Wallet', 'Payments', 'Transfers', 'Tools'];

const DEFAULT_TEMPLATES = {
  welcome_message_en: `👋 Welcome to PayBot PH!\n━━━━━━━━━━━━━━━━━━━━\nHi {name}! 🎉 Your all-in-one Philippine payment gateway is ready.\n\n📄 /invoice · 📱 /qr · 🔗 /link\n💸 /disburse · 📤 /send · 💰 /wallet\n\nType /help for the full guide.`,
  welcome_message_zh: `👋 欢迎使用 PayBot PH！\n━━━━━━━━━━━━━━━━━━━━\n嗨 {name}！🎉 您的一站式菲律宾支付机器人已就绪。\n\n📄 /invoice · 📱 /qr · 🔗 /link\n💸 /disburse · 📤 /send · 💰 /wallet\n\n输入 /help 查看完整参考。`,
  payment_success_message: `✅ Payment Successful!\n━━━━━━━━━━━━━━━━━━━━\n💰 Amount: ₱{amount}\n📝 Description: {description}\n🆔 Ref: {external_id}\n\nThank you for your payment! 🎉`,
  payment_failed_message: `❌ Payment Failed\n━━━━━━━━━━━━━━━━━━━━\n💰 Amount: ₱{amount}\n📝 Description: {description}\n🆔 Ref: {external_id}\n\nPlease try again or contact support.`,
  payment_pending_message: `⏳ Payment Pending\n━━━━━━━━━━━━━━━━━━━━\n💰 Amount: ₱{amount}\n📝 Description: {description}\n🆔 Ref: {external_id}\n\nWaiting for confirmation...`,
  maintenance_message: `🛠️ Bot is under maintenance\nWe'll be back shortly. Thank you for your patience!`,
};

export default function BotSettings() {
  const { user, login } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => { if (!localStorage.getItem(TUTORIAL_KEY)) setShowTutorial(true); }, []);
  const dismissTutorial = () => { localStorage.setItem(TUTORIAL_KEY, '1'); setShowTutorial(false); };

  const [cloneToken, setCloneToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [cloneValidating, setCloneValidating] = useState(false);
  const [cloneSaving, setCloneSaving] = useState(false);
  const [cloneValidated, setCloneValidated] = useState<BotInfo | null>(null);
  const [cloneInfo, setCloneInfo] = useState<CloneBotInfo | null>(null);

  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [botLoading, setBotLoading] = useState(false);
  const [botError, setBotError] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [webhookInfoLoading, setWebhookInfoLoading] = useState(false);
  const [autoSetupLoading, setAutoSetupLoading] = useState(false);

  const [chatId, setChatId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [simType, setSimType] = useState('invoice');
  const [simStatus, setSimStatus] = useState('paid');
  const [simAmount, setSimAmount] = useState('1000');
  const [simDescription, setSimDescription] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [testChecks, setTestChecks] = useState<TestCheck[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testRan, setTestRan] = useState(false);

  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [localConfig, setLocalConfig] = useState<BotConfig>({
    bot_status: 'inactive', maintenance_mode: 'off',
    welcome_message_en: '', welcome_message_zh: '',
    payment_success_message: '', payment_failed_message: '',
    payment_pending_message: '', maintenance_message: '', commands_enabled: '',
    whatsapp_number: '',
  });

  const getErr = (e: unknown) => {
    const err = e as { data?: { detail?: string; message?: string }; message?: string };
    return err?.data?.detail || err?.data?.message || err?.message || 'Unknown error';
  };

  const is401 = (e: unknown) => {
    const err = e as { status?: number; data?: { detail?: string } };
    return err?.status === 401 || (typeof err?.data?.detail === 'string' && err.data.detail.toLowerCase().includes('unauthorized'));
  };

  const fetchBotInfo = async () => {
    setBotLoading(true); setBotError('');
    try {
      const res = await client.apiCall.invoke({ url: '/api/v1/telegram/bot-info', method: 'GET', data: {} });
      if (res.data?.success) setBotInfo(res.data.data as BotInfo);
      else setBotError(res.data?.message || 'Failed');
    } catch (e) {
      if (!is401(e)) setBotError(getErr(e));
    } finally { setBotLoading(false); }
  };

  const fetchWebhookInfo = async () => {
    setWebhookInfoLoading(true);
    try {
      const res = await client.apiCall.invoke({ url: '/api/v1/telegram/webhook-info', method: 'GET', data: {} });
      setWebhookInfo(res.data as WebhookInfo);
    } catch { /* ignore */ }
    finally { setWebhookInfoLoading(false); }
  };

  const fetchCloneInfo = async () => {
    try {
      const res = await client.apiCall.invoke({ url: '/api/v1/telegram/clone-bot/info', method: 'GET', data: {} });
      setCloneInfo(res.data as CloneBotInfo);
    } catch { /* ignore */ }
  };

  const fetchBotConfig = useCallback(async () => {
    if (!user) return;
    setConfigLoading(true);
    try {
      const res = await client.apiCall.invoke({ url: '/api/v1/telegram/bot-config', method: 'GET', data: {} });
      if (res.data?.success) { const cfg = res.data as BotConfig; setBotConfig(cfg); setLocalConfig(cfg); }
    } catch { /* ignore */ }
    finally { setConfigLoading(false); }
  }, [user]);

  useEffect(() => { fetchBotInfo(); }, []);
  useEffect(() => { if (user) { fetchWebhookInfo(); fetchCloneInfo(); fetchBotConfig(); } }, [user, fetchBotConfig]);

  const handleCloneValidate = async () => {
    if (!cloneToken.trim()) return;
    setCloneValidating(true); setCloneValidated(null);
    try {
      const res = await client.apiCall.invoke({ url: '/api/v1/telegram/clone-bot/validate', method: 'POST', data: { bot_token: cloneToken.trim() } });
      if (res.data?.success) { setCloneValidated(res.data.bot as BotInfo); toast.success('Token verified'); }
      else toast.error('Invalid token');
    } catch (e) { toast.error(getErr(e)); } finally { setCloneValidating(false); }
  };

  const handleCloneSave = async () => {
    setCloneSaving(true);
    try {
      const res = await client.apiCall.invoke({ url: '/api/v1/telegram/clone-bot/save', method: 'POST', data: { bot_token: cloneToken.trim() } });
      if (res.data?.success) { toast.success('Bot successfully cloned'); await fetchCloneInfo(); setCloneToken(''); setCloneValidated(null); }
    } catch (e) { toast.error(getErr(e)); } finally { setCloneSaving(false); }
  };

  const handleAutoSetup = async () => {
    setAutoSetupLoading(true);
    try {
      const res = await client.apiCall.invoke({ url: '/api/v1/telegram/auto-setup', method: 'POST', data: {} });
      if ((res.data as any)?.success) { toast.success('Webhook auto-registered'); await fetchWebhookInfo(); }
    } catch (e) { toast.error(getErr(e)); }
    finally { setAutoSetupLoading(false); }
  };

  const handleTestBot = async () => {
    setTestLoading(true);
    try {
      const res = await client.apiCall.invoke({ url: '/api/v1/telegram/test', method: 'GET', data: {} });
      if (res.data) {
        const checks = (res.data as any).checks;
        setTestChecks(Array.isArray(checks) ? checks : []);
        setTestRan(true);
      }
    } catch (e) { toast.error(getErr(e)); }
    finally { setTestLoading(false); }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      const res = await client.apiCall.invoke({ url: '/api/v1/telegram/bot-config', method: 'PUT', data: localConfig });
      if (res.data?.success) { const cfg = res.data as BotConfig; setBotConfig(cfg); setLocalConfig(cfg); toast.success('Settings saved'); }
    } catch (e) { toast.error(getErr(e)); }
    finally { setConfigSaving(false); }
  };

  const configChanged = JSON.stringify(localConfig) !== JSON.stringify(botConfig);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-16 space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div className="space-y-3">
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-brandblue-500/10 flex items-center justify-center border border-brandblue-500/20 shadow-inner">
                <Bot className="h-8 w-8 text-brandblue-600" />
              </div>
              Bot Intelligence
            </h1>
            <p className="text-muted-foreground font-medium flex items-center gap-3">
               <span className="flex h-2 w-2 rounded-full bg-brand-blue-500 shadow-[0_0_10px_rgba(0,122,255,0.8)]" />
               <span className="uppercase tracking-[0.2em] text-[10px] font-black">Telegram Integration Control Node</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            {localConfig.bot_status === 'active' && (
              <div className="fintech-badge bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-6 py-2.5 backdrop-blur-md shadow-sm">
                <CheckCircle className="h-4 w-4 mr-2 inline animate-pulse" /> LIVE_PRODUCTION
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowTutorial(true)} className="h-12 px-6 border-border/60 font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-muted/40 transition-all">
              <Info className="h-4 w-4 mr-2.5" /> HELP_MANUAL
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-10">
          <TabsList className="bg-[#0A0F1E] border border-white/5 p-1.5 h-auto flex-wrap sm:inline-flex gap-2 rounded-[1.5rem] shadow-2xl">
            {[
              { id: 'overview', icon: Settings, label: 'Control' },
              { id: 'messages', icon: MessageSquare, label: 'Response' },
              { id: 'commands', icon: Terminal, label: 'Protocol' },
              { id: 'testing', icon: FlaskConical, label: 'Diagnostics' },
            ].map(t => (
              <TabsTrigger key={t.id} value={t.id} className="rounded-xl py-3.5 px-8 data-[state=active]:bg-white/10 data-[state=active]:text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all text-white/30 border border-transparent data-[state=active]:border-white/10">
                <t.icon className="h-4 w-4 mr-3" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-0 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-10">
                <Card className="fintech-card border-0 shadow-2xl overflow-hidden bg-card/60 backdrop-blur-sm">
                  <div className="h-2.5 bg-brandblue-500 w-full shadow-[0_0_15px_rgba(0,122,255,0.4)]" />
                  <CardHeader className="p-10 border-b border-border/10">
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground">Authentication Token</CardTitle>
                    <CardDescription className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/40 mt-2">Deploy local bot instance via @BotFather credentials</CardDescription>
                  </CardHeader>
                  <CardContent className="p-10 space-y-10">
                    {cloneInfo?.configured && (
                      <div className="bg-[#0A0F1E] border border-white/5 rounded-3xl p-8 flex items-center justify-between shadow-inner group">
                        <div className="flex items-center gap-6">
                          <div className="h-16 w-16 rounded-[1.25rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                            <Bot className="h-8 w-8 text-emerald-400" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-base font-black text-white uppercase tracking-tight">{cloneInfo.bot_name}</p>
                              <ShieldCheck className="h-4 w-4 text-brandblue-400 fill-brandblue-400/20" />
                            </div>
                            <p className="text-[11px] font-bold text-emerald-400/60 uppercase tracking-[0.2em]">@{cloneInfo.bot_username}</p>
                          </div>
                        </div>
                        <div className="fintech-badge bg-emerald-500 text-white border-0 px-5">STATE:CONNECTED</div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">BotFather Secure Token</Label>
                      <div className="flex gap-4">
                        <div className="relative flex-1 group">
                          <Input
                            type={showToken ? 'text' : 'password'}
                            placeholder="1234567890:AAF..."
                            value={cloneToken}
                            onChange={(e) => { setCloneToken(e.target.value); setCloneValidated(null); }}
                            className="bg-muted/20 border-border/40 h-16 font-mono text-sm pr-14 rounded-2xl border-2 shadow-inner uppercase tracking-widest"
                          />
                          <button onClick={() => setShowToken(!showToken)} className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center text-muted-foreground/40 hover:text-brand-blue-500 transition-colors">
                            {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        <Button onClick={handleCloneValidate} disabled={cloneValidating || !cloneToken.trim()} variant="outline" className="h-16 border-2 border-border/40 font-black text-[11px] px-10 rounded-2xl uppercase tracking-[0.3em] hover:bg-muted/40 transition-all shadow-sm">
                          {cloneValidating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'VERIFY_NODE'}
                        </Button>
                      </div>
                    </div>

                    {cloneValidated && (
                      <div className="bg-brandblue-500/5 border-2 border-brandblue-500/20 rounded-[2rem] p-10 animate-in zoom-in-95 duration-500 shadow-xl">
                         <div className="flex items-center gap-8 mb-10">
                            <div className="h-20 w-20 rounded-[1.5rem] bg-white flex items-center justify-center shadow-2xl text-brandblue-600 border-2 border-brandblue-500/20">
                              <Sparkles className="h-10 w-10 animate-float" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xl font-black text-brandblue-900 uppercase tracking-tight">{cloneValidated.first_name}</p>
                                <ShieldCheck className="h-5 w-5 text-brandblue-600 fill-brandblue-600/10" />
                              </div>
                              <p className="text-[11px] font-bold text-brandblue-600 uppercase tracking-[0.2em]">@{cloneValidated.username}</p>
                            </div>
                         </div>
                         <Button onClick={handleCloneSave} disabled={cloneSaving} className="w-full h-20 bg-brandblue-600 hover:bg-brandblue-700 text-white font-black rounded-[1.5rem] uppercase tracking-[0.4em] shadow-2xl shadow-brandblue-500/30 transition-all active:scale-95 text-sm">
                           {cloneSaving ? <Loader2 className="h-7 w-7 animate-spin mr-3" /> : <Webhook className="h-7 w-7 mr-3" />}
                           DEPLOY INSTANCE
                         </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="fintech-card border-0 shadow-2xl overflow-hidden bg-[#0A0F1E] border-white/5">
                   <CardHeader className="p-10 border-b border-white/5">
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-white/80">Cloud Interface</CardTitle>
                    <CardDescription className="font-black text-[10px] uppercase tracking-widest text-white/20 mt-2">Real-time transmission bridge</CardDescription>
                  </CardHeader>
                  <CardContent className="p-10 space-y-8">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-inner">
                       <div className="flex items-center justify-between mb-6">
                         <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em]">Protocol Endpoint</p>
                         <div className={`px-4 py-1 rounded-full font-black text-[9px] uppercase tracking-widest border border-white/5 ${webhookInfo?.is_registered ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                           {webhookInfo?.is_registered ? 'STATE:ACTIVE' : 'STATE:ERROR'}
                         </div>
                       </div>
                       <code className="block p-6 bg-black/40 rounded-2xl text-[11px] font-black text-brandblue-400 break-all border border-white/5 tracking-widest leading-relaxed shadow-sm">
                         {webhookInfo?.webhook_url || 'ASSEMBLING_ENDPOINT...'}
                       </code>
                    </div>
                    <Button onClick={handleAutoSetup} disabled={autoSetupLoading} className="w-full h-18 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-[1.5rem] uppercase tracking-[0.3em] transition-all active:scale-95 group py-4">
                       {autoSetupLoading ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <Zap className="h-6 w-6 mr-3 text-amber-400 group-hover:scale-125 transition-transform" />}
                       REPAIR_NETWORK_BRIDGE
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-10">
                <Card className="fintech-card border-0 shadow-2xl bg-card">
                  <CardHeader className="p-8 border-b border-border/10"><CardTitle className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">Node Logic Control</CardTitle></CardHeader>
                  <CardContent className="p-8 space-y-5">
                    <div className="space-y-4">
                      {(['active', 'inactive', 'maintenance'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setLocalConfig(prev => ({ ...prev, bot_status: s }))}
                          className={`w-full p-6 rounded-[1.5rem] border-2 flex items-center justify-between transition-all duration-500 relative overflow-hidden group ${
                            localConfig.bot_status === s
                              ? 'bg-brandblue-500/5 border-brandblue-500 shadow-lg'
                              : 'bg-muted/10 border-border/40 hover:border-brandblue-500/20 hover:bg-muted/20'
                          }`}
                        >
                          <div className="text-left relative z-10">
                            <p className={`text-[11px] font-black uppercase tracking-[0.3em] ${localConfig.bot_status === s ? 'text-brandblue-600' : 'text-muted-foreground/60'}`}>{s.toUpperCase()}</p>
                            <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest mt-1">{s === 'active' ? 'Full response protocol' : s === 'maintenance' ? 'Service hold pattern' : 'Transmission halt'}</p>
                          </div>
                          {localConfig.bot_status === s && <div className="h-2 w-2 rounded-full bg-brandblue-500 shadow-[0_0_8px_rgba(0,122,255,0.8)] relative z-10" />}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="fintech-card border-0 shadow-2xl bg-[#0A0F1E] border-white/5">
                  <CardHeader className="p-8 border-b border-white/5"><CardTitle className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">Linked Services</CardTitle></CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 ml-1">WhatsApp Hub</Label>
                      <div className="relative group">
                         <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-brandblue-400 transition-colors" />
                         <Input
                           placeholder="639171234567"
                           value={localConfig.whatsapp_number}
                           onChange={e => setLocalConfig(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                           className="bg-white/5 border-white/10 h-16 text-sm font-black rounded-2xl pl-14 text-white tracking-[0.2em] shadow-inner focus:ring-brandblue-500/10 border-2"
                         />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {configChanged && (
              <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-12 duration-700">
                <div className="bg-[#0A0F1E] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] p-6 flex items-center gap-10 rounded-[2rem] min-w-[480px] backdrop-blur-3xl">
                  <div className="flex items-center gap-4">
                     <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Wrench className="h-5 w-5 text-amber-500 animate-float" />
                     </div>
                     <p className="text-white text-[11px] font-black uppercase tracking-[0.3em]">Protocol Overrides Pending</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button onClick={() => setLocalConfig(botConfig!)} variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 font-black text-[10px] uppercase tracking-widest h-12 px-6 rounded-xl transition-all">DISCARD_BIT</Button>
                    <Button onClick={handleSaveConfig} disabled={configSaving} className="bg-brandblue-600 hover:bg-brandblue-700 text-white font-black text-[10px] uppercase tracking-[0.4em] h-14 px-10 rounded-2xl shadow-2xl shadow-brandblue-500/40 transition-all active:scale-95">
                      {configSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'EMIT_CHANGES'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* MESSAGES */}
          <TabsContent value="messages" className="mt-0 space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {[
                  { field: 'welcome_message_en' as const, label: 'EN | Universal greeting', icon: <Globe className="h-4 w-4" /> },
                  { field: 'welcome_message_zh' as const, label: 'ZH | 节点欢迎词', icon: <Globe className="h-4 w-4" /> },
                  { field: 'payment_success_message' as const, label: 'SETTLEMENT_OK_EMISSION', icon: <CheckCircle className="h-4 w-4" /> },
                  { field: 'payment_pending_message' as const, label: 'CLEARANCE_AWAIT_SIGNAL', icon: <Clock className="h-4 w-4" /> },
                  { field: 'payment_failed_message' as const, label: 'TRANSMISSION_ERROR_ALERT', icon: <XCircle className="h-4 w-4" /> },
                  { field: 'maintenance_message' as const, label: 'GRID_MAINTENANCE_STATUS', icon: <Wrench className="h-4 w-4" /> },
                ].map(m => (
                  <Card key={m.field} className="fintech-card border-0 shadow-2xl overflow-hidden bg-card/40">
                    <div className="bg-muted/30 border-b border-border/10 px-8 py-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="text-brandblue-500">{m.icon}</div>
                         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">{m.label}</p>
                      </div>
                      <button onClick={() => setLocalConfig(prev => ({...prev, [m.field]: DEFAULT_TEMPLATES[m.field]}))} className="text-[9px] font-black text-brand-blue-500 uppercase tracking-widest hover:underline bg-brandblue-500/5 px-3 py-1 rounded-lg">RESTORE_DEFAULT</button>
                    </div>
                    <CardContent className="p-8">
                      <Textarea
                        value={localConfig[m.field]}
                        onChange={e => setLocalConfig(prev => ({...prev, [m.field]: e.target.value}))}
                        className="min-h-[220px] bg-muted/20 border-border/40 text-xs font-black leading-relaxed resize-none rounded-2xl p-6 border-2 shadow-inner uppercase tracking-tight focus:ring-brandblue-500/10"
                      />
                    </CardContent>
                  </Card>
                ))}
             </div>
          </TabsContent>

          {/* COMMANDS */}
          <TabsContent value="commands" className="mt-0 animate-in fade-in slide-in-from-top-4 duration-500">
             <Card className="fintech-card border-0 shadow-2xl overflow-hidden">
                <CardHeader className="p-10 bg-muted/20 border-b border-border/10">
                  <div className="flex items-center gap-5">
                     <div className="h-12 w-12 rounded-2xl bg-brandblue-500/10 flex items-center justify-center border border-brandblue-500/20 shadow-inner">
                        <Terminal className="h-6 w-6 text-brandblue-600" />
                     </div>
                     <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Active Operation Protocols</CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">Native kernel instructions for decentralized merchant management</CardDescription>
                     </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 border-t border-border/10 bg-card">
                  <div className="divide-y divide-border/10">
                    {BOT_COMMANDS.map(c => (
                      <div key={c.cmd} className="flex items-center gap-10 px-10 py-8 hover:bg-muted/10 transition-all group/cmd">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-brandblue-50 flex items-center justify-center shrink-0 border-2 border-brandblue-100 text-3xl shadow-sm group-hover/cmd:scale-110 group-hover/cmd:rotate-6 transition-all duration-500">
                          {c.emoji}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <code className="text-base font-black text-brandblue-600 bg-brandblue-500/5 px-4 py-1.5 rounded-xl tracking-tight border border-brandblue-500/10 shadow-sm">{c.cmd}</code>
                          <p className="text-[11px] text-muted-foreground/60 font-black mt-3 uppercase tracking-[0.2em]">{c.desc}</p>
                        </div>
                        <div className="fintech-badge bg-muted/20 text-muted-foreground/40 border-0 px-5 group-hover/cmd:bg-brandblue-500/10 group-hover/cmd:text-brandblue-500 transition-colors">{c.category.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
             </Card>
          </TabsContent>

          {/* TESTING */}
          <TabsContent value="testing" className="mt-0 animate-in fade-in slide-in-from-top-4 duration-500">
             <Card className="fintech-card border-0 shadow-2xl overflow-hidden bg-[#0A0F1E] border-white/5">
                <div className="h-2.5 bg-emerald-500 w-full shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                <CardHeader className="p-10 border-b border-white/5">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                       <FlaskConical className="h-7 w-7 text-emerald-400 animate-pulse" />
                    </div>
                    <div>
                       <CardTitle className="text-xl font-black uppercase tracking-tight text-white/80">Kernel Diagnostics</CardTitle>
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mt-1">Initialize global network integrity check</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-12">
                  <Button onClick={handleTestBot} disabled={testLoading} className="w-full h-20 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-[1.5rem] uppercase tracking-[0.4em] shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all text-sm group">
                    {testLoading ? <Loader2 className="h-7 w-7 animate-spin mr-3 opacity-50" /> : <FlaskConical className="h-7 w-7 mr-4 group-hover:rotate-12 transition-transform" />}
                    EXECUTE_FULL_SYSTEM_AUDIT
                  </Button>

                  {testRan && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in zoom-in-95 duration-700">
                      {Array.isArray(testChecks) && testChecks.map(check => (
                        <div key={check.name} className={`p-8 rounded-[2rem] border-2 transition-all duration-500 hover:scale-105 ${check.passed ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'bg-rose-500/5 border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]'}`}>
                           <div className="flex items-center gap-4 mb-6">
                             <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${check.passed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                {check.passed ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                             </div>
                             <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/80">{check.name.replace(/_/g, ' ')}</p>
                           </div>
                           <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-relaxed">{check.detail}</p>
                           </div>
                           <div className="mt-6 flex justify-end">
                              <div className={`text-[9px] font-black uppercase tracking-widest ${check.passed ? 'text-emerald-400' : 'text-rose-400'}`}>{check.passed ? 'STATE:OK' : 'STATE:FAIL'}</div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 animate-in fade-in duration-500">
           <Card className="max-w-xl border-0 bg-[#0A0F1E] shadow-[0_60px_120px_rgba(0,0,0,0.8)] rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-500 border-white/5">
              <div className="bg-brandblue-600 p-12 flex flex-col items-center text-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                 <div className="h-28 w-28 rounded-[2.5rem] bg-white/10 backdrop-blur-3xl flex items-center justify-center mb-10 shadow-2xl border border-white/20 relative z-10 animate-float">
                   <Sparkles className="h-14 w-14 text-white animate-pulse" />
                 </div>
                 <h2 className="text-4xl font-black text-white uppercase tracking-tighter relative z-10 mb-4">Command the Grid</h2>
                 <p className="text-brandblue-100/60 text-xs font-black uppercase tracking-[0.4em] relative z-10">Neural Control Interface v4.0</p>
              </div>
              <CardContent className="p-12 space-y-12">
                 <div className="space-y-10">
                    {[
                      { icon: Key, title: 'Network Credentials', desc: 'Secure your institutional API token from @BotFather to initialize node', color: 'text-brandblue-500' },
                      { icon: Webhook, title: 'Cloud Relay v4', desc: 'Activate automated bridging to cloud payment nodes with one-click setup', color: 'text-emerald-500' },
                      { icon: MessageSquare, title: 'Emission Logic', desc: 'Configure multi-lingual automated response sequences for EN/ZH sectors', color: 'text-amber-500' },
                    ].map((step, i) => (
                      <div key={i} className="flex gap-8 items-start group">
                         <div className="h-16 w-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center shrink-0 border border-white/10 transition-all group-hover:scale-110 group-hover:rotate-6 duration-500">
                           <step.icon className={`h-8 w-8 ${step.color}`} />
                         </div>
                         <div className="space-y-1.5">
                           <p className="text-sm font-black uppercase tracking-[0.3em] text-white/90">{step.title}</p>
                           <p className="text-[11px] font-bold text-white/30 uppercase leading-relaxed tracking-tight">{step.desc}</p>
                         </div>
                      </div>
                    ))}
                 </div>
                 <Button onClick={dismissTutorial} className="w-full h-20 bg-brandblue-600 hover:bg-brandblue-700 text-white font-black rounded-[2rem] shadow-2xl shadow-brandblue-500/40 uppercase tracking-[0.5em] transition-all active:scale-95 mt-4 text-xs">
                    INITIALIZE_SYSTEM_CORE
                 </Button>
              </CardContent>
           </Card>
        </div>
      )}
    </Layout>
  );
}
