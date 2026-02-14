import { SequencerGrid } from './SequencerGrid';
import { Mixer } from './Mixer';
import { RemixControl } from './RemixControl';
import { PianoRoll } from './PianoRoll';

export class UIManager {
    constructor(audioEngine, sequencer) {
        this.audioEngine = audioEngine;
        this.sequencer = sequencer;

        this.grid = new SequencerGrid(sequencer);
        this.piano = new PianoRoll(audioEngine);
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

        // Middle: Piano (Fixed Height)
        const pianoContainer = document.createElement('div');
        pianoContainer.id = 'piano-container';
        pianoContainer.style.flex = '0 0 auto';
        pianoContainer.style.display = 'flex'; // Layout for Control Strip + Keys
        pianoContainer.style.background = '#222';
        pianoContainer.style.borderBottom = '1px solid #444';
        pianoContainer.style.height = '160px'; // Increased height for controls
        main.appendChild(pianoContainer);

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

        // 1. Render Piano Control Strip
        this.renderPianoControls(pianoContainer);

        // 2. Render Piano Keys (PianoRoll needs to append to container, not overwrite)
        // We need to wrap PianoRoll in a sub-div so it doesn't clear our controls if it uses innerHTML = '' on container.
        const pianoKeysDiv = document.createElement('div');
        pianoKeysDiv.style.flex = '1';
        pianoKeysDiv.style.overflow = 'hidden';
        pianoContainer.appendChild(pianoKeysDiv);

        this.piano.container = pianoKeysDiv;
        this.piano.render();

        this.mixer.container = mixerContainer;
        this.mixer.render();
    }

    renderPianoControls(container) {
        const strip = document.createElement('div');
        strip.className = 'piano-controls';
        // Removed inline styles in favor of CSS class

        // Title
        const title = document.createElement('div');
        title.textContent = "PIANO / SAMPLER";
        title.style.fontSize = '0.7rem';
        title.style.fontWeight = 'bold';
        title.style.color = '#888';
        title.style.letterSpacing = '1px';
        title.style.marginBottom = '5px';
        strip.appendChild(title);

        // Upload Row
        const uploadRow = document.createElement('div');
        uploadRow.style.display = 'flex';
        uploadRow.style.gap = '5px';
        uploadRow.style.marginBottom = '5px';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*';
        fileInput.style.display = 'none';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                this.audioEngine.loadPianoSample(url);
            }
        };

        const btnStyle = "flex: 1; background: #333; border: 1px solid #444; color: #ddd; padding: 4px; cursor: pointer; font-size: 0.7rem; border-radius: 2px;";

        const uploadBtn = document.createElement('button');
        uploadBtn.textContent = "📂 LOAD FILE";
        uploadBtn.style.cssText = btnStyle;
        uploadBtn.onclick = () => fileInput.click();

        uploadRow.appendChild(uploadBtn);
        // Add hidden input
        uploadRow.appendChild(fileInput);
        strip.appendChild(uploadRow);

        // Helper for Knobs/Sliders
        const createControl = (label, type, min, max, val, callback) => {
            const wrap = document.createElement('div');
            wrap.style.display = 'flex';
            wrap.style.flexDirection = 'column';
            wrap.style.alignItems = 'center';

            const lb = document.createElement('div');
            lb.textContent = label;
            lb.style.fontSize = '0.6rem';
            lb.style.marginBottom = '2px';

            const inp = document.createElement('input');
            inp.type = 'range';
            inp.min = min;
            inp.max = max;
            inp.step = (type === 'pitch') ? 1 : 0.01;
            inp.value = val;
            inp.style.width = '100%';
            inp.oninput = (e) => callback(parseFloat(e.target.value));
            inp.onmouseup = function () { this.blur(); };
            inp.ontouchend = function () { this.blur(); };

            wrap.appendChild(lb);
            wrap.appendChild(inp);
            return wrap;
        };

        // GROUP 1: TONE (Vol, Pan, Pitch)
        const toneGroup = document.createElement('div');
        toneGroup.className = 'control-group';

        const toneLabel = document.createElement('div');
        toneLabel.className = 'group-label';
        toneLabel.textContent = "TONE";
        toneGroup.appendChild(toneLabel);

        const toneGrid = document.createElement('div');
        toneGrid.className = 'control-grid';
        toneGrid.appendChild(createControl("VOL", "range", -60, 6, -10, (v) => this.audioEngine.setPianoVolume(v)));
        toneGrid.appendChild(createControl("PAN", "range", -1, 1, 0, (v) => this.audioEngine.setPianoPan(v)));
        toneGrid.appendChild(createControl("PITCH", "pitch", -12, 12, 0, (v) => this.audioEngine.setPianoPitch(v)));
        toneGroup.appendChild(toneGrid);
        strip.appendChild(toneGroup);

        // GROUP 2: FX (Rev, Dly, Time, Arp, Rate)
        const fxGroup = document.createElement('div');
        fxGroup.className = 'control-group';

        const fxLabel = document.createElement('div');
        fxLabel.className = 'group-label';
        fxLabel.textContent = "FX";
        fxGroup.appendChild(fxLabel);

        const fxGrid = document.createElement('div');
        fxGrid.className = 'control-grid';
        fxGrid.appendChild(createControl("REV", "range", 0, 1, 0, (v) => this.audioEngine.setPianoReverb(v)));
        fxGrid.appendChild(createControl("DLY", "range", 0, 1, 0, (v) => this.audioEngine.setPianoDelay(v, undefined)));
        fxGrid.appendChild(createControl("TIME", "range", 0, 1, 0.25, (v) => this.audioEngine.setPianoDelay(this.audioEngine.pianoDelay?.wet.value || 0, v)));
        fxGrid.appendChild(createControl("ARP", "range", 0, 1, 0, (v) => this.audioEngine.setPianoArpWet(v)));
        fxGrid.appendChild(createControl("RATE", "range", 0, 1, 0.3, (v) => this.audioEngine.setPianoArpRate(v)));
        fxGroup.appendChild(fxGrid);
        strip.appendChild(fxGroup);

        container.appendChild(strip);
    }

    initGlobalControls() {
        // Play/Stop
        const playBtn = document.getElementById('play-pause');
        const stopBtn = document.getElementById('stop');
        const bpmInput = document.getElementById('bpm');

        playBtn.addEventListener('click', async () => {
            await this.audioEngine.init();
            if (this.sequencer.isPlaying) {
                this.sequencer.stop(); // Use new method
                playBtn.textContent = 'PLAY';
            } else {
                this.sequencer.start(); // Use new method
                playBtn.textContent = 'PAUSE';
            }
        });

        stopBtn.addEventListener('click', () => {
            this.sequencer.stop(); // Use new method (resets to 0)
            playBtn.textContent = 'PLAY';
            // Reset highlights
            document.querySelectorAll('.step-btn.playing').forEach(el => el.classList.remove('playing'));
        });

        bpmInput.addEventListener('input', (e) => {
            this.audioEngine.transport.bpm.value = parseInt(e.target.value);
        });

        // Session Recording Logic
        const recBtn = document.getElementById('session-rec');
        const timerDisplay = document.getElementById('session-timer');
        let isRecording = false;
        let startTime = 0;
        let timerInterval = null;

        recBtn.addEventListener('click', async () => {
            if (!isRecording) {
                // Start
                await this.audioEngine.startMasterRecording();
                isRecording = true;
                startTime = Date.now();

                // UI Update
                recBtn.style.background = 'red';
                recBtn.style.color = 'white';
                recBtn.style.animation = 'pulse 1s infinite';
                // We need to add keyframes for pulse somewhere, or just toggle opacity? 
                // Inline style animation might fail if keyframes aren't defined. 
                // Let's just use color change for now.

                timerInterval = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    const seconds = Math.floor(elapsed / 1000) % 60;
                    const minutes = Math.floor(elapsed / 60000);
                    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }, 1000);

            } else {
                // Stop
                await this.audioEngine.stopMasterRecording();
                isRecording = false;

                // UI Reset
                recBtn.style.background = '#333';
                recBtn.style.color = '#ff4444';
                recBtn.style.animation = 'none';

                clearInterval(timerInterval);
                timerDisplay.textContent = "00:00";
            }
        });

        // Render initial view
        this.render();
        this.remix.render();

        // FIX: Sliders Steal Keyboard Focus
        const inputs = document.querySelectorAll('input[type="range"]');
        inputs.forEach(input => {
            input.addEventListener('mouseup', function () { this.blur(); });
            input.addEventListener('touchend', function () { this.blur(); });
        });
    }
}
