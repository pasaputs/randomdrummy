import * as Tone from 'tone';

export class HiHatVoice {
    constructor() {
        this.output = new Tone.Volume(0);

        // Synth Path (Noise hihat)
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
            this.synth.triggerAttackRelease("32n", time, velocity);
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
        // MetalSynth doesn't have standard detune like membrane? 
        // We can just modulate frequency slightly if needed, or ignore.
        // For sample:
        const rate = Math.pow(2, cents / 1200);
        this.player.playbackRate = rate;
    }
}
