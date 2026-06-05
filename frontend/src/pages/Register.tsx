import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, User, Phone, Mail, Building2, Send, ArrowRight, ShieldCheck, Zap, Globe, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import TelegramLoginWidget from '@/components/TelegramLoginWidget';
import { APP_NAME, COMPANY_NAME, APP_DESCRIPTION } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  business_name: string;
  telegram_username: string;
}

interface SocialConfig {
  telegram_bot_username: string;
  messenger_page_username: string;
  whatsapp_number: string;
}

const INITIAL_FORM: FormData = {
  full_name: '',
  email: '',
  phone: '',
  address: '',
  business_name: '',
  telegram_username: '',
};

export default function Register() {
  const navigate = useNavigate();
  const { loginWithTelegram } = useAuth();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [socialConfig, setSocialConfig] = useState<SocialConfig | null>(null);

  useEffect(() => {
    fetch('/api/v1/auth/social-config')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setSocialConfig(d))
      .catch(() => {});
  }, []);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Full name, email, and phone are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) setSuccess(true);
      else {
        const d = await res.json();
        setError(d.detail || 'Registration failed');
      }
    } catch { setError('Connection error'); }
    finally { setSubmitting(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brandblue-600/10 to-transparent opacity-50" />
        <div className="max-w-md w-full text-center space-y-10 animate-in fade-in zoom-in-95 duration-700 relative z-10">
          <div className="h-32 w-32 bg-emerald-500/10 rounded-[3rem] flex items-center justify-center mx-auto border-2 border-emerald-500/20 shadow-2xl animate-logo-entrance">
            <CheckCircle className="h-14 w-14 text-emerald-400" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Onboarding Complete</h2>
            <p className="text-white/40 font-black uppercase tracking-[0.3em] text-[10px] leading-loose">Your merchant node has been successfully initialized in regional cluster PH-1.</p>
          </div>
          <Button onClick={() => navigate('/login')} size="lg" className="w-full h-20 bg-brandblue-600 hover:bg-brandblue-700 text-white font-black rounded-[1.5rem] uppercase tracking-[0.4em] shadow-2xl shadow-brandblue-500/40 active:scale-95 transition-all text-xs">
            INIT_SESSION_CORE
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row font-sans">
      {/* Left: Brand Showcase */}
      <div className="lg:w-1/2 bg-[#0A0F1E] p-12 lg:p-24 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-20 pointer-events-none animate-float"><Sparkles className="h-80 w-80 text-brand-blue-500 blur-xl" /></div>
        <div className="absolute bottom-0 left-0 p-20 opacity-10 pointer-events-none animate-float-delayed"><Zap className="h-60 w-60 text-emerald-500 blur-xl" /></div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-5 mb-24 animate-in slide-in-from-left-6 duration-700 group">
            <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-2xl border border-white/10 group-hover:rotate-3 transition-transform duration-500">
               <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{APP_NAME}</h2>
                <ShieldCheck className="h-5 w-5 text-brandblue-400 fill-brandblue-400/10" />
              </div>
              <p className="text-brandblue-400 text-[11px] font-black uppercase tracking-[0.4em] mt-1.5">Philippines</p>
            </div>
          </Link>

          <h1 className="text-6xl lg:text-[7rem] font-black text-white leading-[0.85] tracking-tighter mb-12 animate-in slide-in-from-left-8 duration-1000">
            UNIFIED <br />
            COMMERCE <br />
            <span className="text-gradient">GRID.</span>
          </h1>

          <p className="text-white/40 text-xl lg:text-2xl font-medium max-w-lg mb-20 leading-relaxed opacity-90 uppercase tracking-tight">
             {APP_DESCRIPTION}
          </p>

          <div className="space-y-10">
             {[
               { icon: Globe, label: 'Global Settlement', desc: 'Accept local PHP and settle in USDT realtime.', color: 'text-brandblue-400' },
               { icon: Zap, label: 'Bot Integration', desc: 'Control your entire business via Telegram.', color: 'text-amber-400' },
               { icon: ShieldCheck, label: 'Enterprise Grade', desc: 'PCI-DSS v4.0 compliant cloud nodes.', color: 'text-emerald-400' },
             ].map((f, i) => (
               <div key={i} className="flex gap-6 items-start animate-in slide-in-from-left-10 duration-1000 group" style={{animationDelay: `${i*150}ms`}}>
                  <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-110 transition-transform duration-500"><f.icon className={`h-6 w-6 ${f.color}`} /></div>
                  <div className="space-y-1.5">
                    <p className="text-white font-black text-xs uppercase tracking-[0.3em]">{f.label}</p>
                    <p className="text-white/30 text-xs font-bold uppercase tracking-tight leading-relaxed">{f.desc}</p>
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="relative z-10 mt-24 pt-10 border-t border-white/5 flex items-center justify-between">
           <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.4em]">© {new Date().getFullYear()} {COMPANY_NAME}</p>
           <p className="text-white/10 text-[9px] font-black uppercase tracking-[0.4em]">NODE_VERSION: 4.2.0_STABLE</p>
        </div>
      </div>

      {/* Right: Registration Form */}
      <div className="flex-1 p-10 lg:p-24 flex items-center justify-center overflow-y-auto bg-white">
         <div className="max-w-lg w-full space-y-12 animate-in fade-in slide-in-from-right-8 duration-1000">
            <div className="space-y-4 text-center lg:text-left">
              <h2 className="text-5xl font-black text-[#0A0F1E] uppercase tracking-tighter">Register Node</h2>
              <p className="text-muted-foreground/60 font-black uppercase tracking-[0.3em] text-[10px]">Join the next generation of Philippine payments.</p>
            </div>

            {error && (
              <div className="bg-rose-50 border-2 border-rose-100 text-rose-600 p-6 rounded-3xl flex items-center gap-4 text-[10px] font-black uppercase tracking-widest animate-shake shadow-sm">
                <AlertCircle className="h-5 w-5" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
               <div className="space-y-4">
                 <Label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] ml-1">Master Account Holder</Label>
                 <div className="relative group">
                   <User className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-brandblue-600 transition-colors" />
                   <Input value={form.full_name} onChange={e => handleChange('full_name', e.target.value)} placeholder="LEGAL_NAME_STRING" className="pl-14 h-18 bg-muted/20 border-border/40 rounded-2xl font-black uppercase tracking-widest border-2 focus:ring-brandblue-500/10 shadow-inner" required />
                 </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] ml-1">Transmission Email</Label>
                    <Input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="VERIFIED_ENDPOINT" className="h-18 bg-muted/20 border-border/40 rounded-2xl font-bold border-2 focus:ring-brandblue-500/10 shadow-sm px-8" required />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] ml-1">Communication ID</Label>
                    <Input type="tel" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+63 9XX" className="h-18 bg-muted/20 border-border/40 rounded-2xl font-black tabular-nums tracking-[0.3em] border-2 focus:ring-brandblue-500/10 shadow-sm px-8" required />
                  </div>
               </div>

               <div className="space-y-4">
                 <Label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] ml-1">Merchant Entity Alias</Label>
                 <div className="relative group">
                   <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-brandblue-600 transition-colors" />
                   <Input value={form.business_name} onChange={e => handleChange('business_name', e.target.value)} placeholder="TRADE_NAME_OR_ENTITY" className="pl-14 h-18 bg-muted/20 border-border/40 rounded-2xl font-black uppercase tracking-widest border-2 focus:ring-brandblue-500/10 shadow-sm" />
                 </div>
               </div>

               <div className="space-y-4">
                 <Label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] ml-1">Neural ID (Telegram)</Label>
                 <div className="relative group">
                   <Send className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-brandblue-600 transition-colors" />
                   <Input value={form.telegram_username} onChange={e => handleChange('telegram_username', e.target.value)} placeholder="@HANDLE" className="pl-14 h-18 bg-muted/20 border-border/40 rounded-2xl font-black text-brandblue-600 tracking-[0.2em] border-2 focus:ring-brandblue-500/10 shadow-inner uppercase" required />
                 </div>
                 <p className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-[0.2em] px-4 leading-relaxed">Used to synchronize your account with the PayBot Kernel for institutional notifications.</p>
               </div>

               <Button type="submit" disabled={submitting} className="w-full h-20 bg-brandblue-600 hover:bg-brandblue-700 text-white font-black rounded-[2rem] uppercase tracking-[0.4em] shadow-2xl shadow-brandblue-500/30 transition-all active:scale-95 mt-10 text-xs">
                 {submitting ? <Loader2 className="h-8 w-8 animate-spin" /> : <><Sparkles className="h-6 w-6 mr-4" /> ACTIVATE_MERCHANT_NODE</>}
               </Button>
            </form>

            {socialConfig?.telegram_bot_username && (
              <div className="pt-10 border-t border-border/10 text-center">
                 <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.4em] mb-8">Fast_Track_Authorization</p>
                 <div className="flex justify-center mb-6 scale-110">
                   <TelegramLoginWidget
                     botName={socialConfig.telegram_bot_username}
                     onAuth={user => {
                       setSubmitting(true);
                       loginWithTelegram(user).finally(() => { setSubmitting(false); navigate('/'); });
                     }}
                   />
                 </div>
              </div>
            )}

            <div className="text-center pt-6">
              <p className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                Existing cluster account? <Link to="/login" className="text-brand-blue-600 hover:underline ml-2">INIT_SESSION</Link>
              </p>
            </div>
         </div>
      </div>
    </div>
  );
}
