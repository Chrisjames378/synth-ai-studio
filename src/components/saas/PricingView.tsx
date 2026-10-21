import React, { useState } from 'react';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
  UserSubscriptionState,
  getStoredSubscription,
  saveSubscription,
} from '../../lib/paypal/client';
import {
  Check,
  CreditCard,
  ArrowRight,
  X,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface PricingViewProps {
  onPlanChanged?: (newTier: string) => void;
}

const FINANCIAL_DATA = [
  { month: 'Jan', mrr: 12400, arr: 148800, users: 410 },
  { month: 'Feb', mrr: 15200, arr: 182400, users: 520 },
  { month: 'Mar', mrr: 18900, arr: 226800, users: 680 },
  { month: 'Apr', mrr: 21500, arr: 258000, users: 810 },
  { month: 'May', mrr: 24800, arr: 297600, users: 950 },
  { month: 'Jun', mrr: 29200, arr: 350400, users: 1120 },
];

export const PricingView: React.FC<PricingViewProps> = ({ onPlanChanged }) => {
  const [subView, setSubView] = useState<'plans' | 'metrics'>('plans');
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  const [subState, setSubState] = useState<UserSubscriptionState>(getStoredSubscription());
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (plan.id === subState.tier) return;
    setCheckoutPlan(plan);
    setCheckoutSuccess(false);
  };

  const handleSimulatePayPalApprove = () => {
    if (!checkoutPlan) return;
    setIsProcessingCheckout(true);

    setTimeout(() => {
      const updated: UserSubscriptionState = {
        tier: checkoutPlan.id as any,
        status: 'active',
        paypalSubscriptionId: `I-SUB-${Date.now().toString().slice(-8)}`,
        renewalDate: new Date(Date.now() + (interval === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        payerEmail: 'producer@synthai.studio',
        interval,
      };

      setSubState(updated);
      saveSubscription(updated);
      setIsProcessingCheckout(false);
      setCheckoutSuccess(true);
      if (onPlanChanged) onPlanChanged(updated.tier);
    }, 1200);
  };

  const handleCancelSubscription = () => {
    const updated: UserSubscriptionState = {
      ...subState,
      tier: 'creator',
      status: 'active',
      paypalSubscriptionId: null,
    };
    setSubState(updated);
    saveSubscription(updated);
    if (onPlanChanged) onPlanChanged('creator');
  };

  return (
    <div className="space-y-8">
      {/* Top Banner and View Toggle */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-800 rounded-lg text-cyan-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">CURRENT WORKSPACE TIER:</span>
              <span className="font-semibold text-neutral-100 uppercase tracking-wide">
                {subState.tier.replace('_', ' ')}
              </span>
              <span className="text-xs font-mono text-emerald-400">● {subState.status.toUpperCase()}</span>
            </div>
            <div className="text-xs text-neutral-400 mt-1 font-mono">
              PayPal ID: {subState.paypalSubscriptionId || 'None (Free Plan)'} · Renews on: {subState.renewalDate}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Subview switcher */}
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-medium">
            <button
              onClick={() => setSubView('plans')}
              className={`px-3 py-1 rounded transition-colors ${
                subView === 'plans' ? 'bg-neutral-800 text-cyan-300' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Licensing Tiers
            </button>
            <button
              onClick={() => setSubView('metrics')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                subView === 'metrics' ? 'bg-neutral-800 text-cyan-300' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              SaaS Business Analytics
            </button>
          </div>

          {subState.tier !== 'creator' && (
            <button
              onClick={handleCancelSubscription}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-rose-400 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: LICENSING & PRICING PLANS */}
      {subView === 'plans' && (
        <>
          {/* Header & Interval Switch */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
              Studio Licensing & Hardware Quotas
            </h2>
            <p className="text-xs text-neutral-400 max-w-lg mx-auto">
              Transparent pricing for sound designers, synthesis researchers, and commercial game & DAW audio teams.
            </p>

            {/* Monthly / Annual toggle */}
            <div className="inline-flex items-center p-1 bg-neutral-900 rounded-xl border border-neutral-800 mt-3">
              <button
                onClick={() => setInterval('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  interval === 'monthly'
                    ? 'bg-neutral-800 text-cyan-300 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setInterval('annual')}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  interval === 'annual'
                    ? 'bg-neutral-800 text-cyan-300 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">SAVE 20%</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = subState.tier === plan.id;
              const price = interval === 'monthly' ? plan.monthlyPrice : Math.round(plan.annualPrice / 12);

              return (
                <div
                  key={plan.id}
                  className={`relative bg-neutral-900 rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                    plan.popular
                      ? 'border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.1)]'
                      : 'border-neutral-800'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-cyan-500 text-neutral-950 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      Recommended for Studios
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-neutral-100">{plan.name}</h3>
                      <p className="text-xs text-neutral-400 mt-1 min-h-[32px] leading-relaxed">{plan.tagline}</p>
                    </div>

                    <div className="flex items-baseline gap-1 pt-2 border-t border-neutral-800/80">
                      <span className="text-3xl font-bold font-mono text-neutral-100">${price}</span>
                      <span className="text-xs text-neutral-400">/ month</span>
                      {interval === 'annual' && plan.annualPrice > 0 && (
                        <span className="text-[10px] text-neutral-500 ml-1">billed annually (${plan.annualPrice}/yr)</span>
                      )}
                    </div>

                    {/* Features List */}
                    <div className="space-y-2 pt-4 border-t border-neutral-800/80">
                      <div className="text-[11px] font-medium text-neutral-300 uppercase tracking-wider">
                        Included Capabilities
                      </div>
                      <ul className="space-y-2">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2 text-xs text-neutral-300 leading-snug">
                            <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-6 mt-6 border-t border-neutral-800/80">
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCurrent}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                        isCurrent
                          ? 'bg-neutral-800 text-neutral-400 cursor-default'
                          : plan.popular
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700'
                      }`}
                    >
                      {isCurrent ? (
                        'Current Plan'
                      ) : (
                        <>
                          <span>Upgrade to {plan.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature & Limit Comparison Matrix */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-200">Architectural Quotas & Limit Specifications</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 font-medium">
                    <th className="py-2 pr-4">SPECIFICATION</th>
                    <th className="py-2 px-4">CREATOR</th>
                    <th className="py-2 px-4 text-cyan-400">STUDIO PRO</th>
                    <th className="py-2 px-4">ENTERPRISE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono text-neutral-300">
                  <tr>
                    <td className="py-2.5 pr-4 font-sans text-neutral-400">Models Access</td>
                    <td className="py-2.5 px-4">24 Core Models</td>
                    <td className="py-2.5 px-4 text-cyan-300">All 264+ Models</td>
                    <td className="py-2.5 px-4">Bespoke Weights</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-sans text-neutral-400">DSP Execution Engine</td>
                    <td className="py-2.5 px-4">WebAudio Standard</td>
                    <td className="py-2.5 px-4 text-cyan-300">WASM SIMD AVX2</td>
                    <td className="py-2.5 px-4">Dedicated Tensor Core</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-sans text-neutral-400">Audio Export Resolution</td>
                    <td className="py-2.5 px-4">WAV 48kHz</td>
                    <td className="py-2.5 px-4 text-cyan-300">WAV 96kHz / 32-bit Float</td>
                    <td className="py-2.5 px-4">Lossless Multichannel</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-sans text-neutral-400">Neural Vector Search</td>
                    <td className="py-2.5 px-4 text-neutral-500">Disabled</td>
                    <td className="py-2.5 px-4 text-emerald-400">1536-dim pgvector</td>
                    <td className="py-2.5 px-4 text-emerald-400">Multi-Model Vector Hub</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-sans text-neutral-400">Edge C++ Source Export</td>
                    <td className="py-2.5 px-4 text-neutral-500">Disabled</td>
                    <td className="py-2.5 px-4 text-cyan-300">Enabled</td>
                    <td className="py-2.5 px-4">Full VST3 / AU Source</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: SAAS BUSINESS METRICS & GROWTH ANALYTICS (from prototype) */}
      {subView === 'metrics' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-neutral-100">Enterprise SaaS Subscription & Revenue Trajectory</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Valuation matrix and ARR expansion analytics for SynthAI Enterprise platform.
              </p>
            </div>
            <span className="bg-amber-950/60 border border-amber-800/80 text-amber-300 px-3 py-1 rounded-full text-xs font-mono font-semibold">
              ARR Projection: $350,400 USD
            </span>
          </div>

          {/* Key Financial KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Monthly Recurring (MRR)</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-neutral-100 mt-2 font-mono tabular-nums">$29,200</div>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+17.7% vs last month</span>
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Annual Run Rate (ARR)</span>
                <BarChart3 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-neutral-100 mt-2 font-mono tabular-nums">$350,400</div>
              <div className="text-[11px] text-cyan-400 mt-1">Valuation: ~$1.4M @ 4x ARR</div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Active Subscribers</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-neutral-100 mt-2 font-mono tabular-nums">1,120</div>
              <div className="text-[11px] text-blue-400 mt-1">Net Churn Rate: 0.8%</div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Avg Revenue Per User</span>
                <CreditCard className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-neutral-100 mt-2 font-mono tabular-nums">$26.07</div>
              <div className="text-[11px] text-indigo-400 mt-1">LTV / CAC Ratio: 4.8x</div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: MRR Growth BarChart */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-200">MRR Trajectory (6-Month Performance)</h3>
                <span className="text-xs font-mono text-cyan-400">USD $</span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={FINANCIAL_DATA}>
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090a0f',
                        borderColor: '#262626',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f1f5f9',
                      }}
                      formatter={(val: any) => [`$${val.toLocaleString()}`, 'Monthly Recurring']}
                    />
                    <Bar dataKey="mrr" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Cumulative Subscribers AreaChart */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-200">Paying Studio Producers Growth</h3>
                <span className="text-xs font-mono text-emerald-400">+173% YTD</span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={FINANCIAL_DATA}>
                    <defs>
                      <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090a0f',
                        borderColor: '#262626',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f1f5f9',
                      }}
                      formatter={(val: any) => [val.toLocaleString(), 'Active Producers']}
                    />
                    <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#userGrowth)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulated PayPal Checkout Modal */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#003087] flex items-center justify-center font-bold text-white text-xs">
                  P
                </div>
                <span className="font-semibold text-neutral-100">PayPal Subscription Checkout</span>
              </div>
              <button
                onClick={() => setCheckoutPlan(null)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-100">Subscription Activated!</h3>
                <p className="text-xs text-neutral-400">
                  Your workspace has been upgraded to <strong className="text-neutral-200">{checkoutPlan.name}</strong>.
                  All features, SIMD compilers, and 264+ models are now live.
                </p>
                <button
                  onClick={() => setCheckoutPlan(null)}
                  className="mt-2 px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold rounded-lg"
                >
                  Return to Studio
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Plan</span>
                    <span className="font-semibold text-neutral-200">{checkoutPlan.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Billing Cycle</span>
                    <span className="capitalize text-neutral-200">{interval}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono pt-2 border-t border-neutral-800">
                    <span className="text-neutral-300">Total Due Today</span>
                    <span className="text-cyan-400 font-bold">
                      ${interval === 'monthly' ? checkoutPlan.monthlyPrice : checkoutPlan.annualPrice}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleSimulatePayPalApprove}
                    disabled={isProcessingCheckout}
                    className="w-full py-3 bg-[#FFC439] hover:bg-[#ffbb22] text-[#003087] font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    {isProcessingCheckout ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Authorizing with PayPal...</span>
                      </>
                    ) : (
                      <>
                        <span className="italic font-extrabold text-sm">PayPal</span>
                        <span>Subscribe Now</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSimulatePayPalApprove}
                    disabled={isProcessingCheckout}
                    className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium rounded-xl border border-neutral-700 transition-colors"
                  >
                    Debit or Credit Card
                  </button>
                </div>

                <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
                  Secured by PayPal sandbox protocol. Cancel anytime in your workspace settings with 1-click.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
