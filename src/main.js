import './styles/main.scss';
import { AudioEngine } from './audio/AudioEngine';
import { Sequencer } from './sequencer/Sequencer';
import { UIManager } from './ui/UIManager';

console.log('Drummimasin Initializing...');

const engine = new AudioEngine();
const sequencer = new Sequencer(engine);
const ui = new UIManager(engine, sequencer);

// Initialize Sequencer Loop
sequencer.init();

// Initialize UI Global Controls (Play/Stop/BPM)
ui.initGlobalControls();

// Connect Sequencer Step to UI Grid Warning: Grid only exists if rendered
sequencer.setStepCallback((step) => {
    // We can access the grid instance through UI manager, 
    // but we must be careful if it's not currently in DOM.
    // The SequencerGrid.highlightStep handles selector queries, so it's safe even if hidden (active view logic handled by CSS or render).
    // Actually, handle "if grid is active" logic inside highlightStep or here.
    // Grid is always visible now
    ui.grid.highlightStep(step);
});

console.log('Drummimasin Ready');
