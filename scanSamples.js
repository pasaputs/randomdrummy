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
    '808': 'resonator',
    'piano': 'piano'  // ✅ LISATUD: Nüüd tunneb ka klaveri ära
};

console.log("🚀 Skript käivitus (Piano Presets Support)...");

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

        // Leiame vastava võtme (kick, snare, piano...)
        const mappedKey = FOLDER_MAP[folder.toLowerCase()];

        // Kontrollime, kas on kaust ja kas meil on selle jaoks vaste olemas
        if (fs.statSync(folderPath).isDirectory() && mappedKey) {

            // --- 🎹 ERILOOGIKA KLA VERILE ---
            let searchPath = folderPath;      // Kust me faile otsime?
            let urlSubPath = folder;          // Mis läheb veebiaadressi?

            // Kui kaust on 'piano', vaatame sügavamale 'presets' kausta
            if (folder.toLowerCase() === 'piano') {
                const presetsPath = path.join(folderPath, 'presets');
                if (fs.existsSync(presetsPath)) {
                    searchPath = presetsPath;           // Muudame otsingukoha
                    urlSubPath = `${folder}/presets`;   // Muudame URLi (piano/presets)
                    console.log("   🎹 Leidsin Piano kausta, skaneerin 'presets' alamkausta...");
                }
            }
            // --------------------------------

            // Nüüd loeme faile õigest kohast (searchPath)
            const files = fs.readdirSync(searchPath).filter(file => {
                const lower = file.toLowerCase();
                return lower.endsWith('.wav') || lower.endsWith('.mp3') || lower.endsWith('.ogg');
            });

            if (files.length > 0) {
                manifest[mappedKey] = files.map(f => {
                    // Ehitame veebiaadressi käsitsi, et vältida Windowsi "\" märke
                    // Kasutame urlSubPath muutujat (mis on kas "kick" või "piano/presets")

                    // encodeURI tagab, et tühikud ja erimärgid töötaksid
                    return encodeURI(`/samples/${urlSubPath}/${f}`);
                });

                totalFiles += files.length;
                console.log(`   ✅ ${folder} -> '${mappedKey}': ${files.length} faili.`);
            }
        } else if (fs.statSync(folderPath).isDirectory()) {
            // Jätame vahele kaustad, mida pole nimekirjas (nt .git, temp jne)
            // console.warn(`   ⚠️  Jätan vahele tundmatu kausta: '${folder}'`);
        }
    });

    // Loome vajadusel kausta ja salvestame faili
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
    console.log(`\n🎉 VALMIS! Manifest salvestatud: ${OUTPUT_FILE}`);
    console.log(`   Kokku faile: ${totalFiles}`);

} catch (error) {
    console.error("❌ VIGA:", error);
}