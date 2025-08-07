// Postavke igre
let isAnimating = false;
let linesToClear = [];
let animationStart = 0;
const animationDuration = 400;
let lastClearWasSpecial = false;

const THEMES = {
    'classic': { background: '#1a1a2e', boardBackground: '#000', lineColor: '#61dafb', blockColors: ['#00FFFF', '#0000FF', '#FFA500', '#FFFF00', '#00FF00', '#800080', '#FF0000'], flashColor: '#FFFFFF', gridColor: '#2a2a3e', backgroundImage: null },
    'dark': { background: '#0d0d0d', boardBackground: '#1c1c1c', lineColor: '#999999', blockColors: ['#00FFFF', '#3366FF', '#FF9933', '#FFFF00', '#33CC66', '#9966CC', '#FF3333'], flashColor: '#CCCCCC', gridColor: '#3c3c3c', backgroundImage: null },
    'forest': { background: '#0a1d0d', boardBackground: '#263a29', lineColor: '#b4cf66', blockColors: ['#66FFB2', '#339966', '#FF9900', '#FFFF66', '#33CC66', '#9966CC', '#FF3333'], flashColor: '#E0FF8C', gridColor: '#4a594d', backgroundImage: 'url("images/forest-bg.jpg")' },
    'modern': { background: '#121212', boardBackground: '#1e1e1e', lineColor: '#bb86fc', blockColors: ['#03dac6', '#cf6679', '#f3a469', '#f0e68c', '#aaff00', '#8c5eff', '#e74c3c'], flashColor: '#ffffff', gridColor: '#4d4d4d', backgroundImage: 'url("images/modern-bg.jpg")' },
    'lava': { background: '#220000', boardBackground: '#440000', lineColor: '#FF4500', blockColors: ['#FFD700', '#FF4500', '#FF1493', '#FF6347', '#FF8C00', '#DC143C', '#B22222'], flashColor: '#FF6347', gridColor: '#662222', backgroundImage: 'url("images/lava-bg.jpg")' }
};

const T_SHAPE_INDEX = 5;

let canvas, ctx, nextBlockCanvas, nextBlockCtx;
const COLS = 10;
const ROWS = 20;
let BLOCK_SIZE;

const TETROMINOES = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[1, 1], [1, 1]],
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
];

let board = [];
let boardHistory = [];
let currentPiece, nextPiece;
let score = 0;
let gameOver = true;
let isPaused = false;
let combo = 0;
let assists = { bomb: 0, hammer: 0, undo: 0 };
let bestScore = 0;
let nextAssistReward = 5000;
let bombBonus = 1500;
let hammerMode = false;
let hammerLine = -1;

let dropInterval = 1000;
let level = 1;
let linesClearedThisLevel = 0;
let linesClearedTotal = 0;
let startTime;
const ultraTimeLimit = 120;

let lastDropTime = 0;
let animationFrameId;
let currentPieceIndex, nextPieceIndex;
let COLORS;
let currentTheme;
let currentMode = 'classic';
let keyBindings;

// DOM elementi
let dropSound, clearSound, rotateSound, gameOverSound, tSpinSound, tetrisSound, backgroundMusic, bombSound;
let startScreen, gameOverScreen, pauseScreen, scoreDisplay, finalScoreDisplay, finalTimeDisplay, comboDisplay, startButton, restartButton, resumeButton, themeSwitcher, modeSelector, assistsBombButton, assistsBombCountDisplay, assistsHammerButton, assistsHammerCountDisplay, assistsUndoButton, assistsUndoCountDisplay, bestScoreDisplay, homeButton, pauseButton, levelDisplay, sprintTimerDisplay, ultraTimerDisplay, startCountdown, continueButton, exitModal, confirmExitButton, cancelExitButton;
let backgroundMusicPlaying = false;
let controlsModal, controlsButton, closeControlsModal, controlInputs;
let backgroundImageElement;

let TOUCH_MOVE_THRESHOLD_X;
let TOUCH_MOVE_THRESHOLD_Y;
let TAP_THRESHOLD;

function setCanvasSize() {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) return;
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    const blockSizeFromWidth = Math.floor(containerWidth / COLS);
    const blockSizeFromHeight = Math.floor(containerHeight / ROWS);
    BLOCK_SIZE = Math.min(blockSizeFromWidth, blockSizeFromHeight);
    const canvasWidth = COLS * BLOCK_SIZE;
    const canvasHeight = ROWS * BLOCK_SIZE;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    const sideCanvasSize = Math.floor(BLOCK_SIZE * 4);
    nextBlockCanvas.width = sideCanvasSize;
    nextBlockCanvas.height = sideCanvasSize;
    TOUCH_MOVE_THRESHOLD_X = BLOCK_SIZE * 0.8;
    TOUCH_MOVE_THRESHOLD_Y = BLOCK_SIZE * 1.5;
    TAP_THRESHOLD = BLOCK_SIZE * 0.5;
    if (!gameOver && !isPaused) {
        draw();
        drawNextPiece();
    }
}

function initDOMAndEventListeners() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextBlockCanvas = document.getElementById('nextBlockCanvas');
    nextBlockCtx = nextBlockCanvas.getContext('2d');
    
    dropSound = document.getElementById('dropSound');
    clearSound = document.getElementById('clearSound');
    rotateSound = document.getElementById('rotateSound');
    gameOverSound = document.getElementById('gameOverSound');
    tSpinSound = document.getElementById('tSpinSound');
    tetrisSound = document.getElementById('tetrisSound');
    backgroundMusic = document.getElementById('backgroundMusic');
    bombSound = document.getElementById('bombSound');

    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over-screen');
    pauseScreen = document.getElementById('pause-screen');
    exitModal = document.getElementById('exit-modal');
    scoreDisplay = document.getElementById('score-display');
    finalScoreDisplay = document.getElementById('final-score');
    finalTimeDisplay = document.getElementById('final-time');
    comboDisplay = document.getElementById('combo-display');
    startButton = document.getElementById('start-button');
    restartButton = document.getElementById('restart-button');
    resumeButton = document.getElementById('resume-button');
    homeButton = document.getElementById('home-button');
    pauseButton = document.getElementById('pause-button');
    confirmExitButton = document.getElementById('confirm-exit-button');
    cancelExitButton = document.getElementById('cancel-exit-button');
    assistsBombButton = document.getElementById('assist-bomb-button');
    assistsBombCountDisplay = document.getElementById('assists-bomb-count');
    assistsHammerButton = document.getElementById('assist-hammer-button');
    assistsHammerCountDisplay = document.getElementById('assists-hammer-count');
    assistsUndoButton = document.getElementById('assist-undo-button');
    assistsUndoCountDisplay = document.getElementById('assists-undo-count');
    bestScoreDisplay = document.getElementById('best-score-display');
    levelDisplay = document.getElementById('level-display');
    themeSwitcher = document.getElementById('theme-switcher');
    modeSelector = document.getElementById('mode-selector');
    sprintTimerDisplay = document.getElementById('sprint-timer');
    ultraTimerDisplay = document.getElementById('ultra-timer');
    startCountdown = document.getElementById('start-countdown');
    controlsModal = document.getElementById('controls-modal');
    controlsButton = document.getElementById('controls-button');
    closeControlsModal = document.getElementById('close-controls-modal');
    controlInputs = document.querySelectorAll('#controls-modal input');
    backgroundImageElement = document.getElementById('background-image');

    startButton.addEventListener('click', () => {
        currentMode = modeSelector.value;
        startGame();
    });
    restartButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        startScreen.style.display = 'flex';
    });
    pauseButton.addEventListener('click', togglePause);
    resumeButton.addEventListener('click', togglePause);
    homeButton.addEventListener('click', showExitModal);
    confirmExitButton.addEventListener('click', () => {
        exitModal.style.display = 'none';
        endGame(false, true);
    });
    cancelExitButton.addEventListener('click', () => {
        exitModal.style.display = 'none';
        if (!gameOver) togglePause();
    });
    themeSwitcher.addEventListener('change', (e) => setTheme(e.target.value));
    
    assistsBombButton.addEventListener('click', () => { if (!gameOver && !isPaused) useBombAssist(); });
    assistsHammerButton.addEventListener('click', () => { if (!gameOver && !isPaused) toggleHammerMode(); });
    assistsUndoButton.addEventListener('click', () => { if (!gameOver && !isPaused) useUndoAssist(); });

    controlsButton.addEventListener('click', () => { controlsModal.style.display = 'block'; });
    closeControlsModal.addEventListener('click', () => { controlsModal.style.display = 'none'; });
    
    document.addEventListener('keydown', handleKeydown);
    
    controlInputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            e.preventDefault();
            input.value = e.key === ' ' ? 'Space' : e.key;
            saveKeyBindings();
        });
    });

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasHover);
    window.addEventListener('resize', setCanvasSize);
    
    const storedBestScore = localStorage.getItem('bestScore');
    if (storedBestScore) {
        bestScore = parseInt(storedBestScore, 10);
        bestScoreDisplay.textContent = `${bestScore}`;
    }

    const storedAssists = JSON.parse(localStorage.getItem('assists'));
    if (storedAssists) assists = storedAssists;
    else {
        assists = { bomb: 0, hammer: 0, undo: 0 };
        localStorage.setItem('assists', JSON.stringify(assists));
    }
    updateAssistsDisplay();
    
    const savedTheme = localStorage.getItem('theme') || 'classic';
    setTheme(savedTheme);
    themeSwitcher.value = savedTheme;

    loadKeyBindings();
    
    let touchStartX = 0, touchStartY = 0, lastTouchX = 0, lastTouchY = 0;
    canvas.addEventListener('touchstart', e => {
        if (gameOver || isPaused || !currentPiece) return;
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = touchStartX;
        lastTouchY = touchStartY;
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if (gameOver || isPaused || !currentPiece) return;
        e.preventDefault();
        const currentTouchX = e.touches[0].clientX;
        const currentTouchY = e.touches[0].clientY;
        const dx = currentTouchX - lastTouchX;
        if (Math.abs(dx) > TOUCH_MOVE_THRESHOLD_X) {
            movePiece(dx > 0 ? 1 : -1);
            lastTouchX = currentTouchX;
        }
        const dy = currentTouchY - lastTouchY;
        if (dy > TOUCH_MOVE_THRESHOLD_Y && dy > Math.abs(dx)) {
            movePieceDown();
            lastTouchY = currentTouchY;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        if (gameOver || isPaused || !currentPiece) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) rotatePiece();
        else if (dy < -BLOCK_SIZE * 3 && Math.abs(dy) > Math.abs(dx)) dropPiece();
        draw();
    });

    setCanvasSize();
    startScreen.style.display = 'flex';
}

function playBackgroundMusic() {
    if (!backgroundMusicPlaying) {
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.5;
        backgroundMusic.play().catch(e => console.error("Greška pri puštanju muzike:", e));
        backgroundMusicPlaying = true;
    }
}
function pauseBackgroundMusic() {
    backgroundMusic.pause();
    backgroundMusicPlaying = false;
}
function loadKeyBindings() {
    const savedBindings = JSON.parse(localStorage.getItem('keyBindings'));
    keyBindings = savedBindings || { left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', rotate: 'ArrowUp', drop: ' ', bomb: 'b', hammer: 'h', undo: 'u' };
    controlInputs.forEach(input => {
        const action = input.dataset.action;
        if (keyBindings[action]) input.value = keyBindings[action] === ' ' ? 'Space' : keyBindings[action];
    });
}
function saveKeyBindings() {
    controlInputs.forEach(input => {
        const action = input.dataset.action;
        keyBindings[action] = input.value === 'Space' ? ' ' : input.value;
    });
    localStorage.setItem('keyBindings', JSON.stringify(keyBindings));
}
function initBoard() {
    board = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
}
function createCurrentPiece() {
    if (currentPieceIndex === undefined) return;
    const shape = TETROMINOES[currentPieceIndex];
    currentPiece = { shape, color: COLORS[currentPieceIndex], x: Math.floor((COLS - shape[0].length) / 2), y: 0 };
}
function generateNewPiece() {
    currentPieceIndex = nextPieceIndex !== undefined ? nextPieceIndex : Math.floor(Math.random() * TETROMINOES.length);
    createCurrentPiece();
    nextPieceIndex = Math.floor(Math.random() * TETROMINOES.length);
    nextPiece = { shape: TETROMINOES[nextPieceIndex], color: COLORS[nextPieceIndex] };
    drawNextPiece();
    if (!isValidMove(0, 0, currentPiece.shape)) endGame();
}
function setTheme(themeName) {
    currentTheme = themeName;
    const theme = THEMES[themeName];
    if (!theme) return;
    COLORS = theme.blockColors;
    Object.entries(theme).forEach(([key, value]) => {
        if (key !== 'blockColors' && key !== 'backgroundImage') {
            const propName = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
            document.documentElement.style.setProperty(propName, value);
        }
    });
    backgroundImageElement.style.backgroundImage = theme.backgroundImage || 'none';
    localStorage.setItem('theme', themeName);
    if (!gameOver) draw();
}
function drawBlock(x, y, color, context = ctx, blockSize = BLOCK_SIZE) {
    if (!context) return;
    const lightColor = lightenColor(color, 20);
    const darkColor = darkenColor(color, 20);
    context.fillStyle = lightColor;
    context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
    context.fillStyle = darkColor;
    context.fillRect(x * blockSize + blockSize * 0.1, y * blockSize + blockSize * 0.1, blockSize * 0.8, blockSize * 0.8);
    context.fillStyle = color;
    context.fillRect(x * blockSize + blockSize * 0.2, y * blockSize + blockSize * 0.2, blockSize * 0.6, blockSize * 0.6);
}
function lightenColor(c, a) { let r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); r = Math.min(255, r + a); g = Math.min(255, g + a); b = Math.min(255, b + a); return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`; }
function darkenColor(c, a) { let r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); r = Math.max(0, r - a); g = Math.max(0, g - a); b = Math.max(0, b - a); return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`; }
function drawGhostPiece() {
    if (!currentPiece) return;
    let ghostY = currentPiece.y;
    while (isValidMove(0, 1, currentPiece.shape, ghostY)) ghostY++;
    ctx.globalAlpha = 0.3;
    currentPiece.shape.forEach((row, r) => row.forEach((cell, c) => { if (cell) drawBlock(currentPiece.x + c, ghostY + r, currentPiece.color); }));
    ctx.globalAlpha = 1.0;
}
function drawPieceInCanvas(piece, context, canvasEl) {
    if (!piece || !context) return;
    const { shape, color } = piece;
    context.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const maxDim = Math.max(...shape.map(r => r.length), shape.length);
    const pieceBlockSize = Math.floor(canvasEl.width / (maxDim + 1));
    const offsetX = (canvasEl.width - shape[0].length * pieceBlockSize) / 2;
    const offsetY = (canvasEl.height - shape.length * pieceBlockSize) / 2;
    shape.forEach((row, r) => row.forEach((cell, c) => { if (cell) { context.save(); context.translate(offsetX, offsetY); drawBlock(c, r, color, context, pieceBlockSize); context.restore(); } }));
}
function drawNextPiece() { drawPieceInCanvas(nextPiece, nextBlockCtx, nextBlockCanvas); }

// IZMENA: Funkcija za crtanje table je poboljšana
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Iscrtaj pozadinu table
    ctx.fillStyle = THEMES[currentTheme].boardBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Iscrtaj mrežu za prazna polja
    ctx.fillStyle = THEMES[currentTheme].gridColor;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c]) {
                ctx.globalAlpha = 0.5;
                ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = THEMES[currentTheme].boardBackground;
                ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }

    // Iscrtaj postavljene blokove
    board.forEach((row, r) => row.forEach((cell, c) => { if (cell) drawBlock(c, r, cell); }));
    
    if (hammerLine !== -1) { 
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; 
        ctx.fillRect(0, hammerLine * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE); 
    }
}

function drawCurrentPiece() { if (currentPiece) currentPiece.shape.forEach((row, r) => row.forEach((cell, c) => { if (cell) drawBlock(currentPiece.x + c, currentPiece.y + r, currentPiece.color); })); }
function isValidMove(offsetX, offsetY, newShape, currentY = currentPiece.y) {
    if (!currentPiece) return false;
    for (let r = 0; r < newShape.length; r++) for (let c = 0; c < newShape[r].length; c++) if (newShape[r][c]) {
        const newX = currentPiece.x + c + offsetX, newY = currentY + r + offsetY;
        if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY] && board[newY][newX])) return false;
    }
    return true;
}
function movePiece(direction) { if (currentPiece && isValidMove(direction, 0, currentPiece.shape)) currentPiece.x += direction; }
function movePieceDown() { if (currentPiece && isValidMove(0, 1, currentPiece.shape)) { currentPiece.y++; lastDropTime = performance.now(); } else { mergePiece(); } draw(); }
function rotatePiece() {
    if (!currentPiece) return;
    const N = currentPiece.shape.length, newShape = Array(N).fill(0).map(() => Array(N).fill(0));
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) newShape[c][N - 1 - r] = currentPiece.shape[r][c];
    const kicks = [[0, 0], [-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1], [0, -1], [0, -2], [-2, 0], [2, 0]];
    for (const [kx, ky] of kicks) if (isValidMove(kx, ky, newShape)) {
        currentPiece.x += kx; currentPiece.y += ky; currentPiece.shape = newShape;
        rotateSound.currentTime = 0; rotateSound.play().catch(console.error); return;
    }
}
function dropPiece() {
    if (!currentPiece) return;
    const startY = currentPiece.y;
    while (isValidMove(0, 1, currentPiece.shape)) currentPiece.y++;
    if (currentMode !== 'zen') score += (currentPiece
