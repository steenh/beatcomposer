export const SCALE_INTERVALS: Record<string, number[]> = {
  'major':            [0, 2, 4, 5, 7, 9, 11],
  'natural minor':    [0, 2, 3, 5, 7, 8, 10],
  'harmonic minor':   [0, 2, 3, 5, 7, 8, 11],
  'pentatonic major': [0, 2, 4, 7, 9],
  'pentatonic minor': [0, 3, 5, 7, 10],
  'blues':            [0, 3, 5, 6, 7, 10],
  'dorian':           [0, 2, 3, 5, 7, 9, 10],
  'mixolydian':       [0, 2, 4, 5, 7, 9, 10],
};

export const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const SCALE_NAMES = Object.keys(SCALE_INTERVALS);

export function isNoteInScale(pitch: number, key: number, scale: string): boolean {
  const intervals = SCALE_INTERVALS[scale] ?? SCALE_INTERVALS['natural minor'];
  const noteClass = ((pitch - key) % 12 + 12) % 12;
  return intervals.includes(noteClass);
}

export function snapToScale(pitch: number, key: number, scale: string): number {
  if (isNoteInScale(pitch, key, scale)) return pitch;
  let up = pitch + 1;
  let down = pitch - 1;
  while (!isNoteInScale(up, key, scale)) up++;
  while (down >= 0 && !isNoteInScale(down, key, scale)) down--;
  if (down < 0) return up;
  return (up - pitch) <= (pitch - down) ? up : down;
}
