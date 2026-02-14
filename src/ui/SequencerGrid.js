export class SequencerGrid {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.gridContainer = document.querySelector('#main-content');
    }

    render() {
        this.gridContainer.innerHTML = '';

        // Scrollable Container
        const scrollContainer = document.createElement('div');
        scrollContainer.style.overflowX = 'auto';
        scrollContainer.style.width = '100%';
        scrollContainer.style.paddingBottom = '10px'; // Space for scrollbar

        const wrapper = document.createElement('div');
        wrapper.className = 'sequencer-grid';
        wrapper.style.display = 'grid';

        // Grid Template: Label (sticky) + 32 Steps + Dice + Mute + Solo
        // We'll make the label sticky so it stays visible while scrolling steps
        wrapper.style.gridTemplateColumns = '100px repeat(32, 40px) 40px 30px 30px';
        wrapper.style.gap = '2px';
        wrapper.style.padding = '10px';
        wrapper.style.minWidth = 'fit-content';

        this.sequencer.tracks.forEach((track, trackIndex) => {
            // 1. Label
            const label = document.createElement('div');
            label.textContent = track.toUpperCase();
            label.className = 'track-label';
            label.style.alignSelf = 'center';
            label.style.fontWeight = 'bold';
            label.style.position = 'sticky';
            label.style.left = '0';
            label.style.background = '#2e2e2e'; // Match bg to cover scrolling steps
            label.style.zIndex = '10';
            label.style.paddingRight = '10px';
            wrapper.appendChild(label);

            // 2. Steps (1-32)
            for (let i = 0; i < 32; i++) {
                const btn = document.createElement('button');
                btn.className = 'step-btn';
                btn.dataset.track = track;
                btn.dataset.step = i;
                btn.style.width = '100%';
                btn.style.height = '40px'; // Fixed height
                btn.style.background = '#444';
                btn.style.border = '1px solid #555';
                btn.style.cursor = 'pointer';
                btn.title = `Step ${i + 1}`;

                // Visual Divider after step 16 (index 15)
                if (i === 16) {
                    btn.style.marginLeft = '10px'; // Visual gap
                }

                // Color change for second bar (17-32) logic if desired?
                // "Add a visual divider or slight color change"
                // Let's darken the second bar slightly 
                if (i >= 16) {
                    btn.style.background = '#3a3a3a';
                }

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
                        // Restore bg based on bar
                        btn.style.background = (i >= 16) ? '#3a3a3a' : '#444';
                    }
                });

                wrapper.appendChild(btn);
            }

            // 3. Dice (Randomize)
            const diceBtn = document.createElement('button');
            diceBtn.textContent = '🎲';
            diceBtn.className = 'dice-btn';
            diceBtn.title = 'Randomize Pattern';
            diceBtn.onclick = () => {
                this.sequencer.randomizeTrack(track);
                this.render();
            };
            wrapper.appendChild(diceBtn);

            // 4. Mute Button
            const muteBtn = document.createElement('button');
            muteBtn.textContent = 'M';
            muteBtn.className = 'mute-btn';
            if (this.sequencer.muteStates[track]) muteBtn.classList.add('active-mute');
            muteBtn.onclick = () => {
                this.sequencer.muteStates[track] = !this.sequencer.muteStates[track];
                muteBtn.classList.toggle('active-mute');
            };
            wrapper.appendChild(muteBtn);

            // 5. Solo Button
            const soloBtn = document.createElement('button');
            soloBtn.textContent = 'S';
            soloBtn.className = 'solo-btn';
            if (this.sequencer.soloStates[track]) soloBtn.classList.add('active-solo');
            soloBtn.onclick = () => {
                this.sequencer.soloStates[track] = !this.sequencer.soloStates[track];
                soloBtn.classList.toggle('active-solo');
                // We might need to refresh all solo buttons if we wanted exclusive solo visual feedback logic, 
                // but checking state on render or tick is enough for audio. 
                // However, visual feedback of other tracks being 'dimmed' is not requested, simply S button active.
                this.render(); // Re-render to ensure consistency if needed? Not strictly necessary if just toggling class, but good if we had inter-track dependencies.
            };
            wrapper.appendChild(soloBtn);
        });

        scrollContainer.appendChild(wrapper);
        this.gridContainer.appendChild(scrollContainer);
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
