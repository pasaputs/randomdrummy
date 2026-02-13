import * as Tone from 'tone';

export class KickVoice {
    constructor() {
        this.output = new Tone.Gain(1);

        // Synth Path
        this.synth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.001,
                decay: 0.4,
                sustain: 0.01,
                release: 1.4,
                attackCurve: "exponential"
            }
        }).connect(this.output);

        // Sample Path
        this.player = new Tone.Player().connect(this.output);
        this.useSample = false;
    }

    trigger(time, velocity = 1) {
        if (this.useSample && this.player.loaded) {
            this.player.start(time);
        } else {
            this.synth.triggerAttackRelease("C1", "8n", time, velocity);
        }
    }

    loadSample(url) {
        this.player.load(url).then(() => {
            this.useSample = true;
            console.log(`Kick sample loaded: ${url}`);
        }).catch(e => console.error("Failed to load sample", e));
    }

    setParam(param, value) {
        // Placeholder for easier parameter mapping later
        if (param === 'decay') {
            this.synth.envelope.decay = value;
        }
    }
}
