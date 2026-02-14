import * as Tone from 'tone';

export class SnareVoice {
    constructor() {
        this.output = new Tone.Volume(0);

        // Noise Part (Snap)
        this.noise = new Tone.NoiseSynth({
            noise: {
                type: "pink",
                playbackRate: 3
            },
            envelope: {
                attack: 0.001,
                decay: 0.2,
                sustain: 0,
                release: 0.2
            }
        }).connect(this.output);

        // Tonal Part (Body)
        this.osc = new Tone.MembraneSynth({
            pitchDecay: 0.01,
            octaves: 2,
            oscillator: { type: "triangle" },
            envelope: {
                attack: 0.001,
                decay: 0.3,
                sustain: 0,
                release: 0.4
            }
        }).connect(this.output);

        // Sample Path
        this.player = new Tone.Player().connect(this.output);
        this.useSample = false;
        this.mode = 'empty';
    }

    trigger(time, velocity = 1) {
        if (this.mode === 'empty') return;

        if (this.mode === 'sample' && this.player.loaded) {
            this.player.start(time);
        } else if (this.mode === 'synth') {
            this.noise.triggerAttackRelease("8n", time, velocity);
            this.osc.triggerAttackRelease("G2", "8n", time, velocity);
        }
    }

    loadSample(url) {
        this.player.load(url).then(() => {
            this.useSample = true;
            this.mode = 'sample';
        });
    }

    setDetune(cents) {
        this.osc.detune.value = cents;
        const rate = Math.pow(2, cents / 1200);
        this.player.playbackRate = rate;
    }
}
