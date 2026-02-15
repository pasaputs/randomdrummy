export class VaultManager {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.container = null;
        this.recordings = [];
        this.recordingCounter = 1;
    }

    render(container) {
        this.container = container;
        container.innerHTML = '';
        container.style.padding = '10px';
        container.style.background = '#1e1e1e';
        container.style.borderBottom = '1px solid #444';
        container.style.display = 'flex';
        container.style.gap = '20px';
        container.style.alignItems = 'flex-start';
        container.style.height = '120px';
        container.style.boxSizing = 'border-box';

        // 1. Controls Section
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.flexDirection = 'column';
        controls.style.gap = '10px';
        controls.style.width = '140px';

        const label = document.createElement('div');
        label.textContent = "THE VAULT (32-STEP)";
        label.style.color = '#888';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '0.7rem';
        label.style.letterSpacing = '1px';
        controls.appendChild(label);

        this.recBtn = document.createElement('button');
        this.recBtn.textContent = 'REC VAULT';
        this.recBtn.style.padding = '10px';
        this.recBtn.style.background = '#333';
        this.recBtn.style.color = '#fff';
        this.recBtn.style.border = '1px solid #555';
        this.recBtn.style.borderRadius = '4px';
        this.recBtn.style.cursor = 'pointer';
        this.recBtn.style.fontWeight = 'bold';
        this.recBtn.style.fontSize = '0.8rem';
        this.recBtn.style.transition = 'all 0.2s';

        this.recBtn.onclick = () => {
            if (this.audioEngine.vaultState === 'IDLE') {
                this.audioEngine.armVault();
                this.updateButton('ARMED');
            }
        };

        controls.appendChild(this.recBtn);
        container.appendChild(controls);

        // 2. List Section
        const listWrapper = document.createElement('div');
        listWrapper.style.flex = '1';
        listWrapper.style.height = '100%';
        listWrapper.style.display = 'flex';
        listWrapper.style.flexDirection = 'column';

        const listHeader = document.createElement('div');
        listHeader.textContent = "RECORDED LOOPS";
        listHeader.style.fontSize = '0.7rem';
        listHeader.style.color = '#666';
        listHeader.style.marginBottom = '5px';
        listWrapper.appendChild(listHeader);

        this.list = document.createElement('div');
        this.list.style.flex = '1';
        this.list.style.overflowY = 'auto';
        this.list.style.border = '1px solid #333';
        this.list.style.padding = '5px';
        this.list.style.background = '#111';
        this.list.style.borderRadius = '4px';

        listWrapper.appendChild(this.list);
        container.appendChild(listWrapper);

        // Listeners
        window.addEventListener('vaultStateChanged', (e) => this.updateButton(e.detail.state));
        window.addEventListener('vaultRecordingFinished', (e) => this.addRecording(e.detail.blob));

        // Initial state
        if (this.audioEngine.vaultState) this.updateButton(this.audioEngine.vaultState);
    }

    updateButton(state) {
        if (!this.recBtn) return;

        if (state === 'IDLE') {
            this.recBtn.style.background = '#333';
            this.recBtn.style.color = '#fff';
            this.recBtn.style.borderColor = '#555';
            this.recBtn.textContent = 'REC VAULT';
            this.recBtn.style.animation = 'none';
        } else if (state === 'ARMED') {
            this.recBtn.style.background = '#ffb300';
            this.recBtn.style.color = '#000';
            this.recBtn.style.borderColor = '#ffca28';
            this.recBtn.textContent = 'ARMED\n(Wait for loop...)';
            this.recBtn.style.whiteSpace = 'pre';
            this.recBtn.style.animation = 'pulse 1s infinite';
        } else if (state === 'RECORDING') {
            this.recBtn.style.background = '#d32f2f';
            this.recBtn.style.color = 'white';
            this.recBtn.style.borderColor = '#ff5252';
            this.recBtn.textContent = 'RECORDING...';
            this.recBtn.style.animation = 'none';
        }
    }

    addRecording(blob) {
        const url = URL.createObjectURL(blob);
        const id = this.recordingCounter++;

        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        item.style.marginBottom = '4px';
        item.style.padding = '4px';
        item.style.background = '#2a2a2a';
        item.style.borderRadius = '3px';
        item.style.fontSize = '0.8rem';
        item.style.borderBottom = '1px solid #444';

        const name = document.createElement('span');
        name.textContent = `Loop #${id} (${(blob.size / 1024).toFixed(0)}KB)`;
        name.style.flex = '1';
        name.style.color = '#ccc';

        // Play
        const playBtn = document.createElement('button');
        playBtn.textContent = '▶';
        playBtn.title = 'Play';
        playBtn.style.background = '#444'; playBtn.style.border = 'none'; playBtn.style.color = '#fff'; playBtn.style.cursor = 'pointer';
        playBtn.onclick = () => {
            const audio = new Audio(url);
            audio.play();
        };

        // Download
        const dlBtn = document.createElement('button');
        dlBtn.textContent = '⬇';
        dlBtn.title = 'Download';
        dlBtn.style.background = '#444'; dlBtn.style.border = 'none'; dlBtn.style.color = '#fff'; dlBtn.style.cursor = 'pointer';
        dlBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = `vault_loop_${id}.wav`;
            a.click();
        };

        // Delete
        const delBtn = document.createElement('button');
        delBtn.textContent = '✕';
        delBtn.title = 'Delete';
        delBtn.style.background = '#444'; delBtn.style.border = 'none'; delBtn.style.color = '#ff5252'; delBtn.style.cursor = 'pointer';
        delBtn.onclick = () => {
            item.remove();
            URL.revokeObjectURL(url);
        };

        item.appendChild(name);
        item.appendChild(playBtn);
        item.appendChild(dlBtn);
        item.appendChild(delBtn);

        this.list.insertBefore(item, this.list.firstChild);

        // Success feedback
        if (this.recBtn) {
            this.recBtn.textContent = 'SAVED!';
            this.recBtn.style.background = '#4caf50';
            this.recBtn.style.borderColor = '#4caf50';
            this.recBtn.style.color = '#fff';
            setTimeout(() => {
                this.updateButton('IDLE');
            }, 1500);
        }
    }
}
