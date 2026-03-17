// ========================================
// AuraMesh Pro — Core Engine
// ========================================

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const wrapper = document.getElementById('canvas-wrapper');
const handlesContainer = document.getElementById('node-handles');
const modeBadge = document.getElementById('mode-badge');

// --- State ---
const appState = {
    renderMode: 'fluid',
    playback: 'video',    // 'video' | 'still'
    blend: 'screen',
    speed: 1.0,
    spread: 1.2,
    grain: 0,
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
// Film Grain (disabled by default but kept for engine)
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

class GradientNode {
    constructor(i) {
        this.index = i;
        this.x = 0.15 + Math.random() * 0.7;
        this.y = 0.15 + Math.random() * 0.7;
        this.vx = (Math.random() - 0.5) * 0.004;
        this.vy = (Math.random() - 0.5) * 0.004;
        this.angle = Math.random() * Math.PI * 2;
    }

    update(speed) {
        if (appState.playback === 'still') return;

        if (appState.renderMode === 'fluid') {
            this.x += this.vx * speed;
            this.y += this.vy * speed;
            if (this.x < -0.15 || this.x > 1.15) this.vx *= -1;
            if (this.y < -0.15 || this.y > 1.15) this.vy *= -1;
        } else if (appState.renderMode === 'orbit') {
            this.angle += 0.005 * speed;
            this.x = 0.5 + Math.cos(this.angle + this.index * ((Math.PI * 2) / appState.colors.length)) * 0.32;
            this.y = 0.5 + Math.sin(this.angle + this.index * ((Math.PI * 2) / appState.colors.length)) * 0.32;
        } else if (appState.renderMode === 'aurora') {
            this.x += Math.abs(this.vx) * speed * 0.5;
            if (this.x > 1.2) this.x = -0.2;
            this.y = 0.5 + Math.sin(Date.now() * 0.001 * speed + this.index) * 0.3;
        }
    }
}

function syncNodes() {
    while (appState.nodesData.length < appState.colors.length) {
        appState.nodesData.push(new GradientNode(appState.nodesData.length));
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

        if (appState.renderMode === 'aurora') {
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
    if (appState.playback === 'still') updateNodeHandles();
    requestAnimationFrame(loop);
}

// ========================================
// Canvas Sizing
// ========================================

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = wrapper.clientWidth * dpr;
    canvas.height = wrapper.clientHeight * dpr;
}
window.addEventListener('resize', resizeCanvas);

// ========================================
// Node Handles (Still Mode — Draggable)
// ========================================

let dragNode = null;

function createNodeHandles() {
    handlesContainer.innerHTML = '';
    appState.nodesData.forEach((node, i) => {
        const handle = document.createElement('div');
        handle.className = 'node-handle';
        handle.style.background = appState.colors[i] || '#fff';
        handle.dataset.index = i;

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            dragNode = i;
        });

        handlesContainer.appendChild(handle);
    });
    updateNodeHandles();
}

function updateNodeHandles() {
    const handles = handlesContainer.querySelectorAll('.node-handle');
    const rect = wrapper.getBoundingClientRect();
    handles.forEach((handle, i) => {
        if (appState.nodesData[i]) {
            handle.style.left = (appState.nodesData[i].x * rect.width) + 'px';
            handle.style.top = (appState.nodesData[i].y * rect.height) + 'px';
            handle.style.background = appState.colors[i] || '#fff';
        }
    });
}

function showHandles(show) {
    handlesContainer.style.display = show ? 'block' : 'none';
    wrapper.classList.toggle('draggable', show);
}

document.addEventListener('mousemove', (e) => {
    if (dragNode === null) return;
    const rect = wrapper.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    appState.nodesData[dragNode].x = Math.max(0, Math.min(1, x));
    appState.nodesData[dragNode].y = Math.max(0, Math.min(1, y));
});

document.addEventListener('mouseup', () => {
    dragNode = null;
});

// ========================================
// Custom Dropdown
// ========================================

function initDropdown(triggerId, menuId, onSelect) {
    const trigger = document.getElementById(triggerId);
    const menu = document.getElementById(menuId);
    const options = menu.querySelectorAll('.dropdown-option');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) {
            menu.classList.add('open');
            trigger.classList.add('open');
        }
    });

    options.forEach(opt => {
        opt.addEventListener('click', () => {
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            trigger.querySelector('span').textContent = opt.textContent;
            menu.classList.remove('open');
            trigger.classList.remove('open');
            onSelect(opt.dataset.value);
        });
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.dropdown-trigger').forEach(t => t.classList.remove('open'));
}

document.addEventListener('click', closeAllDropdowns);

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
    if (appState.playback === 'still') createNodeHandles();
}

// Add / Remove
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

// Randomize
document.getElementById('btn-random').addEventListener('click', () => {
    appState.colors = [...palettes[Math.floor(Math.random() * palettes.length)]];
    renderColors();
});

// Render Mode Tabs
document.querySelectorAll('#mode-tabs button').forEach(btn => {
    btn.addEventListener('click', e => {
        document.querySelectorAll('#mode-tabs button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        appState.renderMode = e.target.dataset.mode;
    });
});

// Playback Toggle (Video / Still)
document.querySelectorAll('#playback-tabs button').forEach(btn => {
    btn.addEventListener('click', e => {
        document.querySelectorAll('#playback-tabs button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        appState.playback = e.target.dataset.playback;

        const isStill = appState.playback === 'still';
        showHandles(isStill);
        document.getElementById('speed-control').style.opacity = isStill ? '0.3' : '1';
        document.getElementById('speed-control').style.pointerEvents = isStill ? 'none' : 'auto';
        modeBadge.textContent = isStill ? 'Still' : 'Video';
        modeBadge.classList.toggle('live', !isStill);

        if (isStill) createNodeHandles();
    });
});

// Blend Mode (Custom Dropdown)
initDropdown('blend-trigger', 'blend-menu', (val) => {
    appState.blend = val;
});

// Speed Slider
document.getElementById('speed').addEventListener('input', e => {
    appState.speed = parseFloat(e.target.value);
    document.getElementById('speed-val').innerText = appState.speed.toFixed(1) + 'x';
});

// ========================================
// Export — Image (High Res PNG)
// ========================================

document.getElementById('btn-export-img').addEventListener('click', () => {
    const scale = 4; // Always export 4x for quality
    const expCanvas = document.createElement('canvas');
    expCanvas.width = 640 * scale;
    expCanvas.height = 480 * scale;
    const expCtx = expCanvas.getContext('2d');

    drawFrame(expCtx, expCanvas.width, expCanvas.height);

    const link = document.createElement('a');
    link.download = `AuraMesh-${Date.now()}.png`;
    link.href = expCanvas.toDataURL('image/png', 1.0);
    link.click();
});

// ========================================
// Export — Video (High Quality WebM)
// ========================================

let isRecording = false;
document.getElementById('btn-export-vid').addEventListener('click', () => {
    if (isRecording) return;
    const duration = 6;
    isRecording = true;

    // Force video mode during recording
    const prevPlayback = appState.playback;
    appState.playback = 'video';
    showHandles(false);

    const overlay = document.getElementById('rec-overlay');
    const timeDisplay = document.getElementById('rec-time');
    overlay.classList.add('active');

    // Use high-quality canvas stream
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const recCanvas = document.createElement('canvas');
    recCanvas.width = 640 * dpr;
    recCanvas.height = 480 * dpr;
    const recCtx = recCanvas.getContext('2d');

    // Record at 60fps from a high-res offscreen canvas
    const stream = recCanvas.captureStream(60);

    let recorder;
    // Try VP9 first for best quality, then VP8 fallback
    const mimeTypes = [
        'video/webm; codecs=vp9',
        'video/webm; codecs=vp8',
        'video/webm'
    ];

    let chosenMime = 'video/webm';
    for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
            chosenMime = mime;
            break;
        }
    }

    recorder = new MediaRecorder(stream, {
        mimeType: chosenMime,
        videoBitsPerSecond: 12_000_000 // 12 Mbps for crispy quality
    });

    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: chosenMime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AuraMesh-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        isRecording = false;
        overlay.classList.remove('active');
        appState.playback = prevPlayback;
        if (prevPlayback === 'still') {
            showHandles(true);
            createNodeHandles();
        }
    };

    // Render loop for recording canvas
    let recAnimId;
    function recLoop() {
        appState.nodesData.forEach(n => n.update(appState.speed));
        drawFrame(recCtx, recCanvas.width, recCanvas.height);
        recAnimId = requestAnimationFrame(recLoop);
    }
    recLoop();

    recorder.start();

    let elapsed = 0;
    timeDisplay.innerText = elapsed;
    const interval = setInterval(() => {
        elapsed++;
        timeDisplay.innerText = elapsed;
        if (elapsed >= duration) {
            clearInterval(interval);
            cancelAnimationFrame(recAnimId);
            recorder.stop();
        }
    }, 1000);
});

// ========================================
// Init
// ========================================

resizeCanvas();
renderColors();
showHandles(false);
modeBadge.classList.add('live');
loop();
