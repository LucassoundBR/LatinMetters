// js/visuals.js
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const palettes = {
    dreamy: ['#000004', '#3b0f70', '#8c2981', '#fe9f6d'],
    ocean: ['#010a1a', '#003049', '#023e8a', '#0077b6'],
    plasma: ['#10002b', '#7b2cbf', '#ff006e', '#ffdde1'],
    heat: ['#000000', '#5a100c', '#c44e05', '#d4a017'],
    amazonia: ['#000a00', '#002200', '#005f41', '#00ff41'],
    jinx: ['#240046', '#7b2cbf', '#4361ee', '#3a0ca3'],
    spectral: ['#2e003e', '#7f2982', '#c60055', '#e67e00'],
    golden: ['#050403', '#5e4b35', '#b08d55', '#96700e'],
    kawaii: ['#2b0f31', '#ff7eb9', '#ff9a8b', '#9b59b6'],
    metal_gear: ['#050505', '#222222', '#444444', '#777777'],
};

export class VisualEngine {
    constructor(config) {
        this.config = config;
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        this.mesh = null;
        this.geometry = null;
        this.material = null;
        this.gridHelper = null;
        this.labelGroup = new THREE.Group();
        this.discTexture = this.getDiscTexture();

        this.initScene();
        this.updateLabelsAndGrid();
        this.initGeometry(false);
    }

    getDiscTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(16, 16, 15, 0, Math.PI * 2);
        ctx.fill();
        return new THREE.CanvasTexture(canvas);
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(60, 50, 60);

        this.renderer = new THREE.WebGLRenderer({ antialias: !this.isMobile });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.autoRotate = false;
        this.controls.target.set(0, 0, 0);

        this.scene.add(this.labelGroup);

        // --- POST PROCESSING ---
        const renderScene = new RenderPass(this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.2; bloomPass.strength = 0.25; bloomPass.radius = 0.6;

        this.effectFXAA = new ShaderPass(FXAAShader);
        this.effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * this.renderer.getPixelRatio()), 1 / (window.innerHeight * this.renderer.getPixelRatio()));

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);
        if (!this.isMobile) this.composer.addPass(this.effectFXAA);
    }

    createTextLabel(text, x, y, z) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256; canvas.height = 128;
        ctx.font = "bold 50px 'Share Tech Mono', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(text, 128, 80);
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1.0 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(8, 4, 1);
        sprite.position.set(x, y, z);
        return sprite;
    }

    updateLabelsAndGrid() {
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.geometry?.dispose();
            this.gridHelper.material?.dispose();
        }
        this.labelGroup.children.forEach(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) {
                if (c.material.map) c.material.map.dispose();
                c.material.dispose();
            }
        });
        this.labelGroup.clear();

        const isGridOn = this.config.gridVisible;
        this.labelGroup.visible = !!isGridOn;
        const depthSize = this.config.halfDepth ? 50 : 100;
        const vertices = [];

        // TIME LINES
        const zLines = 8;
        const zStep = depthSize / zLines;
        for (let i = 0; i <= zLines; i++) {
            const z = (depthSize / 2) - (i * zStep);
            vertices.push(-50, -2, z, 50, -2, z);

            if (isGridOn && i % 2 === 0) {
                const tVal = (i * (this.config.halfDepth ? 0.5 : 1.0) * (5 / zLines)).toFixed(0);
                const labelText = i === 0 ? "0s" : `-${tVal}s`;
                this.labelGroup.add(this.createTextLabel(labelText, 56, -2, z));
            }
        }

        // FREQ LINES (LOGARITHMIC MATCH)
        const freqs = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000, 20000];
        const labeled = [50, 500, 1000, 5000, 10000, 20000];

        freqs.forEach((hz) => {
            const xNorm = Math.pow(hz / 20000, 1 / 2.5); // t^2.5 log scale
            const x = (xNorm * 100) - 50;
            vertices.push(x, -2, -depthSize / 2, x, -2, depthSize / 2);

            if (isGridOn && labeled.includes(hz)) {
                const lbl = hz >= 1000 ? (hz / 1000) + 'k' : hz;
                this.labelGroup.add(this.createTextLabel(lbl.toString(), x, -2, (depthSize / 2) + 4));
            }
        });

        const gridGeo = new THREE.BufferGeometry();
        gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.gridHelper = new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 }));
        this.gridHelper.visible = !!isGridOn;
        this.scene.add(this.gridHelper);
    }

    getPaletteColor(t, paletteName) {
        const colors = palettes[paletteName] || palettes.dreamy;
        const c1 = new THREE.Color(colors[0]); const c2 = new THREE.Color(colors[1]); const c3 = new THREE.Color(colors[2]); const c4 = new THREE.Color(colors[3]);
        const finalColor = new THREE.Color();
        if (t < 0.33) finalColor.lerpColors(c1, c2, t / 0.33);
        else if (t < 0.66) finalColor.lerpColors(c2, c3, (t - 0.33) / 0.33);
        else finalColor.lerpColors(c3, c4, (t - 0.66) / 0.34);
        return finalColor;
    }

    initGeometry(preserve = true, persistentData = null) {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.geometry?.dispose();
            this.material?.dispose();
            this.mesh = null;
        }

        const currentDepth = this.config.depth;
        const renderDepth = this.config.halfDepth ? 50 : 100;
        const totalPoints = this.config.width * currentDepth;

        if (this.config.displayMode === 'bars') {
            const posArray = new Float32Array(totalPoints * 2 * 3);
            const colorArray = new Float32Array(totalPoints * 2 * 3);
            for (let i = 0; i < currentDepth; i++) {
                for (let j = 0; j < this.config.width; j++) {
                    const index = (i * this.config.width + j);
                    const c = this.getPaletteColor(j / (this.config.width - 1), this.config.palette);
                    const x = (j / (this.config.width - 1) - 0.5) * 100;
                    const z = (i / (currentDepth - 1) - 0.5) * renderDepth;

                    const h = (preserve && persistentData) ? persistentData[index] : 0;

                    const v1 = index * 6; posArray[v1] = x; posArray[v1 + 1] = -2; posArray[v1 + 2] = z; colorArray[v1] = c.r; colorArray[v1 + 1] = c.g; colorArray[v1 + 2] = c.b;
                    const v2 = index * 6 + 3; posArray[v2] = x; posArray[v2 + 1] = -2 + h; posArray[v2 + 2] = z; colorArray[v2] = c.r; colorArray[v2 + 1] = c.g; colorArray[v2 + 2] = c.b;
                }
            }
            this.geometry = new THREE.BufferGeometry();
            this.geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            this.geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
            this.material = new THREE.LineBasicMaterial({ vertexColors: true });
            this.mesh = new THREE.LineSegments(this.geometry, this.material);
        } else {
            this.geometry = new THREE.PlaneGeometry(100, renderDepth, this.config.width - 1, currentDepth - 1);
            const colors = new Float32Array(this.geometry.attributes.position.count * 3);
            const pos = this.geometry.attributes.position.array;
            for (let i = 0; i < currentDepth; i++) {
                for (let j = 0; j < this.config.width; j++) {
                    const index = (i * this.config.width + j);
                    const c = this.getPaletteColor(j / (this.config.width - 1), this.config.palette);
                    colors[index * 3] = c.r; colors[index * 3 + 1] = c.g; colors[index * 3 + 2] = c.b;
                    if (preserve && persistentData) pos[index * 3 + 2] = persistentData[index];
                }
            }
            this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            if (this.config.displayMode === 'dots') {
                this.material = new THREE.PointsMaterial({ vertexColors: true, size: 0.5, map: this.discTexture, transparent: true, alphaTest: 0.1 });
                this.mesh = new THREE.Points(this.geometry, this.material);
            } else if (this.config.displayMode === 'lines') {
                const indices = [];
                for (let j = 0; j < this.config.width; j += 2) { for (let i = 0; i < currentDepth - 1; i++) { indices.push(i * this.config.width + j, (i + 1) * this.config.width + j); } }
                this.geometry.setIndex(indices);
                this.material = new THREE.LineBasicMaterial({ vertexColors: true });
                this.mesh = new THREE.LineSegments(this.geometry, this.material);
            } else if (this.config.displayMode === 'wire') {
                const indices = [];
                const w = this.config.width; const d = currentDepth;
                for (let i = 0; i < d; i++) { for (let j = 0; j < w - 1; j++) { indices.push(i * w + j, i * w + j + 1); } }
                for (let j = 0; j < w; j++) { for (let i = 0; i < d - 1; i++) { indices.push(i * w + j, (i + 1) * w + j); } }
                const lineGeo = new THREE.BufferGeometry();
                lineGeo.setAttribute('position', this.geometry.attributes.position);
                lineGeo.setAttribute('color', this.geometry.attributes.color);
                lineGeo.setIndex(indices);
                this.geometry = lineGeo;
                this.material = new THREE.LineBasicMaterial({ vertexColors: true });
                this.mesh = new THREE.LineSegments(this.geometry, this.material);
            } else {
                this.material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
                this.mesh = new THREE.Mesh(this.geometry, this.material);
            }
            this.mesh.rotation.x = -Math.PI / 2;
        }
        this.scene.add(this.mesh);
    }

    updateView(v) {
        if (v === 'iso') this.camera.position.set(60, 50, 60);
        else if (v === 'front') this.camera.position.set(0, 20, 80);
        else if (v === 'side') this.camera.position.set(90, 20, 0);
        else if (v === 'top') this.camera.position.set(0, 100, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    setRotationState(state) {
        if (state === 0) {
            this.controls.autoRotate = false;
        } else if (state === 1) {
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 0.2;
        } else {
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 0.6;
        }
    }

    handleResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        const aspect = window.innerWidth / window.innerHeight;
        if (aspect < 1) this.camera.position.set(80, 70, 80); else this.camera.position.set(60, 50, 60);
        this.controls.target.set(0, 0, 0);

        this.effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * this.renderer.getPixelRatio()), 1 / (window.innerHeight * this.renderer.getPixelRatio()));
    }

    render(persistentData) {
        this.controls.update();
        this.composer.render();

        if (!persistentData) return;

        // Visual lerp updates
        const lp = 0.2;
        if (this.config.displayMode === 'bars' && this.geometry.attributes.position) {
            const p = this.geometry.attributes.position.array;
            for (let i = 0; i < this.config.width * this.config.depth; i++) {
                p[i * 6 + 4] += (-2 + persistentData[i] - p[i * 6 + 4]) * lp;
            }
        } else if (this.geometry.attributes.position) {
            const p = this.geometry.attributes.position.array;
            const len = Math.min(p.length / 3, persistentData.length);
            for (let i = 0; i < len; i++) {
                p[i * 3 + 2] += (persistentData[i] - p[i * 3 + 2]) * lp;
            }
        }
        if (this.geometry) this.geometry.attributes.position.needsUpdate = true;
    }
}
