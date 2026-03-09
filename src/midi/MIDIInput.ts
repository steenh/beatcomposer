// Web MIDI API type stubs (in case they are not in lib)
declare global {
  interface Navigator { requestMIDIAccess(): Promise<MIDIAccessStub>; }
  interface MIDIAccessStub {
    inputs: Map<string, MIDIInputPort>;
    onstatechange: ((e: MIDIConnectionEventStub) => void) | null;
  }
  interface MIDIConnectionEventStub {
    port: {
      type: string;
      state: string;
      onmidimessage: ((e: MIDIMessageEventStub) => void) | null;
    };
  }
  interface MIDIMessageEventStub { data: Uint8Array; }
  interface MIDIInputPort {
    onmidimessage: ((e: MIDIMessageEventStub) => void) | null;
  }
}

export class MIDIInput {
  private noteOnHandler?: (pitch: number, velocity: number) => void;
  private noteOffHandler?: (pitch: number) => void;
  private _initialized = false;

  async init(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) return false;
    try {
      const midi = await navigator.requestMIDIAccess();
      this.attachListeners(midi);
      midi.onstatechange = (e: MIDIConnectionEventStub) => {
        if (e.port.type === 'input' && e.port.state === 'connected') {
          e.port.onmidimessage = (m: MIDIMessageEventStub) => this.handleMessage(m);
        }
      };
      this._initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  private attachListeners(midi: MIDIAccessStub): void {
    for (const input of midi.inputs.values()) {
      input.onmidimessage = (m: MIDIMessageEventStub) => this.handleMessage(m);
    }
  }

  private handleMessage(msg: MIDIMessageEventStub): void {
    if (!msg.data || msg.data.length < 3) return;
    const status = msg.data[0];
    const pitch = msg.data[1];
    const velocity = msg.data[2];
    const cmd = status & 0xf0;
    if (cmd === 0x90 && velocity > 0) {
      this.noteOnHandler?.(pitch, velocity);
    } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
      this.noteOffHandler?.(pitch);
    }
  }

  setNoteOnHandler(cb: (pitch: number, velocity: number) => void): void {
    this.noteOnHandler = cb;
  }

  setNoteOffHandler(cb: (pitch: number) => void): void {
    this.noteOffHandler = cb;
  }

  get isInitialized(): boolean { return this._initialized; }
}
