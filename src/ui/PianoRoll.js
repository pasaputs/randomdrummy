import * as Tone from 'tone';

export class PianoRoll {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.container = null;
        this.octaveOffset = 0; // 0 means A=C3 (or configured center)
        this.baseOctave = 3;

        // 44 Key Range: F2 (MIDI 41) to C6 (MIDI 84) approx
        // Let's generate note list
        this.notes = [];
        const startMidi = 41; // F2
        const endMidi = 84;   // C6

        for (let m = startMidi; m <= endMidi; m++) {
            this.notes.push(Tone.Frequency(m, "midi").toNote());
        }

        this.keyMapping = {
            'KeyA': 0, 'KeyW': 1, 'KeyS': 2, 'KeyE': 3, 'KeyD': 4,
            'KeyF': 5, 'KeyT': 6, 'KeyG': 7, 'KeyY': 8, 'KeyH': 9,
            'KeyU': 10, 'KeyJ': 11, 'KeyK': 12, 'KeyO': 13, 'KeyL': 14,
            'KeyP': 15, 'Semicolon': 16, 'Quote': 17
            // A=0(C), W=1(C#), ...
        };

        this.initListeners();
    }

    initListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
            if (e.repeat) return; // Prevent spamming

            // Octave Shift
            if (e.code === 'KeyZ') {
                this.shiftOctave(-1);
                return;
            }
            if (e.code === 'KeyX') {
                this.shiftOctave(1);
                return;
            }

            // Piano Play
            if (this.keyMapping.hasOwnProperty(e.code)) {
                this.playKey(this.keyMapping[e.code]);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keyMapping.hasOwnProperty(e.code)) {
                this.releaseKey(this.keyMapping[e.code]);
            }
        });
    }

    shiftOctave(delta) {
        this.octaveOffset += delta;
        // Limit range? Maybe -2 to +2
        if (this.octaveOffset < -2) this.octaveOffset = -2;
        if (this.octaveOffset > 2) this.octaveOffset = 2;

        this.render(); // Re-render to update active zone

        // Show ephemeral toast?
        console.log(`Octave Shift: ${this.octaveOffset}`);
    }

    getMidiFromIndex(index) {
        // Index 0 = C(3 + offset)
        // Middle C is MIDI 60 (C4). 
        // Let's say base is C3 (MIDI 48).
        const baseMidi = 48 + (this.octaveOffset * 12);
        return baseMidi + index;
    }

    playKey(index) {
        const midi = this.getMidiFromIndex(index);
        const note = Tone.Frequency(midi, "midi").toNote();

        console.log(`PianoRoll Keyboard Play: ${note} (Index: ${index})`);

        // Use new safe method
        if (this.audioEngine.triggerPianoAttack) {
            this.audioEngine.triggerPianoAttack(note);
        } else {
            // Fallback if method missing (shouldn't happen)
            console.warn("triggerPianoAttack missing");
        }
        this.highlightKey(note, true);
    }

    releaseKey(index) {
        const midi = this.getMidiFromIndex(index);
        const note = Tone.Frequency(midi, "midi").toNote();
        // Use new safe method
        if (this.audioEngine.triggerPianoRelease) {
            this.audioEngine.triggerPianoRelease(note);
        }
        this.highlightKey(note, false);
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const scrollWrap = document.createElement('div');
        scrollWrap.style.overflowX = 'auto';
        scrollWrap.style.width = '100%';
        scrollWrap.style.height = '140px';
        scrollWrap.style.background = '#222';
        scrollWrap.className = 'piano-scroll-wrap';

        const keysWrap = document.createElement('div');
        keysWrap.style.display = 'flex';
        keysWrap.style.position = 'relative';
        keysWrap.style.height = '120px'; // Keys height
        keysWrap.style.margin = '10px';
        keysWrap.style.minWidth = 'max-content'; // Ensure full width

        // Render Active Zone Indicator
        const activeStartMidi = this.getMidiFromIndex(0);
        const activeEndMidi = this.getMidiFromIndex(17);

        const statusDiv = document.createElement('div');
        statusDiv.style.position = 'absolute';
        statusDiv.style.top = '0';
        statusDiv.style.left = '10px';
        statusDiv.style.color = '#aaa';
        statusDiv.style.fontSize = '0.7rem';
        statusDiv.textContent = `Octave Offset: ${this.octaveOffset} (Range: ${Tone.Frequency(activeStartMidi, "midi").toNote()} - ${Tone.Frequency(activeEndMidi, "midi").toNote()})`;
        this.container.appendChild(statusDiv);

        this.notes.forEach(note => {
            const isSharp = note.includes('#');
            const midi = Tone.Frequency(note).toMidi();

            const keyEl = document.createElement('div');
            keyEl.setAttribute('data-note', note);
            keyEl.className = `piano-key ${isSharp ? 'black' : 'white'}`;

            // Check if in active zone
            const isActiveZone = (midi >= activeStartMidi && midi <= activeEndMidi);

            if (!isSharp) {
                // White Key
                keyEl.style.width = '36px';
                keyEl.style.height = '120px';
                keyEl.style.background = isActiveZone ? '#eee' : '#bbb'; // Lighter if active
                keyEl.style.border = '1px solid #000';
                keyEl.style.borderRadius = '0 0 4px 4px';
                keyEl.style.zIndex = '1';
                keyEl.style.color = '#333';
                keyEl.style.flexShrink = '0';
            } else {
                // Black Key - Absolute positioning relative to previous white key?
                // Easier logic: Flex all white keys, absolute position black keys based on MIDI.
                // But mixing flow is hard.
                // Standard approach: White keys in flex, Black keys absolute.
                // Or: all keys absolute? 
                // Let's use the Negative Margin trick again, it worked well last time for alignment.
                // White Key Width: 36px.
                // Black Key Width: 22px.
                // Black Key should be centered on border.
                // Margin Left: -11px, Margin Right: -11px.

                keyEl.style.width = '24px';
                keyEl.style.height = '80px';
                keyEl.style.background = isActiveZone ? '#222' : '#111';
                keyEl.style.border = '1px solid #333';
                keyEl.style.borderRadius = '0 0 4px 4px';
                keyEl.style.zIndex = '10';
                keyEl.style.marginLeft = '-12px';
                keyEl.style.marginRight = '-12px';
                keyEl.style.position = 'relative'; // Stacking
            }

            // Mouse Events
            keyEl.onmousedown = () => {
                this.audioEngine.triggerPianoAttack(note);
                this.highlightKey(note, true);
            };
            keyEl.onmouseup = () => {
                this.audioEngine.triggerPianoRelease(note);
                this.highlightKey(note, false);
            };
            keyEl.onmouseleave = () => {
                // optionally stop if dragging?
                this.audioEngine.triggerPianoRelease(note);
                this.highlightKey(note, false);
            };

            keysWrap.appendChild(keyEl);
        });

        scrollWrap.appendChild(keysWrap);
        this.container.appendChild(scrollWrap);

        // Auto-scroll to active zone?
        // Find first active key
        setTimeout(() => {
            const firstActive = keysWrap.querySelector(`[data-note="${Tone.Frequency(activeStartMidi, "midi").toNote()}"]`);
            if (firstActive) {
                firstActive.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }, 100);
    }

    highlightKey(note, on) {
        if (!this.container) return;
        const key = this.container.querySelector(`[data-note="${note}"]`);
        if (key) {
            const isBlack = note.includes('#');
            if (on) {
                key.style.background = '#ff7f50';
            } else {
                // Restore
                // Need to know if active zone to restore correct color
                const midi = Tone.Frequency(note).toMidi();
                const baseMidi = 48 + (this.octaveOffset * 12);
                const isActive = (midi >= baseMidi && midi <= baseMidi + 17);

                if (isBlack) key.style.background = isActive ? '#222' : '#111';
                else key.style.background = isActive ? '#eee' : '#bbb';
            }
        }
    }
}
