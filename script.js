// =================================================================================
// ===== KONSTANTE I PODEŠAVANJA =====
// =================================================================================
const THEMES = {
    'classic': { background: '#1a1a2e', boardBackground: '#000', lineColor: '#61dafb', blockColors: ['#00FFFF', '#0000FF', '#FFA500', '#FFFF00', '#00FF00', '#800080', '#FF0000'], flashColor: '#FFFFFF', gridColor: '#333', backgroundImage: null },
    'dark': { background: '#0d0d0d', boardBackground: '#1c1c1c', lineColor: '#999999', blockColors: ['#00FFFF', '#3366FF', '#FF9933', '#FFFF00', '#33CC66', '#9966CC', '#FF3333'], flashColor: '#CCCCCC', gridColor: '#444', backgroundImage: null },
    'forest': { background: '#0a1d0d', boardBackground: '#263a29', lineColor: '#b4cf66', blockColors: ['#66FFB2', '#339966', '#FF9900', '#FFFF66', '#33CC66', '#9966CC', '#FF3333'], flashColor: '#E0FF8C', gridColor: '#4a594d', backgroundImage: 'url("images/forest-bg.jpg")' },
    'modern': { background: '#121212', boardBackground: '#1e1e1e', lineColor: '#bb86fc', blockColors: ['#03dac6', '#cf6679', '#f3a469', '#f0e68c', '#aaff00', '#8c5eff', '#e74c3c'], flashColor: '#ffffff', gridColor: '#4d4d4d', backgroundImage: 'url("images/modern-bg.jpg")' },
    'lava': { background: '#220000', boardBackground: '#440000', lineColor: '#FF4500', blockColors: ['#FFD700', '#FF4500', '#FF1493', '#FF6347', '#FF8C00', '#DC143C', '#B22222'], flashColor: '#FF6347', gridColor: '#662222', backgroundImage: 'url("images/lava-bg.jpg")' }
};
const T_SHAPE_INDEX = 5;
const COLS = 10;
const ROWS = 20;
const DAS_DELAY = 160; 
const ARR_RATE = 30; 

// PODEŠAVANJA ZA TOUCH "OSEĆAJ"
const TAP_MAX_DURATION = 200;
const TAP_MAX_DISTANCE = 20;
const HARD_DROP_MIN_Y_DISTANCE = 70;
const FLICK_MAX_DURATION = 250;
const SMOOTHING_FACTOR = 0.3;

// PODEŠAVANJA PRAVILA IGRE
const POINTS = { SINGLE: 100, DOUBLE: 300, TRIPLE: 500, TETRIS: 800 };
const T_SPIN_POINTS = { MINI: 100, SINGLE: 800, DOUBLE: 1200, TRIPLE: 1600 };
const LEVEL_SPEED_CONFIG = { BASE_INTERVAL: 1000, MIN_INTERVAL: 100, SPEED_INCREASE_PER_LEVEL: 50 };

const TETROMINOES = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[1, 1], [1, 1]],
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
];

// =================================================================================
// ===== GLOBALNE VARIJABLE I STANJE IGRE =====
// =================================================================================
let canvas, ctx, nextBlockCanvas, nextBlockCtx;
let animationFrameId;
let isAnimating = false;
let animationStart = 0;
let pauseStartTime = 0;
const animationDuration = 400;
let board = [];
let boardHistory = [];
let currentPiece, nextPiece;
let score = 0, bestScores = {};
let level = 1, linesClearedThisLevel = 0, linesClearedTotal = 0;
let combo = 0, lastClearWasSpecial = false;
let gameOver = true, isPaused = false, hammerMode = false;
let startTime, lastDropTime = 0, dropInterval = LEVEL_SPEED_CONFIG.BASE_INTERVAL;
const ultraTimeLimit = 120;
let assists = { bomb: 0, hammer: 0, undo: 0 };
let nextAssistReward = 5000;
let hammerLine = -1;
let currentPieceIndex, nextPieceIndex;
let keyBindings;
let dasTimer = null, arrTimer = null, moveDirection = 0;
let visualX = 0;
let BLOCK_SIZE;
let linesToClear = [];
let COLORS, currentTheme;
let currentMode = 'classic';
let dropSound, clearSound, rotateSound, gameOverSound, tSpinSound, tetrisSound, backgroundMusic, bombSound;
let startScreen, gameOverScreen, pauseScreen, scoreDisplay, finalScoreDisplay, finalTimeDisplay, comboDisplay, startButton, restartButton, resumeButton, themeSwitcher, modeSelector, assistsBombButton, assistsBombCountDisplay, assistsHammerButton, assistsHammerCountDisplay, assistsUndoButton, assistsUndoCountDisplay, bestScoreDisplay, homeButton, pauseButton, levelDisplay, sprintTimerDisplay, ultraTimerDisplay, countdownOverlay;
let backgroundMusicPlaying = false;
let controlsModal, controlsButton, closeControlsModal, controlInputs, exitModal, confirmExitButton, cancelExitButton;
let backgroundImageElement;

// Varijable za Touch kontrole
let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
let initialPieceX = 0;
let lastTouchY = 0;

// =================================================================================
// ===== FUNKCIJE ZA CRTANJE (RENDER) =====
// =================================================================================
function drawBlock(x, y, color, context = ctx, blockSize = BLOCK_SIZE) {
    if (!context || !blockSize) return;
    const lightColor = lightenColor(color, 20);
    const darkColor = darkenColor(color, 20);
    context.fillStyle = lightColor;
    context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
    context.fillStyle = darkColor;
    context.fillRect(x * blockSize + blockSize * 0.1, y * blockSize + blockSize * 0.1, blockSize * 0.8, blockSize * 0.8);
    context.fillStyle = color;
    context.fillRect(x * blockSize + blockSize * 0.2, y * blockSize + blockSize * 0.2, blockSize * 0.6, blockSize * 0.6);
}

function drawBoard() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = THEMES[currentTheme].boardBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = THEMES[currentTheme].gridColor;
    ctx.lineWidth = 1;
    
    // ISPRAVKA: Crtanje linija sa pomakom od pola piksela za oštrinu
    ctx.beginPath();
    for (let i = 1; i < COLS; i++) {
        ctx.moveTo(i * BLOCK_SIZE + 0.5, 0);
        ctx.lineTo(i * BLOCK_SIZE + 0.5, canvas.height);
    }
    for (let i = 1; i < ROWS; i++) {
        ctx.moveTo(0, i * BLOCK_SIZE + 0.5);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE + 0.5);
    }
    ctx.stroke();

    board.forEach((row, r) => row.forEach((cell, c) => { if (cell) drawBlock(c, r, cell); }));
    if (hammerLine !== -1) { ctx.fillStyle = 'rgba(255, 120, 120, 0.4)'; ctx.fillRect(0, hammerLine * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE); }
}

function drawCurrentPiece() { 
    if (!currentPiece) return;
    ctx.save();
    ctx.translate(visualX, 0);
    currentPiece.shape.forEach((row, r) => row.forEach((cell, c) => { 
        if (cell) drawBlock(0 + c, currentPiece.y + r, currentPiece.color); 
    })); 
    ctx.restore();
}

function drawGhostPiece() {
    if (!currentPiece || !BLOCK_SIZE) return;
    let ghostY = currentPiece.y;
    while (isValidMove(0, 1, currentPiece.shape, ghostY, currentPiece.x)) {
        ghostY++;
    }

    ctx.globalAlpha = 0.3;
    ctx.save();
    ctx.translate(visualX, 0);
    currentPiece.shape.forEach((row, r) => row.forEach((cell, c) => { 
        if (cell) drawBlock(0 + c, ghostY + r, currentPiece.color); 
    }));
    ctx.restore();
    ctx.globalAlpha = 1.0;
}

// ... ostatak koda ostaje nepromenjen ...
