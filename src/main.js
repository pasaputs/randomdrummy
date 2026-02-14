import './styles/main.scss';
import { AudioEngine } from './audio/AudioEngine';
import { Sequencer } from './sequencer/Sequencer';
import { UIManager } from './ui/UIManager';
import { KeyboardController } from './ui/KeyboardController';

console.log('Drummimasin Initializing...');

const engine = new AudioEngine();
const sequencer = new Sequencer(engine);
const ui = new UIManager(engine, sequencer);
const keyboard = new KeyboardController(engine);

// Expose for Global Access (Spacebar Logic)
window.audioEngine = engine;
window.audioEngine.sequencer = sequencer;

// Initialize Sequencer Loop
sequencer.init();

// Initialize UI Global Controls (Play/Stop/BPM)
ui.initGlobalControls();
ui.render(); // Ensure UI is rendered

// Connect Sequencer Step to UI Grid
sequencer.setStepCallback((step) => {
    if (ui.grid) {
        ui.grid.highlightStep(step);
    }
});

engine.init().then(() => {
    console.log("Audio Engine Ready");
});
