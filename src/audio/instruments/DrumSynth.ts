import type { KickParams, SnareParams, ClapParams, HihatClosedParams, HihatOpenParams, CymbalParams } from '../../sequencer/types';

export class DrumSynth {
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

  private createNoise(duration: number): AudioBuffer {
    const length = Math.ceil(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private connectWithSends(
    source: AudioNode,
    reverbSend: number,
    delaySend: number,
    dest: AudioNode
  ): void {
    source.connect(dest);
    if (reverbSend > 0) {
      const reverbGain = this.ctx.createGain();
      reverbGain.gain.value = reverbSend;
      source.connect(reverbGain);
      reverbGain.connect(this.reverbNode);
    }
    if (delaySend > 0) {
      const delayGain = this.ctx.createGain();
      delayGain.gain.value = delaySend;
      source.connect(delayGain);
      delayGain.connect(this.delayNode);
    }
  }

  triggerKick(time: number, velocity: number, reverbSend: number, delaySend: number, p: KickParams, outputNode?: AudioNode): void {
    const dest = outputNode ?? this.destination;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = p.gain * velocity;
    this.connectWithSends(masterGain, reverbSend, delaySend, dest);

    // Sine oscillator with pitch envelope
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(p.endFreq, time + p.pitchDecay);

    const ampEnv = this.ctx.createGain();
    ampEnv.gain.setValueAtTime(1.0, time);
    ampEnv.gain.exponentialRampToValueAtTime(0.001, time + p.ampDecay);

    osc.connect(ampEnv);
    ampEnv.connect(masterGain);
    osc.start(time);
    osc.stop(time + p.ampDecay);

    // Click/noise burst at start
    const clickBuffer = this.createNoise(0.02);
    const clickSource = this.ctx.createBufferSource();
    clickSource.buffer = clickBuffer;

    const clickFilter = this.ctx.createBiquadFilter();
    clickFilter.type = 'highpass';
    clickFilter.frequency.value = 2000;

    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(p.clickAmount * velocity, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    clickSource.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(masterGain);
    clickSource.start(time);
    clickSource.stop(time + 0.02);
  }

  triggerSnare(time: number, velocity: number, reverbSend: number, delaySend: number, p: SnareParams, outputNode?: AudioNode): void {
    const dest = outputNode ?? this.destination;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = p.gain * velocity;
    this.connectWithSends(masterGain, reverbSend, delaySend, dest);

    // Sine component
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = p.toneFreq;

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + p.toneDecay);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(time);
    osc.stop(time + p.toneDecay);

    // Noise component
    const noiseBuffer = this.createNoise(p.noiseDecay);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = p.noiseFilter;
    bandpass.Q.value = 0.7;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + p.noiseDecay * 0.8);

    noiseSource.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(masterGain);
    noiseSource.start(time);
    noiseSource.stop(time + p.noiseDecay);
  }

  triggerClap(time: number, velocity: number, reverbSend: number, delaySend: number, p: ClapParams, outputNode?: AudioNode): void {
    const dest = outputNode ?? this.destination;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = p.gain * velocity;
    this.connectWithSends(masterGain, reverbSend, delaySend, dest);

    // 3 layered noise bursts
    for (let i = 0; i < 3; i++) {
      const offset = i * p.spread;
      const noiseBuffer = this.createNoise(p.decay + 0.02);
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = p.filterFreq;
      bandpass.Q.value = 1.0;

      const noiseGain = this.ctx.createGain();
      const burstTime = time + offset;
      noiseGain.gain.setValueAtTime(0.7, burstTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, burstTime + p.decay);

      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(masterGain);
      noiseSource.start(burstTime);
      noiseSource.stop(burstTime + p.decay + 0.02);
    }
  }

  triggerHihatClosed(time: number, velocity: number, reverbSend: number, delaySend: number, p: HihatClosedParams, outputNode?: AudioNode): void {
    const dest = outputNode ?? this.destination;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = p.gain * velocity;
    this.connectWithSends(masterGain, reverbSend, delaySend, dest);

    const noiseBuffer = this.createNoise(p.decay);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = p.filterFreq;

    const envGain = this.ctx.createGain();
    envGain.gain.setValueAtTime(1.0, time);
    envGain.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.625);

    noiseSource.connect(highpass);
    highpass.connect(envGain);
    envGain.connect(masterGain);
    noiseSource.start(time);
    noiseSource.stop(time + p.decay);
  }

  triggerHihatOpen(time: number, velocity: number, reverbSend: number, delaySend: number, p: HihatOpenParams, outputNode?: AudioNode): void {
    const dest = outputNode ?? this.destination;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = p.gain * velocity;
    this.connectWithSends(masterGain, reverbSend, delaySend, dest);

    const noiseBuffer = this.createNoise(p.decay);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = p.filterFreq;

    const envGain = this.ctx.createGain();
    envGain.gain.setValueAtTime(1.0, time);
    envGain.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.875);

    noiseSource.connect(highpass);
    highpass.connect(envGain);
    envGain.connect(masterGain);
    noiseSource.start(time);
    noiseSource.stop(time + p.decay);
  }

  triggerCymbal(time: number, velocity: number, reverbSend: number, delaySend: number, p: CymbalParams, outputNode?: AudioNode): void {
    const dest = outputNode ?? this.destination;
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = p.gain * velocity;
    this.connectWithSends(masterGain, reverbSend, delaySend, dest);

    const noiseBuffer = this.createNoise(p.decay);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = p.filterFreq;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 9000;
    bandpass.Q.value = 0.5;

    const envGain = this.ctx.createGain();
    envGain.gain.setValueAtTime(1.0, time);
    envGain.gain.exponentialRampToValueAtTime(0.001, time + p.decay * 0.8);

    noiseSource.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(envGain);
    envGain.connect(masterGain);
    noiseSource.start(time);
    noiseSource.stop(time + p.decay);
  }
}
