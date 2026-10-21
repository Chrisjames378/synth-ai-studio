export interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  features: string[];
  limits: {
    modelsAccess: string;
    dspThreads: string;
    exportQuota: string;
    cloudStorage: string;
    vectorSearch: boolean;
  };
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'creator',
    name: 'Creator',
    tagline: 'Essential neural synthesis for independent producers and sound designers.',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      'Access to 24 Core Hybrid DSP Models',
      'Dual-Oscillator Subtractive Synthesizer',
      '32-Step Polyphonic Pattern Sequencer',
      'Local Patch Memory (Up to 50 patches)',
      'Community Sound Preset Sharing',
    ],
    limits: {
      modelsAccess: '24 Core Models',
      dspThreads: 'Single WebAudio Worker',
      exportQuota: 'WAV 48kHz / 24-bit',
      cloudStorage: 'Local browser cache',
      vectorSearch: false,
    },
  },
  {
    id: 'studio_pro',
    name: 'Studio Pro',
    tagline: 'Full generative horsepower and real-time edge export for production studios.',
    monthlyPrice: 49,
    annualPrice: 470,
    popular: true,
    features: [
      'Unrestricted Access to all 264+ Hybrid Models',
      'Neural Spectral pgvector Similarity Search (1536-dim)',
      'WebAssembly SIMD AudioWorklet Engine (<1ms latency)',
      'Vercel Edge & Cloudflare Workers DSP compiler',
      'Unlimited Cloud Presets & Version History',
      'Tube Saturation WaveShaping & Stereo Feedback Loop',
      'Multi-Format Export: WAV, C++ DSP Header, Dockerfile',
    ],
    limits: {
      modelsAccess: 'All 264+ Models Unlocked',
      dspThreads: 'Multi-Core SIMD WASM',
      exportQuota: 'Unlimited Edge Deployments',
      cloudStorage: 'Sync across all workstations',
      vectorSearch: true,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise DSP Cluster',
    tagline: 'Custom model fine-tuning, hardware clusters, and dedicated SLA for DAWs.',
    monthlyPrice: 249,
    annualPrice: 2390,
    features: [
      'Everything in Studio Pro',
      'Dedicated Neural Model Fine-Tuning Pipeline',
      'Custom VST3 / AU Audio Unit C++ Export Bridge',
      'Multi-seat collaborative cloud session rooms',
      'Direct Discord & Slack Engineering Support with 99.99% SLA',
      'Air-gapped On-Prem Docker DSP Engine',
    ],
    limits: {
      modelsAccess: 'Bespoke Model Architectures',
      dspThreads: 'Dedicated Cloud GPU Tensor Worker',
      exportQuota: 'Unlimited Commercial Rights',
      cloudStorage: 'Enterprise S3 & Supabase Private Vault',
      vectorSearch: true,
    },
  },
];

export interface UserSubscriptionState {
  tier: 'creator' | 'studio_pro' | 'enterprise';
  status: 'active' | 'trial' | 'cancelled';
  paypalSubscriptionId: string | null;
  renewalDate: string;
  payerEmail: string;
  interval: 'monthly' | 'annual';
}

const STORAGE_KEY = 'synth_ai_subscription_state';

export const getStoredSubscription = (): UserSubscriptionState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    tier: 'studio_pro', // default demo in pro mode so user can test all features!
    status: 'active',
    paypalSubscriptionId: 'I-SUB-SYNTHAI-8924091',
    renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payerEmail: 'producer@synthai.studio',
    interval: 'monthly',
  };
};

export const saveSubscription = (state: UserSubscriptionState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};
