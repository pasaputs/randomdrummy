import { SequencerGrid } from './SequencerGrid';
import { Mixer } from './Mixer';
import { RemixControl } from './RemixControl';

export class UIManager {
    constructor(audioEngine, sequencer) {
        this.audioEngine = audioEngine;
        this.sequencer = sequencer;

        this.grid = new SequencerGrid(sequencer);
        this.mixer = new Mixer(audioEngine);
        this.remix = new RemixControl(sequencer);


        this.initTabs();
    }

    initTabs() {
        // Tabs are removed in favor of single view
        const header = document.querySelector('header');
        if (header) {
            // Remove or hide tab buttons if they exist in HTML
            const tabs = header.querySelector('.tabs');
            if (tabs) tabs.style.display = 'none';

            // Update Header Title ? 
        }
    }

    render() {
        const main = document.getElementById('main-content');
        main.innerHTML = '';
        main.style.display = 'flex';
        main.style.flexDirection = 'column';
        main.style.height = '100%';

        // Top: Sequencer (Flex 1)
        const seqContainer = document.createElement('div');
        seqContainer.id = 'sequencer-container';
        seqContainer.style.flex = '1';
        seqContainer.style.overflowY = 'auto';
        seqContainer.style.borderBottom = '1px solid #444';
        main.appendChild(seqContainer);

        // Bottom: Mixer (Flex 1)
        const mixerContainer = document.createElement('div');
        mixerContainer.id = 'mixer-container';
        mixerContainer.style.flex = '1';
        mixerContainer.style.overflowY = 'auto';
        main.appendChild(mixerContainer);

        // Render Components into their containers
        // We need to hack the component render methods slightly or set their container property
        this.grid.gridContainer = seqContainer;
        this.grid.render();

        this.mixer.container = mixerContainer;
        this.mixer.render();
    }

    initGlobalControls() {
        // Play/Stop
        const playBtn = document.getElementById('play-pause');
        const stopBtn = document.getElementById('stop');
        const bpmInput = document.getElementById('bpm');

        playBtn.addEventListener('click', async () => {
            await this.audioEngine.init();
            if (this.sequencer.isPlaying) {
                this.audioEngine.stop(); // Pause logic in Tone is transport.pause() but stop() resets
                playBtn.textContent = 'PLAY';
                this.sequencer.isPlaying = false;
            } else {
                this.audioEngine.start();
                playBtn.textContent = 'PAUSE';
                this.sequencer.isPlaying = true;
            }
        });

        stopBtn.addEventListener('click', () => {
            this.audioEngine.stop();
            playBtn.textContent = 'PLAY';
            this.sequencer.isPlaying = false;
            // Reset highlights
            document.querySelectorAll('.step-btn.playing').forEach(el => el.classList.remove('playing'));
        });

        bpmInput.addEventListener('input', (e) => {
            this.audioEngine.transport.bpm.value = parseInt(e.target.value);
        });

        // Render initial view
        this.render();
        this.remix.render();
    }
}
