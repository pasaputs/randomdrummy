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
        if (this.buffer && this.player.loaded) {
            this.player.start(time);
        }
    }

    setDetune(cents) {
        const rate = Math.pow(2, cents / 1200);
        this.player.playbackRate = rate;
    }
}
