import * as Tone from 'tone';
import { KickVoice } from './voices/KickVoice';
import { SnareVoice } from './voices/SnareVoice';
import { HiHatVoice } from './voices/HiHatVoice';
import { ResonatorVoice } from './voices/ResonatorVoice';
import { LiveVoice } from './voices/LiveVoice';

export class AudioEngine {
    // Properties initialized in constructor

    constructor() {
        this.ctx = Tone.getContext();
        this.transport = Tone.getTransport();
        this.voices = {};

        // Master Output with Limiter/Compressor
        this.master = new Tone.Limiter(-1).toDestination();
        this.compressor = new Tone.Compressor(-30, 3).connect(this.master);

        // Master Recorder (Session)
        this.masterRecorder = new Tone.Recorder();
        this.master.connect(this.masterRecorder);

        // Vault Recorder (32-Step Loop)
        this.vaultRecorder = new Tone.Recorder();
        this.master.connect(this.vaultRecorder);
        this.vaultState = 'IDLE'; // IDLE, ARMED, RECORDING

        // Per-Track Delays
        this.trackDelays = {};
        // We will initialize them in initVoices

        this.initVoices();

        // Piano Chain
        this.pianoSampler = new Tone.Sampler({
            urls: {
                C4: "C4.mp3" // Default placeholder, will need a robust default or silence
            },
            baseUrl: "https://tonejs.github.io/audio/salamander/", // Use a reliable default for now? Or just empty.
            onload: () => console.log("Piano Default Loaded")
        });

        // Effect Chain
        this.pianoPitch = new Tone.PitchShift(0);
        this.pianoPanner = new Tone.Panner(0);
        this.pianoTremolo = new Tone.Tremolo(5, 0).start(); // 5Hz, 0 Depth
        this.pianoReverb = new Tone.Reverb({ decay: 4, wet: 0 }); // Default dry
        this.pianoDelay = new Tone.FeedbackDelay("8n", 0.3); // Default dry
        this.pianoDelay.wet.value = 0;

        // Chain: Sampler -> Pitch -> Panner -> Tremolo -> Reverb -> Delay -> Volume -> Master
        this.pianoSampler.connect(this.pianoPitch);
        this.pianoPitch.connect(this.pianoPanner);
        this.pianoPanner.connect(this.pianoTremolo);
        this.pianoTremolo.connect(this.pianoReverb);
        this.pianoReverb.connect(this.pianoDelay);

        // Volume Control (End of Chain)
        this.pianoVolume = new Tone.Volume(-10);
        this.pianoDelay.connect(this.pianoVolume);

        // Connect Volume to Master (Compressor)
        this.pianoVolume.connect(this.compressor);

        // Resampling Recorder (LOOP 2M)
        this.pianoRecorder = new Tone.Recorder();
        this.pianoVolume.connect(this.pianoRecorder);

        // Internal Recorder (Track 6 - PIANOLOOP)
        this.pianoInternalRecorder = new Tone.Recorder();
        this.pianoVolume.connect(this.pianoInternalRecorder);

        // Internal Recorder 2 (Track 8 - PIANOLOOP2)
        this.pianoInternalRecorder2 = new Tone.Recorder();
        this.pianoVolume.connect(this.pianoInternalRecorder2);

        // Piano Record State Machine (Per Track)
        this.pianoRecordStates = {
            pianoloop: 'IDLE',
            pianoloop2: 'IDLE'
        };

        // Load Manifest Immediately
        this.sampleManifest = {};
        this.loadManifest();
    }

    // Internal helper: actually starts the MediaRecorder
    startPianoRecording(track) {
        const recorder = (track === 'pianoloop2') ? this.pianoInternalRecorder2 : this.pianoInternalRecorder;
        if (recorder.state !== 'started') {
            recorder.start();
        }
        this.pianoRecordStates[track] = 'RECORDING';
        console.log(`⏺️ Internal Recording (${track}) started.`);
        // Dispatch event with track info
        window.dispatchEvent(new CustomEvent('pianoRecordStateChanged', {
            detail: { state: 'RECORDING', track: track }
        }));
    }

    // State-machine toggle: IDLE → ARMED → (auto-start on note) → RECORDING → IDLE
    async recordInternalPiano(track = 'pianoloop') {
        const state = this.pianoRecordStates[track];
        const recorder = (track === 'pianoloop2') ? this.pianoInternalRecorder2 : this.pianoInternalRecorder;

        if (state === 'IDLE') {
            // ARM the recorder — wait for first note
            this.pianoRecordStates[track] = 'ARMED';
            console.log(`🔴 Armed (${track}) — Waiting for input...`);
            return 'armed';
        } else if (state === 'ARMED') {
            // Cancel arm
            this.pianoRecordStates[track] = 'IDLE';
            console.log(`⬜ Arm cancelled (${track}) — back to IDLE.`);
            return 'idle';
        } else if (state === 'RECORDING') {
            // STOP & CAPTURE
            const blob = await recorder.stop();
            const url = URL.createObjectURL(blob);

            // FORCE LOAD into correct voice
            if (this.voices[track]) {
                if (typeof this.voices[track].load === 'function') {
                    await this.voices[track].load(url);
                } else {
                    await this.voices[track].loadSample(url);
                }
                console.log(`✅ Audio loaded to ${track.toUpperCase()} track`);
            }
            this.pianoRecordStates[track] = 'IDLE';
            return 'stopped';
        }
    }

    setTrackDelayTime(track, val) {
        // Map 0-1 to [16n, 8n, 8n., 4n, 2n]
        const times = ["16n", "8n", "8n.", "4n", "2n"];
        const step = Math.floor(val * (times.length - 1));
        if (this.trackDelays[track]) {
            this.trackDelays[track].delayTime.value = times[step];
        }
    }

    setTrackDelayFeedback(track, val) {
        if (this.trackDelays[track]) {
            this.trackDelays[track].feedback.value = val * 0.9;
        }
    }

    setTrackDelayWet(track, amount) {
        // 0 -> 0 wet
        // 1 -> 0.5 wet
        if (this.trackDelays[track]) {
            this.trackDelays[track].wet.value = amount * 0.5;
        }
    }

    setTrackPitch(track, val) {
        if (this.voices[track]) {
            // val is -1200 to 1200 cents
            const cents = val;
            if (typeof this.voices[track].setDetune === 'function') {
                this.voices[track].setDetune(cents);
            }
        }
    }

    setVolume(track, value) {
        if (this.voices[track] && this.voices[track].output) {
            let db;
            if (value <= 0) {
                db = -Infinity;
            } else {
                db = Tone.gainToDb(value / 100);
            }
            this.voices[track].output.volume.rampTo(db, 0.1);
        }
    }

    setTrackOffset(track, val) {
        // val is 0 to 2 seconds
        if (this.voices[track]) {
            this.voices[track].offset = val;

            // Persist
            try {
                const offsets = JSON.parse(localStorage.getItem('drummimasin_offsets') || '{}');
                offsets[track] = val;
                localStorage.setItem('drummimasin_offsets', JSON.stringify(offsets));
            } catch (e) {
                console.warn('Failed to save offsets', e);
            }
        }
    }

    loadOffsets() {
        try {
            const offsets = JSON.parse(localStorage.getItem('drummimasin_offsets') || '{}');
            Object.keys(offsets).forEach(track => {
                if (this.voices[track]) {
                    this.voices[track].offset = offsets[track];
                }
            });
            console.log("Loaded Sample Offsets", offsets);
        } catch (e) {
            console.warn('Failed to load offsets', e);
        }
    }

    setPianoVolume(db) {
        if (this.pianoVolume) {
            if (db <= -60) this.pianoVolume.volume.rampTo(-Infinity, 0.1);
            else this.pianoVolume.volume.rampTo(db, 0.1);
        }
    }

    setPianoPan(val) {
        // val -1 to 1
        if (this.pianoPanner) {
            this.pianoPanner.pan.rampTo(val, 0.1);
        }
    }

    setPianoReverbWet(val) {
        if (this.pianoReverb) {
            this.pianoReverb.wet.rampTo(val, 0.1);
        }
    }

    setPianoDelayWet(val) {
        if (this.pianoDelay) {
            this.pianoDelay.wet.rampTo(val, 0.1);
        }
    }

    setPianoDelayTime(val) {
        // Map 0-1 to [16n, 8n, 8n., 4n, 2n]
        const times = ["16n", "8n", "8n.", "4n", "2n"];
        const step = Math.floor(val * (times.length - 1));
        if (this.pianoDelay) {
            this.pianoDelay.delayTime.value = times[step];
        }
    }

    setPianoDelayFeedback(val) {
        if (this.pianoDelay) {
            this.pianoDelay.feedback.value = val * 0.9; // Max feedback 0.9 to prevent runaway
        }
    }

    setPianoPitch(val) {
        // val is -1200 to 1200 cents
        const cents = val;
        if (this.pianoPitch) {
            this.pianoPitch.detune.rampTo(cents, 0.1);
        }
    }

    setPianoArpWet(val) {
        // val 0-1
        if (this.pianoTremolo) {
            this.pianoTremolo.wet.rampTo(val, 0.1); // depth is wet/depth in Tone.Tremolo (actually 'depth' prop exists too, but wet controls mix)
            // Tone.Tremolo usually has .depth (0-1) and .wet (0-1).
            // Users usually mean depth. But let's check docs or common usage.
            // Tone.Tremolo: wet controls effect mix. depth controls amplitude modulation depth.
            // Let's control depth if wet is 1? Or wet?
            // "Controls intensity" -> usually Depth.
            // But let's map UI 0-1 to Depth.
            // And ensure Wet is 1? Or just use Wet?
            // If Wet is 0, no effect. If Wet is 1, full effect.
            // Let's use Wet for "Intensity" as requested (Wet/Dry mix).
            // But if Depth is 0, Wet 1 does nothing?
            // Let's set Depth to 1 by default (in constructor? No, constructed with 0?). 
            // Wait, constructor `new Tone.Tremolo(5, 0)` -> 0 is depth.
            // So if I only change Wet, it might stay flat.
            // Let's control DEPTH.
            this.pianoTremolo.depth.rampTo(val, 0.1);
            // And set Wet to 1? Or keep Wet 1?
            // Let's set Wet to 1 in constructor or here.
            if (this.pianoTremolo.wet.value !== 1) this.pianoTremolo.wet.value = 1;
        }
    }

    setPianoArpRate(val) {
        // val 0-1 mapped to 1Hz - 15Hz
        const rate = 1 + (val * 14);
        if (this.pianoTremolo) {
            this.pianoTremolo.frequency.rampTo(rate, 0.1);
        }
    }

    async loadManifest() {
        try {
            const response = await fetch('/samples.json');
            this.sampleManifest = await response.json();
            console.log('Sample Manifest Loaded', this.sampleManifest);
            window.dispatchEvent(new Event('manifestLoaded'));
        } catch (e) {
            console.error('Failed to load sample manifest', e);
        }
    }

    async init() {
        await Tone.start();
        console.log('Audio Context Started');
        console.log('Audio Context Started');
        console.log('Audio Context Started');
        // this.setupMIDI(); // Moved to MIDIController
        this.loadOffsets();
    }

    loadSample(track, filename) {
        if (this.voices[track]) {
            // Check if it's a local blob
            if (filename.startsWith('blob:')) {
                // Revoke previous if it exists (not strictly necessary for every load if we manage it elsewhere, 
                // but good practice if we track it. For now, rely on UI passing unique blob URLs)
                // Actually, Voice class handles loading.
                this.voices[track].loadSample(filename);
            } else {
                // Construct URL - assuming flat structure in public/samples based on manifest
                const url = `/${filename}`;
                this.voices[track].loadSample(url);
            }
            // Reset Pitch on Load
            this.setTrackPitch(track, 0);
        }
    }

    loadLocalFile(track, file) {
        if (!file) return;

        // Revoke previous URL if custom property exists on voice
        if (this.voices[track]._activeBlobUrl) {
            URL.revokeObjectURL(this.voices[track]._activeBlobUrl);
        }

        const url = URL.createObjectURL(file);
        this.voices[track]._activeBlobUrl = url; // Store for cleanup
        this.voices[track].loadSample(url);

        // Reset Pitch on Load
        this.setTrackPitch(track, 0);

        return url; // Return to update UI
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

    // --- MIDI Helper ---
    // Moved MIDI logic to MIDIController.js

    triggerDrum(trackName, velocity = 1) {
        const now = Tone.now();
        this.trigger(trackName, now, velocity);

        // Dispatch UI event (same as manualTrigger but from MIDI)
        const event = new CustomEvent('trackTriggered', { detail: { track: trackName, velocity: velocity } });
        window.dispatchEvent(event);
    }



    initVoices() {
        const createTrackChain = (voice, name) => {
            // 1. Create Delay
            const delay = new Tone.FeedbackDelay("8n", 0.3);
            delay.wet.value = 0; // Default dry
            this.trackDelays[name] = delay;

            // 2. Connect Voice -> Delay -> Master Compressor
            voice.output.connect(delay);
            delay.connect(this.compressor);
        };

        // Track 1: Kick
        this.voices.kick = new KickVoice();
        createTrackChain(this.voices.kick, 'kick');

        // Track 2: Snare
        this.voices.snare = new SnareVoice();
        createTrackChain(this.voices.snare, 'snare');

        // Track 3: Hi-Hat
        this.voices.hihat = new HiHatVoice();
        createTrackChain(this.voices.hihat, 'hihat');

        // Track 4: Resonator
        this.voices.resonator = new ResonatorVoice();
        createTrackChain(this.voices.resonator, 'resonator');

        // Track 5: Live Recording 1
        this.voices.live = new LiveVoice();
        createTrackChain(this.voices.live, 'live');

        // Track 6: Live Recording 2
        this.voices.live2 = new LiveVoice();
        createTrackChain(this.voices.live2, 'live2');

        // Track 7: Piano Loop 1
        this.voices.pianoloop = new LiveVoice();
        createTrackChain(this.voices.pianoloop, 'pianoloop');

        // Track 8: Piano Loop 2
        this.voices.pianoloop2 = new LiveVoice();
        createTrackChain(this.voices.pianoloop2, 'pianoloop2');
    }

    trigger(trackName, time, velocity = 1) {
        if (this.voices[trackName]) {
            this.voices[trackName].trigger(time, velocity);
        }
    }

    manualTrigger(trackName, velocity = 1) {
        const now = Tone.now();
        this.trigger(trackName, now, velocity);

        // Dispatch event for UI feedback (Manual triggers only)
        const event = new CustomEvent('trackTriggered', { detail: { track: trackName, velocity: velocity } });
        window.dispatchEvent(event);
    }

    triggerPianoAttack(note, velocity = 1) {
        // ARM → RECORDING auto-start on first note logic
        // Check ALL loop tracks
        ['pianoloop', 'pianoloop2'].forEach(track => {
            if (this.pianoRecordStates[track] === 'ARMED') {
                this.startPianoRecording(track);
                console.log(`🚀 Auto-Start: Recording started for ${track} on note trigger!`);
            }
        });

        // Safety Check
        if (!this.pianoReady && !this.pianoSampler) return;

        // Use Sampler if available
        if (this.pianoSampler) {
            // If loaded, trigger attack
            if (this.pianoSampler.loaded) {
                this.pianoSampler.triggerAttack(note, Tone.now(), velocity);
            } else {
                // If not loaded, we might want to try anyway or just log/ignore.
                // Tone.Sampler might handle it gracefully or warn.
                this.pianoSampler.triggerAttack(note, Tone.now(), velocity);
            }

            // Dispatch event for UI
            const event = new CustomEvent('pianoTriggered', { detail: { note: note, type: 'attack' } });
            window.dispatchEvent(event);
        }
    }

    triggerPianoRelease(note) {
        if (this.pianoSampler) {
            this.pianoSampler.triggerRelease(note);

            // Dispatch event for UI
            const event = new CustomEvent('pianoTriggered', { detail: { note: note, type: 'release' } });
            window.dispatchEvent(event);
        }
    }

    setPianoVolume(db) {
        if (this.pianoSampler) {
            // db from slider might be -60 to 6.
            if (db <= -60) this.pianoSampler.volume.rampTo(-Infinity, 0.1);
            else this.pianoSampler.volume.rampTo(db, 0.1);
        }
    }

    setPianoPan(val) {
        // val -1 to 1
        if (this.pianoPanner) this.pianoPanner.pan.rampTo(val, 0.1);
    }

    setPianoPitch(semitones) {
        // -12 to 12
        if (this.pianoPitch) {
            this.pianoPitch.pitch = semitones;
        }
    }

    setPianoDelay(wet, time) {
        if (this.pianoDelay) {
            this.pianoDelay.wet.value = wet; // 0-1

            if (time !== undefined) {
                // time might be 0-1 mapped to notes
                const times = ["16n", "8n", "8n.", "4n", "2n"];
                const step = Math.floor(time * (times.length - 1));
                this.pianoDelay.delayTime.value = times[step];
            }
        }
    }

    setPianoReverb(wet) {
        // wet 0-1
        if (this.pianoReverb) {
            // Tone.Reverb wet is normal signal 0-1
            this.pianoReverb.wet.value = wet;
        }
    }

    async loadPianoPreset(filename) {
        // Construct ABSOLUTE path to avoid any ambiguity
        const presetPath = `/samples/piano/presets/${filename}`;
        const absolutePath = window.location.origin + presetPath;

        console.log("🎹 Attempting to load preset from:", absolutePath);

        await this.loadPianoSample(absolutePath);
    }

    async loadPianoSample(file) {
        this.pianoReady = false;

        // 1. Memory Management: Revoke old URL if exists and it was a blob
        if (this.activePianoUrl && this.activePianoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(this.activePianoUrl);
        }
        this.activePianoUrl = null;

        // 2. Prepare URL
        let url;
        if (file instanceof Blob || file instanceof File) {
            url = URL.createObjectURL(file);
            this.activePianoUrl = url; // Store for cleanup
        } else {
            url = file; // Assume string URL (absolute or relative)
        }

        // 3. Dispose old sampler (CRITICAL)
        if (this.pianoSampler) {
            console.log("🗑️ Disposing old sampler...");
            this.pianoSampler.disconnect();
            this.pianoSampler.dispose();
            this.pianoSampler = null; // Ensure generic reference is cleared
        }

        console.log("🎹 Creating new Sampler for:", url);

        // 4. Create NEW Sampler & Connect IMMEDIATELY
        this.pianoSampler = new Tone.Sampler({
            urls: {
                C3: url // Map root to C3
            },
            onload: () => {
                console.log("✅ New Sampler Ready & Connected:", url);
                this.pianoReady = true;

                // Visual Feedback?
                window.dispatchEvent(new Event('pianoReady'));
            },
            onerror: (e) => {
                console.error("❌ Piano Sample Load Failed:", e);
                // Fallback?
            }
        });

        // 5. Connect to FX Chain (Sampler -> Pitch)
        // Ensure Pitch node exists
        if (this.pianoPitch) {
            this.pianoSampler.connect(this.pianoPitch);
            console.log("🔗 Connected Sampler -> PitchShift");
        } else {
            // Fallback to master if chain is broken
            console.warn("⚠️ Piano FX Chain missing, connecting to Destination");
            this.pianoSampler.toDestination();
        }
    }

    start() {
        this.transport.start();
    }

    stop() {
        this.transport.stop();
    }

    // --- Recording Logic ---

    async initRecording() {
        if (!this.mic) {
            this.mic = new Tone.UserMedia();
            this.recorder = new Tone.Recorder();
            this.mic.connect(this.recorder);
            try {
                await this.mic.open();
                console.log("Microphone opened");
            } catch (e) {
                console.error("Microphone access failed", e);
            }
        }
    }

    async startRecording(track = 'live') {
        // We'll use the main recorder for 'live', maybe need 'recorder2' for 'live2' if simultaneous?
        // For now, let's create a second recorder for 'live2' on demand or just use one?
        // Simplest: Create recorder2 in startRecording if needed?
        // Or in constructor? Let's just create it on initRecording?

        let targetRecorder;
        if (track === 'live2') {
            if (!this.recorder2) {
                this.mic2 = new Tone.UserMedia();
                this.recorder2 = new Tone.Recorder();
                this.mic2.connect(this.recorder2); // Connect new mic instance? Or same?
                // Tone.UserMedia is a global input wrapper. new Tone.UserMedia() creates a new connection to the input.
                // Should be fine.
                try {
                    await this.mic2.open();
                } catch (e) { console.error(e); }
            }
            targetRecorder = this.recorder2;
        } else {
            targetRecorder = this.recorder;
        }

        if (targetRecorder && targetRecorder.state === 'started') {
            return this.stopRecording(track);
        }

        if (!targetRecorder) {
            await this.initRecording(); // inits main recorder
            if (track !== 'live2') targetRecorder = this.recorder;
            else {
                // if initRecording didn't init recorder2 (it doesn't), we rely on the block above?
                // Actually let's just use the block above to init recorder 2.
                // Re-running logic:
                if (track === 'live2' && !this.recorder2) {
                    // It should have been created above.
                }
            }
        }

        // Ensure we have a recorder
        if (track === 'live2' && !this.recorder2) return; // failed
        if (track !== 'live2' && !this.recorder) return; // failed

        const rec = (track === 'live2') ? this.recorder2 : this.recorder;

        if (rec && rec.state !== 'started') {
            console.log(`Preparing to record ${track}...`);
            await new Promise(resolve => setTimeout(resolve, 500));

            rec.start();
            console.log(`Recording ${track} started...`);

            // Auto-stop after 10 seconds
            // Store timeout on the instance to allow clearing specific one
            const timeoutKey = `recordingTimeout_${track}`;
            this[timeoutKey] = setTimeout(() => {
                if (rec && rec.state === 'started') {
                    console.log("Max recording duration reached (10s). Stopping...");
                    this.stopRecording(track);
                    window.dispatchEvent(new CustomEvent('recordingStopped', { detail: { track: track } }));
                }
            }, 10000);

            return 'recording';
        }
    }

    async stopRecording(track = 'live') {
        const timeoutKey = `recordingTimeout_${track}`;
        if (this[timeoutKey]) {
            clearTimeout(this[timeoutKey]);
            this[timeoutKey] = null;
        }

        const rec = (track === 'live2') ? this.recorder2 : this.recorder;

        if (rec && rec.state === 'started') {
            const blob = await rec.stop();
            const url = URL.createObjectURL(blob);
            const buffer = await new Tone.Buffer().load(url);

            // Normalize
            const channel = buffer.toArray(0);
            let max = 0;
            for (let i = 0; i < channel.length; i++) {
                if (Math.abs(channel[i]) > max) max = Math.abs(channel[i]);
            }
            if (max > 0) {
                const scale = 1 / max;
                const scaled = channel.map(v => v * scale);
                buffer.fromArray(scaled);
            }

            if (this.voices[track]) {
                this.voices[track].setBuffer(buffer);
            }
            console.log(`Recording ${track} stopped. Buffer set.`);

            // Reset Pitch
            this.setTrackPitch(track, 0);

            return { state: 'stopped', url: url };
        }
        return { state: 'idle' };
    }

    async startMasterRecording() {
        if (this.masterRecorder.state !== 'started') {
            // Delay for 500ms
            console.log("Preparing Master Recording...");
            await new Promise(resolve => setTimeout(resolve, 500));

            this.masterRecorder.start();
            console.log("Master Recording Started");
            return true;
        }
        return false;
    }

    async stopMasterRecording() {
        if (this.masterRecorder.state === 'started') {
            const blob = await this.masterRecorder.stop();
            const url = URL.createObjectURL(blob);

            // Trigger Download
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `session_jam_${timestamp}.wav`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log("Master Recording Stopped and Downloaded");
            return true;
        }
        return false;
    }

    // --- Vault Logic ---

    armVault() {
        if (this.vaultState === 'IDLE') {
            this.vaultState = 'ARMED';
            console.log("Vault ARMED");
            window.dispatchEvent(new CustomEvent('vaultStateChanged', { detail: { state: 'ARMED' } }));
        }
    }

    async startVaultRecording() {
        if (this.vaultRecorder.state !== 'started') {
            this.vaultRecorder.start();
            this.vaultState = 'RECORDING';
            console.log("Vault Recording STARTED");
            window.dispatchEvent(new CustomEvent('vaultStateChanged', { detail: { state: 'RECORDING' } }));
        }
    }

    async stopVaultRecording() {
        if (this.vaultRecorder.state === 'started') {
            const blob = await this.vaultRecorder.stop();
            this.vaultState = 'IDLE';
            console.log("Vault Recording STOPPED");

            window.dispatchEvent(new CustomEvent('vaultStateChanged', { detail: { state: 'IDLE' } }));

            // Dispatch event with blob
            window.dispatchEvent(new CustomEvent('vaultRecordingFinished', { detail: { blob: blob } }));

            return blob;
        }
    }
}
