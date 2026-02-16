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
window.ui = ui;

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

// Global Shortcuts
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // Stop scrolling

        // Check Visibility via DOM (Robust)
        const overlay = document.getElementById('arrangement-overlay');
        const isArrangementVisible = overlay && overlay.style.display !== 'none';

        if (isArrangementVisible && ui.arrangerView) {
            ui.arrangerView.togglePlay();
        } else {
            // Main Sequencer Toggle
            if (sequencer.isPlaying) {
                sequencer.stop();
            } else {
                sequencer.start();
            }
        }
    }
});
