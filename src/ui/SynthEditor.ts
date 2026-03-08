import type { Track } from '../sequencer/types';

interface ParamDef {
  key: string;
  label: string;
  type: 'range' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export class SynthEditor {
  element: HTMLElement;
  onParamChange?: (trackId: string, key: string, value: number | string) => void;
  currentTrackId: string | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'synth-editor';
    this.element.innerHTML = '<div class="synth-editor-title">SYNTH EDITOR</div><div class="synth-editor-body"></div>';
    this.hide();
  }

  private getParamDefs(track: Track): ParamDef[] {
    switch (track.type) {
      case 'kick': return [
        { key: 'gain', label: 'Gain', type: 'range', min: 0.1, max: 1.5, step: 0.01 },
        { key: 'startFreq', label: 'Start Hz', type: 'range', min: 60, max: 400, step: 1 },
        { key: 'endFreq', label: 'End Hz', type: 'range', min: 20, max: 100, step: 1 },
        { key: 'pitchDecay', label: 'Pitch Decay', type: 'range', min: 0.01, max: 0.5, step: 0.01 },
        { key: 'ampDecay', label: 'Amp Decay', type: 'range', min: 0.1, max: 1.5, step: 0.01 },
        { key: 'clickAmount', label: 'Click', type: 'range', min: 0, max: 1, step: 0.01 },
      ];
      case 'snare': return [
        { key: 'gain', label: 'Gain', type: 'range', min: 0.1, max: 1.5, step: 0.01 },
        { key: 'toneFreq', label: 'Tone Hz', type: 'range', min: 80, max: 600, step: 1 },
        { key: 'toneDecay', label: 'Tone Decay', type: 'range', min: 0.01, max: 0.5, step: 0.01 },
        { key: 'noiseDecay', label: 'Noise Decay', type: 'range', min: 0.05, max: 0.8, step: 0.01 },
        { key: 'noiseFilter', label: 'Noise Filter', type: 'range', min: 300, max: 5000, step: 10 },
      ];
      case 'clap': return [
        { key: 'gain', label: 'Gain', type: 'range', min: 0.1, max: 1.5, step: 0.01 },
        { key: 'filterFreq', label: 'Filter Hz', type: 'range', min: 500, max: 5000, step: 10 },
        { key: 'decay', label: 'Decay', type: 'range', min: 0.02, max: 0.5, step: 0.01 },
        { key: 'spread', label: 'Spread', type: 'range', min: 0.001, max: 0.05, step: 0.001 },
      ];
      case 'hihat-closed': return [
        { key: 'gain', label: 'Gain', type: 'range', min: 0.1, max: 1.5, step: 0.01 },
        { key: 'filterFreq', label: 'Filter Hz', type: 'range', min: 2000, max: 18000, step: 100 },
        { key: 'decay', label: 'Decay', type: 'range', min: 0.01, max: 0.3, step: 0.005 },
      ];
      case 'hihat-open': return [
        { key: 'gain', label: 'Gain', type: 'range', min: 0.1, max: 1.5, step: 0.01 },
        { key: 'filterFreq', label: 'Filter Hz', type: 'range', min: 2000, max: 18000, step: 100 },
        { key: 'decay', label: 'Decay', type: 'range', min: 0.05, max: 1.5, step: 0.01 },
      ];
      case 'cymbal': return [
        { key: 'gain', label: 'Gain', type: 'range', min: 0.1, max: 1.5, step: 0.01 },
        { key: 'filterFreq', label: 'Filter Hz', type: 'range', min: 2000, max: 14000, step: 100 },
        { key: 'decay', label: 'Decay', type: 'range', min: 0.2, max: 3.0, step: 0.05 },
      ];
      case 'bass': return [
        { key: 'oscType', label: 'Osc Type', type: 'select', options: ['sawtooth', 'square', 'triangle', 'sine'] },
        { key: 'gain', label: 'Gain', type: 'range', min: 0.1, max: 1.5, step: 0.01 },
        { key: 'subGain', label: 'Sub Mix', type: 'range', min: 0, max: 1, step: 0.01 },
        { key: 'filterCutoff', label: 'Filter Cutoff', type: 'range', min: 50, max: 4000, step: 10 },
        { key: 'filterResonance', label: 'Resonance', type: 'range', min: 0, max: 20, step: 0.1 },
        { key: 'filterEnvelope', label: 'Filter Env', type: 'range', min: 0, max: 5000, step: 10 },
        { key: 'distortion', label: 'Distortion', type: 'range', min: 0, max: 100, step: 1 },
        { key: 'attack', label: 'Attack', type: 'range', min: 0.001, max: 0.5, step: 0.001 },
        { key: 'decay', label: 'Decay', type: 'range', min: 0.01, max: 0.5, step: 0.01 },
        { key: 'sustain', label: 'Sustain', type: 'range', min: 0, max: 1, step: 0.01 },
        { key: 'release', label: 'Release', type: 'range', min: 0.01, max: 1, step: 0.01 },
      ];
      case 'lead': return [
        { key: 'oscType', label: 'Osc Type', type: 'select', options: ['sawtooth', 'square', 'triangle', 'sine'] },
        { key: 'gain', label: 'Gain', type: 'range', min: 0.1, max: 1.5, step: 0.01 },
        { key: 'voiceCount', label: 'Voices', type: 'range', min: 1, max: 7, step: 1 },
        { key: 'detuneSpread', label: 'Detune', type: 'range', min: 0, max: 50, step: 0.5 },
        { key: 'filterCutoff', label: 'Filter Cutoff', type: 'range', min: 200, max: 12000, step: 50 },
        { key: 'filterResonance', label: 'Resonance', type: 'range', min: 0, max: 10, step: 0.1 },
        { key: 'attack', label: 'Attack', type: 'range', min: 0.001, max: 1, step: 0.001 },
        { key: 'decay', label: 'Decay', type: 'range', min: 0.01, max: 1, step: 0.01 },
        { key: 'sustain', label: 'Sustain', type: 'range', min: 0, max: 1, step: 0.01 },
        { key: 'release', label: 'Release', type: 'range', min: 0.01, max: 2, step: 0.01 },
      ];
      case 'pad': return [
        { key: 'oscType', label: 'Osc Type', type: 'select', options: ['sawtooth', 'square', 'triangle', 'sine'] },
        { key: 'gain', label: 'Gain', type: 'range', min: 0.1, max: 1.5, step: 0.01 },
        { key: 'voiceCount', label: 'Voices', type: 'range', min: 1, max: 8, step: 1 },
        { key: 'detuneSpread', label: 'Detune', type: 'range', min: 0, max: 50, step: 0.5 },
        { key: 'filterCutoff', label: 'Filter Cutoff', type: 'range', min: 100, max: 6000, step: 50 },
        { key: 'filterResonance', label: 'Resonance', type: 'range', min: 0, max: 5, step: 0.1 },
        { key: 'attack', label: 'Attack', type: 'range', min: 0.01, max: 3, step: 0.01 },
        { key: 'decay', label: 'Decay', type: 'range', min: 0.01, max: 1, step: 0.01 },
        { key: 'sustain', label: 'Sustain', type: 'range', min: 0, max: 1, step: 0.01 },
        { key: 'release', label: 'Release', type: 'range', min: 0.05, max: 5, step: 0.05 },
      ];
      default: return [];
    }
  }

  setTrack(track: Track): void {
    this.currentTrackId = track.id;
    const body = this.element.querySelector('.synth-editor-body') as HTMLElement;
    body.innerHTML = `<div class="synth-track-name">${track.name}</div>`;

    const params = track.synthParams as unknown as Record<string, number | string>;
    const defs = this.getParamDefs(track);

    for (const def of defs) {
      const row = document.createElement('div');
      row.className = 'synth-param-row';

      if (def.type === 'range') {
        const val = params[def.key] as number;
        const displayVal = document.createElement('span');
        displayVal.className = 'synth-param-value';
        displayVal.textContent = val.toFixed(def.step! < 0.01 ? 3 : def.step! < 1 ? 2 : 0);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = String(def.min);
        slider.max = String(def.max);
        slider.step = String(def.step);
        slider.value = String(val);
        slider.className = 'synth-slider';
        slider.addEventListener('input', () => {
          const numVal = parseFloat(slider.value);
          displayVal.textContent = numVal.toFixed(def.step! < 0.01 ? 3 : def.step! < 1 ? 2 : 0);
          if (this.currentTrackId) this.onParamChange?.(this.currentTrackId, def.key, numVal);
        });

        row.innerHTML = `<label class="synth-param-label">${def.label}</label>`;
        row.appendChild(slider);
        row.appendChild(displayVal);
      } else if (def.type === 'select') {
        const val = params[def.key] as string;
        const select = document.createElement('select');
        select.className = 'synth-select';
        for (const opt of def.options!) {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          if (opt === val) option.selected = true;
          select.appendChild(option);
        }
        select.addEventListener('change', () => {
          if (this.currentTrackId) this.onParamChange?.(this.currentTrackId, def.key, select.value);
        });
        row.innerHTML = `<label class="synth-param-label">${def.label}</label>`;
        row.appendChild(select);
      }

      body.appendChild(row);
    }
  }

  show(): void { this.element.style.display = 'flex'; }
  hide(): void { this.element.style.display = 'none'; }
}
