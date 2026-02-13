import * as Tone from 'tone';

export class Sequencer {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.steps = 16;
        this.tracks = ['kick', 'snare', 'hihat', 'resonator'];

        // logic: pattern[trackIndex][stepIndex] = true/false (or velocity)
        this.pattern = {
            kick: new Array(16).fill(false),
            snare: new Array(16).fill(false),
            hihat: new Array(16).fill(false),
            resonator: new Array(16).fill(false)
        };

        this.isPlaying = false;
        this.currentStep = 0;

        // Schedule the loop
        this.loopId = null;
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
