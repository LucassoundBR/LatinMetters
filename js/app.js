// js/app.js
import { I18nManager } from './i18n.js';
import { AudioEngine } from './audio.js';
import { VisualEngine } from './visuals.js';

class App {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.frameCount = 0;

        // Application configuration state
        this.config = {
            width: 256,
            depth: 64,
            halfDepth: false,
            speedDivisor: 4,
            amp: 30,
            palette: 'dreamy',
            displayMode: 'solid'
        };

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            this.config.width = 128;
            this.config.depth = 48;
        }

        // Scene specific configuration state
        this.sceneConfig = {
            rotState: 0,
            audioSource: 'mic',
            gridVisible: true
        };

        // Persistent height data
        this.persistentData = new Float32Array(256 * 128).fill(0);
        this.binIndexLUT = null;
        this.isUiVisible = true;

        this.initModules();
        this.bindEvents();
    }

    initModules() {
        this.i18n = new I18nManager(this.config, this.sceneConfig);

        // Audio Engine uses a callback when it needs to update the Look-Up Table
        this.audio = new AudioEngine(this.config, () => this.updateBinIndexLUT());

        this.visuals = new VisualEngine(this.config);

        // Initial language setup
        this.i18n.setLang('en');
    }

    updateBinIndexLUT() {
        const nyquist = this.audio.getSampleRate() / 2;
        const totalBins = this.audio.getTotalBins();

        if (totalBins === 0) return;

        this.binIndexLUT = new Uint32Array(this.config.width);
        const endBin = Math.floor((20000 / nyquist) * totalBins);

        for (let j = 0; j < this.config.width; j++) {
            const t = j / (this.config.width - 1);
            let binIndex = Math.floor(Math.pow(t, 2.5) * endBin);
            this.binIndexLUT[j] = Math.min(binIndex, totalBins - 1);
        }
    }

    async startAudio(force = false) {
        if (this.isRunning && !force) return;

        const fftSize = document.getElementById('fftSelect').value;
        const success = await this.audio.init(this.sceneConfig.audioSource, fftSize);

        if (success) {
            this.isRunning = true;
            document.getElementById('click-hint').style.display = 'none';
            if (!force) this.animate(); // Start loop if it's the first time
        } else {
            document.getElementById('click-hint').innerText = "ACCESS DENIED";
        }
    }

    bindEvents() {
        const addListener = (id, event, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, fn);
        };

        // Click to start
        window.addEventListener('load', () => {
            document.body.addEventListener('click', () => this.startAudio(), { once: true });
        });

        // Sliders
        const ampVal = document.getElementById('ampVal');
        const depthVal = document.getElementById('depthVal');
        const speedVal = document.getElementById('speedVal');

        addListener('ampSlider', 'input', (e) => {
            this.config.amp = parseInt(e.target.value);
            if (ampVal) ampVal.innerText = this.config.amp;
        });

        addListener('speedSlider', 'input', (e) => {
            this.config.speedDivisor = 11 - parseInt(e.target.value);
            if (speedVal) speedVal.innerText = e.target.value;
            this.visuals.updateLabelsAndGrid();
        });

        addListener('depthSlider', 'input', (e) => {
            if (depthVal) depthVal.innerText = e.target.value;
        });

        addListener('depthSlider', 'change', (e) => {
            this.config.depth = parseInt(e.target.value);
            this.visuals.initGeometry(true, this.persistentData);
            this.visuals.updateLabelsAndGrid();
        });

        // Dropdowns
        addListener('paletteSelect', 'change', (e) => {
            this.config.palette = e.target.value;
            this.visuals.initGeometry(true, this.persistentData);
        });

        addListener('modeSelect', 'change', (e) => {
            this.config.displayMode = e.target.value;
            this.visuals.initGeometry(true, this.persistentData);
        });

        addListener('viewSelect', 'change', (e) => {
            this.visuals.updateView(e.target.value);
        });

        // Buttons
        addListener('sizeBtn', 'click', (e) => {
            this.config.halfDepth = !this.config.halfDepth;
            e.target.innerText = this.config.halfDepth ? this.i18n.getCurrentLangData().size_half : this.i18n.getCurrentLangData().size_full;
            this.visuals.initGeometry(true, this.persistentData);
            this.visuals.updateLabelsAndGrid();
        });

        addListener('gridBtn', 'click', (e) => {
            this.sceneConfig.gridVisible = !this.sceneConfig.gridVisible;
            this.visuals.updateLabelsAndGrid();
            e.target.innerText = this.sceneConfig.gridVisible ? this.i18n.getCurrentLangData().grid_on : this.i18n.getCurrentLangData().grid_off;
            e.target.classList.toggle('active');
        });

        addListener('srcBtn', 'click', () => {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) { alert('System Audio not supported on Mobile'); return; }

            this.sceneConfig.audioSource = (this.sceneConfig.audioSource === 'mic' ? 'system' : 'mic');
            if (this.sceneConfig.audioSource === 'system') {
                alert(this.i18n.getCurrentLangData().sys_audio_hint);
            }
            this.startAudio(true);
            this.i18n.setLang(this.i18n.currentLang);
        });

        addListener('rotBtn', 'click', (e) => {
            this.sceneConfig.rotState = (this.sceneConfig.rotState + 1) % 3;
            this.visuals.setRotationState(this.sceneConfig.rotState);

            if (this.sceneConfig.rotState === 0) e.target.classList.remove('active');
            else e.target.classList.add('active');

            this.i18n.setLang(this.i18n.currentLang);
        });

        addListener('fsBtn', 'click', (e) => {
            const de = document.documentElement;
            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                if (de.requestFullscreen) de.requestFullscreen().catch(e => console.warn(e));
                else if (de.webkitRequestFullscreen) de.webkitRequestFullscreen();
                else if (de.msRequestFullscreen) de.msRequestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen().catch(e => console.warn(e));
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                else if (document.msExitFullscreen) document.msExitFullscreen();
            }
        });

        addListener('fftSelect', 'change', (e) => {
            this.audio.updateFFT(e.target.value);
        });

        // Window Events
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Tab') {
                e.preventDefault();
                this.isUiVisible = !this.isUiVisible;
                document.getElementById('ui-container').style.transform = this.isUiVisible ? 'translateX(0)' : 'translateX(-100%)';
            }
            if (e.code === 'Space') {
                e.preventDefault();
                this.isPaused = !this.isPaused;
            }
        });

        window.addEventListener('resize', () => {
            this.visuals.handleResize();
        });

        // Expose setLang to window for inline onclick handlers in HTML
        window.setLang = (lang) => this.i18n.setLang(lang);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (!this.isRunning || !this.binIndexLUT) {
            this.visuals.render(null);
            return;
        }

        if (!this.isPaused && this.frameCount % this.config.speedDivisor === 0) {
            const dataArray = this.audio.getFrequencyData();
            if (dataArray) {
                this.persistentData.copyWithin(0, this.config.width, this.config.width * this.config.depth);

                const gate = 8;
                for (let j = 0; j < this.config.width; j++) {
                    let val = dataArray[this.binIndexLUT[j]];
                    this.persistentData[(this.config.depth - 1) * this.config.width + j] = (val < gate ? 0 : val / 255.0) * this.config.amp;
                }
            }
        }

        if (!this.isPaused) this.frameCount++;

        this.visuals.render(this.persistentData);
    }
}

// Initialize application
const app = new App();
