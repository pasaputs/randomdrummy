import * as Tone from 'tone';

export class KeyboardController {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            // Prevention: Input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            if (e.repeat) return;

            // Spacebar Toggle
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling

                const sequencer = window.audioEngine?.sequencer;
                const playBtn = document.getElementById('play-pause');

                // Check Tone.Transport state directly for reliability
                if (Tone.Transport.state === 'started') {
                    // STOP
                    if (sequencer) sequencer.stop();
                    if (playBtn) playBtn.textContent = 'PLAY';
                    console.log("Spacebar: STOP");
                } else {
                    // START
                    Tone.start().then(() => {
                        if (sequencer) sequencer.start();
                        if (playBtn) playBtn.textContent = 'PAUSE';
                        console.log("Spacebar: START");
                    });
                }
                return; // Don't trigger notes
            }

            // Debug Log
            // console.log("KeyboardController Keydown:", e.code);

            // Map keys to tracks
            // A -> Kick
            // S -> Snare
            // D -> HiHat
            // F -> Resonator
            // G -> Live

            // Use e.code or e.key. e.code is layout independent-ish (KeyA usually position).
            // Let's use e.key for simplicity or e.code 'KeyA'.

            // Allow spamming: Tone.js triggers usually handle re-triggering.
            // We just call trigger.

            // Check for repeat to avoid machine-gunning on hold? 
            // "Ensure polyphony... spamming...". Usually means repeated *presses*. 
            // If user Holds A, system auto-repeats. DO we want that? 
            // "MPC Mode" usually implies discrete hits. 
            // If I hold 'A', standard OS repeat might fire. 
            // Often acceptable for "rolls", but might be annoying.
            // Let's allow it for now unless it causes issues.

            const now = this.audioEngine.ctx.now(); // Ensure we use audio context time

            switch (e.code) {
                // DRUMS (Bottom Row)
                case 'KeyC':
                    this.audioEngine.manualTrigger('kick');
                    this.simulateActive('KeyC');
                    break;
                case 'KeyV':
                    this.audioEngine.manualTrigger('snare');
                    this.simulateActive('KeyV');
                    break;
                case 'KeyB':
                    this.audioEngine.manualTrigger('hihat');
                    this.simulateActive('KeyB');
                    break;
                case 'KeyN':
                    this.audioEngine.manualTrigger('resonator');
                    this.simulateActive('KeyN');
                    break;
                case 'KeyM':
                    this.audioEngine.manualTrigger('live');
                    this.simulateActive('KeyM');
                    break;
                // NO PIANO MAPPING HERE - Handled by PianoRoll.js
            }
        });
    }

    triggerPiano(note) {
        this.audioEngine.triggerPiano(note);
    }

    simulateActive(code) {
        // Optional: We could highlight the key on a virtual keyboard if we had one.
        // For now, the AudioEngine trigger emits an event that Mixer listens to, 
        // so the visual feedback is handled there.
    }
}
