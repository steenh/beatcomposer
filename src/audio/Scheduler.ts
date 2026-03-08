import type { AudioEngine } from './AudioEngine';
import type { Song } from '../sequencer/Song';

export class Scheduler {
  private isPlaying = false;
  private currentStep = 0;
  private nextStepTime = 0;
  private timerId: number | null = null;
  private readonly lookahead = 0.1;      // seconds
  private readonly scheduleInterval = 25; // ms
  onStep?: (step: number, time: number) => void;

  constructor(private audio: AudioEngine, private song: Song) {}

  private stepDuration(): number {
    return 60 / this.song.data.bpm / 4; // 16th notes
  }

  private scheduleStep(step: number, time: number): void {
    const pattern = this.song.getCurrentPattern();
    for (const track of pattern.tracks) {
      if (track.mute) continue;
      const isDrum = !['bass', 'lead', 'pad'].includes(track.type);
      if (isDrum) {
        if (track.steps[step]?.active) {
          this.audio.triggerTrack(track, step, time, this.song.data.bpm);
        }
      } else {
        // Always check melodic tracks for piano roll notes
        this.audio.triggerTrack(track, step, time, this.song.data.bpm);
      }
    }
    this.onStep?.(step, time);
  }

  private tick(): void {
    const pattern = this.song.getCurrentPattern();
    while (this.nextStepTime < this.audio.ctx.currentTime + this.lookahead) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += this.stepDuration();
      this.currentStep = (this.currentStep + 1) % pattern.stepCount;
    }
    if (this.isPlaying) {
      this.timerId = window.setTimeout(() => this.tick(), this.scheduleInterval);
    }
  }

  start(): void {
    if (this.isPlaying) return;
    this.audio.resume();
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = this.audio.ctx.currentTime + 0.05;
    this.tick();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;
    this.onStep?.(-1, 0);
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get step(): number {
    return this.currentStep;
  }
}
