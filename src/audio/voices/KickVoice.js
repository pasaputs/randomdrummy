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
