import * as Tone from 'tone';
import { KickVoice } from './voices/KickVoice';
import { SnareVoice } from './voices/SnareVoice';
import { HiHatVoice } from './voices/HiHatVoice';
import { ResonatorVoice } from './voices/ResonatorVoice';

export class AudioEngine {
    // Properties initialized in constructor

    constructor() {
        this.ctx = Tone.getContext();
        this.transport = Tone.getTransport();
        this.voices = {};

        // Master Output with Limiter/Compressor
        this.master = new Tone.Limiter(-1).toDestination();
        this.compressor = new Tone.Compressor(-30, 3).connect(this.master);

        // Master Effects Chain
        this.monoDelay = new Tone.FeedbackDelay("8n", 0.5);
        this.stereoDelay = new Tone.PingPongDelay("8n", 0.2); // Initial feedback 0.2, time 8n

        this.reverb = new Tone.Reverb({ decay: 4, wet: 0 }); // Init Reverb
        this.reverb.generate(); // Pre-calculate impulse response

        // Effects Input - all voices will connect here
        this.effectsInput = new Tone.Gain(1);

        // Initial delay setup: use monoDelay by default
        this.delay = this.monoDelay;

        // Chain: effectsInput -> activeDelay -> reverb -> compressor
        this.pingPongDelay = new Tone.PingPongDelay("8n", 0.5);

        // Route: Input -> Delay (Selected) -> Reverb -> Compressor
        // By default use Mono
        this.activeDelay = this.monoDelay;

        this.effectsBus = new Tone.Gain(1);
        this.effectsBus.connect(this.activeDelay);
        this.activeDelay.connect(this.reverb);
        this.reverb.connect(this.compressor);

        // Init state
        this.monoDelay.wet.value = 0;
        this.pingPongDelay.wet.value = 0;
        this.reverb.wet.value = 0; // Ensure reverb wet is also initialized

        this.initVoices();

        // Load Manifest Immediately
        this.sampleManifest = {};
        this.loadManifest();
    }

    togglePingPong(isActive) {
        this.activeDelay.disconnect();

        // Transfer params
        const time = this.activeDelay.delayTime.value;
        const fb = this.activeDelay.feedback.value;
        const wet = this.activeDelay.wet.value;

        if (isActive) {
            this.activeDelay = this.pingPongDelay;
        } else {
            this.activeDelay = this.monoDelay;
        }

        this.activeDelay.delayTime.value = time;
        this.activeDelay.feedback.value = fb;
        this.activeDelay.wet.value = wet;

        this.effectsBus.disconnect();
        this.effectsBus.connect(this.activeDelay);
        this.activeDelay.connect(this.reverb);
    }

    setDelayTime(val) {
        // Map 0-1 to [16n, 8n, 8n., 4n, 2n]
        const times = ["16n", "8n", "8n.", "4n", "2n"];
        const step = Math.floor(val * (times.length - 1));
        this.activeDelay.delayTime.value = times[step];
    }

    setFeedback(val) {
        this.activeDelay.feedback.value = val * 0.9; // Cap at 0.9 to prevent infinite
    }

    setEffectsMix(amount) {
        // Control Reverb/Delay Wet amount
        // 0 -> 0 wet
        // 1 -> 0.5 wet (Don't go full wet for drums usually)
        this.activeDelay.wet.value = amount * 0.5;
        this.reverb.wet.value = amount * 0.4;
    }

    async loadManifest() {
        try {
            const response = await fetch('/samples.json');
            this.sampleManifest = await response.json();
            console.log('Sample Manifest Loaded', this.sampleManifest);
        } catch (e) {
            console.error('Failed to load sample manifest', e);
        }
    }

    async init() {
        await Tone.start();
        console.log('Audio Context Started');
        this.setupMIDI();
    }

    loadSample(track, filename) {
        if (this.voices[track]) {
            // Construct URL - assuming flat structure in public/samples based on manifest
            // Manifest contains "samples/kicks/filename.wav"
            const url = `/${filename}`;
            this.voices[track].loadSample(url);
        }
    }

    randomizeSample(track) {
        const samples = this.sampleManifest[track];
        if (samples && samples.length > 0) {
            const randomFile = samples[Math.floor(Math.random() * samples.length)];
            console.log(`Randomizing ${track} to ${randomFile}`);
            this.loadSample(track, randomFile);
            return randomFile; // Return for UI update
        }
        return null;
    }

    randomizeAllSamples() {
        // Kick, Snare, HiHat, Resonator
        ['kick', 'snare', 'hihat', 'resonator'].forEach(track => this.randomizeSample(track));
    }

    setupMIDI() {
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(midiAccess => {
                const inputs = midiAccess.inputs.values();
                for (let input of inputs) {
                    input.onmidimessage = (msg) => this.handleMIDIMessage(msg);
                }
                midiAccess.onstatechange = (e) => {
                    if (e.port.type === 'input' && e.port.state === 'connected') {
                        e.port.onmidimessage = (msg) => this.handleMIDIMessage(msg);
                    }
                };
            }).catch(e => console.warn("MIDI Access Failed", e));
        }
    }

    handleMIDIMessage(msg) {
        const [status, note, velocity] = msg.data;
        // Note On (channel 1-16): 0x90-0x9F. velocity > 0
        if ((status & 0xF0) === 0x90 && velocity > 0) {
            this.triggerFromMIDI(note, velocity);
        }
    }

    triggerFromMIDI(note, velocity) {
        const now = Tone.now();
        const vel = velocity / 127;
        switch (note) {
            case 36: this.trigger('kick', now, vel); break; // C1
            case 38: this.trigger('snare', now, vel); break; // D1
            case 42: this.trigger('hihat', now, vel); break; // F#1
            case 41: // F1 (Low Tom typically) or
            case 48: // C2
                this.trigger('resonator', now, vel); break;
        }
    }

    initVoices() {
        // Track 1: Kick
        this.voices.kick = new KickVoice();
        this.voices.kick.output.connect(this.effectsBus); // Route to FX Chain

        // Track 2: Snare
        this.voices.snare = new SnareVoice();
        this.voices.snare.output.connect(this.effectsBus);

        // Track 3: Hi-Hat
        this.voices.hihat = new HiHatVoice();
        this.voices.hihat.output.connect(this.effectsBus);

        // Track 4: Resonator
        this.voices.resonator = new ResonatorVoice();
        this.voices.resonator.output.connect(this.effectsBus);
    }

    trigger(trackName, time, velocity = 1) {
        if (this.voices[trackName]) {
            this.voices[trackName].trigger(time, velocity);
        }
    }

    start() {
        this.transport.start();
    }

    stop() {
        this.transport.stop();
    }
}
