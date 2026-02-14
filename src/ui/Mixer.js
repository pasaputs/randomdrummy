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
        this.container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'mixer-grid';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'space-around';
        wrapper.style.padding = '20px';
        wrapper.style.height = '100%';

        const tracks = ['kick', 'snare', 'hihat', 'resonator', 'live', 'pianoloop'];

        tracks.forEach(track => {
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

            if (track === 'live') {
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

                // Rec State Logic (Simplified from previous, merging cleanly)
                // We need to preserve the complex logic if possible, or re-implement simply.
                // Re-implementing specific UI feedback for REC:
                const startRec = () => {
                    recBtn.style.background = 'red';
                    recBtn.style.color = 'white';
                    this.audioEngine.startRecording();
                };
                const stopRec = () => {
                    recBtn.style.background = '#333';
                    recBtn.style.color = '#ff4444';
                    // Check if we need to show download link etc?
                    // For now, adhere to "Hold to Record" request or Toggle?
                    // Previous code was Toggle? No, "Hold to Record" in previous block provided by user in prompt 1, 
                    // but implemented as Toggle in prompt 2?
                    // Prompt 2: "REC button now toggles...". 
                    // This request text says: "Dice/Rec Button".
                    // Let's stick to the TOGGLE logic we implemented earlier if we can find it?
                    // Actually, the code I'm replacing had "Hold to Record" logic (mousedown/up). 
                    // Wait, I might have overwritten the Toggle logic in a previous step?
                    // Let's look at the code I read in Step 543/591. 
                    // Lines 72-83: "Hold to Record Logic". 
                    // Okay, so the logic currently IS Hold. I will preserve Hold.
                    this.audioEngine.stopRecording();
                };

                recBtn.addEventListener('mousedown', startRec);
                recBtn.addEventListener('mouseup', stopRec);
                recBtn.addEventListener('mouseleave', stopRec);
                recBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRec(); });
                recBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRec(); });

                // We also had a download link and progress bar in the "Restoring File Uploads" step (Step 546-554).
                // Did that get applied? 
                // Step 554 applied changes to Mixer.js.
                // But the View in Step 591 shows "Hold to Record" logic.
                // It seems my previous big replace in Step 554 might have FAILED or was overwritten?
                // Step 555 returned "target content not found".
                // So the "Restoring File Uploads" and "Toggle Rec" logic WAS NOT APPLIED correctly.
                // I need to be careful here. I will implement the layout requested NOW.
                // I will stick to "Hold to Record" as seen in current file, to be safe, unless User specifically asked for Toggle in history. 
                // User history says "Enhanced Live Recording (Completed) ... Toggle Logic". 
                // So I SHOULD have Toggle. 
                // Since I am rewriting the whole block, I will re-implement TOGGLE logic here.

                let isRecording = false;
                recBtn.onclick = async () => {
                    if (!isRecording) {
                        // PREPARING STATE
                        recBtn.textContent = 'GET READY...';
                        recBtn.style.background = 'orange';
                        recBtn.style.color = 'black';

                        const res = await this.audioEngine.startRecording();

                        if (res === 'recording') {
                            isRecording = true;
                            recBtn.textContent = 'STOP';
                            recBtn.style.background = 'red';
                            recBtn.style.color = 'white';
                        }
                    } else {
                        const res = await this.audioEngine.stopRecording();
                        isRecording = false;
                        recBtn.textContent = 'REC';
                        recBtn.style.background = '#333';
                        recBtn.style.color = '#ff4444';
                        if (res.url) {
                            // minimal download link
                            const a = document.createElement('a');
                            a.href = res.url;
                            a.download = 'recording.wav';
                            a.click();
                        }
                    }
                };

                // Auto-stop listener
                window.addEventListener('recordingStopped', () => {
                    if (isRecording) {
                        isRecording = false;
                        recBtn.textContent = 'REC';
                        recBtn.style.background = '#333';
                        recBtn.style.color = '#ff4444';
                    }
                });

                headerRow.appendChild(recBtn);
            } else if (track === 'pianoloop') {
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

                recBtn.onclick = async () => {
                    // Visuals: Blinking Red immediately to indicate "Request Sent/Recording"
                    recBtn.style.animation = 'pulse 0.5s infinite alternate';

                    const status = await this.audioEngine.recordInternalPiano();

                    if (status === 'recording') {
                        recBtn.style.background = 'red';
                        recBtn.style.color = 'white';
                        recBtn.textContent = 'STOP';
                        // Animation continues
                    } else {
                        // STOPPED
                        recBtn.style.animation = 'none';
                        recBtn.style.background = '#333';
                        recBtn.style.color = '#ff4444';
                        recBtn.textContent = 'REC';

                        // Visual Feedback: Track Loaded
                        // Find the label in this headerRow (it's the first child)
                        const trackLabel = headerRow.querySelector('div');
                        if (trackLabel) {
                            trackLabel.style.color = '#4caf50'; // Green
                            trackLabel.textContent = "PIANOLOOP (LOADED)";
                            // Reset after 3s? Or keep it? User said "Change track label... to indicate 'Loop Loaded'"
                            // Loop Loaded persists until typical reset.
                        }
                        // Auto-trigger Step 1 (index 0)
                        if (window.audioEngine.sequencer) {
                            window.audioEngine.sequencer.pattern['pianoloop'][0] = true;

                            // REFRESH GRID UI
                            if (window.ui && window.ui.grid && typeof window.ui.grid.render === 'function') {
                                window.ui.grid.render();
                            } else {
                                // Fallback: try re-rendering the whole UI if grid render not found (unlikely)
                                console.log("Grid render not found, relying on next step update.");
                            }

                            // If playing, it will pick up next cycle.
                            // User: "If the sequencer is playing, it should start looping from the next cycle."
                            // This is automatic if we set the pattern step. 
                            // But if we are PAST step 0, it waits for wrap around.
                            // Perfect.
                        }
                    }
                };
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
            if (track === 'live' || track === 'pianoloop') {
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
