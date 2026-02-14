import * as Tone from 'tone';

export class Sequencer {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.steps = 32;
        this.tracks = ['kick', 'snare', 'hihat', 'resonator', 'live', 'pianoloop'];

        // logic: pattern[trackIndex][stepIndex] = true/false (or velocity)
        this.pattern = {
            kick: new Array(32).fill(false),
            snare: new Array(32).fill(false),
            hihat: new Array(32).fill(false),
            resonator: new Array(32).fill(false),
            live: new Array(32).fill(false),
            pianoloop: new Array(32).fill(false)
        };

        this.isPlaying = false;
        this.currentStep = 0;

        // Schedule the loop
        this.loopId = null;
    }

    start() {
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
        this.remixAmount = this.remixAmount || 0;

        this.tracks.forEach(track => {
            let shouldPlay = this.pattern[track][step];

            // Remix Logic
            if (this.remixAmount > 0 && Math.random() < this.remixAmount * 0.4) {
                shouldPlay = true;
            }

            if (shouldPlay) {
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

        this.currentStep++;
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
