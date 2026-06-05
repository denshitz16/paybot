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
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer">
             <div className="h-11 w-11 rounded-2xl bg-brandblue-500 flex items-center justify-center shadow-lg shadow-brandblue-500/20 group-hover:rotate-[10deg] transition-all duration-500">
                <img src="/logo.svg" alt="Logo" className="h-6 w-6" />
             </div>
             <div className="hidden sm:block">
               <h2 className="text-xl font-black text-foreground tracking-tighter uppercase leading-none">{APP_NAME}</h2>
               <p className="text-[9px] font-black text-brandblue-500 uppercase tracking-[0.2em] mt-1 leading-none">Philippines</p>
             </div>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <Link to="/features" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] hover:text-brand-blue-600 transition-colors">Capabilities</Link>
            <Link to="/pricing" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] hover:text-brand-blue-600 transition-colors">Pricing</Link>
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] hover:text-brand-blue-600 transition-colors">Kernel Support</a>
            <div className="h-4 w-px bg-black/[0.08] mx-2" />
            <Link to="/login">
               <Button variant="ghost" className="text-[10px] font-black uppercase tracking-[0.2em] px-6 hover:bg-muted/50 rounded-xl">Sign In</Button>
            </Link>
            <Link to="/register">
               <Button className="bg-brandblue-500 hover:bg-brandblue-600 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 h-12 rounded-2xl shadow-xl shadow-brandblue-500/30 active:scale-95 transition-all">Initialize Node</Button>
            </Link>
          </div>

          <button className="md:hidden p-2.5 rounded-xl bg-muted/50 text-foreground" onClick={() => setMobileNavOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden glass border-b border-black/5 p-8 animate-in slide-in-from-top-4 duration-500">
             <div className="flex flex-col gap-6">
                <Link to="/features" className="text-xs font-black uppercase tracking-[0.2em]">Capabilities</Link>
                <Link to="/pricing" className="text-xs font-black uppercase tracking-[0.2em]">Pricing</Link>
                <Link to="/login" className="text-xs font-black uppercase tracking-[0.2em] text-brand-blue-600">Merchant Access</Link>
                <Link to="/register">
                   <Button className="w-full bg-brandblue-500 text-white font-black rounded-2xl h-14 uppercase tracking-[0.2em] shadow-xl shadow-brandblue-500/30">Activate Merchant Node</Button>
                </Link>
             </div>
          </div>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative pt-32 lg:pt-48 pb-24 lg:pb-48 bg-[#020617] overflow-hidden">
        {/* Dynamic Background Elements */}
        <div className="absolute top-0 right-0 p-20 opacity-20 pointer-events-none animate-pulse-slow">
           <div className="h-[600px] w-[600px] rounded-full bg-brand-blue-500 blur-[150px]" />
        </div>
        <div className="absolute bottom-0 left-0 p-20 opacity-10 pointer-events-none">
           <div className="h-[400px] w-[400px] rounded-full bg-purple-500 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
           <div className="grid lg:grid-cols-12 gap-16 lg:gap-24 items-center">
              <div className="lg:col-span-7 text-center lg:text-left">
                 <div className="inline-flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] px-5 py-2.5 rounded-full backdrop-blur-md mb-10 animate-in fade-in duration-1000">
                   <Globe className="h-3.5 w-3.5 text-brand-blue-400 animate-pulse" />
                   <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Region PH-1 Protocols: Active</span>
                 </div>

                 <h1 className="text-6xl lg:text-9xl font-black text-white leading-[0.85] tracking-tighter mb-10 animate-in slide-in-from-left-8 duration-1000">
                    PHILIPPINE <br />
                    COMMERCE <br />
                    <span className="text-gradient">EVOLVED.</span>
                 </h1>

                 <p className="text-slate-400 text-xl lg:text-2xl font-medium max-w-2xl mb-14 leading-relaxed mx-auto lg:mx-0 opacity-80">
                    {APP_DESCRIPTION} Build, scale, and settle in <span className="font-black text-white underline decoration-brand-blue-500 underline-offset-4">USDT same-day</span> via our Telegram-native core.
                 </p>

                 <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
                    <Link to="/register" className="w-full sm:w-auto">
                       <Button size="lg" className="w-full h-18 px-12 bg-white text-black hover:bg-slate-100 font-black rounded-[2rem] uppercase tracking-widest shadow-2xl shadow-white/5 transition-all active:scale-95 group">
                         Start Installation <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                       </Button>
                    </Link>
                    <Link to="/features" className="w-full sm:w-auto">
                       <Button variant="outline" size="lg" className="w-full h-18 px-12 border-white/10 text-white hover:bg-white/5 font-black rounded-[2rem] uppercase tracking-widest transition-all">
                         Kernel Specs
                       </Button>
                    </Link>
                 </div>

                 <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-10 pt-10 border-t border-white/[0.05]">
                    <StatItem label="Active Nodes" value="500+" />
                    <StatItem label="Volume Capacity" value="₱2B+" />
                    <StatItem label="Clearing Cycle" value="T+0" />
                    <StatItem label="Grid Uptime" value="99.9%" />
                 </div>
              </div>

              <div className="lg:col-span-5 hidden lg:block">
                 <div className="relative animate-in zoom-in-95 duration-1000">
                    {/* High-Fidelity UI Mockup */}
                    <div className="glass border border-white/[0.08] rounded-[3.5rem] p-12 shadow-3xl relative">
                       <div className="absolute top-0 right-0 p-6 opacity-20"><Zap className="h-20 w-20 text-brand-blue-400" /></div>

                       <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-8">
                          <div className="flex items-center justify-between border-b pb-8 border-black/[0.03]">
                             <div>
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">Vault Payout Inbound</p>
                               <h3 className="text-4xl font-black text-black tracking-tighter tabular-nums">₱ 24,500.50</h3>
                             </div>
                             <div className="h-14 w-14 rounded-[1.25rem] bg-emerald-500 shadow-xl shadow-emerald-500/20 flex items-center justify-center text-white"><CheckCircle className="h-7 w-7" /></div>
                          </div>
                          <div className="space-y-5">
                             {[
                               { label: 'Source Node', val: 'DRL Solutions PH' },
                               { label: 'Clearing Engine', val: 'Kernel v2.4.0' },
                               { label: 'Settlement Pair', val: 'PHP / USDT' },
                             ].map(row => (
                               <div key={row.label} className="flex justify-between items-center text-xs font-black">
                                 <span className="text-muted-foreground/60 uppercase tracking-widest">{row.label}</span>
                                 <span className="text-black uppercase tracking-tight">{row.val}</span>
                               </div>
                             ))}
                          </div>
                          <div className="pt-6">
                             <div className="w-full h-14 bg-[#020617] rounded-2xl flex items-center justify-center font-black text-white text-[10px] uppercase tracking-[0.4em] shadow-xl shadow-black/10">Verification Protocol Success</div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* ── Capability Grid ── */}
      <section className="py-32 lg:py-48 bg-white">
        <div className="max-w-7xl mx-auto px-6">
           <div className="max-w-3xl mb-24">
              <h2 className="text-[11px] font-black text-brand-blue-600 uppercase tracking-[0.4em] mb-6">Core Infrastructure</h2>
              <h3 className="text-5xl lg:text-7xl font-black text-foreground tracking-tighter leading-[0.95]">The standard for <br />high-volume PHP liquidity.</h3>
              <p className="mt-8 text-xl text-muted-foreground font-medium opacity-70">PayBot provides the underlying layer for secure, real-time Philippine commerce.</p>
           </div>

           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
              {[
                { icon: Smartphone, title: 'Telegram Native', desc: 'Manage global invoices, payouts, and customer relations directly from your secure Telegram console.' },
                { icon: ShieldCheck, title: 'Security Kernel', desc: 'Bank-grade encryption with automated fraud detection and multi-gateway intelligent routing.' },
                { icon: Zap, title: 'Real-time Clearing', desc: 'Bridge local currency directly to global stablecoin liquidity with automated T+0 settlement cycles.' },
                { icon: BarChart3, title: 'Advanced Ledger', desc: 'Granular monitoring of every transaction node with custom export protocols for enterprise reporting.' },
                { icon: Building2, title: 'Direct Bank Bridge', desc: 'Seamless integration with InstaPay and PESONet networks, supporting 50+ local banks and wallets.' },
                { icon: MessageCircle, title: 'Automation Omni', desc: 'Event-driven webhooks and automated bot messages keep your business synchronized in real-time.' },
              ].map((f, i) => (
                <div key={i} className="p-10 rounded-[3rem] bg-[#F9FAFB] border border-black/[0.03] hover:border-brand-blue-500/20 transition-all duration-500 hover:-translate-y-2 group cursor-default">
                   <div className="h-16 w-16 rounded-[1.5rem] bg-white shadow-xl shadow-black/[0.02] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-[10deg] transition-all duration-500">
                      <f.icon className="h-8 w-8 text-brand-blue-500" />
                   </div>
                   <h4 className="text-xl font-black text-foreground uppercase tracking-tight mb-4">{f.title}</h4>
                   <p className="text-muted-foreground font-semibold text-sm leading-relaxed opacity-70">{f.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* ── Activation CTA ── */}
      <section className="py-24 lg:py-48 bg-[#F8FAFC] relative overflow-hidden">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-brand-blue-500/5 blur-[120px] pointer-events-none" />

         <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex h-20 w-20 rounded-[2rem] bg-brand-blue-500 text-white items-center justify-center shadow-3xl shadow-brand-blue-500/30 mb-12 animate-float">
               <Bot className="h-10 w-10" />
            </div>
            <h2 className="text-5xl lg:text-8xl font-black text-[#020617] tracking-tighter mb-10 leading-[0.9]">
               JOIN THE <br />NEXT GENERATION.
            </h2>
            <p className="text-slate-500 text-xl font-medium mb-16 max-w-xl mx-auto opacity-80 uppercase tracking-widest text-center">
               Activate your merchant node today and experience T+0 settlement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
               <Link to="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full h-20 px-16 bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-black rounded-full uppercase tracking-widest shadow-2xl shadow-brand-blue-500/20 active:scale-95 transition-all">Go Live in 3 Minutes</Button>
               </Link>
               <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="ghost" size="lg" className="w-full h-20 px-16 font-black uppercase tracking-widest text-muted-foreground hover:text-black transition-colors rounded-full">Sign In</Button>
               </Link>
            </div>
         </div>
      </section>

      <AppFooter />
    </div>
  );
}
