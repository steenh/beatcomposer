export interface Step {
  active: boolean;
  velocity: number; // 0-127
}

export interface PianoRollNote {
  id: string;
  step: number;      // start step (0-based)
  pitch: number;     // MIDI note number
  duration: number;  // in steps
  velocity: number;  // 0-127
}

export type TrackType = 'kick' | 'snare' | 'clap' | 'hihat-closed' | 'hihat-open' | 'cymbal' | 'bass' | 'lead' | 'pad';

export type OscType = 'sawtooth' | 'square' | 'triangle' | 'sine';

export type LFOShape = 'sine' | 'triangle' | 'sawtooth' | 'square';
export type LFOTarget = 'filterCutoff' | 'volume' | 'pitch';

export interface LFOConfig {
  enabled: boolean;
  shape: LFOShape;
  rate: number;
  depth: number;
  target: LFOTarget;
  sync: boolean;
}

export interface TrackFX {
  filterEnabled: boolean;
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  filterCutoff: number;
  filterResonance: number;
  distortionEnabled: boolean;
  distortionAmount: number;
  bitcrusherEnabled: boolean;
  bitcrusherBits: number;
  bitcrusherRate: number;
  lfo: LFOConfig;
}

export interface KickParams {
  startFreq: number;    // 180
  endFreq: number;      // 40
  pitchDecay: number;   // 0.15
  ampDecay: number;     // 0.5
  clickAmount: number;  // 0.5
  gain: number;         // 0.8
}

export interface SnareParams {
  toneFreq: number;     // 200
  toneDecay: number;    // 0.1
  noiseDecay: number;   // 0.25
  noiseFilter: number;  // 1200
  gain: number;         // 0.7
}

export interface ClapParams {
  filterFreq: number;   // 1500
  decay: number;        // 0.1
  spread: number;       // 0.015
  gain: number;         // 0.65
}

export interface HihatClosedParams {
  filterFreq: number;   // 8000
  decay: number;        // 0.08
  gain: number;         // 0.5
}

export interface HihatOpenParams {
  filterFreq: number;   // 8000
  decay: number;        // 0.4
  gain: number;         // 0.45
}

export interface CymbalParams {
  filterFreq: number;   // 6000
  decay: number;        // 1.0
  gain: number;         // 0.4
}

export interface BassParams {
  oscType: OscType;
  subGain: number;          // 0.5
  filterCutoff: number;     // 400
  filterResonance: number;  // 8
  filterEnvelope: number;   // 1600
  distortion: number;       // 30
  attack: number;           // 0.01
  decay: number;            // 0.1
  sustain: number;          // 0.7
  release: number;          // 0.1
  gain: number;             // 0.7
}

export interface LeadParams {
  oscType: OscType;
  voiceCount: number;       // 3
  detuneSpread: number;     // 8
  filterCutoff: number;     // 3000
  filterResonance: number;  // 2
  attack: number;           // 0.02
  decay: number;            // 0.1
  sustain: number;          // 0.8
  release: number;          // 0.15
  gain: number;             // 0.5
}

export interface PadParams {
  oscType: OscType;
  voiceCount: number;       // 4
  detuneSpread: number;     // 15
  filterCutoff: number;     // 1500
  filterResonance: number;  // 1
  attack: number;           // 0.3
  decay: number;            // 0.2
  sustain: number;          // 0.6
  release: number;          // 0.8
  gain: number;             // 0.4
}

export type SynthParams =
  | KickParams
  | SnareParams
  | ClapParams
  | HihatClosedParams
  | HihatOpenParams
  | CymbalParams
  | BassParams
  | LeadParams
  | PadParams;

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  steps: Step[];
  notes: PianoRollNote[]; // for melodic tracks
  volume: number;   // 0-1
  pan: number;      // -1 to 1
  mute: boolean;
  solo: boolean;
  reverbSend: number; // 0-1
  delaySend: number;  // 0-1
  synthParams: SynthParams;
  fx: TrackFX;
}

export interface Pattern {
  id: string;
  name: string;
  tracks: Track[];
  stepCount: 16 | 32;
}

export interface ArrangementSlot {
  id: string;
  patternId: string;
  bars: number; // how many times to repeat
}

export interface Song {
  patterns: Pattern[];
  arrangement: ArrangementSlot[];
  currentPatternId: string;
  bpm: number;
  key: number;
  scale: string;
}
