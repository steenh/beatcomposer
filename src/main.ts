import { Song } from './sequencer/Song';
import { AudioEngine } from './audio/AudioEngine';
import { Scheduler } from './audio/Scheduler';
import { App } from './ui/App';

const song = new Song();
const audio = new AudioEngine();
const scheduler = new Scheduler(audio, song);
const app = new App(song, audio, scheduler);

document.getElementById('app')!.appendChild(app.element);
