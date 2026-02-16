export class Mixer {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.container = document.querySelector('#main-content'); // Will be updated by UIManager

        window.addEventListener('samplesRandomized', () => {
            // Iterate over selects and update values
            const selects = this.container.querySelectorAll('select');
            selects.forEach(select => {
                this.render();
            });
        });

        window.addEventListener('trackTriggered', (e) => {
            this.flashTrack(e.detail.track);
        });
    }

    render() {
        // Cleanup old listeners
        if (this._pianoStateListeners) {
            this._pianoStateListeners.forEach(l => window.removeEventListener(l.type, l.handler));
        }
        this._pianoStateListeners = [];

        this.container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'mixer-grid';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'space-around';
        wrapper.style.padding = '20px';
        wrapper.style.height = '100%';

        const tracks = ['kick', 'snare', 'hihat', 'percs', 'resonator', 'live', 'live2', 'pianoloop', 'pianoloop2'];

        tracks.forEach(track => {
            console.log("Rendering controls for:", track);
            const strip = document.createElement('div');
            strip.setAttribute('data-track', track);
            strip.className = 'channel-strip';
            strip.style.display = 'flex';
            strip.style.flexDirection = 'column';
            // strip.style.alignItems = 'center'; // Remove center alignment to let rows fill width
            strip.style.gap = '10px';
            strip.style.background = '#1e1e1e';
            strip.style.padding = '10px';
            strip.style.borderRadius = '4px';
            strip.style.width = '220px'; // Widen to 220px
            strip.style.boxSizing = 'border-box';
            strip.style.border = '1px solid #333';

            // --- 1. Header Row (Name + Dice/Rec) ---
            const headerRow = document.createElement('div');
            headerRow.style.display = 'flex';
            headerRow.style.justifyContent = 'space-between';
            headerRow.style.alignItems = 'center';
            headerRow.style.width = '100%';
            headerRow.style.borderBottom = '1px solid #333';
            headerRow.style.paddingBottom = '5px';
            headerRow.style.marginBottom = '5px';

            const label = document.createElement('div');
            label.textContent = track.toUpperCase();
            label.style.fontWeight = 'bold';
            label.style.fontSize = '0.9rem';
            headerRow.appendChild(label);

            if (track === 'live' || track === 'live2') {
                // REC Logic
                const recContainer = document.createElement('div');
                recContainer.style.display = 'flex';
                recContainer.style.alignItems = 'center';
                recContainer.style.gap = '5px';

                const recBtn = document.createElement('button');
                recBtn.textContent = 'REC';
                recBtn.style.color = '#ff4444';
                recBtn.style.background = '#333';
                recBtn.style.border = '1px solid #555';
                recBtn.style.borderRadius = '4px';
                recBtn.style.fontSize = '0.7rem';
                recBtn.style.padding = '2px 6px';
                recBtn.style.cursor = 'pointer';
                recBtn.id = `rec-btn-${track}`;

                let isRecording = false;
                recBtn.onclick = async () => {
                    if (!isRecording) {
                        // PREPARING STATE
                        recBtn.textContent = 'GET READY...';
                        recBtn.style.background = 'orange';
                        recBtn.style.color = 'black';

                        const res = await this.audioEngine.startRecording(track);

                        if (res === 'recording') {
                            isRecording = true;
                            recBtn.textContent = 'STOP';
                            recBtn.style.background = 'red';
                            recBtn.style.color = 'white';
                        }
                    } else {
                        const res = await this.audioEngine.stopRecording(track);
                        isRecording = false;
                        recBtn.textContent = 'REC';
                        recBtn.style.background = '#333';
                        recBtn.style.color = '#ff4444';
                        if (res.url) {
                            // minimal download link (optional, keeping minimal for UI cleanliness)
                            // const a = document.createElement('a');
                            // a.href = res.url;
                            // a.download = `${track}_recording.wav`;
                            // a.click();
                        }
                    }
                };

                // Auto-stop listener
                window.addEventListener('recordingStopped', (e) => {
                    if (e.detail && e.detail.track === track && isRecording) {
                        isRecording = false;
                        recBtn.textContent = 'REC';
                        recBtn.style.background = '#333';
                        recBtn.style.color = '#ff4444';
                    }
                });

                headerRow.appendChild(recBtn);
            } else if (track === 'pianoloop' || track === 'pianoloop2') {
                // SPECIAL REC LOGIC FOR PIANO LOOP
                const recBtn = document.createElement('button');
                recBtn.textContent = 'REC';
                recBtn.style.color = '#ff4444';
                recBtn.style.background = '#333';
                recBtn.style.border = '1px solid #555';
                recBtn.style.borderRadius = '4px';
                recBtn.style.fontSize = '0.7rem';
                recBtn.style.padding = '2px 6px';
                recBtn.style.cursor = 'pointer';
                recBtn.style.transition = 'all 0.2s'; // Smooth transition
                recBtn.id = `rec-btn-${track}`;

                // Helper to update button visuals based on state
                const updateButtonState = (state) => {
                    if (state === 'ARMED') {
                        recBtn.textContent = 'ARM ●';
                        recBtn.style.background = '#ffb300'; // Amber
                        recBtn.style.color = 'black';
                        recBtn.style.borderColor = '#ffca28';
                        recBtn.style.animation = 'pulse-amber 1s infinite';
                    } else if (state === 'RECORDING') {
                        recBtn.textContent = 'STOP';
                        recBtn.style.background = '#d32f2f'; // Red
                        recBtn.style.color = 'white';
                        recBtn.style.borderColor = '#ff5252';
                        recBtn.style.animation = 'none';
                    } else { // IDLE
                        recBtn.textContent = 'REC';
                        recBtn.style.background = '#333';
                        recBtn.style.color = '#ff4444';
                        recBtn.style.borderColor = '#555';
                        recBtn.style.animation = 'none';
                    }
                };

                // Inject Keyframes for Pulse if not exists (Idempotent)
                if (!document.getElementById('anim-pulse-amber')) {
                    const style = document.createElement('style');
                    style.id = 'anim-pulse-amber';
                    style.textContent = `
                        @keyframes pulse-amber {
                            0% { box-shadow: 0 0 0 0 rgba(255, 179, 0, 0.7); }
                            70% { box-shadow: 0 0 0 6px rgba(255, 179, 0, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(255, 179, 0, 0); }
                        }
                    `;
                    document.head.appendChild(style);
                }

                recBtn.onclick = async () => {
                    const result = await this.audioEngine.recordInternalPiano(track);

                    if (result === 'armed') {
                        updateButtonState('ARMED');
                    } else if (result === 'idle') {
                        updateButtonState('IDLE');
                    } else if (result === 'stopped') {
                        updateButtonState('IDLE');
                        // Visual Feedback: Track Loaded
                        const trackLabel = headerRow.querySelector('div');
                        if (trackLabel) {
                            trackLabel.style.color = '#4caf50'; // Green
                            trackLabel.textContent = `${track.toUpperCase()} (LOADED)`;
                        }
                        // Refresh Grid
                        if (window.audioEngine.sequencer) {
                            window.audioEngine.sequencer.pattern[track][0] = true;
                            if (window.ui && window.ui.grid && typeof window.ui.grid.render === 'function') {
                                window.ui.grid.render();
                            }
                        }
                    }
                };

                // Listen for Auto-Start event (Triggered by Note)
                const onStateChange = (e) => {
                    if (e.detail.track === track && e.detail.state === 'RECORDING') {
                        updateButtonState('RECORDING');
                    }
                };
                window.addEventListener('pianoRecordStateChanged', onStateChange);
                // We keep track of one listener for cleanup? 
                // Since this loop runs for multiple tracks, we might overwrite this._pianoStateListener
                // We should store active listeners in an array or map?
                // Or since render() clears basic innerHTML, maybe we don't need to be too aggressive on cleanup if we trust the browser?
                // "Ensuring proper event listener cleanup" was a requirement.
                // But we are in a loop now.
                // Let's add it to a list.
                if (!this._pianoStateListeners) this._pianoStateListeners = [];
                this._pianoStateListeners.push({ type: 'pianoRecordStateChanged', handler: onStateChange });
                // We need to implement cleanup in render() start!

                // Initial State Check
                if (this.audioEngine.pianoRecordStates && this.audioEngine.pianoRecordStates[track]) {
                    updateButtonState(this.audioEngine.pianoRecordStates[track]);
                }

                headerRow.appendChild(recBtn);

            } else {
                const dice = document.createElement('button');
                dice.textContent = '🎲';
                dice.style.background = 'transparent';
                dice.style.border = 'none';
                dice.style.cursor = 'pointer';
                dice.style.fontSize = '1.2rem';
                dice.style.color = '#aaa';
                dice.title = 'Random Sample';

                dice.addEventListener('click', () => {
                    const newFile = this.audioEngine.randomizeSample(track);
                    // We need to update the select box below if we can access it.
                    // Dispatch event or just let it update? 
                    // We'll give the select an ID or class we can find using the strip.
                    if (newFile) {
                        const sel = strip.querySelector('select');
                        if (sel) sel.value = newFile;
                    }
                });

                headerRow.appendChild(dice);
            }
            strip.appendChild(headerRow);

            // --- 2. Loader Row (Dropdown + Files) ---
            const loaderRow = document.createElement('div');
            loaderRow.style.display = 'flex';
            loaderRow.style.gap = '5px';
            loaderRow.style.width = '100%';
            loaderRow.style.marginBottom = '5px';

            // Select
            const select = document.createElement('select');
            if (track === 'live' || track === 'live2' || track === 'pianoloop' || track === 'pianoloop2') {
                select.style.display = 'none'; // logic from before
            }
            select.style.flexGrow = '1';
            select.style.width = '0'; // Flex trick
            select.style.background = '#333';
            select.style.color = '#eee';
            select.style.border = '1px solid #444';
            select.style.fontSize = '0.7rem';
            select.style.padding = '2px';

            const populate = () => {
                if (this.audioEngine.sampleManifest && this.audioEngine.sampleManifest[track]) {
                    select.innerHTML = '';
                    ['Empty', 'Synth'].forEach(val => {
                        const o = document.createElement('option');
                        o.text = val; o.value = val.toLowerCase();
                        select.appendChild(o);
                    });
                    this.audioEngine.sampleManifest[track].forEach(file => {
                        const o = document.createElement('option');
                        o.text = file.split('/').pop();
                        o.value = file;
                        select.appendChild(o);
                    });
                    select.value = 'empty';
                } else {
                    const l = document.createElement('option'); l.text = "Loading..."; select.appendChild(l);
                    setTimeout(populate, 500);
                }
            };
            populate();

            select.addEventListener('change', (e) => {
                const val = e.target.value;
                const selectedOpt = select.options[select.selectedIndex];

                // UI Pitch Reset
                if (strip._pitchSlider) {
                    strip._pitchSlider.value = 0;
                }

                if (selectedOpt && selectedOpt._file) {
                    this.audioEngine.loadLocalFile(track, selectedOpt._file);
                } else if (val === 'empty' || val === 'synth') {
                    if (this.audioEngine.voices[track]) this.audioEngine.voices[track].mode = val;
                } else {
                    this.audioEngine.loadSample(track, val);
                }
            });
            loaderRow.appendChild(select);

            // File Inputs
            const fileInput = document.createElement('input');
            fileInput.type = 'file'; fileInput.accept = 'audio/*'; fileInput.style.display = 'none';
            fileInput.onchange = (e) => {
                const f = e.target.files[0];
                if (f) this.audioEngine.loadLocalFile(track, f);
            };
            strip.appendChild(fileInput);

            const folderInput = document.createElement('input');
            folderInput.type = 'file'; folderInput.webkitdirectory = true; folderInput.style.display = 'none';
            folderInput.onchange = (e) => {
                const files = Array.from(e.target.files).filter(f => f.type.startsWith('audio/'));
                if (files.length) {
                    const grp = document.createElement('optgroup'); grp.label = "Local";
                    files.forEach(f => {
                        const o = document.createElement('option'); o.text = f.name; o._file = f;
                        o.value = Math.random().toString(36);
                        grp.appendChild(o);
                    });
                    select.appendChild(grp);
                    if (grp.firstChild) {
                        select.value = grp.firstChild.value;
                        this.audioEngine.loadLocalFile(track, grp.firstChild._file);
                    }
                }
            };
            strip.appendChild(folderInput);

            // Buttons
            const btnStyle = "background: #333; border: 1px solid #555; color: #eee; cursor: pointer; padding: 2px 5px; border-radius: 3px;";

            const fileBtn = document.createElement('button');
            fileBtn.innerHTML = '📄'; fileBtn.title = 'Current File';
            fileBtn.style.cssText = btnStyle;
            fileBtn.onclick = () => fileInput.click();
            loaderRow.appendChild(fileBtn);

            const folderBtn = document.createElement('button');
            folderBtn.innerHTML = '📂'; folderBtn.title = 'Load Folder';
            folderBtn.style.cssText = btnStyle;
            folderBtn.onclick = () => folderInput.click();
            loaderRow.appendChild(folderBtn);

            strip.appendChild(loaderRow);


            // --- 3. FX Row (Delay + Time) ---
            const fxRow = document.createElement('div');
            fxRow.style.display = 'flex';
            fxRow.style.justifyContent = 'space-around';
            fxRow.style.width = '100%';
            fxRow.style.marginBottom = '10px';
            fxRow.style.background = '#252525';
            fxRow.style.padding = '5px 0';
            fxRow.style.borderRadius = '4px';

            const createKnob = (name, cb) => {
                const kWrap = document.createElement('div');
                kWrap.style.textAlign = 'center';
                const kn = document.createElement('input');
                kn.type = 'range'; kn.min = 0; kn.max = 1; kn.step = 0.01; kn.value = name === 'TIME' ? 0.5 : 0;
                kn.style.width = '60px';
                kn.oninput = (e) => cb(parseFloat(e.target.value));

                const txt = document.createElement('div');
                txt.textContent = name;
                txt.style.fontSize = '0.6rem';
                txt.style.color = '#888';

                kWrap.appendChild(txt);
                kWrap.appendChild(kn);
                return kWrap;
            };

            fxRow.appendChild(createKnob('DLY', (v) => this.audioEngine.setTrackDelayWet(track, v)));
            fxRow.appendChild(createKnob('TIME', (v) => this.audioEngine.setTrackDelayTime(track, v)));

            // PITCH SLIDER (Explicit Render)
            const pitchWrap = document.createElement('div');
            pitchWrap.className = 'fx-control-group';
            pitchWrap.style.textAlign = 'center';
            pitchWrap.style.display = 'flex';
            pitchWrap.style.flexDirection = 'column';
            pitchWrap.style.alignItems = 'center';

            const pitchLbl = document.createElement('div');
            pitchLbl.textContent = 'PITCH';
            pitchLbl.style.fontSize = '0.6rem';
            pitchLbl.style.color = '#ffd700'; // Gold/Yellow

            const pitchIn = document.createElement('input');
            pitchIn.type = 'range';
            pitchIn.className = 'pitch-slider';
            pitchIn.min = -1200;
            pitchIn.max = 1200;
            pitchIn.step = 10;
            pitchIn.value = 0;
            pitchIn.style.width = '60px';
            pitchIn.style.marginTop = '2px';

            pitchIn.oninput = (e) => {
                this.audioEngine.setTrackPitch(track, parseFloat(e.target.value));
            };

            // Store for reset reference
            strip._pitchSlider = pitchIn;

            pitchWrap.appendChild(pitchLbl);
            pitchWrap.appendChild(pitchIn);
            fxRow.appendChild(pitchWrap);

            strip.appendChild(fxRow);


            // --- 4. Mixer Section (Pan + Vol) ---
            const mixRow = document.createElement('div');
            mixRow.style.display = 'flex';
            mixRow.style.flexDirection = 'column';
            mixRow.style.alignItems = 'center';
            mixRow.style.gap = '5px';
            mixRow.style.flexGrow = '1';

            // Pan
            const panWrap = document.createElement('div');
            panWrap.style.textAlign = 'center';
            const panTitle = document.createElement('div'); panTitle.textContent = 'PAN'; panTitle.style.fontSize = '0.6rem'; panTitle.style.color = '#888';
            const panIn = document.createElement('input');
            panIn.type = 'range'; panIn.min = -1; panIn.max = 1; panIn.step = 0.1; panIn.value = 0; panIn.style.width = '80px';
            panIn.oninput = (e) => { /* Todo: Pan logic */ };
            panWrap.appendChild(panTitle);
            panWrap.appendChild(panIn);
            mixRow.appendChild(panWrap);

            // START Offset Slider (Recorded Tracks Only)
            if (track === 'live' || track === 'live2' || track === 'pianoloop' || track === 'pianoloop2') {
                const startWrap = document.createElement('div');
                startWrap.style.textAlign = 'center';
                startWrap.style.marginTop = '10px';

                const startTitle = document.createElement('div');
                startTitle.textContent = 'START';
                startTitle.style.fontSize = '0.6rem';
                startTitle.style.color = '#ff7f50'; // Accent color

                const startIn = document.createElement('input');
                startIn.type = 'range';
                startIn.min = 0;
                startIn.max = 2; // 2 seconds max
                startIn.step = 0.001; // ms precision
                startIn.value = 0;
                startIn.style.width = '80px';

                // Load persisted value if any
                try {
                    const offsets = JSON.parse(localStorage.getItem('drummimasin_offsets') || '{}');
                    if (offsets[track]) startIn.value = offsets[track];
                } catch (e) { }

                startIn.oninput = (e) => {
                    this.audioEngine.setTrackOffset(track, parseFloat(e.target.value));
                };

                startWrap.appendChild(startTitle);
                startWrap.appendChild(startIn);
                mixRow.appendChild(startWrap);
            }

            // Vol
            const volIn = document.createElement('input');
            volIn.type = 'range';
            volIn.min = 0; volIn.max = 100; volIn.value = 80;
            // Vertical styling
            volIn.classList.add('vertical');
            volIn.setAttribute('orient', 'vertical'); // Keep for accessibility/compatibility
            // volIn.style.writingMode = 'bt-lr'; // Moved to CSS
            // volIn.style.appearance = 'slider-vertical'; // Moved to CSS
            volIn.style.width = '20px';
            volIn.style.height = '120px'; // Taller
            volIn.style.marginTop = '10px';
            volIn.oninput = (e) => this.audioEngine.setVolume(track, parseFloat(e.target.value));

            // Init Volume
            this.audioEngine.setVolume(track, 80);

            mixRow.appendChild(volIn);
            strip.appendChild(mixRow);

            wrapper.appendChild(strip);
        });

        // Master FX Section Removed (Per-track delays implemented)

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

    flashTrack(trackName) {
        // Find the strip or label
        // We need to store references to strips or query them
        // Since we didn't store them in an object map, let's query by text content or similar?
        // Better: We can add data-track attribute to strips in render()
        // But render() reconstructs. 
        // Let's rely on data attribute.
        const strip = this.container.querySelector(`.channel-strip[data-track="${trackName}"]`);
        if (strip) {
            // Flash effect
            strip.style.transition = 'background 0.05s';
            strip.style.background = '#444'; // Lighter
            setTimeout(() => {
                strip.style.transition = 'background 0.2s';
                strip.style.background = '#1e1e1e'; // Original
            }, 100);
        }
    }
}
