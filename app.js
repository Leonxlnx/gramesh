// ========================================
// AuraMesh Pro — Core Application Logic
// ========================================

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });

// --- Application State ---
const appState = {
    mode: 'fluid',
    blend: 'screen',
    speed: 1.0,
    spread: 1.2,
    grain: 0.15,
    colors: ['#ff0080', '#7928ca', '#ff4d4d', '#f9cb28', '#00dfd8'],
    nodesData: []
};

const palettes = [
    ['#ff0055', '#4338ca', '#00ffcc', '#ffb800', '#ff00ff'],
    ['#00C9FF', '#92FE9D', '#1CB5E0', '#000046', '#02AAB0'],
    ['#FF416C', '#FF4B2B', '#FF9068', '#FFB75E', '#b21f1f'],
    ['#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a'],
    ['#8E2DE2', '#4A00E0', '#f12711', '#f5af19', '#11998e']
];

// ========================================
// Utilities
// ========================================

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 0, g: 0, b: 0 };
}

// ========================================
// Film Grain Pre-Renderer
// ========================================

const noiseCanvas = document.createElement('canvas');
noiseCanvas.width = 256;
noiseCanvas.height = 256;
const nCtx = noiseCanvas.getContext('2d');
const imgData = nCtx.createImageData(256, 256);
for (let i = 0; i < imgData.data.length; i += 4) {
    const v = Math.random() * 255;
    imgData.data[i] = v;
    imgData.data[i + 1] = v;
    imgData.data[i + 2] = v;
    imgData.data[i + 3] = 255;
}
nCtx.putImageData(imgData, 0, 0);

// ========================================
// Node Engine
// ========================================

class Node {
    constructor(i, total) {
        this.index = i;
        this.x = Math.random();
        this.y = Math.random();
        this.vx = (Math.random() - 0.5) * 0.005;
        this.vy = (Math.random() - 0.5) * 0.005;
        this.angle = Math.random() * Math.PI * 2;
    }

    update(speed) {
        if (appState.mode === 'fluid') {
            this.x += this.vx * speed;
            this.y += this.vy * speed;
            if (this.x < -0.2) this.vx *= -1;
            if (this.x > 1.2) this.vx *= -1;
            if (this.y < -0.2) this.vy *= -1;
            if (this.y > 1.2) this.vy *= -1;
        } else if (appState.mode === 'orbit') {
            this.angle += 0.005 * speed;
            this.x = 0.5 + Math.cos(this.angle) * 0.35;
            this.y = 0.5 + Math.sin(this.angle) * 0.35;
        } else if (appState.mode === 'aurora') {
            this.x += Math.abs(this.vx) * speed * 0.5;
            if (this.x > 1.2) this.x = -0.2;
            this.y = 0.5 + Math.sin(Date.now() * 0.001 * speed + this.index) * 0.3;
        }
    }
}

function syncNodes() {
    while (appState.nodesData.length < appState.colors.length) {
        appState.nodesData.push(new Node(appState.nodesData.length, appState.colors.length));
    }
    while (appState.nodesData.length > appState.colors.length) {
        appState.nodesData.pop();
    }
}

// ========================================
// Rendering
// ========================================

function drawFrame(ctxTarget, w, h) {
    ctxTarget.fillStyle = '#050505';
    ctxTarget.fillRect(0, 0, w, h);

    ctxTarget.globalCompositeOperation = appState.blend;

    appState.nodesData.forEach((node, i) => {
        const cx = node.x * w;
        const cy = node.y * h;
        const radius = Math.max(w, h) * 0.5 * appState.spread;

        const grad = ctxTarget.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const color = appState.colors[i % appState.colors.length];
        const rgb = hexToRgb(color);

        grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`);
        grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

        ctxTarget.fillStyle = grad;
        ctxTarget.beginPath();

        if (appState.mode === 'aurora') {
            ctxTarget.save();
            ctxTarget.translate(cx, cy);
            ctxTarget.scale(1.5, 0.5);
            ctxTarget.arc(0, 0, radius, 0, Math.PI * 2);
            ctxTarget.fill();
            ctxTarget.restore();
        } else {
            ctxTarget.arc(cx, cy, radius, 0, Math.PI * 2);
            ctxTarget.fill();
        }
    });

    ctxTarget.globalCompositeOperation = 'source-over';

    // Film grain overlay
    if (appState.grain > 0) {
        const pattern = ctxTarget.createPattern(noiseCanvas, 'repeat');
        ctxTarget.globalAlpha = appState.grain;
        ctxTarget.globalCompositeOperation = 'overlay';
        ctxTarget.fillStyle = pattern;
        ctxTarget.fillRect(0, 0, w, h);
        ctxTarget.globalAlpha = 1.0;
        ctxTarget.globalCompositeOperation = 'source-over';
    }
}

function loop() {
    appState.nodesData.forEach(n => n.update(appState.speed));
    drawFrame(ctx, canvas.width, canvas.height);
    requestAnimationFrame(loop);
}

// ========================================
// Canvas Sizing (Fixed 640×480 @ DPR)
// ========================================

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = wrapper.clientWidth * dpr;
    canvas.height = wrapper.clientHeight * dpr;
}
window.addEventListener('resize', resizeCanvas);

// ========================================
// UI Interactions
// ========================================

const colorsContainer = document.getElementById('colors');

function renderColors() {
    colorsContainer.innerHTML = '';
    appState.colors.forEach((col, i) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = col;

        const input = document.createElement('input');
        input.type = 'color';
        input.value = col;
        input.addEventListener('input', e => {
            appState.colors[i] = e.target.value;
            swatch.style.background = e.target.value;
        });

        swatch.appendChild(input);
        colorsContainer.appendChild(swatch);
    });

    document.getElementById('btn-add').disabled = appState.colors.length >= 10;
    document.getElementById('btn-remove').disabled = appState.colors.length <= 2;
    syncNodes();
}

// Add / Remove colors
document.getElementById('btn-add').addEventListener('click', () => {
    if (appState.colors.length < 10) {
        appState.colors.push('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
        renderColors();
    }
});

document.getElementById('btn-remove').addEventListener('click', () => {
    if (appState.colors.length > 2) {
        appState.colors.pop();
        renderColors();
    }
});

// Randomize palette
document.getElementById('btn-random').addEventListener('click', () => {
    const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];
    appState.colors = [...randomPalette];
    renderColors();
});

// Mode tabs
document.querySelectorAll('.segmented button').forEach(btn => {
    btn.addEventListener('click', e => {
        document.querySelectorAll('.segmented button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        appState.mode = e.target.dataset.mode;
    });
});

// Blend mode
document.getElementById('blend').addEventListener('change', e => {
    appState.blend = e.target.value;
});

// Sliders
document.getElementById('speed').addEventListener('input', e => {
    appState.speed = parseFloat(e.target.value);
    document.getElementById('speed-val').innerText = appState.speed.toFixed(1) + 'x';
});

document.getElementById('spread').addEventListener('input', e => {
    appState.spread = parseFloat(e.target.value);
    document.getElementById('spread-val').innerText = appState.spread.toFixed(1) + 'x';
});

document.getElementById('grain').addEventListener('input', e => {
    appState.grain = parseFloat(e.target.value);
    document.getElementById('grain-val').innerText = (appState.grain * 100).toFixed(0) + '%';
});

// ========================================
// Export Logic
// ========================================

// Image Export
document.getElementById('btn-export-img').addEventListener('click', () => {
    const scale = parseInt(document.getElementById('img-scale').value);
    const rect = canvas.getBoundingClientRect();

    const expCanvas = document.createElement('canvas');
    expCanvas.width = rect.width * scale;
    expCanvas.height = rect.height * scale;
    const expCtx = expCanvas.getContext('2d');

    drawFrame(expCtx, expCanvas.width, expCanvas.height);

    const link = document.createElement('a');
    link.download = `AuraMesh-${Date.now()}.png`;
    link.href = expCanvas.toDataURL('image/png', 1.0);
    link.click();
});

// Video Export (WebM 60FPS)
let isRecording = false;
document.getElementById('btn-export-vid').addEventListener('click', () => {
    if (isRecording) return;
    const duration = parseInt(document.getElementById('vid-duration').value) || 5;
    isRecording = true;

    const overlay = document.getElementById('rec-overlay');
    const timeDisplay = document.getElementById('rec-time');
    overlay.classList.add('active');

    const stream = canvas.captureStream(60);
    const options = { mimeType: 'video/webm; codecs=vp9' };
    let recorder;
    try {
        recorder = new MediaRecorder(stream, options);
    } catch (e) {
        recorder = new MediaRecorder(stream);
    }

    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AuraMesh-Video-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        isRecording = false;
        overlay.classList.remove('active');
    };

    recorder.start();

    let elapsed = 0;
    timeDisplay.innerText = elapsed;
    const interval = setInterval(() => {
        elapsed++;
        timeDisplay.innerText = elapsed;
        if (elapsed >= duration) {
            clearInterval(interval);
            recorder.stop();
        }
    }, 1000);
});

// ========================================
// Init
// ========================================

resizeCanvas();
renderColors();
loop();
