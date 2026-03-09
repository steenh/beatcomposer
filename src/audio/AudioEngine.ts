import { DrumSynth } from './instruments/DrumSynth';
import { BassSynth } from './instruments/BassSynth';
import { LeadSynth } from './instruments/LeadSynth';
import { PadSynth } from './instruments/PadSynth';
import type { Track, TrackType, TrackFX, KickParams, SnareParams, ClapParams, HihatClosedParams, HihatOpenParams, CymbalParams, BassParams, LeadParams, PadParams } from '../sequencer/types';

interface TrackFXChain {
  input: GainNode;
  filter: BiquadFilterNode;
  distortion: WaveShaperNode;
  distortionGain: GainNode;
  output: GainNode;
  lfoOsc: OscillatorNode | null;
  lfoGain: GainNode;
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const k = amount;
  const n = 256;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    if (k === 0) {
      curve[i] = x;
    } else {
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
  }
  return curve;
}

function makeBitcrusherCurve(bits: number): Float32Array<ArrayBuffer> {
  const steps = Math.pow(2, Math.max(1, bits));
  const n = 65536;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  return curve;
}

export class AudioEngine {
  ctx!: AudioContext;
  private masterGain!: GainNode;
  private compressor!: DynamicsCompressorNode;
  private reverbNode!: ConvolverNode;
  private reverbGain!: GainNode;
  private delayNode!: DelayNode;
  private delayFeedback!: GainNode;
  private delayWetGain!: GainNode;

  drums!: DrumSynth;
  bass!: BassSynth;
  lead!: LeadSynth;
  pad!: PadSynth;

  private initialized = false;
  private fxChains: Map<string, TrackFXChain> = new Map();

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    this.ctx = new AudioContext();

    // Master chain: instruments -> masterGain -> compressor -> destination
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.compressor.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.compressor);

    // Reverb
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.3;
    this.reverbGain.connect(this.masterGain);
    this.reverbNode = await this.createReverb();
    this.reverbNode.connect(this.reverbGain);

    // Delay
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.value = 0.375;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.35;
    this.delayWetGain = this.ctx.createGain();
    this.delayWetGain.gain.value = 0.25;
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);
    this.delayWetGain.connect(this.masterGain);

    this.drums = new DrumSynth(this.ctx, this.masterGain, this.reverbNode, this.delayNode);
    this.bass = new BassSynth(this.ctx, this.masterGain, this.reverbNode, this.delayNode);
    this.lead = new LeadSynth(this.ctx, this.masterGain, this.reverbNode, this.delayNode);
    this.pad = new PadSynth(this.ctx, this.masterGain, this.reverbNode, this.delayNode);

    // Create FX chains for all track types
    const trackTypes: TrackType[] = ['kick', 'snare', 'clap', 'hihat-closed', 'hihat-open', 'cymbal', 'bass', 'lead', 'pad'];
    for (const type of trackTypes) {
      this.fxChains.set(type, this.createFXChain(type));
    }
  }

  private createFXChain(_trackType: string): TrackFXChain {
    const input = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 20000;
    filter.Q.value = 0;

    const distortionGain = this.ctx.createGain();
    distortionGain.gain.value = 1;
    const distortion = this.ctx.createWaveShaper();
    distortion.curve = makeDistortionCurve(0);
    distortion.oversample = '2x';

    const output = this.ctx.createGain();
    output.gain.value = 1;

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0; // depth 0 = no modulation

    // Chain: input → filter → distortion → output → masterGain
    input.connect(filter);
    filter.connect(distortionGain);
    distortionGain.connect(distortion);
    distortion.connect(output);
    output.connect(this.masterGain);

    // LFO → filter.frequency (when LFO enabled)
    lfoGain.connect(filter.frequency);

    return { input, filter, distortion, distortionGain, output, lfoOsc: null, lfoGain };
  }

  private async createReverb(): Promise<ConvolverNode> {
    const convolver = this.ctx.createConvolver();
    const sampleRate = this.ctx.sampleRate;
    const length = Math.ceil(sampleRate * 2.5);
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    convolver.buffer = impulse;
    return convolver;
  }

  triggerTrack(track: Track, step: number, time: number, bpm: number): void {
    if (track.mute) return;
    const stepDuration = 60 / bpm / 4;
    const fxInput = this.fxChains.get(track.type)?.input ?? this.masterGain;

    switch (track.type) {
      case 'kick':
        this.drums.triggerKick(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as KickParams, fxInput);
        break;
      case 'snare':
        this.drums.triggerSnare(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as SnareParams, fxInput);
        break;
      case 'clap':
        this.drums.triggerClap(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as ClapParams, fxInput);
        break;
      case 'hihat-closed':
        this.drums.triggerHihatClosed(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as HihatClosedParams, fxInput);
        break;
      case 'hihat-open':
        this.drums.triggerHihatOpen(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as HihatOpenParams, fxInput);
        break;
      case 'cymbal':
        this.drums.triggerCymbal(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as CymbalParams, fxInput);
        break;
      case 'bass':
      case 'lead':
      case 'pad': {
        const notes = track.notes.filter(n => n.step === step);
        for (const note of notes) {
          const duration = note.duration * stepDuration;
          if (track.type === 'bass') {
            this.bass.triggerNote(time, note.pitch, note.velocity / 127, duration, track.reverbSend, track.delaySend, track.synthParams as BassParams, fxInput);
          } else if (track.type === 'lead') {
            this.lead.triggerNote(time, note.pitch, note.velocity / 127, duration, track.reverbSend, track.delaySend, track.synthParams as LeadParams, fxInput);
          } else {
            this.pad.triggerNote(time, note.pitch, note.velocity / 127, duration, track.reverbSend, track.delaySend, track.synthParams as PadParams, fxInput);
          }
        }
        break;
      }
    }
  }

  updateTrackFX(trackType: TrackType, fx: TrackFX, bpm: number): void {
    const chain = this.fxChains.get(trackType);
    if (!chain) return;

    // Filter
    chain.filter.type = fx.filterType;
    chain.filter.frequency.value = fx.filterEnabled ? fx.filterCutoff : 20000;
    chain.filter.Q.value = fx.filterEnabled ? fx.filterResonance : 0;

    // Distortion
    chain.distortion.curve = fx.distortionEnabled
      ? makeDistortionCurve(fx.distortionAmount)
      : makeDistortionCurve(0);

    // Bitcrusher (applied as second waveshaper, or reuse distortion if bitcrusher enabled)
    // Simple approach: bitcrusher replaces distortion curve when enabled
    if (fx.bitcrusherEnabled) {
      chain.distortion.curve = makeBitcrusherCurve(fx.bitcrusherBits);
    }

    // LFO
    if (chain.lfoOsc) {
      chain.lfoOsc.stop();
      chain.lfoOsc.disconnect();
      chain.lfoOsc = null;
    }
    if (fx.lfo.enabled) {
      const lfo = this.ctx.createOscillator();
      lfo.type = fx.lfo.shape;
      const rate = fx.lfo.sync ? (bpm / 60) * fx.lfo.rate : fx.lfo.rate;
      lfo.frequency.value = rate;
      chain.lfoGain.gain.value = fx.lfo.target === 'filterCutoff'
        ? fx.lfo.depth * fx.filterCutoff * 0.8
        : fx.lfo.depth;
      lfo.connect(chain.lfoGain);
      lfo.start();
      chain.lfoOsc = lfo;
    } else {
      chain.lfoGain.gain.value = 0;
    }
  }

  startLFOs(): void {
    // LFOs are started per updateTrackFX; this method can restart them if needed
    // For now, LFO oscillators are managed in updateTrackFX
  }

  stopLFOs(): void {
    for (const chain of this.fxChains.values()) {
      if (chain.lfoOsc) {
        try { chain.lfoOsc.stop(); } catch { /* ignore */ }
        chain.lfoOsc.disconnect();
        chain.lfoOsc = null;
      }
    }
  }

  previewNote(track: Track, pitch: number, velocity: number): void {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const fxInput = this.fxChains.get(track.type)?.input ?? this.masterGain;
    switch (track.type) {
      case 'kick': this.drums.triggerKick(time, velocity / 127, track.reverbSend, track.delaySend, track.synthParams as KickParams, fxInput); break;
      case 'snare': this.drums.triggerSnare(time, velocity / 127, track.reverbSend, track.delaySend, track.synthParams as SnareParams, fxInput); break;
      case 'clap': this.drums.triggerClap(time, velocity / 127, track.reverbSend, track.delaySend, track.synthParams as ClapParams, fxInput); break;
      case 'hihat-closed': this.drums.triggerHihatClosed(time, velocity / 127, track.reverbSend, track.delaySend, track.synthParams as HihatClosedParams, fxInput); break;
      case 'hihat-open': this.drums.triggerHihatOpen(time, velocity / 127, track.reverbSend, track.delaySend, track.synthParams as HihatOpenParams, fxInput); break;
      case 'cymbal': this.drums.triggerCymbal(time, velocity / 127, track.reverbSend, track.delaySend, track.synthParams as CymbalParams, fxInput); break;
      case 'bass': this.bass.triggerNote(time, pitch, velocity / 127, 0.3, track.reverbSend, track.delaySend, track.synthParams as BassParams, fxInput); break;
      case 'lead': this.lead.triggerNote(time, pitch, velocity / 127, 0.3, track.reverbSend, track.delaySend, track.synthParams as LeadParams, fxInput); break;
      case 'pad': this.pad.triggerNote(time, pitch, velocity / 127, 0.5, track.reverbSend, track.delaySend, track.synthParams as PadParams, fxInput); break;
    }
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMasterVolume(v: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = v;
    }
  }

  updateDelayTime(bpm: number): void {
    if (this.delayNode) {
      this.delayNode.delayTime.value = (60 / bpm) * 0.75;
    }
  }

  get isInitialized(): boolean {
    return this.initialized;
  }
}
