import * as Tone from 'tone';

export class ArrangerView {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.container = null;
        this.isVisible = false;

        // Constants (120 BPM = 2s/bar -> 100px/s)
        this.pixelsPerSecond = 100;

        // Layout Constants
        this.rowHeight = 70;
        this.numRows = 4;
    }

    render() {
        if (this.container) return; // Prevent double render

        // Main Overlay
        this.container = document.createElement('div');
        this.container.id = 'arrangement-overlay';
        this.container.style.position = 'fixed';
        this.container.style.top = '0'; // Top
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '350px'; // Fixed Height
        this.container.style.backgroundColor = 'rgba(20, 20, 20, 0.95)'; // Transparent Dark
        this.container.style.zIndex = '999'; // High Z-Index
        this.container.style.display = 'none';
        this.container.style.flexDirection = 'column';
        this.container.style.borderBottom = '2px solid #555';
        this.container.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';


        // 1. Header
        const header = document.createElement('div');
        header.style.height = '40px';
        header.style.backgroundColor = '#222';
        header.style.borderBottom = '1px solid #333';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.padding = '0 10px';
        header.style.justifyContent = 'space-between';

        const title = document.createElement('div');
        title.textContent = "ARRANGEMENT VIEW";
        title.style.fontWeight = 'bold';
        title.style.color = '#ccc';
        title.style.letterSpacing = '1px';
        title.style.fontSize = '0.9rem';

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '10px';

        const playBtn = document.createElement('button');
        playBtn.id = 'arranger-play-btn';
        playBtn.textContent = '▶ PREVIEW SONG';
        playBtn.style.padding = '4px 10px';
        playBtn.style.background = '#444';
        playBtn.style.border = 'none';
        playBtn.style.color = '#fff';
        playBtn.style.cursor = 'pointer';
        playBtn.style.fontWeight = 'bold';

        playBtn.onclick = () => {
            this.togglePlay();
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.background = 'transparent';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#888';
        closeBtn.style.fontSize = '1.2rem';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => this.toggle();

        controls.appendChild(playBtn);
        controls.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(controls);
        this.container.appendChild(header);

        // 2. Timeline Track Area
        const trackArea = document.createElement('div');
        trackArea.className = 'arrangement-timeline'; // For CSS targeting
        trackArea.style.flex = '1';
        trackArea.style.overflowX = 'auto'; // Horizontal scroll
        trackArea.style.overflowY = 'hidden';
        trackArea.style.position = 'relative';
        trackArea.style.background = '#1a1a1a';

        // CSS Grid Gradient (Vertical Lines + Horizontal Rows)
        trackArea.style.backgroundImage = `
            linear-gradient(to right, #333 1px, transparent 1px),
            linear-gradient(to right, #222 1px, transparent 1px),
            linear-gradient(to bottom, #444 1px, transparent 1px) 
        `;
        // Size: Major vertical 200px, Minor vertical 50px, Row height 70px
        // Note: linear-gradient repeats if we don't set no-repeat. 
        // We want the horizontal lines (rows) to repeat every 70px.
        // Let's use a simpler approach for rows: specific gradient
        trackArea.style.backgroundImage = `
            linear-gradient(to right, #333 1px, transparent 1px),
            linear-gradient(to bottom, #444 1px, transparent 1px)
        `;
        trackArea.style.backgroundSize = `200px ${this.rowHeight}px, 100% ${this.rowHeight}px`;

        // Content Area (Grid + Ruler)
        const content = document.createElement('div');
        content.style.position = 'relative';
        content.style.width = '2000px';
        content.style.height = `${this.numRows * this.rowHeight}px`; // Dynamic Height
        trackArea.appendChild(content);

        // 3. Ruler (Bottom inside content)
        const rulerStrip = document.createElement('div');
        rulerStrip.style.height = '20px';
        rulerStrip.style.width = '100%';
        rulerStrip.style.position = 'absolute';
        rulerStrip.style.bottom = '0';
        rulerStrip.style.left = '0';
        rulerStrip.style.display = 'flex'; // Lay out marks horizontally
        rulerStrip.style.background = 'rgba(0,0,0,0.5)'; // Slight overlay

        for (let i = 0; i < 20; i++) { // 20 bars
            const mark = document.createElement('div');
            mark.textContent = (i + 1).toString();
            mark.style.width = '200px'; // Matches grid
            mark.style.height = '100%';
            mark.style.fontSize = '0.7rem';
            mark.style.color = '#888';
            mark.style.borderLeft = '1px solid #444';
            mark.style.paddingLeft = '5px';
            mark.style.boxSizing = 'border-box';
            rulerStrip.appendChild(mark);
        }
        content.appendChild(rulerStrip);

        // 4. Playhead
        this.playhead = document.createElement('div');
        this.playhead.id = 'arranger-playhead';
        this.playhead.style.position = 'absolute';
        this.playhead.style.top = '0';
        this.playhead.style.left = '0';
        this.playhead.style.width = '2px';
        this.playhead.style.height = '100%';
        this.playhead.style.backgroundColor = 'red';
        this.playhead.style.zIndex = '10';
        this.playhead.style.pointerEvents = 'none';
        content.appendChild(this.playhead);


        this.container.appendChild(trackArea);

        // --- Drag & Drop Logic ---
        this.songClips = []; // Store clip data: { id, url, startPx, startTime }

        // Allow Drop
        trackArea.ondragover = (e) => {
            e.preventDefault(); // CRITICAL: Allows drop
            e.dataTransfer.dropEffect = 'copy';
        };

        // Handle Drop
        trackArea.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;

            try {
                const clipData = JSON.parse(rawData);

                // Calculate Drop Position
                const rect = trackArea.getBoundingClientRect();
                const offsetX = e.clientX - rect.left + trackArea.scrollLeft;
                const offsetY = e.clientY - rect.top + trackArea.scrollTop;

                // Snap to Grid (50px quantize)
                const gridSize = 50;
                const x = Math.max(0, offsetX);
                const snappedX = Math.floor(x / gridSize) * gridSize;

                // Calculate Row
                let rowIndex = Math.floor(offsetY / this.rowHeight);
                if (rowIndex < 0) rowIndex = 0;
                if (rowIndex >= this.numRows) rowIndex = this.numRows - 1;

                // Calculate Duration & Width
                // Create temporary audio to get metadata
                if (clipData.url) {
                    const tempAudio = new Audio(clipData.url);
                    tempAudio.onloadedmetadata = () => {
                        let duration = tempAudio.duration; // Seconds

                        // --- AUTO-TRIM LOGIC ---
                        // 32 Steps = 2 Bars = 8 Beats
                        // Duration = (60 / BPM) * 8
                        const bpm = Tone.Transport.bpm.value;
                        const exact32StepsDuration = (60 / bpm) * 8; // e.g. 4.0s at 120BPM

                        // Rounding tolerance? Let's strictly cap if > limit by a tiny margin
                        if (isFinite(duration)) {
                            if (duration > exact32StepsDuration) {
                                console.log(`✂️ Auto-Trimming clip from ${duration.toFixed(3)}s to ${exact32StepsDuration.toFixed(3)}s (32 steps)`);
                                duration = exact32StepsDuration;
                            }

                            const calculatedWidth = duration * this.pixelsPerSecond;
                            console.log(`Clip Duration: ${duration}s, Width: ${calculatedWidth}px`);

                            // Render Clip with Dynamic Width
                            this.addClipToTimeline(clipData, snappedX, content, calculatedWidth, duration, rowIndex);
                        } else {
                            // Fallback if duration fails
                            this.addClipToTimeline(clipData, snappedX, content, 200, 2, rowIndex);
                        }
                    };
                    // Handle Load Error
                    tempAudio.onerror = () => {
                        console.warn("Could not load clip metadata, using default width.");
                        this.addClipToTimeline(clipData, snappedX, content, 200, 2, rowIndex);
                    };
                } else {
                    this.addClipToTimeline(clipData, snappedX, content, 200, 2, rowIndex);
                }

            } catch (err) {
                console.error("Drop failed in Arranger", err);
            }
        };

        // Append to body (overlay)
        document.body.appendChild(this.container);

        // Listen for stop to reset Playhead
        window.addEventListener('arrangementStopped', () => {
            cancelAnimationFrame(this.animationFrame);
            if (this.playhead) this.playhead.style.left = '0px';
            // Reset UI button state if external stop
            const btn = this.container.querySelector('button'); // Hacky selector but works for now
            if (btn && btn.textContent.includes('STOP')) {
                btn.textContent = '▶ PREVIEW SONG';
                btn.style.background = '#444';
            }
        });
    }

    addClipToTimeline(clipData, x, parent, width = 200, duration = 2, rowIndex = 0) {
        // Create Visual Element
        const clip = document.createElement('div');
        clip.className = 'arr-clip';
        clip.textContent = clipData.name;
        clip.style.position = 'absolute';
        clip.style.left = `${x}px`;
        clip.style.top = `${rowIndex * this.rowHeight + 2}px`; // +2 for spacing
        clip.style.height = `${this.rowHeight - 4}px`; // -4 for spacing
        clip.style.width = `${width}px`; // Dynamic Width
        clip.style.background = '#673ab7'; // Deep Purple
        clip.style.color = 'white';
        clip.style.border = '1px solid #9575cd';
        clip.style.borderRadius = '4px';
        clip.style.padding = '5px';

        // Init Dataset Row
        clip.dataset.row = rowIndex;
        clip.style.fontSize = '0.8rem';
        clip.style.boxSizing = 'border-box';
        clip.style.cursor = 'move';
        clip.style.overflow = 'hidden';
        clip.style.whiteSpace = 'nowrap';
        clip.style.overflow = 'hidden';
        clip.style.whiteSpace = 'nowrap';
        clip.style.textOverflow = 'ellipsis';

        // DATASET FOR SCRAPING
        clip.dataset.url = clipData.url;
        clip.dataset.duration = duration; // Save Seconds
        clip.dataset.id = clipData.id; // Optional but good for debugging

        // Drag Handling
        let isDragging = false;
        let startX = 0;
        let startY = 0; // Track Y
        let initialLeft = 0;
        let initialTop = 0;

        clip.onmousedown = (e) => {
            e.stopPropagation();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = clip.offsetLeft;
            initialTop = clip.offsetTop;
            clip.style.zIndex = '100';
            clip.style.opacity = '0.8';
        };

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            // X Axis
            const deltaX = e.clientX - startX;
            let newLeft = initialLeft + deltaX;
            const gridSize = 25;
            newLeft = Math.floor(newLeft / gridSize) * gridSize;
            newLeft = Math.max(0, newLeft);
            clip.style.left = `${newLeft}px`;

            // Y Axis (Row Switching)
            const deltaY = e.clientY - startY;
            // Calculate potential new row based on visual position
            // We adding deltaY to initialTop
            let rawTop = initialTop + deltaY;

            // Determine closest row
            let newRow = Math.round(rawTop / this.rowHeight);
            if (newRow < 0) newRow = 0;
            if (newRow >= this.numRows) newRow = this.numRows - 1;

            // Snap Top to Row
            let newTop = newRow * this.rowHeight + 2;
            clip.style.top = `${newTop}px`;

            // Update Dataset for State
            clip.dataset.row = newRow;
        });

        window.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            clip.style.zIndex = '';
            clip.style.opacity = '1';

            // Update Model
            const currentLeft = clip.offsetLeft;
            const clipObj = this.songClips.find(c => c.element === clip);
            if (clipObj) {
                clipObj.startPx = currentLeft;
                // Time will be recalculated on Play
            }
        });


        // Double click to remove.
        /*
        clip.ondblclick = (e) => {
            e.stopPropagation();
            clip.remove();
            this.songClips = this.songClips.filter(c => c.element !== clip);
        };
        */

        // Delete Button (X)
        const deleteBtn = document.createElement('span');
        deleteBtn.textContent = '×';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '2px';
        deleteBtn.style.right = '4px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontWeight = 'bold';
        deleteBtn.style.color = '#ffcccb';
        deleteBtn.style.fontSize = '14px';
        deleteBtn.style.lineHeight = '14px';
        deleteBtn.style.zIndex = '200';

        deleteBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent drag start
            clip.remove();
            // Remove from model
            // clipData.id might not be unique if dragged multiple times? 
            // Better to match by element reference or assign unique ID on drop.
            // Using element reference from filter
            this.songClips = this.songClips.filter(c => c.element !== clip);
        };

        clip.appendChild(deleteBtn);

        parent.appendChild(clip);

        // Store State
        this.songClips.push({
            id: clipData.id,
            url: clipData.url,
            startPx: x,
            startTime: 0, // Will be calculated on Play using pixelsPerBar/pixelsPerSecond logic
            duration: duration, // Store real duration
            width: width,
            element: clip
        });

        console.log("Clip Added:", this.songClips[this.songClips.length - 1]);
    }

    getCurrentArrangement() {
        const clips = [];
        const clipElements = this.container.querySelectorAll('.arr-clip');

        clipElements.forEach(el => {
            const left = parseFloat(el.style.left);
            if (isNaN(left)) return;

            // Calculate Start Time based on Position
            const startTime = left / this.pixelsPerSecond;

            const url = el.dataset.url;
            const duration = parseFloat(el.dataset.duration) || 2;

            if (url) {
                clips.push({
                    url: url,
                    startTime: startTime,
                    duration: duration
                });
            }
        });

        return clips;
    }

    togglePlay() {
        const playBtn = document.getElementById('arranger-play-btn');

        if (this.audioEngine.isPlayingArrangement) {
            // USER CLICKS STOP
            this.audioEngine.stopArrangement();
        } else {
            // USER CLICKS PLAY
            // Scrape current state
            const playlist = this.getCurrentArrangement();

            if (playlist.length === 0) {
                console.log("No clips to play");
                return;
            }

            // Update UI immediately
            if (playBtn) {
                playBtn.textContent = '⏹ STOP PREVIEW';
                playBtn.style.background = '#d32f2f'; // Red
            }

            console.log("Playing Arrangement from DOM:", playlist);

            // Pass Reset Callback
            this.audioEngine.playArrangement(playlist, () => {
                this.resetPlayButton();
            });

            this.startPlayheadAnimation();
        }
    }

    resetPlayButton() {
        const playBtn = document.getElementById('arranger-play-btn');
        if (playBtn) {
            playBtn.textContent = '▶ PREVIEW SONG';
            playBtn.style.background = '#444';
            playBtn.style.color = '#fff';
        }
    }

    startPlayheadAnimation() {
        const animate = () => {
            if (this.audioEngine.isPlayingArrangement) {
                // 120BPM = 2s per bar (200px).
                // Speed = 100px per second.
                // Tone.Transport.seconds gives current time.
                const pxPerSec = 100;
                // We should really get BPM dynamically, but user asked for "const pixelsPerSecond"
                // Assuming fixed 120bpm for now as per project context.

                const pos = Tone.Transport.seconds * pxPerSec;
                if (this.playhead) this.playhead.style.left = `${pos}px`;

                this.animationFrame = requestAnimationFrame(animate);
            }
        };
        this.animationFrame = requestAnimationFrame(animate);
    }

    toggle() {
        if (!this.container) this.render();
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';
    }
}
