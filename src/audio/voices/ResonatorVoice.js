import * as Tone from 'tone';

export class ResonatorVoice {
    constructor() {
        this.output = new Tone.PanVol(0, -10);

        // Synth Path (Sampler-like or Synth?)
        // Originally likely an 808 synth or sample player
        this.synth = new Tone.MembraneSynth().connect(this.output); // Fallback

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
            this.synth.triggerAttackRelease("C1", "4n", time, velocity);
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
        const rate = Math.pow(2, cents / 1200);
        this.player.playbackRate = rate;
    }
}
