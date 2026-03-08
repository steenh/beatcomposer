import type { Song as SongData, Pattern, Track, PianoRollNote, Step, ArrangementSlot, SynthParams } from './types';
import type { TrackType } from './types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function makeStep(active = false, velocity = 100): Step {
  return { active, velocity };
}

function defaultSynthParams(type: TrackType): SynthParams {
  switch (type) {
    case 'kick': return { startFreq:180, endFreq:40, pitchDecay:0.15, ampDecay:0.5, clickAmount:0.5, gain:0.8 };
    case 'snare': return { toneFreq:200, toneDecay:0.1, noiseDecay:0.25, noiseFilter:1200, gain:0.7 };
    case 'clap': return { filterFreq:1500, decay:0.1, spread:0.015, gain:0.65 };
    case 'hihat-closed': return { filterFreq:8000, decay:0.08, gain:0.5 };
    case 'hihat-open': return { filterFreq:8000, decay:0.4, gain:0.45 };
    case 'cymbal': return { filterFreq:6000, decay:1.0, gain:0.4 };
    case 'bass': return { oscType:'sawtooth', subGain:0.5, filterCutoff:400, filterResonance:8, filterEnvelope:1600, distortion:30, attack:0.01, decay:0.1, sustain:0.7, release:0.1, gain:0.7 };
    case 'lead': return { oscType:'sawtooth', voiceCount:3, detuneSpread:8, filterCutoff:3000, filterResonance:2, attack:0.02, decay:0.1, sustain:0.8, release:0.15, gain:0.5 };
    case 'pad': return { oscType:'sawtooth', voiceCount:4, detuneSpread:15, filterCutoff:1500, filterResonance:1, attack:0.3, decay:0.2, sustain:0.6, release:0.8, gain:0.4 };
  }
}

function makeTrack(type: TrackType, name: string, stepCount = 16): Track {
  return {
    id: generateId(),
    name,
    type,
    steps: Array.from({ length: stepCount }, () => makeStep()),
    notes: [],
    volume: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    reverbSend: type === 'pad' ? 0.6 : type === 'lead' ? 0.3 : 0.1,
    delaySend: type === 'lead' ? 0.3 : type === 'bass' ? 0.1 : 0.0,
    synthParams: defaultSynthParams(type),
  };
}

function makeDefaultPattern(patternNum: number): Pattern {
  const stepCount = 16;
  const tracks: Track[] = [
    makeTrack('kick', 'Kick', stepCount),
    makeTrack('snare', 'Snare', stepCount),
    makeTrack('clap', 'Clap', stepCount),
    makeTrack('hihat-closed', 'HH Closed', stepCount),
    makeTrack('hihat-open', 'HH Open', stepCount),
    makeTrack('cymbal', 'Cymbal', stepCount),
    makeTrack('bass', 'Bass', stepCount),
    makeTrack('lead', 'Lead', stepCount),
    makeTrack('pad', 'Pad', stepCount),
  ];

  if (patternNum === 0) {
    // Kick: 4-on-the-floor
    [0, 4, 8, 12].forEach(i => { tracks[0].steps[i] = makeStep(true, 110); });
    // Snare
    [4, 12].forEach(i => { tracks[1].steps[i] = makeStep(true, 100); });
    // Clap
    [4, 12].forEach(i => { tracks[2].steps[i] = makeStep(true, 95); });
    // Hihat closed: all even steps
    [0, 2, 4, 6, 8, 10, 12, 14].forEach(i => { tracks[3].steps[i] = makeStep(true, 80); });
    // Hihat open: step 10
    tracks[4].steps[10] = makeStep(true, 90);
    // Cymbal: step 0
    tracks[5].steps[0] = makeStep(true, 85);
  }

  return {
    id: generateId(),
    name: `Pattern ${patternNum + 1}`,
    tracks,
    stepCount,
  };
}

type EventCallback = (data?: unknown) => void;

export class Song {
  data: SongData;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  constructor() {
    const patterns: Pattern[] = Array.from({ length: 8 }, (_, i) => makeDefaultPattern(i));
    this.data = {
      patterns,
      arrangement: [],
      currentPatternId: patterns[0].id,
      bpm: 128,
      key: 0,
      scale: 'natural minor',
    };
  }

  getCurrentPattern(): Pattern {
    return this.getPattern(this.data.currentPatternId);
  }

  getPattern(id: string): Pattern {
    const p = this.data.patterns.find(p => p.id === id);
    if (!p) throw new Error(`Pattern ${id} not found`);
    return p;
  }

  setCurrentPattern(id: string): void {
    this.data.currentPatternId = id;
    this.emit('patternChange', id);
  }

  private findTrack(patternId: string, trackId: string): Track {
    const pattern = this.getPattern(patternId);
    const track = pattern.tracks.find(t => t.id === trackId);
    if (!track) throw new Error(`Track ${trackId} not found`);
    return track;
  }

  toggleStep(patternId: string, trackId: string, stepIndex: number): void {
    const track = this.findTrack(patternId, trackId);
    const step = track.steps[stepIndex];
    if (step) {
      step.active = !step.active;
      this.emit('stepChange', { patternId, trackId, stepIndex, step });
    }
  }

  setStepVelocity(patternId: string, trackId: string, stepIndex: number, velocity: number): void {
    const track = this.findTrack(patternId, trackId);
    const step = track.steps[stepIndex];
    if (step) {
      step.velocity = Math.max(0, Math.min(127, velocity));
      this.emit('stepChange', { patternId, trackId, stepIndex, step });
    }
  }

  addNote(patternId: string, trackId: string, note: PianoRollNote): void {
    const track = this.findTrack(patternId, trackId);
    track.notes.push(note);
    this.emit('notesChange', { patternId, trackId, notes: track.notes });
  }

  removeNote(patternId: string, trackId: string, noteId: string): void {
    const track = this.findTrack(patternId, trackId);
    track.notes = track.notes.filter(n => n.id !== noteId);
    this.emit('notesChange', { patternId, trackId, notes: track.notes });
  }

  updateNote(patternId: string, trackId: string, note: PianoRollNote): void {
    const track = this.findTrack(patternId, trackId);
    const idx = track.notes.findIndex(n => n.id === note.id);
    if (idx >= 0) {
      track.notes[idx] = note;
      this.emit('notesChange', { patternId, trackId, notes: track.notes });
    }
  }

  setTrackVolume(patternId: string, trackId: string, volume: number): void {
    const track = this.findTrack(patternId, trackId);
    track.volume = Math.max(0, Math.min(1, volume));
    this.emit('trackChange', { patternId, trackId, track });
  }

  setTrackPan(patternId: string, trackId: string, pan: number): void {
    const track = this.findTrack(patternId, trackId);
    track.pan = Math.max(-1, Math.min(1, pan));
    this.emit('trackChange', { patternId, trackId, track });
  }

  setTrackMute(patternId: string, trackId: string, mute: boolean): void {
    const track = this.findTrack(patternId, trackId);
    track.mute = mute;
    this.emit('trackChange', { patternId, trackId, track });
  }

  setTrackSolo(patternId: string, trackId: string, solo: boolean): void {
    const pattern = this.getPattern(patternId);
    // If enabling solo, disable solo on all other tracks
    if (solo) {
      pattern.tracks.forEach(t => { t.solo = false; });
    }
    const track = this.findTrack(patternId, trackId);
    track.solo = solo;
    // If any track is soloed, mute all non-solo tracks
    const anySolo = pattern.tracks.some(t => t.solo);
    if (anySolo) {
      pattern.tracks.forEach(t => { t.mute = !t.solo; });
    } else {
      // When disabling solo, unmute all
      pattern.tracks.forEach(t => { t.mute = false; });
    }
    this.emit('trackChange', { patternId, trackId, track });
    this.emit('patternTracksChange', { patternId });
  }

  setTrackReverbSend(patternId: string, trackId: string, send: number): void {
    const track = this.findTrack(patternId, trackId);
    track.reverbSend = Math.max(0, Math.min(1, send));
    this.emit('trackChange', { patternId, trackId, track });
  }

  setTrackDelaySend(patternId: string, trackId: string, send: number): void {
    const track = this.findTrack(patternId, trackId);
    track.delaySend = Math.max(0, Math.min(1, send));
    this.emit('trackChange', { patternId, trackId, track });
  }

  setBpm(bpm: number): void {
    this.data.bpm = Math.max(60, Math.min(200, bpm));
    this.emit('bpmChange', this.data.bpm);
  }

  addArrangementSlot(patternId: string): void {
    const slot: ArrangementSlot = {
      id: generateId(),
      patternId,
      bars: 1,
    };
    this.data.arrangement.push(slot);
    this.emit('arrangementChange', this.data.arrangement);
  }

  removeArrangementSlot(id: string): void {
    this.data.arrangement = this.data.arrangement.filter(s => s.id !== id);
    this.emit('arrangementChange', this.data.arrangement);
  }

  setSynthParam(patternId: string, trackId: string, key: string, value: number | string): void {
    const track = this.getPattern(patternId).tracks.find(t => t.id === trackId);
    if (!track) return;
    (track.synthParams as unknown as Record<string, number | string>)[key] = value;
    this.emit('paramChange', { patternId, trackId, key, value });
  }

  setKey(key: number): void {
    this.data.key = key;
    this.emit('scaleChange', { key, scale: this.data.scale });
  }

  setScale(scale: string): void {
    this.data.scale = scale;
    this.emit('scaleChange', { key: this.data.key, scale });
  }

  serialize(): string {
    return JSON.stringify(this.data, null, 2);
  }

  loadFromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      // Basic validation
      if (!parsed.patterns || !Array.isArray(parsed.patterns)) throw new Error('Invalid song file');
      this.data = parsed;
      this.emit('fullReset', null);
    } catch (e) {
      console.error('Failed to load song:', e);
      alert('Invalid song file. Please select a valid Beat Composer JSON file.');
    }
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}
