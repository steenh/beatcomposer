import type { BassParams } from '../../sequencer/types';

export class BassSynth {
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

  private createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 256;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  triggerNote(
    time: number,
    pitch: number,
    velocity: number,
    duration: number,
    reverbSend: number,
    delaySend: number,
    p: BassParams,
    outputNode?: AudioNode
  ): void {
    const freq = this.midiToFreq(pitch);
    const releaseTime = p.release;
    const endTime = time + duration + releaseTime;

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

    // Distortion
    const distortion = this.ctx.createWaveShaper();
    distortion.curve = this.createDistortionCurve(p.distortion);
    distortion.oversample = '2x';
    distortion.connect(masterGain);

    // Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(p.filterCutoff + p.filterEnvelope, time);
    filter.frequency.exponentialRampToValueAtTime(p.filterCutoff, time + duration);
    filter.Q.value = p.filterResonance;
    filter.connect(distortion);

    // Amp envelope gain
    const ampGain = this.ctx.createGain();
    ampGain.gain.setValueAtTime(0, time);
    ampGain.gain.linearRampToValueAtTime(1.0, time + p.attack);
    ampGain.gain.setValueAtTime(1.0, time + p.attack + p.decay);
    ampGain.gain.linearRampToValueAtTime(p.sustain, time + p.attack + p.decay + 0.0001);
    // Sustain until note end then release
    ampGain.gain.setValueAtTime(p.sustain, time + duration);
    ampGain.gain.linearRampToValueAtTime(0, time + duration + releaseTime);
    ampGain.connect(filter);

    // Main oscillator
    const osc = this.ctx.createOscillator();
    osc.type = p.oscType;
    osc.frequency.value = freq;
    osc.connect(ampGain);
    osc.start(time);
    osc.stop(endTime);

    // Sub oscillator (sine)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = freq;
    const subGain = this.ctx.createGain();
    subGain.gain.value = p.subGain;
    subOsc.connect(subGain);
    subGain.connect(ampGain);
    subOsc.start(time);
    subOsc.stop(endTime);
  }
}
