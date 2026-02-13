import * as Tone from 'tone';

export class ResonatorVoice {
    constructor() {
        this.output = new Tone.Gain(1);

        // Resonator / Comb Filter
        this.comb = new Tone.FeedbackCombFilter({
            delayTime: 0.003, // Musical pitch roughly
            resonance: 0.8
        }).connect(this.output);

        // Source Exciter
        this.synth = new Tone.PulseOscillator({
            frequency: 60,
            width: 0.2
        }).connect(this.comb);

        // Amp Envelope
        this.envelope = new Tone.AmplitudeEnvelope({
            attack: 0.005,
            decay: 0.3,
            sustain: 0.1,
            release: 0.8
        }).connect(this.comb);

        // Connect synth through envelope logic manually because PulseOsc doesn't have internal env
        this.synth.start();
        this.synth.disconnect();
        this.synth.connect(this.envelope);

        // Sample Path (808)
        this.player = new Tone.Player().connect(this.output);
        this.useSample = false;
    }

    trigger(time, velocity = 1) {
        if (this.useSample && this.player.loaded) {
            this.player.start(time);
            return;
        }
        // Randomize resonator slightly for variation
        // this.comb.delayTime.value = 0.002 + (Math.random() * 0.005);
        this.envelope.triggerAttackRelease(0.1, time, velocity);
    }

    loadSample(url) {
        this.player.load(url).then(() => {
            this.useSample = true;
        });
    }

    setTone(val) {
        this.comb.resonance.value = val;
    }
}
