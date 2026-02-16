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

        // Grid Template: Label | Steps | Dice | Mute | Solo
        // Steps column will take remaining space.
        wrapper.style.gridTemplateColumns = '100px 1fr 40px 30px 30px';
        wrapper.style.gap = '5px';
        wrapper.style.padding = '10px';
        wrapper.style.minWidth = 'fit-content';

        // --- 0. Header Row ---
        const headerLabel = document.createElement('div');
        headerLabel.innerHTML = '<span>TRACKS</span><br><span style="font-size:0.6rem; color:#666">GLOBAL</span>';
        headerLabel.style.gridColumn = '1';
        headerLabel.style.color = '#888';
        headerLabel.style.fontSize = '0.7rem';
        headerLabel.style.textAlign = 'right';
        headerLabel.style.paddingRight = '10px';
        headerLabel.style.alignSelf = 'center';
        wrapper.appendChild(headerLabel);

        // Header Steps (Spacer)
        const headerSteps = document.createElement('div');
        wrapper.appendChild(headerSteps);

        // Global Dice
        const globalDice = document.createElement('button');
        globalDice.textContent = '🎲';
        globalDice.title = 'Randomize ALL';
        globalDice.className = 'dice-btn';
        globalDice.style.opacity = '1';
        globalDice.style.color = '#fff';
        globalDice.onclick = () => {
            if (confirm("Randomize ALL tracks?")) {
                this.sequencer.randomizeAllTracks(); // Need to implement or use existing
                this.render();
            }
        };
        wrapper.appendChild(globalDice);

        // Global Clear (The requested button!)
        const clearBtn = document.createElement('button');
        clearBtn.textContent = '🗑️'; // or "CLR"
        clearBtn.className = 'mute-btn'; // reuse style
        clearBtn.style.background = '#d32f2f';
        clearBtn.title = 'Clear Pattern';
        clearBtn.onclick = () => {
            if (confirm("Clear ONE pattern?")) {
                this.sequencer.clearPattern();
                this.render();
            }
        };
        // Span 2 columns (Mute+Solo space)
        clearBtn.style.gridColumn = 'span 2';
        wrapper.appendChild(clearBtn);

        this.sequencer.tracks.forEach((track, trackIndex) => {
            // 1. Label
            const label = document.createElement('div');
            label.textContent = track.toUpperCase();
            label.className = 'track-label';
            label.style.alignSelf = 'center';
            label.style.fontWeight = 'bold';
            label.style.position = 'sticky';
            label.style.left = '0';
            label.style.background = '#2e2e2e'; // Match bg
            label.style.zIndex = '10';
            label.style.paddingRight = '10px';
            wrapper.appendChild(label);

            // 2. Steps Container (1-32)
            const stepsContainer = document.createElement('div');
            stepsContainer.className = 'steps-container';
            // CSS will handle grid-template-columns: repeat(32, 1fr)

            for (let i = 0; i < 32; i++) {
                const btn = document.createElement('button');
                btn.className = 'step-btn';
                btn.dataset.track = track;
                btn.dataset.step = i;
                btn.title = `Step ${i + 1}`;

                // No visual divider margin logic here anymore - strictly grid
                // We can add "group" classes if we want CSS delimiters
                if (i % 4 === 0 && i !== 0) {
                    // Maybe add a class for start of beat?
                    btn.classList.add('beat-start');
                }

                // Color change logic (Visual feedback only)
                if (i >= 16) {
                    btn.classList.add('bar-2');
                }

                // Active state
                if (this.sequencer.pattern[track][i]) {
                    btn.classList.add('active');
                }

                btn.onclick = () => {
                    const isActive = this.sequencer.toggleStep(track, i);
                    btn.classList.toggle('active', isActive);
                };

                stepsContainer.appendChild(btn);
            }
            wrapper.appendChild(stepsContainer);

            // 3. Dice
            const diceBtn = document.createElement('button');
            diceBtn.textContent = '🎲';
            diceBtn.className = 'dice-btn';
            diceBtn.title = 'Randomize Pattern';
            diceBtn.onclick = () => {
                this.sequencer.randomizeTrack(track);
                this.render();
            };
            wrapper.appendChild(diceBtn);

            // 4. Mute
            const muteBtn = document.createElement('button');
            muteBtn.textContent = 'M';
            muteBtn.className = 'mute-btn';
            if (this.sequencer.muteStates[track]) muteBtn.classList.add('active-mute');
            muteBtn.onclick = () => {
                this.sequencer.muteStates[track] = !this.sequencer.muteStates[track];
                muteBtn.classList.toggle('active-mute');
            };
            wrapper.appendChild(muteBtn);

            // 5. Solo
            const soloBtn = document.createElement('button');
            soloBtn.textContent = 'S';
            soloBtn.className = 'solo-btn';
            if (this.sequencer.soloStates[track]) soloBtn.classList.add('active-solo');
            soloBtn.onclick = () => {
                this.sequencer.soloStates[track] = !this.sequencer.soloStates[track];
                soloBtn.classList.toggle('active-solo');
                this.render();
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
