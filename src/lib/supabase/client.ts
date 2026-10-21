import { SynthParams } from '../audio/AudioEngine';

export interface Preset {
  id: string;
  name: string;
  modelCore: string;
  category: string;
  tags: string[];
  parameters: Partial<SynthParams>;
  isPublic: boolean;
  createdAt: string;
  embedding?: number[]; // 1536-dim spectral vector
  similarity?: number;
}

export const SUPABASE_SQL_DDL = `-- SynthAI Studio Supabase Schema & pgvector Migration
-- Run this in your Supabase SQL Editor:

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- User Profiles Table with PayPal Subscription Tracking
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'creator' CHECK (subscription_tier IN ('creator', 'studio_pro', 'enterprise')),
    paypal_subscription_id TEXT,
    paypal_payer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Audio Presets Table with 1536-dim pgvector Spectral Embeddings
CREATE TABLE IF NOT EXISTS public.presets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    model_core VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Neural Spectral Decomposition',
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536), -- Neural Spectral Embedding
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;

-- Profile Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Preset Policies
CREATE POLICY "Public presets are viewable by everyone" ON public.presets FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert their own presets" ON public.presets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own presets" ON public.presets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own presets" ON public.presets FOR DELETE USING (auth.uid() = user_id);

-- Cosine Distance Vector Search Function for AI Presets
CREATE OR REPLACE FUNCTION match_presets (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  model_core VARCHAR(100),
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    presets.id,
    presets.name,
    presets.model_core,
    1 - (presets.embedding <=> query_embedding) AS similarity
  FROM presets
  WHERE 1 - (presets.embedding <=> query_embedding) > match_threshold
  ORDER BY presets.embedding <=> query_embedding
  LIMIT match_count;
$$;
`;

// Deterministic mock 1536-dim vector generator for audio spectral footprint
export function generateMockEmbedding(seedStr: string): number[] {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const vector: number[] = new Array(1536);
  let mag = 0;
  for (let i = 0; i < 1536; i++) {
    const val = Math.sin(hash + i * 0.17) * Math.cos(i * 0.03 + (hash % 100));
    vector[i] = val;
    mag += val * val;
  }
  const norm = Math.sqrt(mag) || 1;
  return vector.map((v) => v / norm);
}

// Cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export const SEED_PRESETS: Preset[] = [
  {
    id: 'preset-001',
    name: 'Cyberpunk Neon Pulse',
    modelCore: 'HYBRID-001',
    category: 'Neural Spectral Decomposition',
    tags: ['Lead', 'Cyber', 'Pluck', 'Fast Attack'],
    isPublic: true,
    createdAt: '2026-10-18T10:30:00Z',
    parameters: {
      osc1Type: 'sawtooth',
      osc1Detune: -5,
      osc2Type: 'square',
      osc2Detune: 7,
      osc2Mix: 0.45,
      filterType: 'lowpass',
      cutoff: 2800,
      resonance: 5.2,
      attack: 0.02,
      decay: 0.25,
      sustain: 0.4,
      release: 0.6,
      lfoRate: 3.5,
      lfoDepth: 180,
      delayTime: 0.25,
      delayFeedbackVal: 0.4,
      saturationDrive: 28,
      masterVolume: 0.8,
    },
    embedding: generateMockEmbedding('Cyberpunk Neon Pulse saw square fast lead'),
  },
  {
    id: 'preset-002',
    name: 'Deep Acid 303 Sub',
    modelCore: 'HYBRID-045',
    category: 'Subtractive Quantum Hybrid',
    tags: ['Bass', 'Acid', 'Subtractive', 'Resonant'],
    isPublic: true,
    createdAt: '2026-10-19T14:15:00Z',
    parameters: {
      osc1Type: 'square',
      osc1Detune: 0,
      osc2Type: 'sawtooth',
      osc2Detune: 12,
      osc2Mix: 0.3,
      filterType: 'lowpass',
      cutoff: 950,
      resonance: 8.5,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.2,
      release: 0.4,
      lfoRate: 6.0,
      lfoDepth: 350,
      delayTime: 0.18,
      delayFeedbackVal: 0.25,
      saturationDrive: 42,
      masterVolume: 0.85,
    },
    embedding: generateMockEmbedding('Deep Acid 303 Sub squelch resonant bass'),
  },
  {
    id: 'preset-003',
    name: 'Ethereal Glass Resonator',
    modelCore: 'HYBRID-089',
    category: 'FM Generative Resonator',
    tags: ['Bell', 'Ethereal', 'FM', 'Ambient'],
    isPublic: true,
    createdAt: '2026-10-19T18:40:00Z',
    parameters: {
      osc1Type: 'sine',
      osc1Detune: 0,
      osc2Type: 'sine',
      osc2Detune: 19,
      osc2Mix: 0.85,
      filterType: 'lowpass',
      cutoff: 4800,
      resonance: 2.5,
      attack: 0.01,
      decay: 0.8,
      sustain: 0.25,
      release: 2.2,
      lfoRate: 4.2,
      lfoDepth: 60,
      delayTime: 0.4,
      delayFeedbackVal: 0.6,
      saturationDrive: 8,
      masterVolume: 0.75,
    },
    embedding: generateMockEmbedding('Ethereal Glass Resonator fm bell chime metallic'),
  },
  {
    id: 'preset-004',
    name: 'Aether Wavelet Pad',
    modelCore: 'HYBRID-133',
    category: 'Wavetable Wavelet Diffusion',
    tags: ['Pad', 'Atmosphere', 'Diffusion', 'Lush'],
    isPublic: true,
    createdAt: '2026-10-20T08:20:00Z',
    parameters: {
      osc1Type: 'sawtooth',
      osc1Detune: -8,
      osc2Type: 'triangle',
      osc2Detune: 8,
      osc2Mix: 0.65,
      filterType: 'lowpass',
      cutoff: 2200,
      resonance: 2.0,
      attack: 0.6,
      decay: 0.8,
      sustain: 0.9,
      release: 2.4,
      lfoRate: 0.75,
      lfoDepth: 400,
      delayTime: 0.45,
      delayFeedbackVal: 0.55,
      saturationDrive: 15,
      masterVolume: 0.8,
    },
    embedding: generateMockEmbedding('Aether Wavelet Pad warm lush evolving string'),
  },
  {
    id: 'preset-005',
    name: 'Bio-Acoustic Granular Drone',
    modelCore: 'HYBRID-221',
    category: 'Bio-Acoustic Granular Matrix',
    tags: ['Granular', 'Drone', 'Organic', 'Cinematic'],
    isPublic: true,
    createdAt: '2026-10-20T11:05:00Z',
    parameters: {
      osc1Type: 'triangle',
      osc1Detune: 3,
      osc2Type: 'sawtooth',
      osc2Mix: 0.5,
      osc2Detune: 24,
      filterType: 'lowpass',
      cutoff: 1750,
      resonance: 4.0,
      attack: 0.4,
      decay: 0.5,
      sustain: 0.8,
      release: 1.6,
      lfoRate: 5.5,
      lfoDepth: 260,
      delayTime: 0.35,
      delayFeedbackVal: 0.45,
      saturationDrive: 22,
      masterVolume: 0.8,
    },
    embedding: generateMockEmbedding('Bio-Acoustic Granular Drone organic soundscape cinematic'),
  },
];

const PRESETS_STORAGE_KEY = 'synth_ai_cloud_presets';

export const getStoredPresets = (): Preset[] => {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return SEED_PRESETS;
};

export const savePresets = (presets: Preset[]) => {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {}
};
