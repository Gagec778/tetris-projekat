// =================================================================================
// ===== CONSTANTS AND SETTINGS =====
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
const PUZZLE_COLS = 10;
const PUZZLE_ROWS = 10;

// TOUCH FEEL SETTINGS
const TAP_MAX_DURATION = 200;
const TAP_MAX_DISTANCE = 20;
const HARD_DROP_MIN_Y_DISTANCE = 70;
const FLICK_MAX_DURATION = 250;
const SMOOTHING_FACTOR = 0.3;

// GAME RULES SETTINGS
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

const PUZZLE_PIECES = [
    [[1]], [[1, 1]], [[1, 1, 1]], [[1, 1, 1, 1]], [[1, 1, 1, 1, 1]],
    [[1], [1]], [[1], [1], [1]],
    [[1, 1], [1, 1]],
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]]
];

// =================================================================================
// ===== GLOBAL VARIABLES & GAME STATE =====
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
let dropSound, clearSound, rotateSound, gameOverSound, tSpinSound, tetrisSound, backgroundMusic, bombSound, placeSound;
let tetrisWrapper, blockPuzzleWrapper, mainMenu, tetrisMenu, gameOverScreen, pauseScreen, scoreDisplay, finalScoreDisplay, finalTimeDisplay, comboDisplay, startButton, restartButton, resumeButton, themeSwitcher, modeSelector, assistsBombButton, assistsBombCountDisplay, assistsHammerButton, assistsHammerCountDisplay, assistsUndoButton, assistsUndoCountDisplay, bestScoreDisplay, homeButton, pauseButton, levelDisplay, sprintTimerDisplay, ultraTimerDisplay, countdownOverlay;
let backgroundMusicPlaying = false;
let controlsModal, controlsButton, closeControlsModal, controlInputs, exitModal, confirmExitButton, cancelExitButton;
let backgroundImageElement, settingsButton, settingsModal, closeSettingsModalButton, soundToggleButton, selectTetrisButton, selectBlockPuzzleButton, backToMainMenuButton, puzzleBackButton, blockPuzzleCanvas, blockPuzzleCtx, puzzleScoreDisplay, puzzleBestScoreDisplay;

// Block Puzzle State
let puzzleBoard = [];
let availablePuzzlePieces = [null, null, null];
let puzzleScore = 0;
let puzzleBestScores = {};
let draggingPiece = null;
let draggingPieceCanvas, draggingPieceCtx, draggingElement;
let puzzleGhost = { cells: [], color: ''};

// Touch Control Variables
let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
let initialPieceX = 0;
let lastTouchY = 0;

// =================================================================================
// ===== DRAWING FUNCTIONS =====
// =================================================================================
// ... (Sve funkcije su iste kao u prošloj poruci, preskačemo radi kratkoće)

// =================================================================================
// ===== BLOCK PUZZLE FUNCTIONS =====
// =================================================================================
// ... (Sve funkcije su iste kao u prošloj poruci, preskačemo radi kratkoće)


// =================================================================================
// ===== INITIALIZATION =====
// =================================================================================
// ... (Preskačemo sve do initDOMAndEventListeners)

document.addEventListener('DOMContentLoaded', () => {
    // Menus and Wrappers
    tetrisWrapper = document.getElementById('tetris-wrapper');
    blockPuzzleWrapper = document.getElementById('block-puzzle-wrapper');
    mainMenu = document.getElementById('main-menu');
    tetrisMenu = document.getElementById('tetris-menu');
    settingsModal = document.getElementById('settings-modal');
    gameOverScreen = document.getElementById('game-over-screen');
    pauseScreen = document.getElementById('pause-screen');
    exitModal = document.getElementById('exit-modal');
    countdownOverlay = document.getElementById('countdown-overlay');
    controlsModal = document.getElementById('controls-modal');
    gameOverTitle = document.getElementById('game-over-title');

    // Canvases
    canvas = document.getElementById('gameCanvas');
    ctx = canvas ? canvas.getContext('2d') : null;
    nextBlockCanvas = document.getElementById('nextBlockCanvas');
    nextBlockCtx = nextBlockCanvas ? nextBlockCanvas.getContext('2d') : null;
    backgroundImageElement = document.getElementById('background-image');
    
    // Displays
    scoreDisplay = document.getElementById('score-display');
    finalScoreDisplay = document.getElementById('final-score');
    finalTimeDisplay = document.getElementById('final-time');
    comboDisplay = document.getElementById('combo-display');
    levelDisplay = document.getElementById('level-display');
    sprintTimerDisplay = document.getElementById('sprint-timer');
    ultraTimerDisplay = document.getElementById('ultra-timer');
    bestScoreDisplay = document.getElementById('best-score-display');

    // Buttons
    selectTetrisButton = document.getElementById('select-tetris-button');
    selectBlockPuzzleButton = document.getElementById('select-blockpuzzle-button');
    backToMainMenuButton = document.getElementById('back-to-main-menu-button');
    puzzleBackButton = document.getElementById('puzzle-back-button');
    settingsButton = document.getElementById('settings-button');
    closeSettingsModalButton = document.getElementById('close-settings-modal-button');
    soundToggleButton = document.getElementById('sound-toggle-button');
    startButton = document.getElementById('start-button');
    restartButton = document.getElementById('restart-button');
    resumeButton = document.getElementById('resume-button');
    homeButton = document.getElementById('home-button');
    pauseButton = document.getElementById('pause-button');
    confirmExitButton = document.getElementById('confirm-exit-button');
    cancelExitButton = document.getElementById('cancel-exit-button');
    controlsButton = document.getElementById('controls-button');
    closeControlsModal = document.getElementById('close-controls-modal');
    
    // Selectors & Inputs
    themeSwitcher = document.getElementById('theme-switcher');
    modeSelector = document.getElementById('mode-selector');
    controlInputs = document.querySelectorAll('.control-item input');
    
    // Assist Elements
    assistsBombButton = document.getElementById('assist-bomb-button');
    assistsBombCountDisplay = document.getElementById('assists-bomb-count');
    assistsHammerButton = document.getElementById('assist-hammer-button');
    assistsHammerCountDisplay = document.getElementById('assists-hammer-count');
    assistsUndoButton = document.getElementById('assist-undo-button');
    assistsUndoCountDisplay = document.getElementById('assists-undo-count');
    
    // Audio
    allAudioElements = document.querySelectorAll('audio');
    dropSound = document.getElementById('dropSound');
    clearSound = document.getElementById('clearSound');
    rotateSound = document.getElementById('rotateSound');
    gameOverSound = document.getElementById('gameOverSound');
    tSpinSound = document.getElementById('tSpinSound');
    tetrisSound = document.getElementById('tetrisSound');
    backgroundMusic = document.getElementById('backgroundMusic');
    bombSound = document.getElementById('bombSound');
    placeSound = document.getElementById('placeSound');
    
    function resizeGame() {
        if (!canvas) return;
        const container = document.getElementById('canvas-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        BLOCK_SIZE = Math.floor(Math.min(containerWidth / COLS, containerHeight / ROWS));
        canvas.width = COLS * BLOCK_SIZE;
        canvas.height = ROWS * BLOCK_SIZE;
        if (nextBlockCanvas && nextBlockCanvas.parentElement.clientWidth > 0) {
            nextBlockCanvas.width = nextBlockCanvas.parentElement.clientWidth * 0.9;
            nextBlockCanvas.height = nextBlockCanvas.parentElement.clientHeight * 0.9;
        }
        draw(); 
        if(!gameOver) drawNextPiece();
    }

    // --- Event Listeners ---
    window.addEventListener('resize', resizeGame);
    if(canvas) {
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    }
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keyup', handleKeyup);
    
    if(selectTetrisButton) selectTetrisButton.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        tetrisMenu.style.display = 'flex';
    });
    
    if(selectBlockPuzzleButton) selectBlockPuzzleButton.addEventListener('click', () => {
        // Trenutno prazno, dok ne implementiramo igru
        mainMenu.style.display = 'none';
        blockPuzzleWrapper.style.display = 'flex';
    });

    if(backToMainMenuButton) backToMainMenuButton.addEventListener('click', () => {
        tetrisMenu.style.display = 'none';
        mainMenu.style.display = 'flex';
    });

    if(puzzleBackButton) puzzleBackButton.addEventListener('click', () => {
        blockPuzzleWrapper.style.display = 'none';
        mainMenu.style.display = 'flex';
    });

    if(settingsButton) settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
    });

    if(closeSettingsModalButton) closeSettingsModalButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    if(soundToggleButton) soundToggleButton.addEventListener('click', toggleSound);

    if(startButton) startButton.addEventListener('click', () => {
        countdownOverlay.style.display = 'flex';
        let count = 3;
        countdownOverlay.textContent = count;
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownOverlay.textContent = count;
            } else {
                clearInterval(countdownInterval);
                countdownOverlay.style.display = 'none';
                startGame();
            }
        }, 1000);
    });

    if(restartButton) restartButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        tetrisWrapper.style.display = 'none';
        tetrisMenu.style.display = 'flex'; // ISPRAVKA: Vrati na Tetris meni, ne glavni
    });

    if(pauseButton) pauseButton.addEventListener('click', togglePause);
    if(resumeButton) resumeButton.addEventListener('click', togglePause);
    
    if(homeButton) homeButton.addEventListener('click', () => {
        if (gameOver) {
            gameOverScreen.style.display = 'none';
            tetrisWrapper.style.display = 'none';
            mainMenu.style.display = 'flex';
        } else if (!isPaused) {
            togglePause();
            exitModal.style.display = 'flex';
        }
    });

    if(cancelExitButton) cancelExitButton.addEventListener('click', () => {
        exitModal.style.display = 'none';
        togglePause();
    });

    if(confirmExitButton) confirmExitButton.addEventListener('click', () => {
        exitModal.style.display = 'none';
        endGame(false, true);
    });

    if(themeSwitcher) themeSwitcher.addEventListener('change', (e) => {
        applyTheme(e.target.value);
        localStorage.setItem('theme', e.target.value);
    });
    if(modeSelector) modeSelector.addEventListener('change', (e) => {
        currentMode = e.target.value;
        localStorage.setItem('mode', currentMode);
        updateBestScoreDisplay();
    });
    if(assistsBombButton) assistsBombButton.addEventListener('click', useBombAssist);
    if(assistsHammerButton) assistsHammerButton.addEventListener('click', toggleHammerMode);
    if(assistsUndoButton) assistsUndoButton.addEventListener('click', useUndoAssist);

    if(controlsButton) controlsButton.addEventListener('click', () => {
        if (controlsModal) {
            updateControlsDisplay();
            controlsModal.style.display = 'block';
        }
    });
    if(closeControlsModal) closeControlsModal.addEventListener('click', () => {
        if (controlsModal) controlsModal.style.display = 'none';
    });
    if(controlInputs) controlInputs.forEach(input => {
        input.addEventListener('click', (e) => {
            const clickedInput = e.target;
            controlInputs.forEach(i => i.classList.remove('listening'));
            clickedInput.classList.add('listening');
            clickedInput.value = '...';

            function keydownHandler(event) {
                event.preventDefault();
                const newKey = event.key === ' ' ? 'Space' : event.key;
                const action = clickedInput.dataset.action;
                keyBindings[action] = newKey;
                localStorage.setItem('keyBindings', JSON.stringify(keyBindings));
                updateControlsDisplay();
                clickedInput.classList.remove('listening');
                window.removeEventListener('keydown', keydownHandler, true);
            }
            window.addEventListener('keydown', keydownHandler, { capture: true, once: true });
        });
    });

    loadSettings();
});
