export class TransportBar {
  element: HTMLElement;
  private bpmDisplay!: HTMLElement;
  private playBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private loopBtn!: HTMLButtonElement;
  private volumeSlider!: HTMLInputElement;
  private isLooping = true;

  private playCallback?: () => void;
  private stopCallback?: () => void;
  private bpmChangeCallback?: (bpm: number) => void;
  private volumeChangeCallback?: (vol: number) => void;

  onSave?: () => void;
  onLoad?: (json: string) => void;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'transport-bar';
    this.render();
  }

  private render(): void {
    this.element.innerHTML = '';

    // Logo
    const logo = document.createElement('div');
    logo.className = 'transport-logo';
    logo.textContent = 'BEAT COMPOSER';
    this.element.appendChild(logo);

    // BPM control
    const bpmGroup = document.createElement('div');
    bpmGroup.className = 'transport-group';

    const bpmLabel = document.createElement('span');
    bpmLabel.className = 'transport-label';
    bpmLabel.textContent = 'BPM';

    const bpmMinus = document.createElement('button');
    bpmMinus.className = 'transport-btn bpm-btn';
    bpmMinus.textContent = '−';
    bpmMinus.addEventListener('click', () => {
      const current = parseInt(this.bpmDisplay.textContent || '128', 10);
      this.setBpm(current - 1);
      this.bpmChangeCallback?.(parseInt(this.bpmDisplay.textContent || '128', 10));
    });

    this.bpmDisplay = document.createElement('span');
    this.bpmDisplay.className = 'bpm-display';
    this.bpmDisplay.textContent = '128';

    // Allow click to edit BPM
    this.bpmDisplay.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '60';
      input.max = '200';
      input.value = this.bpmDisplay.textContent || '128';
      input.className = 'bpm-input';
      this.bpmDisplay.textContent = '';
      this.bpmDisplay.appendChild(input);
      input.focus();
      input.select();
      const commit = () => {
        const val = Math.max(60, Math.min(200, parseInt(input.value, 10) || 128));
        this.bpmDisplay.textContent = String(val);
        this.bpmChangeCallback?.(val);
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { commit(); input.blur(); }
        if (e.key === 'Escape') { this.bpmDisplay.textContent = input.value; input.blur(); }
      });
    });

    const bpmPlus = document.createElement('button');
    bpmPlus.className = 'transport-btn bpm-btn';
    bpmPlus.textContent = '+';
    bpmPlus.addEventListener('click', () => {
      const current = parseInt(this.bpmDisplay.textContent || '128', 10);
      this.setBpm(current + 1);
      this.bpmChangeCallback?.(parseInt(this.bpmDisplay.textContent || '128', 10));
    });

    bpmGroup.appendChild(bpmLabel);
    bpmGroup.appendChild(bpmMinus);
    bpmGroup.appendChild(this.bpmDisplay);
    bpmGroup.appendChild(bpmPlus);
    this.element.appendChild(bpmGroup);

    // Playback controls
    const controlGroup = document.createElement('div');
    controlGroup.className = 'transport-group';

    this.playBtn = document.createElement('button');
    this.playBtn.className = 'transport-btn play-btn';
    this.playBtn.textContent = '▶';
    this.playBtn.title = 'Play';
    this.playBtn.addEventListener('click', () => {
      this.playCallback?.();
    });

    this.stopBtn = document.createElement('button');
    this.stopBtn.className = 'transport-btn stop-btn';
    this.stopBtn.textContent = '■';
    this.stopBtn.title = 'Stop';
    this.stopBtn.addEventListener('click', () => {
      this.stopCallback?.();
    });

    this.loopBtn = document.createElement('button');
    this.loopBtn.className = 'transport-btn loop-btn active';
    this.loopBtn.textContent = '⟳';
    this.loopBtn.title = 'Loop';
    this.loopBtn.addEventListener('click', () => {
      this.isLooping = !this.isLooping;
      this.loopBtn.classList.toggle('active', this.isLooping);
    });

    controlGroup.appendChild(this.playBtn);
    controlGroup.appendChild(this.stopBtn);
    controlGroup.appendChild(this.loopBtn);
    this.element.appendChild(controlGroup);

    // Volume control
    const volGroup = document.createElement('div');
    volGroup.className = 'transport-group';

    const volLabel = document.createElement('span');
    volLabel.className = 'transport-label';
    volLabel.textContent = 'VOL';

    this.volumeSlider = document.createElement('input');
    this.volumeSlider.type = 'range';
    this.volumeSlider.min = '0';
    this.volumeSlider.max = '1';
    this.volumeSlider.step = '0.01';
    this.volumeSlider.value = '0.8';
    this.volumeSlider.className = 'transport-volume';
    this.volumeSlider.addEventListener('input', () => {
      this.volumeChangeCallback?.(parseFloat(this.volumeSlider.value));
    });

    volGroup.appendChild(volLabel);
    volGroup.appendChild(this.volumeSlider);
    this.element.appendChild(volGroup);

    // Save/Load buttons
    const fileGroup = document.createElement('div');
    fileGroup.className = 'transport-group';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save';
    saveBtn.textContent = 'SAVE';
    saveBtn.title = 'Save song to JSON file';
    saveBtn.addEventListener('click', () => {
      this.onSave?.();
    });

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn-load';
    loadBtn.textContent = 'LOAD';
    loadBtn.title = 'Load song from JSON file';
    loadBtn.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (text) this.onLoad?.(text);
        };
        reader.readAsText(file);
        document.body.removeChild(fileInput);
      });
      fileInput.click();
    });

    fileGroup.appendChild(saveBtn);
    fileGroup.appendChild(loadBtn);
    this.element.appendChild(fileGroup);
  }

  setBpm(bpm: number): void {
    const clamped = Math.max(60, Math.min(200, bpm));
    this.bpmDisplay.textContent = String(clamped);
  }

  setPlaying(playing: boolean): void {
    this.playBtn.classList.toggle('active', playing);
    this.playBtn.textContent = playing ? '⏸' : '▶';
  }

  onPlay(cb: () => void): void {
    this.playCallback = cb;
  }

  onStop(cb: () => void): void {
    this.stopCallback = cb;
  }

  onBpmChange(cb: (bpm: number) => void): void {
    this.bpmChangeCallback = cb;
  }

  onVolumeChange(cb: (vol: number) => void): void {
    this.volumeChangeCallback = cb;
  }

  get looping(): boolean {
    return this.isLooping;
  }
}
