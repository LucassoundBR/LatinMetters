// js/audio.js

export class AudioEngine {
    constructor(stateConfig, binUpdateCallback) {
        this.config = stateConfig;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.mediaStream = null;

        // This callback notifies the main app when the LUT needs regenerating 
        // (usually after FFT size changes or init)
        this.onBinUpdate = binUpdateCallback;
    }

    async init(audioSource, fftSize) {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // FORCE RESUME ON CLICK
            await this.audioContext.resume();

            // Destroy previous stream if switching sources
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
            }

            if (audioSource === 'mic') {
                this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } else {
                this.mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            }

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = parseInt(fftSize);
            this.analyser.smoothingTimeConstant = 0.8;

            source.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            // Generate LUT based on new context
            if (this.onBinUpdate) this.onBinUpdate();

            return true; // Success
        } catch (err) {
            console.error(err);
            return false; // Failed
        }
    }

    updateFFT(newSize) {
        if (this.analyser) {
            this.analyser.fftSize = parseInt(newSize);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            if (this.onBinUpdate) this.onBinUpdate();
        }
    }

    getFrequencyData() {
        if (!this.analyser || !this.dataArray) return null;
        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray;
    }

    getSampleRate() {
        return this.audioContext ? this.audioContext.sampleRate : 44100;
    }

    getTotalBins() {
        return this.analyser ? this.analyser.frequencyBinCount : 0;
    }
}
