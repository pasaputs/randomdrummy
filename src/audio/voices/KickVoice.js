import * as Tone from 'tone';

export class KickVoice {
    constructor() {
        this.output = new Tone.Volume(0);

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
        this.mode = 'empty'; // default: 'empty', 'synth', 'sample'
    }

    trigger(time, velocity = 1) {
        if (this.mode === 'empty') return; // Silent

        if (this.mode === 'sample' && this.player.loaded) {
            this.player.start(time);
        } else if (this.mode === 'synth') {
            this.synth.triggerAttackRelease("C1", "8n", time, velocity);
        }
    }

    loadSample(url) {
        this.player.load(url).then(() => {
            this.useSample = true;
            this.mode = 'sample';
            console.log(`Kick sample loaded: ${url}`);
        }).catch(e => console.error("Failed to load sample", e));
    }

    setDetune(cents) {
        this.synth.detune.value = cents;
        // Use playbackRate for reliable sample pitch shifting
        const rate = Math.pow(2, cents / 1200);
        this.player.playbackRate = rate;
    }

    setParam(param, value) {
        // Placeholder for easier parameter mapping later
        if (param === 'decay') {
            this.synth.envelope.decay = value;
        }
    }
}
