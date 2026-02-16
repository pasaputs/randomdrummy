import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Node.js path setup (ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const SAMPLES_DIR = path.join(__dirname, 'public', 'samples');
const OUTPUT_FILE = path.join(__dirname, 'src', 'audio', 'sampleManifest.json');

// MAPPING: Folder Name -> AudioEngine Track Key
const FOLDER_MAP = {
    'kicks': 'kick',
    'hi hats': 'hihat',
    'snare': 'snare',
    'percs': 'percs',
    '808': 'resonator'
};

console.log("🚀 Skript käivitus (Normalized Mapping)...");

if (!fs.existsSync(SAMPLES_DIR)) {
    console.error("❌ VIGA: Ei leia kausta 'public/samples'!");
    process.exit(1);
}

const manifest = {};
let totalFiles = 0;

try {
    const folders = fs.readdirSync(SAMPLES_DIR);

    folders.forEach(folder => {
        const folderPath = path.join(SAMPLES_DIR, folder);

        // Calculate mapped key (default to folder name if not found, but logged)
        const mappedKey = FOLDER_MAP[folder.toLowerCase()];

        if (fs.statSync(folderPath).isDirectory() && mappedKey) {

            const files = fs.readdirSync(folderPath).filter(file => {
                const lower = file.toLowerCase();
                return lower.endsWith('.wav') || lower.endsWith('.mp3') || lower.endsWith('.ogg');
            });

            if (files.length > 0) {
                manifest[mappedKey] = files.map(f => {
                    // Path normalization:
                    // 1. Force forward slashes
                    // 2. Start with /
                    // 3. Encoded URI components

                    // We construct the web-compatible path manually
                    // e.g., /samples/hi%20hats/file.wav
                    const safeFolder = encodeURIComponent(folder); // handles spaces in folder
                    const safeFile = encodeURIComponent(f);       // handles spaces in file

                    // Note: encodeURIComponent encodes spaces as %20, which is what we want for URLs.
                    // However, we must Ensure we don't double slash or miss slash.

                    // But wait, the previous script used encodeURI on the whole string, which is risky for parts.
                    // Let's stick to a robust simple construction.
                    // Actually, for web server 'public' root:
                    // File on disk: public/samples/hi hats/foo.wav
                    // URL: /samples/hi%20hats/foo.wav

                    return `/samples/${folder}/${f}`; // We will encode this later or let the browser handle standard path? 
                    // The user prompt specifically asked for encodeURI.
                    // "Uses encodeURI to handle spaces in filenames."

                }).map(p => encodeURI(p)); // Encode the whole path to be safe

                totalFiles += files.length;
                console.log(`   ✅ ${folder} -> '${mappedKey}': ${files.length} faili.`);
            }
        } else if (fs.statSync(folderPath).isDirectory()) {
            console.warn(`   ⚠️  Hoiatus: Kaustale '${folder}' puudub vaste (FOLDER_MAP). Jätan vahele.`);
        }
    });

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
    console.log(`\n🎉 VALMIS! Manifest salvestatud: ${OUTPUT_FILE}`);
    console.log(`   Kokku faile: ${totalFiles}`);

} catch (error) {
    console.error("❌ VIGA:", error);
}