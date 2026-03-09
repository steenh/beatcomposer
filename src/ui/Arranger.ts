import type { ArrangementSlot, Pattern } from '../sequencer/types';

export class Arranger {
  element: HTMLElement;
  private addCallback?: () => void;
  private removeCallback?: (id: string) => void;
  private selectedSlotId: string | null = null;

  onReorder?: (fromIndex: number, toIndex: number) => void;
  onBarsChange?: (slotId: string, bars: number) => void;

  private dragFromIndex = -1;

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
      slots.forEach((slot, index) => {
        const pattern = patterns.find(p => p.id === slot.patternId);
        const slotEl = document.createElement('div');
        slotEl.className = 'arranger-slot';
        slotEl.classList.toggle('selected', slot.id === this.selectedSlotId);
        slotEl.dataset.slotId = slot.id;
        slotEl.dataset.index = String(index);

        slotEl.draggable = true;

        slotEl.addEventListener('dragstart', (e) => {
          this.dragFromIndex = index;
          e.dataTransfer!.effectAllowed = 'move';
          slotEl.classList.add('dragging');
        });
        slotEl.addEventListener('dragend', () => {
          slotEl.classList.remove('dragging');
          this.element.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });
        slotEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer!.dropEffect = 'move';
          slotEl.classList.add('drag-over');
        });
        slotEl.addEventListener('dragleave', () => {
          slotEl.classList.remove('drag-over');
        });
        slotEl.addEventListener('drop', (e) => {
          e.preventDefault();
          slotEl.classList.remove('drag-over');
          const toIndex = parseInt(slotEl.dataset.index!, 10);
          if (this.dragFromIndex !== -1 && this.dragFromIndex !== toIndex) {
            this.onReorder?.(this.dragFromIndex, toIndex);
          }
          this.dragFromIndex = -1;
        });

        const patternName = document.createElement('span');
        patternName.className = 'slot-pattern-name';
        patternName.textContent = pattern?.name ?? 'Unknown';
        slotEl.appendChild(patternName);

        // Bars input (replaces static span)
        const barsInput = document.createElement('input');
        barsInput.type = 'number';
        barsInput.min = '1';
        barsInput.max = '64';
        barsInput.value = String(slot.bars);
        barsInput.className = 'slot-bars-input';
        barsInput.title = 'Number of times to repeat';
        const commitBars = () => {
          const val = parseInt(barsInput.value, 10);
          if (!isNaN(val)) this.onBarsChange?.(slot.id, val);
        };
        barsInput.addEventListener('blur', commitBars);
        barsInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { commitBars(); barsInput.blur(); }
          e.stopPropagation(); // prevent delete key from removing slot
        });
        slotEl.appendChild(barsInput);

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
      });
    }

    this.element.appendChild(slotsContainer);
  }

  onAdd(cb: () => void): void { this.addCallback = cb; }
  onRemove(cb: (id: string) => void): void { this.removeCallback = cb; }
}
