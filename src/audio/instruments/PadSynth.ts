import type { PadParams } from '../../sequencer/types';

export class PadSynth {
  private ctx: AudioContext;
  private destination: AudioNode;
  private reverbNode: AudioNode;
  private delayNode: AudioNode;

  constructor(ctx: AudioContext, destination: AudioNode, reverbNode: AudioNode, delayNode: AudioNode) {
    this.ctx = ctx;
    this.destination = destination;
    this.reverbNode = reverbNode;
    this.delayNode = delayNode;
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private centsToRatio(cents: number): number {
    return Math.pow(2, cents / 1200);
  }

  triggerNote(
    time: number,
    pitch: number,
    velocity: number,
    duration: number,
    reverbSend: number,
    delaySend: number,
    p: PadParams,
    outputNode?: AudioNode
  ): void {
    const freq = this.midiToFreq(pitch);
    const releaseTime = p.release;
    const endTime = time + duration + releaseTime;

    // Build detunings array dynamically
    const detunings: number[] = [];
    for (let i = 0; i < p.voiceCount; i++) {
      detunings.push(p.voiceCount === 1 ? 0 : ((i / (p.voiceCount - 1)) * 2 - 1) * p.detuneSpread);
    }

    // Master output gain
    const dest = outputNode ?? this.destination;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = p.gain * velocity;
    masterGain.connect(dest);

    if (reverbSend > 0) {
      const rv = this.ctx.createGain();
      rv.gain.value = reverbSend;
      masterGain.connect(rv);
      rv.connect(this.reverbNode);
    }
    if (delaySend > 0) {
      const dl = this.ctx.createGain();
      dl.gain.value = delaySend;
      masterGain.connect(dl);
      dl.connect(this.delayNode);
    }

    // Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = p.filterCutoff;
    filter.Q.value = p.filterResonance;
    filter.connect(masterGain);

    // Amp envelope - slow attack for lush pad
    const ampGain = this.ctx.createGain();
    ampGain.gain.setValueAtTime(0, time);
    ampGain.gain.linearRampToValueAtTime(1.0, time + p.attack);
    ampGain.gain.linearRampToValueAtTime(p.sustain, time + p.attack + p.decay);
    ampGain.gain.setValueAtTime(p.sustain, time + duration);
    ampGain.gain.linearRampToValueAtTime(0, time + duration + releaseTime);
    ampGain.connect(filter);

    // Detuned oscillators
    for (const detune of detunings) {
      const osc = this.ctx.createOscillator();
      osc.type = p.oscType;
      osc.frequency.value = freq * this.centsToRatio(detune);
      const oscGain = this.ctx.createGain();
      oscGain.gain.value = 1 / detunings.length;
      osc.connect(oscGain);
      oscGain.connect(ampGain);
      osc.start(time);
      osc.stop(endTime);
    }
  }
}
