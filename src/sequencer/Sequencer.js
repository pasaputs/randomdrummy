import * as Tone from 'tone';

export class Sequencer {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.steps = 32;
        this.tracks = ['kick', 'snare', 'hihat', 'resonator', 'live', 'live2', 'pianoloop', 'pianoloop2'];

        // logic: pattern[trackIndex][stepIndex] = true/false (or velocity)
        this.pattern = {
            kick: new Array(32).fill(false),
            snare: new Array(32).fill(false),
            hihat: new Array(32).fill(false),
            resonator: new Array(32).fill(false),
            live: new Array(32).fill(false),
            live2: new Array(32).fill(false),
            pianoloop: new Array(32).fill(false),
            pianoloop2: new Array(32).fill(false)
        };

        this.isPlaying = false;
        this.currentStep = 0;

        this.muteStates = { kick: false, snare: false, hihat: false, resonator: false, live: false, live2: false, pianoloop: false, pianoloop2: false };
        this.soloStates = { kick: false, snare: false, hihat: false, resonator: false, live: false, live2: false, pianoloop: false, pianoloop2: false };

        // Schedule the loop
        this.loopId = null;

        // Listen for Arrangement Events to restore grid loop
        window.addEventListener('arrangementStopped', () => {
            console.log("Sequencer: Restoring Grid Loop...");
            this.reschedule();
        });
    }

    reschedule() {
        if (this.loopId !== null) {
            Tone.Transport.clear(this.loopId);
        }
        this.init();
    }

    async start() {
        if (this.audioEngine.mode === 'ARRANGEMENT') {
            console.log("Sequencer: Stopping Arrangement first...");
            this.audioEngine.stopArrangement();
        }

        if (Tone.context.state !== 'running') {
            await Tone.start();
        }

        Tone.Transport.start();
        this.isPlaying = true;
    }

    stop() {
        Tone.Transport.stop();      // Stop the clock
        Tone.Transport.position = 0; // Force position to 0:0:0
        this.currentStep = 0;       // Reset internal step counter
        this.isPlaying = false;
        console.log("Sequencer Stopped & Reset to 0");
    }

    init() {
        this.loopId = Tone.Transport.scheduleRepeat((time) => {
            this.tick(time);
        }, "16n");
        console.log('Sequencer Initialized');
    }

    tick(time) {
        // Current 16th note step
        const step = this.currentStep % this.steps;

        // --- Vault Logic ---
        if (step === 0 && this.audioEngine.vaultState === 'ARMED') {
            // 1. Change state FIRST to prevent re-entry
            this.audioEngine.vaultState = 'RECORDING';

            // 2. Start Recording
            this.audioEngine.startVaultRecording();
            console.log("🔴 Vault: Recording STARTED (Atomic Trigger)");

            // 2. Schedule exact stop (32 steps = 2 measures)
            const recordingDuration = Tone.Time("2m").toSeconds();
            // Tone.Time("2m") assumes 4/4 signature. 2 measures = 8 beats = 32 sixteenths. Correct.

            setTimeout(() => {
                this.audioEngine.stopVaultRecording();
                console.log("✅ Vault: Stopped automatically after 2 measures");
            }, recordingDuration * 1000);
        }
        // Removed step 31 check since we use setTimeout now


        this.remixAmount = this.remixAmount || 0;

        // Check Logic: Is any track soloed?
        const isAnySolo = Object.values(this.soloStates).some(v => v === true);

        this.tracks.forEach(track => {
            let shouldPlay = this.pattern[track][step];

            // Remix Logic
            if (this.remixAmount > 0 && Math.random() < this.remixAmount * 0.4) {
                shouldPlay = true;
            }

            // Mute/Solo Logic
            const isMuted = this.muteStates[track];
            const isSoloed = this.soloStates[track];

            if (shouldPlay && !isMuted && (!isAnySolo || isSoloed)) {
                // Trigger sound
                this.audioEngine.trigger(track, time);
            }
        });

        // Update UI callback if exists
        if (this.onStepChange) {
            Tone.Draw.schedule(() => {
                this.onStepChange(step);
            }, time);
        }

        this.currentStep = (this.currentStep + 1) % this.steps;
    }

    setRemixAmount(val) {
        this.remixAmount = val;
    }

    toggleStep(track, step) {
        this.pattern[track][step] = !this.pattern[track][step];
        return this.pattern[track][step];
    }

    // "God Prompt": Dice Logic
    randomizeTrack(track) {
        for (let i = 0; i < this.steps; i++) {
            // 30% chance of a note
            this.pattern[track][i] = Math.random() < 0.3;
        }
        if (this.onPatternChange) this.onPatternChange(track);
    }

    randomizeAll() {
        this.tracks.forEach(t => this.randomizeTrack(t));
    }

    clearTrack(track) {
        this.pattern[track].fill(false);
        if (this.onPatternChange) this.onPatternChange(track);
    }

    // Callbacks for UI
    setStepCallback(cb) {
        this.onStepChange = cb;
    }

    setPatternChangeCallback(cb) {
        this.onPatternChange = cb;
    }
}
