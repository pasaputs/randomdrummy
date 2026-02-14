import * as Tone from 'tone';

export class HiHatVoice {
    constructor() {
        this.output = new Tone.Volume(0);

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
        this.mode = 'empty';
    }

    trigger(time, velocity = 1) {
        if (this.mode === 'empty') return;

        if (this.mode === 'sample' && this.player.loaded) {
            this.player.start(time);
        } else if (this.mode === 'synth') {
            this.synth.triggerAttackRelease("32n", time, velocity);
        }
    }

    loadSample(url) {
        this.player.load(url).then(() => {
            this.useSample = true;
            this.mode = 'sample';
        });
    }

    setDetune(cents) {
        this.synth.detune.value = cents;
        const rate = Math.pow(2, cents / 1200);
        this.player.playbackRate = rate;
    }
}
