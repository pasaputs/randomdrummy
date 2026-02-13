import * as Tone from 'tone';

export class HiHatVoice {
    constructor() {
        this.output = new Tone.Gain(0.8);

        this.filter = new Tone.Filter(3000, "highpass").connect(this.output);

        this.synth = new Tone.MetalSynth({
            frequency: 200,
            envelope: {
                attack: 0.001,
                decay: 0.1,
                release: 0.01
            },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5
        }).connect(this.filter);

        // Sample Path
        this.player = new Tone.Player().connect(this.output);
        this.useSample = false;
    }

    trigger(time, velocity = 1) {
        if (this.useSample && this.player.loaded) {
            this.player.start(time);
        } else {
            this.synth.triggerAttackRelease("32n", time, velocity);
        }
    }

    loadSample(url) {
        this.player.load(url).then(() => {
            this.useSample = true;
        });
    }
}
