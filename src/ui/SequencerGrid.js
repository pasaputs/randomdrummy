export class SequencerGrid {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.gridContainer = document.querySelector('#main-content');
    }

    render() {
        this.gridContainer.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'sequencer-grid';
        wrapper.style.display = 'grid';
        wrapper.style.gridTemplateColumns = '100px repeat(16, 1fr) 50px'; // Label + 16 Steps + Dice
        wrapper.style.gap = '5px';
        wrapper.style.padding = '10px';

        this.sequencer.tracks.forEach((track, trackIndex) => {
            // 1. Label
            const label = document.createElement('div');
            label.textContent = track.toUpperCase();
            label.className = 'track-label';
            label.style.alignSelf = 'center';
            label.style.fontWeight = 'bold';
            wrapper.appendChild(label);

            // 2. Steps (1-16)
            for (let i = 0; i < 16; i++) {
                const btn = document.createElement('button');
                btn.className = 'step-btn';
                btn.dataset.track = track;
                btn.dataset.step = i;
                btn.style.width = '100%';
                btn.style.aspectRatio = '1';
                btn.style.background = '#444';
                btn.style.border = '1px solid #555';
                btn.style.cursor = 'pointer';

                // Active state check
                if (this.sequencer.pattern[track][i]) {
                    btn.classList.add('active');
                    btn.style.background = '#ff7f50'; // Accent color
                }

                btn.addEventListener('click', () => {
                    const isActive = this.sequencer.toggleStep(track, i);
                    if (isActive) {
                        btn.classList.add('active');
                        btn.style.background = '#ff7f50';
                    } else {
                        btn.classList.remove('active');
                        btn.style.background = '#444';
                    }
                });

                wrapper.appendChild(btn);
            }

            // 3. Dice (Randomize)
            const diceBtn = document.createElement('button');
            diceBtn.textContent = '🎲';
            diceBtn.className = 'dice-btn';
            diceBtn.style.background = 'transparent';
            diceBtn.style.border = '1px solid #444';
            diceBtn.style.cursor = 'pointer';
            diceBtn.addEventListener('click', () => {
                this.sequencer.randomizeTrack(track);
                this.render(); // Re-render to show new pattern
            });
            wrapper.appendChild(diceBtn);
        });

        this.gridContainer.appendChild(wrapper);
    }

    highlightStep(stepIndex) {
        // Remove previous highlights
        document.querySelectorAll('.step-btn.playing').forEach(el => el.classList.remove('playing'));

        // Add highlight to current column
        document.querySelectorAll(`button[data-step="${stepIndex}"]`).forEach(el => {
            el.classList.add('playing');
            el.style.borderColor = '#fff'; // Flash white border
            setTimeout(() => el.style.borderColor = '#555', 100);
        });
    }
}
