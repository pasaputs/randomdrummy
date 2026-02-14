import fs from 'fs';
import path from 'path';

const samplesDir = path.join(process.cwd(), 'public', 'samples');
const outputFile = path.join(process.cwd(), 'public', 'samples.json');

const mapping = {
    kick: 'kicks',
    snare: 'snare',
    hihat: 'hi hats',
    resonator: '808',
    piano: 'piano/presets'
};

const manifest = {};

for (const [track, folder] of Object.entries(mapping)) {
    const dirPath = path.join(samplesDir, folder);
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath)
            .filter(file => !file.startsWith('.') && (file.endsWith('.wav') || file.endsWith('.mp3')))
            .map(file => `samples/${folder}/${file}`);
        manifest[track] = files;
    } else {
        manifest[track] = [];
    }
}

fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));
console.log('Manifest generated:', outputFile);
