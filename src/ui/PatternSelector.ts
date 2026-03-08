import type { Pattern } from '../sequencer/types';

export class PatternSelector {
  element: HTMLElement;
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private selectCallback?: (id: string) => void;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'pattern-selector';
  }

  setPatterns(patterns: Pattern[], activeId: string): void {
    this.element.innerHTML = '';
    this.buttons.clear();

    const label = document.createElement('span');
    label.className = 'pattern-label';
    label.textContent = 'PATTERN:';
    this.element.appendChild(label);

    for (const pattern of patterns) {
      const btn = document.createElement('button');
      btn.className = 'pattern-btn';
      btn.textContent = pattern.name;
      btn.dataset.id = pattern.id;
      btn.classList.toggle('active', pattern.id === activeId);
      btn.addEventListener('click', () => {
        this.selectCallback?.(pattern.id);
      });
      this.buttons.set(pattern.id, btn);
      this.element.appendChild(btn);
    }
  }

  setActive(id: string): void {
    this.buttons.forEach((btn, btnId) => {
      btn.classList.toggle('active', btnId === id);
    });
  }

  onSelect(cb: (id: string) => void): void {
    this.selectCallback = cb;
  }
}
