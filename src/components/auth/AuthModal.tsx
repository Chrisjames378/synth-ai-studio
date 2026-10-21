import React, { useState } from 'react';
import { UserSubscriptionState } from '../../lib/paypal/client';
import { X, Key, Shield, User, Copy, Check, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  subState: UserSubscriptionState;
  onSwitchTier: (tier: 'creator' | 'studio_pro' | 'enterprise') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  subState,
  onSwitchTier,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyKey = (label: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-neutral-100">Producer Studio Account</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card with Avatar */}
        <div className="flex items-center gap-4 bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
          <img
            src="/src/assets/images/producer_avatar_1792525703638.jpg"
            alt="Chris James - Lead Audio Engineer"
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-xl object-cover border border-neutral-700 shadow-md"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-100 text-sm">Chris James</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                {subState.tier.replace('_', ' ')}
              </span>
            </div>
            <div className="text-xs text-neutral-400">chris.james378@gmail.com</div>
            <div className="text-[11px] text-neutral-500">Lead Audio Engineer & Sound Designer</div>
          </div>
        </div>

        {/* Quick Role / Persona Switcher for Testing */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-neutral-300">Quick Tier Persona Switcher</div>
          <div className="grid grid-cols-3 gap-2">
            {(['creator', 'studio_pro', 'enterprise'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onSwitchTier(t)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                  subState.tier === t
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* API Credentials */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>Developer DSP & Cloud Credentials</span>
          </div>

          <div className="space-y-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs font-mono">
            <div className="flex items-center justify-between text-neutral-400">
              <span>SYNTHAI_EDGE_TOKEN:</span>
              <button
                onClick={() => copyKey('token', 'syn_live_99a823bfe4c1294801e')}
                className="hover:text-cyan-300 flex items-center gap-1 text-[11px]"
              >
                {copiedKey === 'token' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                syn_live_...
              </button>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>NEXT_PUBLIC_PAYPAL_CLIENT_ID:</span>
              <button
                onClick={() => copyKey('paypal', 'sb-synthai-client-id-2026')}
                className="hover:text-cyan-300 flex items-center gap-1 text-[11px]"
              >
                {copiedKey === 'paypal' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                sb-synth...
              </button>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>SUPABASE_PGVECTOR_URL:</span>
              <button
                onClick={() => copyKey('supa', 'https://synthai-vectors.supabase.co')}
                className="hover:text-cyan-300 flex items-center gap-1 text-[11px]"
              >
                {copiedKey === 'supa' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                https://syn...
              </button>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
