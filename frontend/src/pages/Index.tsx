import { useEffect, useRef, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import TelegramLoginWidget from '@/components/TelegramLoginWidget';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Bot, BarChart3, Wallet, CreditCard, ShieldCheck,
  Zap, Globe, TrendingUp, DollarSign, Building2, CheckCircle2,
  MessageCircle, Bell, Users, ChevronRight, Star, Lock, Smartphone,
  PieChart, Send, RefreshCw, Receipt, Menu, X, ArrowUpRight,
  Sparkles, CheckCircle
} from 'lucide-react';
import { APP_NAME, COMPANY_NAME, SUPPORT_URL, APP_DESCRIPTION } from '@/lib/brand';
import AppFooter from '@/components/AppFooter';

/* ─── Shared Components ───────────────────────────────────────── */

function LogoBox({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`h-12 w-12 rounded-2xl bg-white shadow-lg flex items-center justify-center border border-black/5 hover:scale-110 transition-transform cursor-default ${className}`}>
      {children}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center md:text-left group">
      <p className="text-4xl font-black text-white tracking-tighter tabular-nums group-hover:scale-105 transition-transform duration-300">{value}</p>
      <p className="text-brand-blue-100 text-[10px] font-black uppercase tracking-[0.25em] opacity-60 mt-1">{label}</p>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────── */
export default function LandingPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileNavOpen] = useState(false);

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-white text-[#141414] overflow-x-hidden font-sans selection:bg-brandblue-500 selection:text-white">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/70 backdrop-blur-xl border-b border-black/[0.03]">
        <div className="max-w-7xl mx-auto px-10 h-24 flex items-center justify-between">
          <div className="flex items-center gap-5 group cursor-pointer">
             <div className="h-12 w-12 rounded-2xl bg-[#0A0F1E] flex items-center justify-center shadow-2xl shadow-brand-blue-500/20 group-hover:rotate-3 group-hover:scale-110 transition-all duration-500 border border-white/5">
                <img src="/logo.svg" alt="Logo" className="h-7 w-7 animate-logo-bounce" />
             </div>
             <div className="hidden sm:block">
               <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">{APP_NAME}</h2>
               <p className="text-[10px] font-black text-brandblue-500 uppercase tracking-[0.4em] mt-1.5 leading-none">Philippines</p>
             </div>
          </div>

          <div className="hidden md:flex items-center gap-12">
            <Link to="/features" className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] hover:text-brand-blue-600 transition-colors">CAPABILITIES</Link>
            <Link to="/pricing" className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] hover:text-brand-blue-600 transition-colors">PRICING</Link>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] hover:text-brand-blue-600 transition-colors">KERNEL_SUPPORT</a>
            <div className="h-4 w-px bg-black/[0.08] mx-4" />
            <Link to="/login">
               <Button variant="ghost" className="text-[11px] font-black uppercase tracking-[0.3em] px-8 hover:bg-muted/50 rounded-xl h-12">SIGN_IN</Button>
            </Link>
            <Link to="/register">
               <Button className="bg-[#0A0F1E] hover:bg-black text-white font-black text-[11px] uppercase tracking-[0.3em] px-10 h-14 rounded-2xl shadow-2xl active:scale-95 transition-all">INITIALIZE_NODE</Button>
            </Link>
          </div>

          <button className="md:hidden h-12 w-12 flex items-center justify-center rounded-2xl bg-muted/50 text-foreground" onClick={() => setMobileNavOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-2xl border-b border-black/5 p-10 animate-in slide-in-from-top-6 duration-500 shadow-2xl">
             <div className="flex flex-col gap-8">
                <Link to="/features" className="text-sm font-black uppercase tracking-[0.4em]">CAPABILITIES</Link>
                <Link to="/pricing" className="text-sm font-black uppercase tracking-[0.4em]">PRICING</Link>
                <Link to="/login" className="text-sm font-black uppercase tracking-[0.4em] text-brand-blue-600">MERCHANT_ACCESS</Link>
                <Link to="/register">
                   <Button className="w-full bg-[#0A0F1E] text-white font-black rounded-3xl h-18 text-xs uppercase tracking-[0.4em] shadow-2xl">ACTIVATE_MERCHANT_NODE</Button>
                </Link>
             </div>
          </div>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative pt-40 lg:pt-60 pb-32 lg:pb-60 bg-[#0A0F1E] overflow-hidden">
        {/* Advanced Background Gradients */}
        <div className="absolute top-0 right-0 p-20 opacity-30 pointer-events-none">
           <div className="h-[800px] w-[800px] rounded-full bg-brand-blue-600 blur-[180px] animate-float" />
        </div>
        <div className="absolute bottom-0 left-0 p-20 opacity-10 pointer-events-none">
           <div className="h-[500px] w-[500px] rounded-full bg-emerald-500 blur-[150px] animate-float-delayed" />
        </div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-10 relative z-10">
           <div className="grid lg:grid-cols-12 gap-20 lg:gap-32 items-center">
              <div className="lg:col-span-7 text-center lg:text-left">
                 <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-full backdrop-blur-3xl mb-12 animate-in fade-in duration-1000 shadow-2xl">
                   <Globe className="h-4 w-4 text-brand-blue-400 animate-pulse" />
                   <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em]">GRID_STATUS: OPERATIONAL — PH-SE-ASIA</span>
                 </div>

                 <h1 className="text-7xl lg:text-[10rem] font-black text-white leading-[0.85] tracking-tighter mb-12 animate-in slide-in-from-left-12 duration-1000">
                    PH_CORE <br />
                    LEDGER <br />
                    <span className="text-gradient">EVOLVED.</span>
                 </h1>

                 <p className="text-white/40 text-xl lg:text-2xl font-medium max-w-2xl mb-16 leading-relaxed mx-auto lg:mx-0 uppercase tracking-tight">
                    {APP_DESCRIPTION} Deploy nodes, scale liquidity, and settle in <span className="text-white font-black underline decoration-brand-blue-500 decoration-4 underline-offset-8">USDT_REALTIME</span> via our Telegram-native protocol.
                 </p>

                 <div className="flex flex-col sm:flex-row items-center gap-8 justify-center lg:justify-start">
                    <Link to="/register" className="w-full sm:w-auto">
                       <Button size="lg" className="w-full h-20 px-16 bg-white text-[#0A0F1E] hover:bg-slate-100 font-black rounded-[2.5rem] uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(255,255,255,0.1)] transition-all active:scale-95 group text-xs">
                         INITIATE_ONBOARDING <ArrowRight className="ml-4 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                       </Button>
                    </Link>
                    <Link to="/features" className="w-full sm:w-auto">
                       <Button variant="ghost" size="lg" className="w-full h-20 px-16 border-2 border-white/5 text-white hover:bg-white/5 font-black rounded-[2.5rem] uppercase tracking-[0.4em] transition-all text-xs">
                         KERNEL_SPECS
                       </Button>
                    </Link>
                 </div>

                 <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-12 pt-16 border-t border-white/5">
                    <StatItem label="NETWORK_NODES" value="500+" />
                    <StatItem label="VOLUME_CAPACITY" value="₱2B+" />
                    <StatItem label="CLEARING_CYCLE" value="T+0" />
                    <StatItem label="GRID_UPTIME" value="99.9%" />
                 </div>
              </div>

              <div className="lg:col-span-5 hidden lg:block">
                 <div className="relative animate-in zoom-in-95 duration-1000">
                    {/* High-Fidelity UI Terminal Mockup */}
                    <div className="fintech-card bg-black/40 border border-white/10 rounded-[4rem] p-1 shadow-[0_50px_100px_rgba(0,0,0,0.6)] backdrop-blur-3xl relative group">
                       <div className="absolute inset-0 bg-gradient-to-br from-brandblue-500/10 to-transparent rounded-[4rem] pointer-events-none" />

                       <div className="p-12 space-y-12">
                          <div className="flex items-center justify-between border-b border-white/10 pb-10">
                             <div className="space-y-3">
                               <div className="flex items-center gap-3">
                                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">VAULT_INBOUND_SIGNAL</p>
                               </div>
                               <h3 className="text-5xl font-black text-white tracking-tighter tabular-nums">₱ 24,500.50</h3>
                             </div>
                             <div className="h-20 w-20 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-2xl animate-logo-bounce">
                                <CheckCircle className="h-10 w-10" />
                             </div>
                          </div>
                          <div className="space-y-6">
                             {[
                               { label: 'Source Node', val: 'DRL_SOLUTIONS_PH', color: 'text-white/60' },
                               { label: 'Clearing Engine', val: 'KERNEL_V4.2.0', color: 'text-brandblue-400' },
                               { label: 'Settlement Pair', val: 'PHP / USDT_TRC20', color: 'text-emerald-400' },
                             ].map(row => (
                               <div key={row.label} className="flex justify-between items-center text-xs font-black group/row">
                                 <span className="text-white/20 uppercase tracking-[0.3em] group-hover/row:text-white/40 transition-colors">{row.label}</span>
                                 <span className={`${row.color} uppercase tracking-tight group-hover/row:scale-105 transition-transform`}>{row.val}</span>
                               </div>
                             ))}
                          </div>
                          <div className="pt-10">
                             <div className="w-full h-18 bg-white/5 border border-white/10 rounded-[1.5rem] flex items-center justify-center font-black text-white/60 text-[10px] uppercase tracking-[0.5em] shadow-inner group-hover:bg-white/10 transition-all cursor-default">
                                <ShieldCheck className="h-4 w-4 mr-4 text-emerald-400" />
                                VERIFICATION_PROTOCOL_OK
                             </div>
                          </div>
                       </div>
                    </div>
                    {/* Floating Accent Cards */}
                    <div className="absolute -top-10 -left-10 h-32 w-32 bg-brandblue-500/20 rounded-[2rem] blur-2xl animate-pulse" />
                    <div className="absolute -bottom-10 -right-10 h-40 w-40 bg-emerald-500/10 rounded-[2rem] blur-3xl animate-float-delayed" />
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* ── Capability Grid ── */}
      <section className="py-40 lg:py-60 bg-white">
        <div className="max-w-7xl mx-auto px-10">
           <div className="max-w-4xl mb-32">
              <h2 className="text-[12px] font-black text-brand-blue-600 uppercase tracking-[0.5em] mb-8">Infrastructure_Protocol</h2>
              <h3 className="text-6xl lg:text-9xl font-black text-[#0A0F1E] tracking-tighter leading-[0.9] uppercase">The new standard for <br /><span className="text-brand-blue-600">institutional</span> PHP liquidity.</h3>
              <p className="mt-12 text-2xl text-muted-foreground font-black uppercase tracking-tight opacity-40 leading-relaxed">PayBot provides the underlying transmission layer for secure, real-time Philippine commerce cycles.</p>
           </div>

           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
              {[
                { icon: Smartphone, title: 'Telegram Native', desc: 'Manage global invoices, payouts, and customer relations directly from your secure Telegram console node.' },
                { icon: ShieldCheck, title: 'Security Kernel', desc: 'Bank-grade encryption with automated fraud detection and multi-gateway intelligent routing protocols.' },
                { icon: Zap, title: 'Real-time Clearing', desc: 'Bridge local currency directly to global stablecoin liquidity with automated T+0 settlement cycles.' },
                { icon: BarChart3, title: 'Advanced Ledger', desc: 'Granular monitoring of every transaction node with custom export protocols for enterprise-level reporting.' },
                { icon: Building2, title: 'Direct Bank Bridge', desc: 'Native integration with InstaPay and PESONet networks, supporting all major Philippine bank entities.' },
                { icon: MessageCircle, title: 'Automation Omni', desc: 'Event-driven webhooks and automated bot messages keep your entire business synchronized in real-time.' },
              ].map((f, i) => (
                <div key={i} className="p-12 rounded-[3.5rem] bg-[#F8FAFC] border border-black/[0.03] hover:border-brand-blue-500/30 transition-all duration-700 hover:-translate-y-3 group cursor-default shadow-sm hover:shadow-2xl">
                   <div className="h-20 w-20 rounded-3xl bg-white shadow-2xl flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 border border-black/5">
                      <f.icon className="h-10 w-10 text-brand-blue-500" />
                   </div>
                   <h4 className="text-2xl font-black text-[#0A0F1E] uppercase tracking-tighter mb-6 group-hover:text-brandblue-600 transition-colors">{f.title}</h4>
                   <p className="text-muted-foreground font-bold text-sm leading-relaxed opacity-60 uppercase tracking-tight">{f.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* ── Activation CTA ── */}
      <section className="py-40 lg:py-60 bg-[#0A0F1E] relative overflow-hidden">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-full bg-brand-blue-500/10 blur-[150px] pointer-events-none animate-pulse" />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none" />

         <div className="max-w-5xl mx-auto px-10 text-center relative z-10">
            <div className="inline-flex h-24 w-24 rounded-[2.5rem] bg-white text-[#0A0F1E] items-center justify-center shadow-[0_30px_60px_rgba(255,255,255,0.1)] mb-16 animate-float border-4 border-brandblue-500/20">
               <Bot className="h-12 w-12" />
            </div>
            <h2 className="text-6xl lg:text-9xl font-black text-white tracking-tighter mb-14 leading-[0.85] uppercase">
               JOIN THE <br />NEXT <span className="text-gradient">GENERATION.</span>
            </h2>
            <p className="text-white/30 text-xl font-black mb-20 max-w-2xl mx-auto uppercase tracking-[0.4em] text-center leading-loose">
               Activate your merchant node today and experience institutional T+0 settlement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
               <Link to="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full h-24 px-20 bg-white text-[#0A0F1E] hover:bg-slate-100 font-black rounded-full uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all text-xs">GO_LIVE_3_MIN</Button>
               </Link>
               <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="ghost" size="lg" className="w-full h-24 px-20 font-black uppercase tracking-[0.4em] text-white/30 hover:text-white transition-colors rounded-full border border-white/5 hover:bg-white/5 text-xs">INIT_SESSION</Button>
               </Link>
            </div>
         </div>
      </section>

      <AppFooter />
    </div>
  );
}
