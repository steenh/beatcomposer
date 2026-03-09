import type { Pattern, Track } from '../sequencer/types';

const TRACK_COLORS: Record<string, string> = {
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

export class StepGrid {
  element: HTMLElement;
  private stepButtons: Map<string, HTMLButtonElement[]> = new Map(); // trackId -> buttons
  private currentPlayhead = -1;
  private stepClickCallback?: (trackId: string, stepIndex: number) => void;
  private pattern: Pattern | null = null;

  onVelocityChange?: (trackId: string, stepIndex: number, velocity: number) => void;

  private velDragging = false;
  private velDragStartY = 0;
  private velDragStartVelocity = 0;
  private velDragTrackId = '';
  private velDragStepIndex = 0;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'step-grid-wrapper';

    document.addEventListener('mousemove', (e) => {
      if (!this.velDragging) return;
      const delta = this.velDragStartY - e.clientY;
      const newVel = Math.max(1, Math.min(127, this.velDragStartVelocity + delta));
      this.onVelocityChange?.(this.velDragTrackId, this.velDragStepIndex, Math.round(newVel));
    });
    document.addEventListener('mouseup', () => { this.velDragging = false; });
  }

  setPattern(pattern: Pattern): void {
    this.pattern = pattern;
    this.element.innerHTML = '';
    this.stepButtons.clear();

    const grid = document.createElement('div');
    grid.className = 'step-grid';
    grid.style.gridTemplateColumns = `repeat(${pattern.stepCount}, 1fr)`;

    // Column headers (beat markers)
    const headerRow = document.createElement('div');
    headerRow.className = 'step-grid-header';
    for (let i = 0; i < pattern.stepCount; i++) {
      const marker = document.createElement('div');
      marker.className = 'beat-marker-header';
      if (i % 4 === 0) {
        marker.textContent = String(Math.floor(i / 4) + 1);
        marker.classList.add('beat-number');
      }
      headerRow.appendChild(marker);
    }
    this.element.appendChild(headerRow);

    for (const track of pattern.tracks) {
      const buttons: HTMLButtonElement[] = [];
      const color = TRACK_COLORS[track.type] || '#e2e8f0';

      for (let i = 0; i < pattern.stepCount; i++) {
        const btn = document.createElement('button');
        btn.className = 'step-btn';

        const step = track.steps[i];
        if (step?.active) {
          btn.classList.add('active');
          btn.style.setProperty('--step-color', color);
        }

        if (i % 4 === 0) btn.classList.add('beat-start');
        if (i % 2 === 0) btn.classList.add('even-step');

        // Velocity bar
        const velBar = document.createElement('div');
        velBar.className = 'velocity-bar';
        velBar.style.height = (step.velocity / 127 * 100) + '%';
        velBar.style.color = color;
        btn.appendChild(velBar);
        (btn as unknown as Record<string, unknown>)['_velBar'] = velBar;

        const trackId = track.id;
        const stepIndex = i;
        btn.addEventListener('click', () => {
          this.stepClickCallback?.(trackId, stepIndex);
        });

        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (!step.active) return; // only drag on active steps
          this.velDragging = true;
          this.velDragStartY = e.clientY;
          this.velDragStartVelocity = step.velocity;
          this.velDragTrackId = track.id;
          this.velDragStepIndex = stepIndex;
        });

        grid.appendChild(btn);
        buttons.push(btn);
      }

      this.stepButtons.set(track.id, buttons);
    }

    this.element.appendChild(grid);

    // Re-apply playhead if needed
    if (this.currentPlayhead >= 0) {
      this.setCurrentStep(this.currentPlayhead);
    }
  }

  updateTrackSteps(track: Track): void {
    const buttons = this.stepButtons.get(track.id);
    if (!buttons) return;
    const color = TRACK_COLORS[track.type] || '#e2e8f0';
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const step = track.steps[i];
      const wasPlayhead = btn.classList.contains('playhead');
      btn.className = 'step-btn';
      if (i % 4 === 0) btn.classList.add('beat-start');
      if (i % 2 === 0) btn.classList.add('even-step');
      if (step?.active) {
        btn.classList.add('active');
        btn.style.setProperty('--step-color', color);
      }
      if (wasPlayhead) btn.classList.add('playhead');

      // Update velocity bar height
      const velBar = (btn as unknown as Record<string, unknown>)['_velBar'] as HTMLDivElement | undefined;
      if (velBar && step) {
        velBar.style.height = (step.velocity / 127 * 100) + '%';
      }
    }
  }

  setCurrentStep(step: number): void {
    // Remove old playhead
    if (this.currentPlayhead >= 0) {
      this.stepButtons.forEach(buttons => {
        if (this.currentPlayhead < buttons.length) {
          buttons[this.currentPlayhead].classList.remove('playhead');
        }
      });
    }

    this.currentPlayhead = step;

    if (step >= 0) {
      this.stepButtons.forEach(buttons => {
        if (step < buttons.length) {
          buttons[step].classList.add('playhead');
        }
      });
    }
  }

  onStepClick(cb: (trackId: string, stepIndex: number) => void): void {
    this.stepClickCallback = cb;
  }
}
