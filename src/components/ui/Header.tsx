import React from 'react';
import { UserSubscriptionState } from '../../lib/paypal/client';
import { User } from 'lucide-react';

export type ActiveTab = 'studio' | 'models' | 'cloud' | 'deploy' | 'saas';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  subState: UserSubscriptionState;
  onOpenAccount: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  subState,
  onOpenAccount,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => onSelectTab('studio')}
        className="text-lg font-bold tracking-tight text-neutral-100 hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
        <span>SynthAI Studio</span>
      </button>

      {/* Zone 2: 4-5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
        <button
          onClick={() => onSelectTab('studio')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'studio' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Studio
        </button>
        <button
          onClick={() => onSelectTab('models')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'models' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Models
        </button>
        <button
          onClick={() => onSelectTab('cloud')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'cloud' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Cloud Presets
        </button>
        <button
          onClick={() => onSelectTab('deploy')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'deploy' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Edge Deploy
        </button>
        <button
          onClick={() => onSelectTab('saas')}
          className={`hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'saas' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Licensing
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenAccount}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-900 border border-neutral-700 hover:border-neutral-600 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <img
            src="/src/assets/images/producer_avatar_1792525703638.jpg"
            alt="Chris James"
            referrerPolicy="no-referrer"
            className="w-5 h-5 rounded-full object-cover"
          />
          <span className="hidden sm:inline">Chris James</span>
          <span className="text-[10px] text-cyan-400 font-mono uppercase">
            {subState.tier === 'studio_pro' ? 'Pro' : subState.tier}
          </span>
        </button>
      </div>
    </header>
  );
};
