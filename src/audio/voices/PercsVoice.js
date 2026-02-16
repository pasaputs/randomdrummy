import * as Tone from 'tone';

export class PercsVoice {
    constructor() {
        this.output = new Tone.PanVol(0, -6);

        // Synth Path (Membrane for generic percussion)
        this.synth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 2,
            oscillator: { type: "square8" }, // More gritty for percs
            envelope: {
                attack: 0.001,
                decay: 0.2,
                sustain: 0,
                release: 0.5
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
            this.synth.triggerAttackRelease("C2", "16n", time, velocity);
        }
    }

    loadSample(url) {
        if (!url) return;

        // 🛡️ SANITIZE: Fix double slashes if they exist.
        const cleanUrl = url.startsWith('//') ? url.replace('//', '/') : url;

        console.log(`🎵 Loading sanitized path: ${cleanUrl}`);

        this.player.load(cleanUrl)
            .then(() => {
                console.log(`✅ Loaded: ${cleanUrl}`);
                this.useSample = true;
                this.mode = 'sample';
            })
            .catch(e => console.error(`❌ Error loading ${cleanUrl}:`, e));
    }

    setDetune(cents) {
        this.synth.detune.value = cents;
        // Use playbackRate for reliable sample pitch shifting
        const rate = Math.pow(2, cents / 1200);
        this.player.playbackRate = rate;
    }

    setParam(param, value) {
        if (param === 'decay') {
            this.synth.envelope.decay = value;
        }
    }
}