export class MIDIController {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.init();
    }

    init() {
        if (navigator.requestMIDIAccess) {
            console.log("🎹 MIDI System Initialized. Looking for devices...");
            navigator.requestMIDIAccess().then(this.onMIDISuccess.bind(this), this.onMIDIFailure.bind(this));
        } else {
            console.warn("Web MIDI API not supported in this browser.");
        }
    }

    onMIDISuccess(midiAccess) {
        this.midiAccess = midiAccess;
        const inputs = midiAccess.inputs.values();
        for (let input of inputs) {
            input.onmidimessage = this.onMIDIMessage.bind(this);
            console.log(`MIDI Input Connected: ${input.name}`);
        }

        midiAccess.onstatechange = (e) => {
            if (e.port.type === 'input' && e.port.state === 'connected') {
                e.port.onmidimessage = this.onMIDIMessage.bind(this);
                console.log(`MIDI Input Connected: ${e.port.name}`);
            }
        };
    }

    onMIDIFailure() {
        console.warn("Could not access your MIDI devices.");
    }

    onMIDIMessage(message) {
        const [status, note, velocity] = message.data;
        // console.log(`MIDI: ${status} ${note} ${velocity}`); // Debug

        const command = status & 0xf0;
        // const channel = status & 0x0f;

        // Note On (144)
        if (command === 144 && velocity > 0) {
            this.handleNoteOn(note, velocity);
        }
        // Note Off (128) or Note On with 0 velocity
        else if (command === 128 || (command === 144 && velocity === 0)) {
            this.handleNoteOff(note);
        }
    }

    handleNoteOn(note, velocity) {
        const vel01 = velocity / 127.0;

        // Drum Mapping (C1, D1, F#1, F1/C2)
        // 36: Kick (C1)
        // 38: Snare (D1)
        // 42: HiHat (F#1) - standard GM Closed HiHat
        // 46: Open HiHat (A#1) -> Map to Open Hat? Or use 46 for Resonator?
        // User asked: 46 (typically drum pads) -> Resonator?
        // Wait, User said: "Notes 36, 38, 42, 46 -> Trigger Kick, Snare, HiHat, Resonator."

        if (note === 36) this.audioEngine.triggerDrum('kick', vel01);
        else if (note === 38) this.audioEngine.triggerDrum('snare', vel01);
        else if (note === 42) this.audioEngine.triggerDrum('hihat', vel01);
        else if (note === 46) this.audioEngine.triggerDrum('resonator', vel01);

        // Piano Mapping (48 and above - C3+)
        else if (note >= 48) {
            // Convert MIDI note to Frequency or Note Name logic is likely inside AudioEngine or Sampler.
            // Sampler typically takes MIDI note number or Note Name.
            // Tone.js Sampler can accept MIDI numbers? Yes, or we convert.
            // Tone.Frequency(note, "midi").toNote();
            this.audioEngine.triggerPianoAttack(note, vel01); // Passing MIDI number directly if AudioEngine supports it
        }
    }

    handleNoteOff(note) {
        // Piano Mapping
        if (note >= 48) {
            this.audioEngine.triggerPianoRelease(note);
        }
    }
}
