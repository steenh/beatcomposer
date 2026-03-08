import type { Track } from '../sequencer/types';

export class TrackPanel {
  element: HTMLElement;
  private trackRows: Map<string, HTMLElement> = new Map();
  private activeTrackId: string | null = null;

  private muteCallback?: (trackId: string, mute: boolean) => void;
  private soloCallback?: (trackId: string, solo: boolean) => void;
  private volumeCallback?: (trackId: string, vol: number) => void;
  private panCallback?: (trackId: string, pan: number) => void;
  private reverbCallback?: (trackId: string, send: number) => void;
  private delayCallback?: (trackId: string, send: number) => void;
  private pianoRollCallback?: (trackId: string) => void;
  onSynthOpen?: (trackId: string) => void;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'track-panel';
  }

  setTracks(tracks: Track[]): void {
    this.element.innerHTML = '';
    this.trackRows.clear();

    const header = document.createElement('div');
    header.className = 'track-panel-header';
    header.textContent = 'TRACKS';
    this.element.appendChild(header);

    for (const track of tracks) {
      const row = this.createTrackRow(track);
      this.trackRows.set(track.id, row);
      this.element.appendChild(row);
    }
  }

  private createTrackRow(track: Track): HTMLElement {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.dataset.trackId = track.id;
    if (track.id === this.activeTrackId) row.classList.add('active');

    // Track name
    const nameEl = document.createElement('div');
    nameEl.className = 'track-name';
    nameEl.textContent = track.name;
    nameEl.style.color = this.getTrackColor(track.type);
    row.appendChild(nameEl);

    // Controls row
    const controls = document.createElement('div');
    controls.className = 'track-controls';

    // Mute button
    const muteBtn = document.createElement('button');
    muteBtn.className = 'mute-btn' + (track.mute ? ' active' : '');
    muteBtn.textContent = 'M';
    muteBtn.title = 'Mute';
    muteBtn.addEventListener('click', () => {
      const newMute = !track.mute;
      muteBtn.classList.toggle('active', newMute);
      this.muteCallback?.(track.id, newMute);
    });
    controls.appendChild(muteBtn);

    // Solo button
    const soloBtn = document.createElement('button');
    soloBtn.className = 'solo-btn' + (track.solo ? ' active' : '');
    soloBtn.textContent = 'S';
    soloBtn.title = 'Solo';
    soloBtn.addEventListener('click', () => {
      const newSolo = !track.solo;
      soloBtn.classList.toggle('active', newSolo);
      this.soloCallback?.(track.id, newSolo);
    });
    controls.appendChild(soloBtn);

    // SYNTH button (for all tracks)
    const synthBtn = document.createElement('button');
    synthBtn.className = 'btn-synth';
    synthBtn.textContent = 'SYNTH';
    synthBtn.title = 'Open Synth Editor';
    synthBtn.addEventListener('click', () => {
      this.onSynthOpen?.(track.id);
    });
    controls.appendChild(synthBtn);

    // Piano roll button for melodic tracks
    if (['bass', 'lead', 'pad'].includes(track.type)) {
      const prBtn = document.createElement('button');
      prBtn.className = 'piano-roll-btn';
      prBtn.textContent = 'PR';
      prBtn.title = 'Open Piano Roll';
      prBtn.addEventListener('click', () => {
        this.pianoRollCallback?.(track.id);
      });
      controls.appendChild(prBtn);
    }

    row.appendChild(controls);

    // Volume slider
    const volRow = document.createElement('div');
    volRow.className = 'track-slider-row';
    const volLabel = document.createElement('span');
    volLabel.className = 'slider-label';
    volLabel.textContent = 'V';
    const volSlider = document.createElement('input');
    volSlider.type = 'range';
    volSlider.min = '0';
    volSlider.max = '1';
    volSlider.step = '0.01';
    volSlider.value = String(track.volume);
    volSlider.className = 'track-slider vol-slider';
    volSlider.style.setProperty('--track-color', this.getTrackColor(track.type));
    volSlider.addEventListener('input', () => {
      this.volumeCallback?.(track.id, parseFloat(volSlider.value));
    });
    volRow.appendChild(volLabel);
    volRow.appendChild(volSlider);
    row.appendChild(volRow);

    // Pan slider
    const panRow = document.createElement('div');
    panRow.className = 'track-slider-row';
    const panLabel = document.createElement('span');
    panLabel.className = 'slider-label';
    panLabel.textContent = 'P';
    const panSlider = document.createElement('input');
    panSlider.type = 'range';
    panSlider.min = '-1';
    panSlider.max = '1';
    panSlider.step = '0.01';
    panSlider.value = String(track.pan);
    panSlider.className = 'track-slider pan-slider';
    panSlider.style.setProperty('--track-color', this.getTrackColor(track.type));
    panSlider.addEventListener('input', () => {
      this.panCallback?.(track.id, parseFloat(panSlider.value));
    });
    panRow.appendChild(panLabel);
    panRow.appendChild(panSlider);
    row.appendChild(panRow);

    // Reverb send
    const rvRow = document.createElement('div');
    rvRow.className = 'track-slider-row';
    const rvLabel = document.createElement('span');
    rvLabel.className = 'slider-label';
    rvLabel.textContent = 'R';
    const rvSlider = document.createElement('input');
    rvSlider.type = 'range';
    rvSlider.min = '0';
    rvSlider.max = '1';
    rvSlider.step = '0.01';
    rvSlider.value = String(track.reverbSend);
    rvSlider.className = 'track-slider';
    rvSlider.style.setProperty('--track-color', '#8844ff');
    rvSlider.addEventListener('input', () => {
      this.reverbCallback?.(track.id, parseFloat(rvSlider.value));
    });
    rvRow.appendChild(rvLabel);
    rvRow.appendChild(rvSlider);
    row.appendChild(rvRow);

    // Delay send
    const dlRow = document.createElement('div');
    dlRow.className = 'track-slider-row';
    const dlLabel = document.createElement('span');
    dlLabel.className = 'slider-label';
    dlLabel.textContent = 'D';
    const dlSlider = document.createElement('input');
    dlSlider.type = 'range';
    dlSlider.min = '0';
    dlSlider.max = '1';
    dlSlider.step = '0.01';
    dlSlider.value = String(track.delaySend);
    dlSlider.className = 'track-slider';
    dlSlider.style.setProperty('--track-color', '#44ffcc');
    dlSlider.addEventListener('input', () => {
      this.delayCallback?.(track.id, parseFloat(dlSlider.value));
    });
    dlRow.appendChild(dlLabel);
    dlRow.appendChild(dlSlider);
    row.appendChild(dlRow);

    return row;
  }

  private getTrackColor(type: string): string {
    const colors: Record<string, string> = {
      'kick': '#ff4466',
      'snare': '#ff8800',
      'clap': '#ffcc00',
      'hihat-closed': '#00ccff',
      'hihat-open': '#00ffaa',
      'cymbal': '#aa88ff',
      'bass': '#ff44aa',
      'lead': '#44ffcc',
      'pad': '#8844ff',
    };
    return colors[type] || '#e2e8f0';
  }

  setActiveTrack(trackId: string): void {
    this.activeTrackId = trackId;
    this.trackRows.forEach((row, id) => {
      row.classList.toggle('active', id === trackId);
    });
  }

  updateTrack(track: Track): void {
    const row = this.trackRows.get(track.id);
    if (!row) return;
    const newRow = this.createTrackRow(track);
    this.trackRows.set(track.id, newRow);
    row.replaceWith(newRow);
  }

  onMute(cb: (trackId: string, mute: boolean) => void): void { this.muteCallback = cb; }
  onSolo(cb: (trackId: string, solo: boolean) => void): void { this.soloCallback = cb; }
  onVolumeChange(cb: (trackId: string, vol: number) => void): void { this.volumeCallback = cb; }
  onPanChange(cb: (trackId: string, pan: number) => void): void { this.panCallback = cb; }
  onReverbChange(cb: (trackId: string, send: number) => void): void { this.reverbCallback = cb; }
  onDelayChange(cb: (trackId: string, send: number) => void): void { this.delayCallback = cb; }
  onPianoRollOpen(cb: (trackId: string) => void): void { this.pianoRollCallback = cb; }
}
