export class Mixer {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.container = document.querySelector('#main-content'); // Will be updated by UIManager

        window.addEventListener('samplesRandomized', () => {
            // Iterate over selects and update values
            const selects = this.container.querySelectorAll('select');
            selects.forEach(select => {
                // Find track name from parent or data attribute. 
                // We didn't store track name on select. Let's rely on re-rendering for now or simple check.
                // Actually, re-rendering might be acceptable if specific state isn't lost. 
                // Let's just re-render mixer since it's fast.
                this.render();
            });
        });
    }

    render() {
        this.container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'mixer-grid';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'space-around';
        wrapper.style.padding = '20px';
        wrapper.style.height = '100%';

        const tracks = ['kick', 'snare', 'hihat', 'resonator'];

        tracks.forEach(track => {
            const strip = document.createElement('div');
            strip.className = 'channel-strip';
            strip.style.display = 'flex';
            strip.style.flexDirection = 'column';
            strip.style.alignItems = 'center';
            strip.style.gap = '10px';
            strip.style.background = '#1e1e1e';
            strip.style.padding = '10px';
            strip.style.borderRadius = '4px';
            strip.style.width = '80px';

            // Header Row (Label + Dice)
            const headerRow = document.createElement('div');
            headerRow.style.display = 'flex';
            headerRow.style.alignItems = 'center';
            headerRow.style.gap = '8px';
            headerRow.style.marginBottom = '5px';

            // Label
            const label = document.createElement('div');
            label.textContent = track.toUpperCase();
            label.style.fontWeight = 'bold';
            headerRow.appendChild(label);

            // Random Sample Dice
            const dice = document.createElement('button');
            dice.textContent = '🎲';
            dice.title = 'Random Sample';
            dice.style.background = 'transparent';
            dice.style.border = 'none';
            dice.style.cursor = 'pointer';
            dice.style.fontSize = '1.2rem';
            dice.style.color = '#d3d3d3';

            dice.addEventListener('click', () => {
                const newFile = this.audioEngine.randomizeSample(track);
                if (newFile) {
                    // Update dropdown value to match new file
                    // We need to access the select element. 
                    // Since we are building it below, we can assign it to variable 'select' 
                    // but we need to ensure 'select' is available in this scope or move this listener.
                    // Let's attach listener after select is created.
                    // Logic moved.
                }
            });
            headerRow.appendChild(dice);
            strip.appendChild(headerRow);

            // Sample Dropdown
            const select = document.createElement('select');
            select.style.width = '100%';
            select.style.background = '#444'; // Ableton-ish grey
            select.style.color = '#d3d3d3';
            select.style.border = '1px solid #555';
            select.style.fontSize = '0.7rem';
            select.style.marginBottom = '5px';

            // Populate later when manifest is loaded
            // We need a way to refresh this when engine inits, or just poll
            // For MVP, if engine.sampleManifest is ready, populate.
            // If not, we might need a refresh button or delay.
            // Better: check availability immediately and retry if empty.

            const populate = () => {
                if (this.audioEngine.sampleManifest && this.audioEngine.sampleManifest[track]) {
                    select.innerHTML = '';
                    const defaultOpt = document.createElement('option');
                    defaultOpt.text = "Synth (Default)";
                    defaultOpt.value = "";
                    select.appendChild(defaultOpt);

                    this.audioEngine.sampleManifest[track].forEach(file => {
                        const opt = document.createElement('option');
                        // file is "samples/kicks/name.wav"
                        const name = file.split('/').pop();
                        opt.text = name;
                        opt.value = file;
                        select.appendChild(opt);
                    });
                } else {
                    const loading = document.createElement('option');
                    loading.text = "Loading...";
                    select.appendChild(loading);
                    // Retry?
                    setTimeout(populate, 500);
                }
            };
            populate();

            select.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.audioEngine.loadSample(track, e.target.value);
                } else {
                    // Reset to synth? Currently logic only supports switching to sample.
                    // We need to implement 'unload' or 'useSample = false' in Voice if we want to revert.
                    // For now, reloading page or checking if user selected empty.
                    if (this.audioEngine.voices[track]) {
                        this.audioEngine.voices[track].useSample = false;
                    }
                }
            });
            // Attach Dice Listener (now that select exists)
            dice.addEventListener('click', () => {
                const newFile = this.audioEngine.randomizeSample(track);
                if (newFile) {
                    select.value = newFile;
                }
            });

            strip.appendChild(select);

            // Pan Knob (simulated with range input)
            const panWrapper = document.createElement('div');
            panWrapper.style.textAlign = 'center';
            const panLabel = document.createElement('span');
            panLabel.textContent = 'Pan';
            panLabel.style.fontSize = '0.8rem';

            const panInput = document.createElement('input');
            panInput.type = 'range';
            panInput.min = '-1';
            panInput.max = '1';
            panInput.step = '0.1';
            panInput.value = '0';
            panInput.style.width = '60px';

            panInput.addEventListener('input', (e) => {
                // Access internal Panner of Voice (assuming it exists, otherwise connect one)
                // For MVP, if voices don't have panner exposed, we might skip or add it to Voice class
                // TODO: Ensure Voice has .panner property
            });

            panWrapper.appendChild(panLabel);
            panWrapper.appendChild(panInput);
            strip.appendChild(panWrapper);

            // Volume Fader
            const volInput = document.createElement('input');
            volInput.type = 'range';
            volInput.orient = 'vertical'; // Firefox
            volInput.style.writingMode = 'bt-lr'; // Chrome/Webkit for vertical slider
            volInput.style.appearance = 'slider-vertical';
            volInput.style.width = '20px';
            volInput.style.height = '150px';
            volInput.min = '-60';
            volInput.max = '0';
            volInput.value = '-6'; // Default dB

            volInput.addEventListener('input', (e) => {
                if (this.audioEngine.voices[track]) {
                    this.audioEngine.voices[track].output.gain.value = this.dbToGain(parseFloat(e.target.value));
                }
            });

            strip.appendChild(volInput);
            wrapper.appendChild(strip);
        });

        // Master Effects Section
        const fxSection = document.createElement('div');
        fxSection.className = 'fx-section';
        fxSection.style.display = 'flex';
        fxSection.style.flexDirection = 'column';
        fxSection.style.alignItems = 'center';
        fxSection.style.gap = '10px';
        fxSection.style.background = '#222';
        fxSection.style.padding = '10px';
        fxSection.style.borderRadius = '4px';
        fxSection.style.marginLeft = '10px';

        const fxTitle = document.createElement('div');
        fxTitle.textContent = 'DELAY';
        fxTitle.style.fontWeight = 'bold';
        fxTitle.style.color = '#ff7f50';
        fxSection.appendChild(fxTitle);

        // Time Knob
        const timeControl = this.createKnob('Time', 0, 1, 0.5, (val) => {
            this.audioEngine.setDelayTime(val);
        });
        fxSection.appendChild(timeControl);

        // Feedback Knob
        const fbControl = this.createKnob('Fbk', 0, 0.9, 0.5, (val) => {
            this.audioEngine.setFeedback(val);
        });
        fxSection.appendChild(fbControl);

        // Ping Pong Toggle
        const ppRow = document.createElement('div');
        ppRow.style.display = 'flex';
        ppRow.style.alignItems = 'center';
        ppRow.style.gap = '5px';
        ppRow.style.fontSize = '0.8rem';

        const ppLabel = document.createElement('span');
        ppLabel.textContent = 'PingPong';

        const ppCheck = document.createElement('input');
        ppCheck.type = 'checkbox';
        ppCheck.addEventListener('change', (e) => {
            this.audioEngine.togglePingPong(e.target.checked);
        });

        ppRow.appendChild(ppLabel);
        ppRow.appendChild(ppCheck);
        fxSection.appendChild(ppRow);

        wrapper.appendChild(fxSection);

        this.container.appendChild(wrapper);
    }

    createKnob(label, min, max, initial, callback) {
        const wrapper = document.createElement('div');
        wrapper.style.textAlign = 'center';

        const lbl = document.createElement('div');
        lbl.textContent = label;
        lbl.style.fontSize = '0.8rem';

        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = 0.01;
        input.value = initial;
        input.style.width = '60px';

        input.addEventListener('input', (e) => callback(parseFloat(e.target.value)));

        wrapper.appendChild(lbl);
        wrapper.appendChild(input);
        return wrapper;
    }

    dbToGain(db) {
        return Math.pow(10, db / 20);
    }
}
