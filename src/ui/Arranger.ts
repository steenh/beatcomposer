import type { ArrangementSlot, Pattern } from '../sequencer/types';

export class Arranger {
  element: HTMLElement;
  private addCallback?: () => void;
  private removeCallback?: (id: string) => void;
  private selectedSlotId: string | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'arranger';
    this.render([], []);

    // Keyboard listener for delete
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedSlotId) {
        // Only if focus is not on an input
        if (document.activeElement?.tagName !== 'INPUT') {
          this.removeCallback?.(this.selectedSlotId);
          this.selectedSlotId = null;
        }
      }
    });
  }

  setArrangement(slots: ArrangementSlot[], patterns: Pattern[]): void {
    this.render(slots, patterns);
  }

  private render(slots: ArrangementSlot[], patterns: Pattern[]): void {
    this.element.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'arranger-header';

    const title = document.createElement('span');
    title.className = 'arranger-title';
    title.textContent = 'ARRANGEMENT';
    header.appendChild(title);

    const addBtn = document.createElement('button');
    addBtn.className = 'arranger-add-btn';
    addBtn.textContent = '+ ADD PATTERN';
    addBtn.addEventListener('click', () => {
      this.addCallback?.();
    });
    header.appendChild(addBtn);

    const totalBars = slots.reduce((acc, s) => acc + s.bars, 0);
    const totalEl = document.createElement('span');
    totalEl.className = 'arranger-total';
    totalEl.textContent = `Total: ${totalBars} bar${totalBars !== 1 ? 's' : ''}`;
    header.appendChild(totalEl);

    this.element.appendChild(header);

    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'arranger-slots';

    if (slots.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'arranger-empty';
      empty.textContent = 'No arrangement yet. Add patterns using the + button above.';
      slotsContainer.appendChild(empty);
    } else {
      for (const slot of slots) {
        const pattern = patterns.find(p => p.id === slot.patternId);
        const slotEl = document.createElement('div');
        slotEl.className = 'arranger-slot';
        slotEl.classList.toggle('selected', slot.id === this.selectedSlotId);
        slotEl.dataset.slotId = slot.id;

        const patternName = document.createElement('span');
        patternName.className = 'slot-pattern-name';
        patternName.textContent = pattern?.name ?? 'Unknown';
        slotEl.appendChild(patternName);

        const barsLabel = document.createElement('span');
        barsLabel.className = 'slot-bars';
        barsLabel.textContent = `×${slot.bars}`;
        slotEl.appendChild(barsLabel);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'slot-remove-btn';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Remove slot';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeCallback?.(slot.id);
        });
        slotEl.appendChild(removeBtn);

        slotEl.addEventListener('click', () => {
          this.selectedSlotId = slot.id;
          this.element.querySelectorAll('.arranger-slot').forEach(el => {
            el.classList.toggle('selected', (el as HTMLElement).dataset.slotId === slot.id);
          });
        });

        slotsContainer.appendChild(slotEl);
      }
    }

    this.element.appendChild(slotsContainer);
  }

  onAdd(cb: () => void): void { this.addCallback = cb; }
  onRemove(cb: (id: string) => void): void { this.removeCallback = cb; }
}
