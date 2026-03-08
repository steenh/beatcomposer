import { DrumSynth } from './instruments/DrumSynth';
import { BassSynth } from './instruments/BassSynth';
import { LeadSynth } from './instruments/LeadSynth';
import { PadSynth } from './instruments/PadSynth';
import type { Track, KickParams, SnareParams, ClapParams, HihatClosedParams, HihatOpenParams, CymbalParams, BassParams, LeadParams, PadParams } from '../sequencer/types';

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

    switch (track.type) {
      case 'kick':
        this.drums.triggerKick(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as KickParams);
        break;
      case 'snare':
        this.drums.triggerSnare(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as SnareParams);
        break;
      case 'clap':
        this.drums.triggerClap(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as ClapParams);
        break;
      case 'hihat-closed':
        this.drums.triggerHihatClosed(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as HihatClosedParams);
        break;
      case 'hihat-open':
        this.drums.triggerHihatOpen(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as HihatOpenParams);
        break;
      case 'cymbal':
        this.drums.triggerCymbal(time, track.steps[step].velocity / 127, track.reverbSend, track.delaySend, track.synthParams as CymbalParams);
        break;
      case 'bass':
      case 'lead':
      case 'pad': {
        const notes = track.notes.filter(n => n.step === step);
        for (const note of notes) {
          const duration = note.duration * stepDuration;
          if (track.type === 'bass') {
            this.bass.triggerNote(time, note.pitch, note.velocity / 127, duration, track.reverbSend, track.delaySend, track.synthParams as BassParams);
          } else if (track.type === 'lead') {
            this.lead.triggerNote(time, note.pitch, note.velocity / 127, duration, track.reverbSend, track.delaySend, track.synthParams as LeadParams);
          } else {
            this.pad.triggerNote(time, note.pitch, note.velocity / 127, duration, track.reverbSend, track.delaySend, track.synthParams as PadParams);
          }
        }
        break;
      }
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
