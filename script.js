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
let isMuted = false;
let allAudioElements;
let dropSound, clearSound, rotateSound, gameOverSound, tSpinSound, tetrisSound, backgroundMusic, bombSound;
let mainMenu, tetrisMenu, gameWrapper, gameOverScreen, pauseScreen, scoreDisplay, finalScoreDisplay, finalTimeDisplay, comboDisplay, startButton, restartButton, resumeButton, themeSwitcher, modeSelector, assistsBombButton, assistsBombCountDisplay, assistsHammerButton, assistsHammerCountDisplay, assistsUndoButton, assistsUndoCountDisplay, bestScoreDisplay, homeButton, pauseButton, levelDisplay, sprintTimerDisplay, ultraTimerDisplay, countdownOverlay;
let backgroundMusicPlaying = false;
let controlsModal, controlsButton, closeControlsModal, controlInputs, exitModal, confirmExitButton, cancelExitButton;
let backgroundImageElement, settingsButton, settingsModal, closeSettingsModalButton, soundToggleButton, selectTetrisButton, backToMainMenuButton;

// Varijable za Touch kontrole
let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
let initialPieceX = 0;
let lastTouchY = 0;

// =================================================================================
// ===== FUNKCIJE ZA CRTANJE (RENDER) =====
// =================================================================================
// ... (Sve funkcije od drawBlock do isTSpin ostaju iste kao u prethodnoj poruci) ...

// =================================================================================
// ===== KONTROLE (INPUT HANDLERS) =====
// =================================================================================
// ... (Sve funkcije od handleKeydown do handleCanvasHover ostaju iste) ...
// ... (handleTouchStart, handleTouchMove, handleTouchEnd ostaju iste) ...


// =================================================================================
// ===== GLAVNA LOGIKA IGRE (GAME LOGIC) =====
// =================================================================================
function startGame() {
    // Sakrij menije, prikaži igru
    mainMenu.style.display = 'none';
    tetrisMenu.style.display = 'none';
    gameWrapper.style.display = 'flex';
    resizeGame(); // Osiguraj pravu veličinu

    // Resetovanje stanja
    initBoard(); score = 0; level = 1; linesClearedTotal = 0; linesClearedThisLevel = 0;
    dropInterval = LEVEL_SPEED_CONFIG.BASE_INTERVAL;
    updateBestScoreDisplay();
    updateScoreDisplay(); updateLevelDisplay(); updateAssistsDisplay(); startTime = performance.now();
    sprintTimerDisplay.style.display = currentMode === 'sprint' ? 'block' : 'none';
    ultraTimerDisplay.style.display = currentMode === 'ultra' ? 'block' : 'none';
    gameOverScreen.style.display = 'none'; pauseScreen.style.display = 'none';
    gameOver = false; isPaused = false;
    currentPieceIndex = Math.floor(Math.random() * TETROMINOES.length); nextPieceIndex = Math.floor(Math.random() * TETROMINOES.length);
    generateNewPiece();
    if (currentMode !== 'zen') playBackgroundMusic();
    lastDropTime = performance.now();
    
    if(animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ... (Ostatak koda ostaje skoro isti, sa ključnim izmenama ispod) ...

// =================================================================================
// ===== INICIJALIZACIJA IGRE, Događaji i Podešavanja =====
// =================================================================================

function initDOMAndEventListeners() {
    // Dohvatanje kontejnera i menija
    gameWrapper = document.getElementById('main-game-wrapper');
    mainMenu = document.getElementById('main-menu');
    tetrisMenu = document.getElementById('tetris-menu');
    settingsModal = document.getElementById('settings-modal');

    // Dohvatanje canvasa
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextBlockCanvas = document.getElementById('nextBlockCanvas');
    nextBlockCtx = nextBlockCanvas.getContext('2d');
    backgroundImageElement = document.getElementById('background-image');
    
    // ... (dohvatanje ostalih elemenata ostaje isto kao u prethodnoj poruci) ...
    gameOverScreen = document.getElementById('game-over-screen');
    pauseScreen = document.getElementById('pause-screen');
    exitModal = document.getElementById('exit-modal');
    countdownOverlay = document.getElementById('countdown-overlay');
    scoreDisplay = document.getElementById('score-display');
    finalScoreDisplay = document.getElementById('final-score');
    finalTimeDisplay = document.getElementById('final-time');
    comboDisplay = document.getElementById('combo-display');
    levelDisplay = document.getElementById('level-display');
    sprintTimerDisplay = document.getElementById('sprint-timer');
    ultraTimerDisplay = document.getElementById('ultra-timer');
    bestScoreDisplay = document.getElementById('best-score-display');
    startButton = document.getElementById('start-button');
    restartButton = document.getElementById('restart-button');
    resumeButton = document.getElementById('resume-button');
    homeButton = document.getElementById('home-button');
    pauseButton = document.getElementById('pause-button');
    confirmExitButton = document.getElementById('confirm-exit-button');
    cancelExitButton = document.getElementById('cancel-exit-button');
    themeSwitcher = document.getElementById('theme-switcher');
    modeSelector = document.getElementById('mode-selector');
    assistsBombButton = document.getElementById('assist-bomb-button');
    assistsBombCountDisplay = document.getElementById('assists-bomb-count');
    assistsHammerButton = document.getElementById('assist-hammer-button');
    assistsHammerCountDisplay = document.getElementById('assists-hammer-count');
    assistsUndoButton = document.getElementById('assist-undo-button');
    assistsUndoCountDisplay = document.getElementById('assists-undo-count');
    controlsModal = document.getElementById('controls-modal');
    controlsButton = document.getElementById('controls-button');
    closeControlsModal = document.getElementById('close-controls-modal');
    controlInputs = document.querySelectorAll('.control-item input');
    
    // Novi dugmići
    selectTetrisButton = document.getElementById('select-tetris-button');
    backToMainMenuButton = document.getElementById('back-to-main-menu-button');
    settingsButton = document.getElementById('settings-button');
    closeSettingsModalButton = document.getElementById('close-settings-modal-button');
    soundToggleButton = document.getElementById('sound-toggle-button');
    
    allAudioElements = document.querySelectorAll('audio');
    dropSound = document.getElementById('dropSound');
    clearSound = document.getElementById('clearSound');
    // ... (i ostali zvukovi)
    
    function resizeGame() {
        // ... (ova funkcija ostaje ista)
    }

    // --- Povezivanje događaja (Event Listeners) ---
    window.addEventListener('resize', resizeGame);
    // ... (stari listeneri za igru ostaju)
    
    // NOVI LISTENERI ZA MENIJE
    selectTetrisButton.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        tetrisMenu.style.display = 'flex';
    });

    backToMainMenuButton.addEventListener('click', () => {
        tetrisMenu.style.display = 'none';
        mainMenu.style.display = 'flex';
    });

    settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
    });

    closeSettingsModalButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    soundToggleButton.addEventListener('click', toggleSound);

    // ... (ostali listeneri ostaju isti, npr. startButton.addEventListener...)
    
    // Izmena za restart dugme
    restartButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        gameWrapper.style.display = 'none'; // Sakrij igru
        mainMenu.style.display = 'flex'; // Vrati se na glavni meni
    });

    // ... (svi ostali listeneri ostaju isti)

    loadSettings();
    resizeGame();
}

function toggleSound() {
    isMuted = !isMuted;
    allAudioElements.forEach(audio => {
        audio.muted = isMuted;
    });
    soundToggleButton.textContent = isMuted ? '🔇' : '🔊';
    localStorage.setItem('isMuted', isMuted);
}

function loadSettings() {
    // ... (stara loadSettings logika)
    // DODATAK: Učitaj i primeni podešavanje za zvuk
    isMuted = JSON.parse(localStorage.getItem('isMuted') || 'false');
    allAudioElements.forEach(audio => {
        audio.muted = isMuted;
    });
    soundToggleButton.textContent = isMuted ? '🔇' : '🔊';
}

// ... (ostatak koda)
