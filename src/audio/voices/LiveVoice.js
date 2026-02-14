import * as Tone from 'tone';

export class LiveVoice {
    constructor() {
        this.output = new Tone.Volume(0);
        this.player = new Tone.Player().connect(this.output);
        this.buffer = null;
    }

    setBuffer(buffer) {
        this.buffer = buffer;
        this.player.buffer = this.buffer;
        console.log("Live Voice Buffer Set", buffer);
    }

    trigger(time, velocity = 1) {
        if (this.player && this.player.loaded) {
            this.player.start(time);
            console.log("🔊 Playing PIANOLOOP at", time); // Commented out to reduce spam, but verify functionality
        } else if (this.buffer) {
            // Fallback if loaded is false but we set buffer manually?
            // Tone.Player should be loaded if buffer is set.
        }
    }

    setDetune(cents) {
        const rate = Math.pow(2, cents / 1200);
        this.player.playbackRate = rate;
    }

    async loadSample(url) {
        await this.player.load(url);
        this.player.loop = false; // Sequencer triggers it, so internal loop is false
        console.log("Live Voice Loaded with new Loop:", url);
    }

    async load(url) {
        await this.loadSample(url);
    }
}
