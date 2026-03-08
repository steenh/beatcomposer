import type { Song } from '../sequencer/Song';
import type { AudioEngine } from '../audio/AudioEngine';
import type { Scheduler } from '../audio/Scheduler';
import type { Track, PianoRollNote } from '../sequencer/types';
import { TransportBar } from './TransportBar';
import { PatternSelector } from './PatternSelector';
import { TrackPanel } from './TrackPanel';
import { StepGrid } from './StepGrid';
import { PianoRoll } from './PianoRoll';
import { Arranger } from './Arranger';
import { SynthEditor } from './SynthEditor';

export class App {
  element: HTMLElement;
  private transport: TransportBar;
  private patternSelector: PatternSelector;
  private trackPanel: TrackPanel;
  private stepGrid: StepGrid;
  private pianoRoll: PianoRoll;
  private arranger: Arranger;
  private synthEditor: SynthEditor;
  private sequencerArea!: HTMLElement;
  private pianoRollVisible = false;
  private activeTrackId: string | null = null;
  private audioInitialized = false;

  constructor(
    private song: Song,
    private audio: AudioEngine,
    private scheduler: Scheduler,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'app';

    this.transport = new TransportBar();
    this.patternSelector = new PatternSelector();
    this.trackPanel = new TrackPanel();
    this.stepGrid = new StepGrid();
    this.pianoRoll = new PianoRoll();
    this.arranger = new Arranger();
    this.synthEditor = new SynthEditor();

    this.buildLayout();
    this.wireEvents();
    this.refreshAll();
  }

  private buildLayout(): void {
    // Transport bar
    this.element.appendChild(this.transport.element);

    // Pattern selector
    this.element.appendChild(this.patternSelector.element);

    // Main area (track panel + sequencer)
    const mainArea = document.createElement('div');
    mainArea.className = 'main-area';

    // Track panel on the left
    mainArea.appendChild(this.trackPanel.element);

    // Sequencer area on the right
    this.sequencerArea = document.createElement('div');
    this.sequencerArea.className = 'sequencer-area';
    this.sequencerArea.appendChild(this.stepGrid.element);
    this.sequencerArea.appendChild(this.pianoRoll.element);
    this.pianoRoll.element.style.display = 'none';

    mainArea.appendChild(this.sequencerArea);
    mainArea.appendChild(this.synthEditor.element);
    this.element.appendChild(mainArea);

    // Arranger at the bottom
    this.element.appendChild(this.arranger.element);
  }

  private wireEvents(): void {
    // Transport
    this.transport.onPlay(() => this.handlePlay());
    this.transport.onStop(() => this.handleStop());
    this.transport.onBpmChange((bpm) => {
      this.song.setBpm(bpm);
      this.audio.updateDelayTime?.(bpm);
    });
    this.transport.onVolumeChange((vol) => {
      if (this.audio.isInitialized) {
        this.audio.setMasterVolume(vol);
      }
    });

    // Pattern selector
    this.patternSelector.onSelect((id) => {
      this.song.setCurrentPattern(id);
      this.patternSelector.setActive(id);
      this.refreshPattern();
    });

    // Track panel
    this.trackPanel.onMute((trackId, mute) => {
      const pattern = this.song.getCurrentPattern();
      this.song.setTrackMute(pattern.id, trackId, mute);
    });
    this.trackPanel.onSolo((trackId, solo) => {
      const pattern = this.song.getCurrentPattern();
      this.song.setTrackSolo(pattern.id, trackId, solo);
      this.refreshTrackPanel();
    });
    this.trackPanel.onVolumeChange((trackId, vol) => {
      const pattern = this.song.getCurrentPattern();
      this.song.setTrackVolume(pattern.id, trackId, vol);
    });
    this.trackPanel.onPanChange((trackId, pan) => {
      const pattern = this.song.getCurrentPattern();
      this.song.setTrackPan(pattern.id, trackId, pan);
    });
    this.trackPanel.onReverbChange((trackId, send) => {
      const pattern = this.song.getCurrentPattern();
      this.song.setTrackReverbSend(pattern.id, trackId, send);
    });
    this.trackPanel.onDelayChange((trackId, send) => {
      const pattern = this.song.getCurrentPattern();
      this.song.setTrackDelaySend(pattern.id, trackId, send);
    });
    this.trackPanel.onPianoRollOpen((trackId) => {
      this.openPianoRoll(trackId);
    });

    this.trackPanel.onSynthOpen = (trackId) => {
      const pattern = this.song.getCurrentPattern();
      const track = pattern.tracks.find(t => t.id === trackId);
      if (!track) return;
      this.synthEditor.setTrack(track);
      this.synthEditor.show();
    };

    this.synthEditor.onParamChange = (trackId, key, value) => {
      const pattern = this.song.getCurrentPattern();
      this.song.setSynthParam(pattern.id, trackId, key, value);
    };

    this.transport.onSave = () => {
      const json = this.song.serialize();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'beatcomposer-song.json';
      a.click();
      URL.revokeObjectURL(url);
    };

    this.transport.onLoad = (json) => {
      this.song.loadFromJSON(json);
    };

    // Step grid
    this.stepGrid.onStepClick((trackId, stepIndex) => {
      const pattern = this.song.getCurrentPattern();
      this.song.toggleStep(pattern.id, trackId, stepIndex);
      const track = pattern.tracks.find(t => t.id === trackId);
      if (track) {
        this.stepGrid.updateTrackSteps(track);
      }
    });

    // Piano roll
    this.pianoRoll.onNotesChange((notes) => {
      if (!this.activeTrackId) return;
      const pattern = this.song.getCurrentPattern();
      const track = pattern.tracks.find(t => t.id === this.activeTrackId);
      if (!track) return;
      // Replace all notes with the new set
      track.notes = notes;
      this.song.emit('notesChange', { patternId: pattern.id, trackId: this.activeTrackId, notes });
    });

    // Arranger
    this.arranger.onAdd(() => {
      const pattern = this.song.getCurrentPattern();
      this.song.addArrangementSlot(pattern.id);
      this.refreshArranger();
    });
    this.arranger.onRemove((id) => {
      this.song.removeArrangementSlot(id);
      this.refreshArranger();
    });

    // Scheduler step callback
    this.scheduler.onStep = (step, _time) => {
      // Use requestAnimationFrame to update UI
      requestAnimationFrame(() => {
        this.stepGrid.setCurrentStep(step);
        if (this.pianoRollVisible) {
          this.pianoRoll.setCurrentStep(step);
        }
      });
    };

    // Song events
    this.song.on('patternChange', () => {
      this.refreshPattern();
    });
    this.song.on('bpmChange', (bpm) => {
      this.transport.setBpm(bpm as number);
    });

    this.song.on('fullReset', () => {
      this.pianoRollVisible = false;
      this.activeTrackId = null;
      this.pianoRoll.element.style.display = 'none';
      this.stepGrid.element.style.display = 'block';
      this.synthEditor.hide();
      this.refreshAll();
    });

    this.song.on('scaleChange', (data) => {
      const { key, scale } = data as { key: number; scale: string };
      if (this.pianoRoll.setScale) this.pianoRoll.setScale(key, scale);
    });
  }

  private async handlePlay(): Promise<void> {
    if (!this.audioInitialized) {
      await this.audio.init();
      this.audioInitialized = true;
    }
    if (this.scheduler.playing) {
      this.scheduler.stop();
      this.transport.setPlaying(false);
    } else {
      this.scheduler.start();
      this.transport.setPlaying(true);
    }
  }

  private handleStop(): void {
    this.scheduler.stop();
    this.transport.setPlaying(false);
    this.stepGrid.setCurrentStep(-1);
    if (this.pianoRollVisible) {
      this.pianoRoll.setCurrentStep(-1);
    }
  }

  private openPianoRoll(trackId: string): void {
    const pattern = this.song.getCurrentPattern();
    const track = pattern.tracks.find(t => t.id === trackId);
    if (!track) return;

    this.activeTrackId = trackId;
    this.trackPanel.setActiveTrack(trackId);

    if (this.pianoRollVisible && this.activeTrackId === trackId) {
      // Toggle off
      this.pianoRollVisible = false;
      this.pianoRoll.element.style.display = 'none';
      this.stepGrid.element.style.display = 'block';
      this.activeTrackId = null;
      this.trackPanel.setActiveTrack('');
      return;
    }

    this.pianoRoll.setTrack(track);
    this.pianoRollVisible = true;
    this.pianoRoll.element.style.display = 'flex';
    this.stepGrid.element.style.display = 'none';
  }

  private refreshAll(): void {
    const pattern = this.song.getCurrentPattern();
    this.transport.setBpm(this.song.data.bpm);
    this.patternSelector.setPatterns(this.song.data.patterns, pattern.id);
    this.trackPanel.setTracks(pattern.tracks);
    this.stepGrid.setPattern(pattern);
    this.refreshArranger();
  }

  private refreshPattern(): void {
    const pattern = this.song.getCurrentPattern();
    this.trackPanel.setTracks(pattern.tracks);
    this.stepGrid.setPattern(pattern);
    this.patternSelector.setActive(pattern.id);

    // If piano roll is open, update it
    if (this.pianoRollVisible && this.activeTrackId) {
      const track = pattern.tracks.find(t => t.id === this.activeTrackId);
      if (track) {
        this.pianoRoll.setTrack(track);
      } else {
        // Track not in new pattern, close piano roll
        this.pianoRollVisible = false;
        this.pianoRoll.element.style.display = 'none';
        this.stepGrid.element.style.display = 'block';
      }
    }
  }

  private refreshTrackPanel(): void {
    const pattern = this.song.getCurrentPattern();
    this.trackPanel.setTracks(pattern.tracks);
  }

  private refreshArranger(): void {
    this.arranger.setArrangement(this.song.data.arrangement, this.song.data.patterns);
  }

  // Called when a piano roll note changes
  private handlePianoRollNotesChange(notes: PianoRollNote[]): void {
    if (!this.activeTrackId) return;
    const pattern = this.song.getCurrentPattern();
    const track = pattern.tracks.find(t => t.id === this.activeTrackId);
    if (!track) return;
    track.notes = notes;
  }
}
