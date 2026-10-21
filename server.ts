import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio environment expects the applet dev server on port 3000
// Robust Port Parsing: Supports PORT env var, --port 3000, --port=3000, -p 3000
function getPort(): number {
  if (process.env.PORT) {
    const p = parseInt(process.env.PORT, 10);
    if (!isNaN(p)) return p;
  }
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if ((arg === '--port' || arg === '-p') && process.argv[i + 1]) {
      const p = parseInt(process.argv[i + 1], 10);
      if (!isNaN(p)) return p;
    }
    if (arg.startsWith('--port=')) {
      const p = parseInt(arg.split('=')[1], 10);
      if (!isNaN(p)) return p;
    }
  }
  return 3000;
}

const port = getPort();

app.use(express.json());

// Health check endpoint for dev server supervisor & monitors
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    port,
  });
});

// Initialize GoogleGenAI SDK safely with fallback protection
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

// Algorithmic fallbacks in case API key is missing or call fails
const FALLBACK_PROGRESSIONS: Record<string, any> = {
  cyberpunk: {
    title: 'Cyberpunk Neon Dorian Squelch',
    description: 'Minor-modal oscillation with raised 6th degree for dark electronic bass and resonant leads.',
    key: 'C',
    scale: 'Dorian',
    chords: ['Cm7', 'F7', 'Bbmaj7', 'Dm7b5'],
    romanNumerals: 'i7 - IV7 - VII - iiø7',
    suggestedBpm: 132,
    sequence32: [
      { stepNumber: 1, note: 'C4', active: true, accent: true, velocity: 1.0 },
      { stepNumber: 2, note: 'C4', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 3, note: 'D#4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 4, note: 'G4', active: true, accent: false, velocity: 0.8 },
      { stepNumber: 5, note: 'A#4', active: true, accent: true, velocity: 0.95 },
      { stepNumber: 6, note: 'A4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 7, note: 'G4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 8, note: 'D#4', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 9, note: 'F4', active: true, accent: true, velocity: 1.0 },
      { stepNumber: 10, note: 'A4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 11, note: 'C5', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 12, note: 'D#4', active: true, accent: false, velocity: 0.8 },
      { stepNumber: 13, note: 'F4', active: true, accent: true, velocity: 0.9 },
      { stepNumber: 14, note: 'D4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 15, note: 'C4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 16, note: 'A#3', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 17, note: 'A#3', active: true, accent: true, velocity: 1.0 },
      { stepNumber: 18, note: 'D4', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 19, note: 'F4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 20, note: 'A4', active: true, accent: false, velocity: 0.8 },
      { stepNumber: 21, note: 'C5', active: true, accent: true, velocity: 0.95 },
      { stepNumber: 22, note: 'A#4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 23, note: 'G4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 24, note: 'F4', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 25, note: 'D4', active: true, accent: true, velocity: 1.0 },
      { stepNumber: 26, note: 'F4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 27, note: 'G#4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 28, note: 'C5', active: true, accent: false, velocity: 0.8 },
      { stepNumber: 29, note: 'D5', active: true, accent: true, velocity: 0.95 },
      { stepNumber: 30, note: 'C5', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 31, note: 'G#4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 32, note: 'D4', active: true, accent: false, velocity: 0.85 },
    ],
    automationTips: {
      cutoffTrend: 'High acid sweep at step 1 and step 17 with fast decay',
      saturationDrive: 36,
      resonance: 9.2,
    },
  },
  ambient: {
    title: 'Celestial Lydian Ethereal Bloom',
    description: 'Drifting Lydian #4 harmonic tension designed for lush convolution pads and wavetable diffusion.',
    key: 'F',
    scale: 'Lydian',
    chords: ['Fmaj7#11', 'G6/F', 'Am9', 'Em7'],
    romanNumerals: 'Imaj7#11 - II6 - iii9 - vii7',
    suggestedBpm: 94,
    sequence32: [
      { stepNumber: 1, note: 'F3', active: true, accent: true, velocity: 0.9 },
      { stepNumber: 2, note: 'C4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 3, note: 'E4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 4, note: 'B4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 5, note: 'A4', active: true, accent: true, velocity: 0.85 },
      { stepNumber: 6, note: 'E4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 7, note: 'C4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 8, note: 'F4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 9, note: 'G3', active: true, accent: true, velocity: 0.9 },
      { stepNumber: 10, note: 'D4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 11, note: 'B4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 12, note: 'E5', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 13, note: 'D5', active: true, accent: true, velocity: 0.85 },
      { stepNumber: 14, note: 'B4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 15, note: 'G4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 16, note: 'D4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 17, note: 'A3', active: true, accent: true, velocity: 0.9 },
      { stepNumber: 18, note: 'E4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 19, note: 'C5', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 20, note: 'G4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 21, note: 'B4', active: true, accent: true, velocity: 0.85 },
      { stepNumber: 22, note: 'G4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 23, note: 'E4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 24, note: 'A4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 25, note: 'E3', active: true, accent: true, velocity: 0.9 },
      { stepNumber: 26, note: 'B3', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 27, note: 'G4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 28, note: 'D5', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 29, note: 'C5', active: true, accent: true, velocity: 0.85 },
      { stepNumber: 30, note: 'G4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 31, note: 'E4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 32, note: 'B4', active: false, accent: false, velocity: 0.6 },
    ],
    automationTips: {
      cutoffTrend: 'Slow sine wave swell with maximum reverb on steps 25-32',
      saturationDrive: 10,
      resonance: 2.5,
    },
  },
};

// API Endpoint for Gemini Chord Intelligence
app.post('/api/chord-intelligence', async (req: Request, res: Response) => {
  try {
    const {
      modelName = 'Neural Vortex 1',
      category = 'Neural Spectral Decomposition',
      currentBpm = 128,
      style = 'Cyberpunk',
      rootNote = 'C',
      scale = 'Natural Minor',
    } = req.body;

    if (!apiKey || !ai) {
      console.warn('GEMINI_API_KEY not configured or client uninitialized; using algorithmic harmonic engine.');
      const fallback = style.toLowerCase().includes('ambient')
        ? FALLBACK_PROGRESSIONS.ambient
        : FALLBACK_PROGRESSIONS.cyberpunk;
      return res.json({
        ...fallback,
        source: 'algorithmic-fallback',
        key: rootNote,
      });
    }

    const prompt = `You are an expert synthesizer music theorist and electronic composer.
Generate an intelligent, musically compelling harmonic progression and 32-step polyphonic note sequence tailored for:
- Synthesizer Model: "${modelName}" (Category: "${category}")
- Musical Style / Vibe: "${style}"
- Root Note: "${rootNote}"
- Scale / Mode: "${scale}"
- Target BPM: ${currentBpm}

Requirements:
1. Provide a professional title and concise description explaining the harmonic theory and why it pairs with this synth model.
2. Provide a 4-chord progression with chord names (e.g., ["${rootNote}m7", "Abmaj7", "Bb7", "Gm7"]) and Roman numeral analysis.
3. Provide an array of exactly 32 steps (representing 2 bars of 16th notes).
   - Each step has: stepNumber (1-32), note (e.g. "C4", "D#4", "G4", "A#4", "F4", "C3", etc.), active (boolean), accent (boolean), velocity (0.4 to 1.0).
   - Include a good rhythmic syncopation (between 14 and 24 active steps out of 32).
4. Provide parameter automation tips (cutoff trend, suggested saturation drive 0-60, resonance 1-15).

Return strictly JSON matching this structure.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            key: { type: Type.STRING },
            scale: { type: Type.STRING },
            chords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            romanNumerals: { type: Type.STRING },
            suggestedBpm: { type: Type.NUMBER },
            sequence32: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  note: { type: Type.STRING },
                  active: { type: Type.BOOLEAN },
                  accent: { type: Type.BOOLEAN },
                  velocity: { type: Type.NUMBER },
                },
                required: ['stepNumber', 'note', 'active', 'accent', 'velocity'],
              },
            },
            automationTips: {
              type: Type.OBJECT,
              properties: {
                cutoffTrend: { type: Type.STRING },
                saturationDrive: { type: Type.NUMBER },
                resonance: { type: Type.NUMBER },
              },
              required: ['cutoffTrend', 'saturationDrive', 'resonance'],
            },
          },
          required: [
            'title',
            'description',
            'key',
            'scale',
            'chords',
            'romanNumerals',
            'suggestedBpm',
            'sequence32',
            'automationTips',
          ],
        },
      },
    });

    const text = response.text?.trim() || '{}';
    const parsedData = JSON.parse(text);

    // Ensure 32 steps
    if (!Array.isArray(parsedData.sequence32) || parsedData.sequence32.length < 32) {
      console.warn('AI returned fewer than 32 steps; padding sequence');
      const fallbackSeq = FALLBACK_PROGRESSIONS.cyberpunk.sequence32;
      parsedData.sequence32 = Array.from({ length: 32 }, (_, i) => {
        return parsedData.sequence32?.[i] || fallbackSeq[i];
      });
    }

    return res.json({
      ...parsedData,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Error generating chord intelligence with Gemini:', error);
    const fallback = FALLBACK_PROGRESSIONS.cyberpunk;
    return res.json({
      ...fallback,
      source: 'algorithmic-fallback',
      notice: 'Gemini request encountered an issue; fallback harmonic model applied.',
    });
  }
});

// Mount Vite in development or serve static files in production
async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static(path.join(__dirname, 'dist')));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      });
    }

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`[SynthAI Studio] Dev server live on http://0.0.0.0:${port}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[SynthAI Studio] Port ${port} is in use; please kill the old process or retry.`);
      } else {
        console.error('[SynthAI Studio] Server error:', err);
      }
    });
  } catch (err) {
    console.error('[SynthAI Studio] Failed to start server:', err);
  }
}

process.on('uncaughtException', (err) => {
  console.error('[SynthAI Studio] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[SynthAI Studio] Unhandled rejection:', reason);
});

startServer();
