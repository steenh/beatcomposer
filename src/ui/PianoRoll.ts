import type { Track, PianoRollNote } from '../sequencer/types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]); // indices within octave

const MIN_PITCH = 36; // C2
const MAX_PITCH = 84; // C6
const TOTAL_PITCHES = MAX_PITCH - MIN_PITCH + 1; // 49
const KEY_HEIGHT = 16; // px per note row
const STEP_WIDTH = 40; // px per step
const KEY_WIDTH = 60; // px for piano keyboard

function generateId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export class PianoRoll {
  element: HTMLElement;
  private track: Track | null = null;
  private stepCount = 16;
  private currentPlayhead = -1;
  private notesChangeCallback?: (notes: PianoRollNote[]) => void;

  // Drag state
  private isDragging = false;
  private dragNote: PianoRollNote | null = null;
  private dragType: 'move' | 'resize' | null = null;
  private dragStartX = 0;
  private dragStartStep = 0;
  private dragStartDuration = 0;

  private notesContainer!: HTMLElement;
  private playheadEl!: HTMLElement;
  private canvas!: HTMLCanvasElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'piano-roll';
    this.buildLayout();
  }

  private buildLayout(): void {
    this.element.innerHTML = '';

    // Top bar
    const topBar = document.createElement('div');
    topBar.className = 'pr-topbar';
    topBar.textContent = 'PIANO ROLL — click to add notes, right-click to remove';
    this.element.appendChild(topBar);

    // Main area
    const mainArea = document.createElement('div');
    mainArea.className = 'pr-main';
    this.element.appendChild(mainArea);

    // Piano keys sidebar
    const keysSidebar = document.createElement('div');
    keysSidebar.className = 'pr-keys';
    keysSidebar.style.width = KEY_WIDTH + 'px';
    keysSidebar.style.minWidth = KEY_WIDTH + 'px';

    for (let pitch = MAX_PITCH; pitch >= MIN_PITCH; pitch--) {
      const noteInOctave = (pitch - 60 + 1200) % 12;
      const octave = Math.floor(pitch / 12) - 1;
      const noteName = NOTE_NAMES[noteInOctave];
      const isBlack = BLACK_KEYS.has(noteInOctave);

      const key = document.createElement('div');
      key.className = 'piano-key' + (isBlack ? ' black-key' : ' white-key');
      key.style.height = KEY_HEIGHT + 'px';
      key.dataset.pitch = String(pitch);

      if (!isBlack) {
        key.textContent = noteName === 'C' ? `${noteName}${octave}` : noteName;
      }

      // Play note on click
      key.addEventListener('mousedown', () => {
        // Could trigger preview note
      });

      keysSidebar.appendChild(key);
    }

    mainArea.appendChild(keysSidebar);

    // Grid + notes area
    const gridWrapper = document.createElement('div');
    gridWrapper.className = 'pr-grid-wrapper';
    mainArea.appendChild(gridWrapper);

    // Step header
    const stepHeader = document.createElement('div');
    stepHeader.className = 'pr-step-header';
    this.updateStepHeader(stepHeader);
    gridWrapper.appendChild(stepHeader);

    // Notes canvas area
    const notesArea = document.createElement('div');
    notesArea.className = 'pr-notes-area';
    notesArea.style.position = 'relative';
    notesArea.style.width = (this.stepCount * STEP_WIDTH) + 'px';
    notesArea.style.height = (TOTAL_PITCHES * KEY_HEIGHT) + 'px';
    gridWrapper.appendChild(notesArea);

    // Background grid canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pr-canvas';
    this.canvas.width = this.stepCount * STEP_WIDTH;
    this.canvas.height = TOTAL_PITCHES * KEY_HEIGHT;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    notesArea.appendChild(this.canvas);
    this.drawGrid();

    // Notes container (on top of canvas)
    this.notesContainer = document.createElement('div');
    this.notesContainer.className = 'pr-notes-container';
    this.notesContainer.style.position = 'absolute';
    this.notesContainer.style.top = '0';
    this.notesContainer.style.left = '0';
    this.notesContainer.style.width = '100%';
    this.notesContainer.style.height = '100%';
    this.notesContainer.style.pointerEvents = 'none';
    notesArea.appendChild(this.notesContainer);

    // Playhead
    this.playheadEl = document.createElement('div');
    this.playheadEl.className = 'pr-playhead';
    this.playheadEl.style.position = 'absolute';
    this.playheadEl.style.top = '0';
    this.playheadEl.style.width = STEP_WIDTH + 'px';
    this.playheadEl.style.height = '100%';
    this.playheadEl.style.pointerEvents = 'none';
    this.playheadEl.style.display = 'none';
    notesArea.appendChild(this.playheadEl);

    // Click handler on notes area
    notesArea.addEventListener('mousedown', (e) => this.handleMouseDown(e, notesArea));
    notesArea.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleRightClick(e, notesArea);
    });

    // Global mouse move/up for drag
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', () => this.handleMouseUp());
  }

  private updateStepHeader(header: HTMLElement): void {
    header.innerHTML = '';
    header.style.width = (this.stepCount * STEP_WIDTH + KEY_WIDTH) + 'px';
    // Spacer for keys
    const spacer = document.createElement('div');
    spacer.style.width = KEY_WIDTH + 'px';
    spacer.style.minWidth = KEY_WIDTH + 'px';
    spacer.style.display = 'inline-block';
    header.appendChild(spacer);

    for (let i = 0; i < this.stepCount; i++) {
      const cell = document.createElement('div');
      cell.className = 'pr-step-cell';
      cell.style.width = STEP_WIDTH + 'px';
      cell.style.display = 'inline-block';
      if (i % 4 === 0) {
        cell.textContent = String(Math.floor(i / 4) + 1);
        cell.classList.add('beat-num');
      }
      header.appendChild(cell);
    }
  }

  private drawGrid(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let row = 0; row < TOTAL_PITCHES; row++) {
      const pitch = MAX_PITCH - row;
      const noteInOctave = (pitch - 60 + 1200) % 12;
      const isBlack = BLACK_KEYS.has(noteInOctave);
      const y = row * KEY_HEIGHT;

      // Row background
      ctx.fillStyle = isBlack ? '#12121e' : '#1a1a2e';
      ctx.fillRect(0, y, this.canvas.width, KEY_HEIGHT);

      // C note line
      if (noteInOctave === 0) {
        ctx.fillStyle = '#2a2a4e';
        ctx.fillRect(0, y, this.canvas.width, 1);
      }

      // Horizontal line
      ctx.fillStyle = '#2a2a3e';
      ctx.fillRect(0, y + KEY_HEIGHT - 1, this.canvas.width, 1);
    }

    // Vertical lines (steps)
    for (let col = 0; col <= this.stepCount; col++) {
      const x = col * STEP_WIDTH;
      const isBeat = col % 4 === 0;
      ctx.fillStyle = isBeat ? '#3a3a5e' : '#2a2a3e';
      ctx.fillRect(x, 0, 1, this.canvas.height);
    }
  }

  private pitchToRow(pitch: number): number {
    return MAX_PITCH - pitch;
  }

  private rowToPitch(row: number): number {
    return MAX_PITCH - row;
  }

  private getEventCoords(e: MouseEvent, container: HTMLElement): { step: number; pitch: number } {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const step = Math.floor(x / STEP_WIDTH);
    const row = Math.floor(y / KEY_HEIGHT);
    const pitch = this.rowToPitch(row);
    return {
      step: Math.max(0, Math.min(this.stepCount - 1, step)),
      pitch: Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch)),
    };
  }

  private handleMouseDown(e: MouseEvent, container: HTMLElement): void {
    if (e.button !== 0) return;
    if (!this.track) return;

    const { step, pitch } = this.getEventCoords(e, container);

    // Check if clicking on existing note
    const existingNote = this.track.notes.find(n =>
      n.pitch === pitch && step >= n.step && step < n.step + n.duration
    );

    if (existingNote) {
      // Check if near right edge (resize)
      const noteEndX = (existingNote.step + existingNote.duration) * STEP_WIDTH;
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const noteRightEdge = noteEndX;

      if (Math.abs(clickX - noteRightEdge) < 8) {
        // Resize
        this.isDragging = true;
        this.dragNote = { ...existingNote };
        this.dragType = 'resize';
        this.dragStartX = e.clientX;
        this.dragStartDuration = existingNote.duration;
      } else {
        // Move
        this.isDragging = true;
        this.dragNote = { ...existingNote };
        this.dragType = 'move';
        this.dragStartX = e.clientX;
        this.dragStartStep = existingNote.step;
      }
    } else {
      // Add new note
      const newNote: PianoRollNote = {
        id: generateId(),
        step,
        pitch,
        duration: 1,
        velocity: 100,
      };
      if (this.track) {
        this.track.notes.push(newNote);
        this.renderNotes();
        this.notesChangeCallback?.([...this.track.notes]);

        // Start drag to resize the new note
        this.isDragging = true;
        this.dragNote = { ...newNote };
        this.dragType = 'resize';
        this.dragStartX = e.clientX;
        this.dragStartDuration = 1;
      }
    }
  }

  private handleRightClick(e: MouseEvent, container: HTMLElement): void {
    if (!this.track) return;
    const { step, pitch } = this.getEventCoords(e, container);
    const noteIndex = this.track.notes.findIndex(n =>
      n.pitch === pitch && step >= n.step && step < n.step + n.duration
    );
    if (noteIndex >= 0) {
      this.track.notes.splice(noteIndex, 1);
      this.renderNotes();
      this.notesChangeCallback?.([...this.track.notes]);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.dragNote || !this.track) return;

    const dx = e.clientX - this.dragStartX;
    const stepsDelta = Math.round(dx / STEP_WIDTH);

    if (this.dragType === 'resize') {
      const newDuration = Math.max(1, this.dragStartDuration + stepsDelta);
      // Update the note in track
      const noteIdx = this.track.notes.findIndex(n => n.id === this.dragNote!.id);
      if (noteIdx >= 0) {
        this.track.notes[noteIdx] = { ...this.track.notes[noteIdx], duration: newDuration };
        this.renderNotes();
      }
    } else if (this.dragType === 'move') {
      const newStep = Math.max(0, Math.min(this.stepCount - this.dragNote.duration, this.dragStartStep + stepsDelta));
      const noteIdx = this.track.notes.findIndex(n => n.id === this.dragNote!.id);
      if (noteIdx >= 0) {
        this.track.notes[noteIdx] = { ...this.track.notes[noteIdx], step: newStep };
        this.renderNotes();
      }
    }
  }

  private handleMouseUp(): void {
    if (this.isDragging && this.track) {
      this.notesChangeCallback?.([...this.track.notes]);
    }
    this.isDragging = false;
    this.dragNote = null;
    this.dragType = null;
  }

  private renderNotes(): void {
    if (!this.track) return;
    this.notesContainer.innerHTML = '';

    const color = this.getTrackColor(this.track.type);

    for (const note of this.track.notes) {
      const noteEl = document.createElement('div');
      noteEl.className = 'pr-note';
      noteEl.style.position = 'absolute';
      noteEl.style.left = (note.step * STEP_WIDTH) + 'px';
      noteEl.style.top = (this.pitchToRow(note.pitch) * KEY_HEIGHT) + 'px';
      noteEl.style.width = (note.duration * STEP_WIDTH - 2) + 'px';
      noteEl.style.height = (KEY_HEIGHT - 1) + 'px';
      noteEl.style.backgroundColor = color;
      noteEl.style.borderRadius = '2px';
      noteEl.style.boxShadow = `0 0 6px ${color}`;
      noteEl.style.pointerEvents = 'none';
      noteEl.style.opacity = String(0.6 + (note.velocity / 127) * 0.4);

      // Resize handle
      const handle = document.createElement('div');
      handle.style.position = 'absolute';
      handle.style.right = '0';
      handle.style.top = '0';
      handle.style.width = '6px';
      handle.style.height = '100%';
      handle.style.cursor = 'ew-resize';
      handle.style.backgroundColor = 'rgba(255,255,255,0.3)';
      noteEl.appendChild(handle);

      this.notesContainer.appendChild(noteEl);
    }

    // Re-enable pointer events on container for interaction
    this.notesContainer.style.pointerEvents = 'none';
  }

  private getTrackColor(type: string): string {
    const colors: Record<string, string> = {
      'bass': '#ff44aa',
      'lead': '#44ffcc',
      'pad': '#8844ff',
    };
    return colors[type] || '#e2e8f0';
  }

  setTrack(track: Track): void {
    this.track = track;
    this.stepCount = track.steps.length as 16 | 32;

    // Rebuild canvas size
    this.canvas.width = this.stepCount * STEP_WIDTH;
    this.canvas.height = TOTAL_PITCHES * KEY_HEIGHT;

    const notesArea = this.notesContainer.parentElement;
    if (notesArea) {
      notesArea.style.width = (this.stepCount * STEP_WIDTH) + 'px';
    }

    // Update step header
    const header = this.element.querySelector('.pr-step-header') as HTMLElement;
    if (header) this.updateStepHeader(header);

    this.drawGrid();
    this.renderNotes();
  }

  setCurrentStep(step: number): void {
    this.currentPlayhead = step;
    if (step < 0) {
      this.playheadEl.style.display = 'none';
    } else {
      this.playheadEl.style.display = 'block';
      this.playheadEl.style.left = (step * STEP_WIDTH) + 'px';
    }
  }

  onNotesChange(cb: (notes: PianoRollNote[]) => void): void {
    this.notesChangeCallback = cb;
  }
}
