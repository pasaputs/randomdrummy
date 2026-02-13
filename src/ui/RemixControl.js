export class RemixControl {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.container = document.querySelector('footer > .transport-controls');
    }

    render() {
        // Append to footer transport controls
        const wrapper = document.createElement('div');
        wrapper.className = 'remix-control';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '10px';
        wrapper.style.marginLeft = '20px';
        wrapper.style.borderLeft = '1px solid #444';
        wrapper.style.paddingLeft = '20px';

        const label = document.createElement('span');
        label.textContent = 'REMIX';
        label.style.fontWeight = 'bold';
        label.style.color = '#ff7f50';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '1';
        slider.step = '0.01';
        slider.value = '0';
        slider.style.width = '100px';

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = '0%';
        valueDisplay.style.fontSize = '0.8rem';
        valueDisplay.style.width = '30px';

        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.sequencer.setRemixAmount(val);
            // Link Remix Slider to Effects Mix
            if (this.sequencer.audioEngine) {
                this.sequencer.audioEngine.setEffectsMix(val);
            }
            valueDisplay.textContent = Math.round(val * 100) + '%';
        });

        // Global Sample Randomizer
        const globalDice = document.createElement('button');
        globalDice.textContent = '🎲 ALL';
        globalDice.title = 'Randomize All Samples';
        globalDice.style.background = '#444';
        globalDice.style.border = '1px solid #555';
        globalDice.style.color = '#fff';
        globalDice.style.padding = '5px 10px';
        globalDice.style.cursor = 'pointer';
        globalDice.style.marginLeft = '10px';
        globalDice.style.borderRadius = '4px';

        globalDice.addEventListener('click', () => {
            // Access engine via sequencer or pass engine to RemixControl
            // UIManager passes sequencer, but sequencer has engine.
            if (this.sequencer.audioEngine) {
                this.sequencer.audioEngine.randomizeAllSamples();
                // We need to update UI dropdowns. 
                // Ideally UI listens to engine events. 
                // For MVP, trigger a re-render of mixer or hackily update selects if we can reach them.
                // Let's force a mixer re-render if it's simpler? No, that resets state.
                // Dispatch event?
                window.dispatchEvent(new Event('samplesRandomized'));
            }
        });

        wrapper.appendChild(label);
        wrapper.appendChild(slider);
        wrapper.appendChild(valueDisplay);
        wrapper.appendChild(globalDice);

        this.container.appendChild(wrapper);
    }
}
