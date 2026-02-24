import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: 'sms',
    title: 'SMS Auto-Verification',
    desc: 'Clients paste their MTN MoMo confirmation SMS and we extract the amount, recipient, and transaction ID automatically.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: 'shield',
    title: 'Three-Layer Validation',
    desc: 'Every payment is checked for duplicates, recipient match, and date window — giving each transaction a trust level.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: 'calendar',
    title: 'Automated Payout Scheduling',
    desc: 'Set your rotation cycle once. SusuPay computes payout dates, tracks positions, and notifies members automatically.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: 'phone',
    title: 'Works on Any Phone',
    desc: 'USSD fallback for feature phones. Members without smartphones can check balances and history via short codes.',
    color: 'bg-amber-100 text-amber-600',
    comingSoon: true,
  },
  {
    icon: 'bell',
    title: 'Real-Time Notifications',
    desc: 'Instant push notifications when payments are confirmed, queried, or when your payout is approaching.',
    color: 'bg-rose-100 text-rose-600',
  },
  {
    icon: 'users',
    title: 'Group Transparency',
    desc: 'Every member can see deposit counts, balances, and rotation positions — building trust without exposing private info.',
    color: 'bg-teal-100 text-teal-600',
  },
] as const;

const STEPS = [
  {
    num: 1,
    title: 'Create Your Group',
    desc: 'Register as a collector, set your payout cycle, and share your invite code with members.',
  },
  {
    num: 2,
    title: 'Clients Pay via MoMo',
    desc: 'Members send mobile money to your number and paste the confirmation SMS in the app.',
  },
  {
    num: 3,
    title: 'Payments Auto-Verified',
    desc: 'SusuPay validates every transaction, updates balances instantly, and schedules payouts on time.',
  },
] as const;

const AUDIENCES = [
  {
    icon: 'briefcase',
    title: 'Susu Collectors',
    desc: 'Replace your notebook with a digital dashboard. Verify payments in seconds, not hours.',
  },
  {
    icon: 'shopping',
    title: 'Market Women & Traders',
    desc: 'Save daily from your stall without worrying about lost receipts or disputed amounts.',
  },
  {
    icon: 'group',
    title: 'Savings Groups & Cooperatives',
    desc: 'Coordinate rotating contributions across dozens of members with full transparency.',
  },
  {
    icon: 'heart',
    title: 'Anyone Who Saves',
    desc: 'Whether you save GHS 5 or GHS 500 a day, SusuPay keeps every cedi accounted for.',
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Icon helper                                                        */
/* ------------------------------------------------------------------ */

function Icon({ name, className = 'w-6 h-6' }: { name: string; className?: string }) {
  const props = { className, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 };
  switch (name) {
    case 'sms':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h2" />
        </svg>
      );
    case 'shopping':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    case 'group':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case 'x':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LandingPage() {
  const { isAuthenticated, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isAuthenticated) {
    const path = role === 'COLLECTOR' ? '/collector/dashboard' : '/client/dashboard';
    return <Navigate to={path} replace />;
  }

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <span className="text-xl font-bold text-primary-600 tracking-tight">SusuPay</span>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('features')} className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">Features</button>
            <button onClick={() => scrollTo('how-it-works')} className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">How It Works</button>
            <button onClick={() => scrollTo('who-its-for')} className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">Who It's For</button>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/client/login" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">Client Login</Link>
            <Link to="/collector/login" className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">Collector Login</Link>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 -mr-2 text-gray-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Icon name={mobileMenuOpen ? 'x' : 'menu'} className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t shadow-lg">
            <div className="px-4 py-3 space-y-2">
              <button onClick={() => scrollTo('features')} className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Features</button>
              <button onClick={() => scrollTo('how-it-works')} className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">How It Works</button>
              <button onClick={() => scrollTo('who-its-for')} className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Who It's For</button>
              <hr className="my-2" />
              <Link to="/client/login" className="block w-full text-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Client Login</Link>
              <Link to="/collector/login" className="block w-full text-center px-3 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Collector Login</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-32 overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50">
        {/* Decorative blobs */}
        <div className="absolute top-10 -left-20 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            {/* Text column */}
            <div className="text-center lg:text-left mb-12 lg:mb-0">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
                Your Susu Group,{' '}
                <span className="text-primary-600">Digitized</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto lg:mx-0">
                Replace handwritten notebooks and WhatsApp screenshots with automatic SMS verification,
                real-time balances, and scheduled payouts — all from your phone.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/collector/register"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-600/25 transition-all"
                >
                  Get Started as Collector
                </Link>
                <Link
                  to="/client/login"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-primary-700 bg-white border-2 border-primary-200 rounded-xl hover:border-primary-400 transition-all"
                >
                  Check Your Savings
                </Link>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-[280px] h-[560px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl" />
                {/* Screen */}
                <div className="w-full h-full bg-white rounded-[2.25rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-6 pt-4 pb-2">
                    <span className="text-[10px] font-semibold text-gray-400">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-2 bg-gray-300 rounded-sm" />
                      <div className="w-3 h-2 bg-gray-300 rounded-sm" />
                      <div className="w-4 h-2 bg-green-400 rounded-sm" />
                    </div>
                  </div>
                  {/* App header */}
                  <div className="px-5 pt-2 pb-3">
                    <p className="text-[10px] text-gray-400">Good morning,</p>
                    <p className="text-sm font-bold text-gray-900">Kwame A.</p>
                  </div>
                  {/* Balance card */}
                  <div className="mx-4 p-4 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl text-white">
                    <p className="text-[10px] text-primary-200">Total Group Balance</p>
                    <p className="text-2xl font-bold mt-1">GHS 12,450.00</p>
                    <div className="flex justify-between mt-3 text-[10px] text-primary-200">
                      <span>23 members</span>
                      <span>Day 18 of 30</span>
                    </div>
                  </div>
                  {/* Pending payments */}
                  <div className="px-5 pt-4">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pending</p>
                    {[
                      { name: 'Ama S.', amount: 'GHS 50.00', trust: 'HIGH' },
                      { name: 'Kofi B.', amount: 'GHS 50.00', trust: 'MEDIUM' },
                      { name: 'Adjoa M.', amount: 'GHS 100.00', trust: 'HIGH' },
                    ].map((tx) => (
                      <div key={tx.name} className="flex items-center justify-between py-2.5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-primary-700">{tx.name[0]}</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">{tx.name}</p>
                            <p className="text-[10px] text-gray-400">MoMo Transfer</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-900">{tx.amount}</p>
                          <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${
                            tx.trust === 'HIGH' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {tx.trust}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics ────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 -mt-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 grid grid-cols-3 gap-4 sm:gap-8 text-center">
          {[
            { value: '500+', label: 'Active Groups', color: 'bg-primary-100 text-primary-600' },
            { value: '25,000+', label: 'Transactions Verified', color: 'bg-blue-100 text-blue-600' },
            { value: 'GHS 2M+', label: 'Money Saved', color: 'bg-accent-100 text-accent-600' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${stat.color} flex items-center justify-center mx-auto mb-2 sm:mb-3`}>
                <Icon name="check" className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything You Need to Run Your Susu Group
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              From automatic payment verification to USSD support, SusuPay handles the hard parts so you can focus on growing your group.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="relative bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                {'comingSoon' in f && f.comingSoon && (
                  <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <Icon name={f.icon} className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-500">Three simple steps to get your group running.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-5">
                  <span className="text-2xl font-bold text-primary-700">{step.num}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who It's For ───────────────────────────────────────── */}
      <section id="who-its-for" className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Who It's For</h2>
            <p className="mt-4 text-lg text-gray-500">SusuPay is built for anyone who participates in rotating savings.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <Icon name={a.icon} className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{a.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to Modernize Your Susu Group?
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            Join hundreds of collectors who have already switched from paper to SusuPay.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/collector/register"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-primary-700 bg-white rounded-xl hover:bg-primary-50 shadow-lg transition-all"
            >
              Register as Collector
            </Link>
            <Link
              to="/client/login"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white border-2 border-white/40 rounded-xl hover:bg-white/10 transition-all"
            >
              Log In as Client
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <span className="text-lg font-bold text-white">SusuPay</span>
              <p className="mt-2 text-sm leading-relaxed">
                Digitizing Ghana's traditional susu savings system with trust, transparency, and technology.
              </p>
            </div>
            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollTo('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollTo('how-it-works')} className="hover:text-white transition-colors">How It Works</button></li>
                <li><button onClick={() => scrollTo('who-its-for')} className="hover:text-white transition-colors">Who It's For</button></li>
              </ul>
            </div>
            {/* Get Started */}
            <div>
              <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-3">Get Started</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/collector/register" className="hover:text-white transition-colors">Register as Collector</Link></li>
                <li><Link to="/client/login" className="hover:text-white transition-colors">Client Login</Link></li>
                <li><Link to="/client/join" className="hover:text-white transition-colors">Join a Group</Link></li>
              </ul>
            </div>
            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="cursor-default">Privacy Policy</span></li>
                <li><span className="cursor-default">Terms of Service</span></li>
                <li><span className="cursor-default">Cookie Policy</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-gray-800 text-center text-sm">
            &copy; {new Date().getFullYear()} SusuPay. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
