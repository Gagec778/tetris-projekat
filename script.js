let isAnimating = false;
let linesToClear = [];
let animationStart = 0;
const animationDuration = 400;
let lastClearWasSpecial = false;

const THEMES = {
    'classic': {
        background: '#1a1a2e',
        boardBackground: '#000',
        lineColor: '#61dafb',
        blockColors: ['#00FFFF', '#0000FF', '#FFA500', '#FFFF00', '#00FF00', '#800080', '#FF0000'],
        flashColor: '#FFFFFF',
        gridColor: '#4d4d4d',
        backgroundImage: null
    },
    'dark': {
        background: '#0d0d0d',
        boardBackground: '#1c1c1c',
        lineColor: '#999999',
        blockColors: ['#00FFFF', '#3366FF', '#FF9933', '#FFFF00', '#33CC66', '#9966CC', '#FF3333'],
        flashColor: '#CCCCCC',
        gridColor: '#666666',
        backgroundImage: null
    },
    'forest': {
        background: '#0a1d0d',
        boardBackground: '#263a29',
        lineColor: '#b4cf66',
        blockColors: ['#66FFB2', '#339966', '#FF9900', '#FFFF66', '#33CC66', '#9966CC', '#FF3333'],
        flashColor: '#E0FF8C',
        gridColor: '#6d8471',
        backgroundImage: 'url("images/forest-bg.jpg")'
    },
    'modern': {
        background: '#121212',
        boardBackground: '#1e1e1e',
        lineColor: '#bb86fc',
        blockColors: ['#03dac6', '#cf6679', '#f3a469', '#f0e68c', '#aaff00', '#8c5eff', '#e74c3c'],
        flashColor: '#ffffff',
        gridColor: '#6d6d6d',
        backgroundImage: 'url("images/modern-bg.jpg")'
    },
    'lava': {
        background: '#220000',
        boardBackground: '#440000',
        lineColor: '#FF4500',
        blockColors: ['#FFD700', '#FF4500', '#FF1493', '#FF6347', '#FF8C00', '#DC143C', '#B22222'],
        flashColor: '#FF6347',
        gridColor: '#880000',
        backgroundImage: 'url("images/lava-bg.jpg")'
    }
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
let assists = {
    bomb: 0,
    hammer: 0,
    undo: 0
};
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
let resizeObserver;
let keyBindings;

let dropSound, clearSound, rotateSound, gameOverSound, tSpinSound, tetrisSound, backgroundMusic, bombSound;
let startScreen, gameOverScreen, pauseScreen, scoreDisplay, finalScoreDisplay, finalTimeDisplay, comboDisplay, startButton, restartButton, resumeButton, themeSwitcher, modeSelector, assistsBombButton, assistsBombCountDisplay, assistsHammerButton, assistsHammerCountDisplay, assistsUndoButton, assistsUndoCountDisplay, bestScoreDisplay, homeButton, pauseButton, levelDisplay, sprintTimerDisplay, ultraTimerDisplay, startCountdown, continueButton, exitModal, confirmExitButton, cancelExitButton;
let backgroundMusicPlaying = false;
let controlsModal, controlsButton, closeControlsModal, controlInputs;
let backgroundImageElement;

let TOUCH_MOVE_THRESHOLD_X;
let TOUCH_MOVE_THRESHOLD_Y;
let TAP_THRESHOLD;

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

function setCanvasSize() {
    const root = document.documentElement;
    const infoSection = document.getElementById('info-section');
    const assistsPanel = document.getElementById('assists-panel');
    const wrapper = document.getElementById('main-game-wrapper');

    const availableWidth = wrapper.clientWidth - 20;
    const availableHeight = wrapper.clientHeight - infoSection.offsetHeight - assistsPanel.offsetHeight - 20;

    const tempBlockSize = Math.floor(Math.min(availableWidth / COLS, availableHeight / ROWS));
    
    BLOCK_SIZE = Math.max(12, tempBlockSize);

    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    
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
    continueButton = document.getElementById('continue-button');
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
    continueButton.addEventListener('click', () => {
        continueGame();
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
        togglePause();
    });
    themeSwitcher.addEventListener('change', (e) => setTheme(e.target.value));
    
    assistsBombButton.addEventListener('click', () => {
        if (gameOver || isPaused) return;
        useBombAssist();
    });
    assistsHammerButton.addEventListener('click', () => {
        if (gameOver || isPaused) return;
        toggleHammerMode();
    });
    assistsUndoButton.addEventListener('click', () => {
        if (gameOver || isPaused) return;
        useUndoAssist();
    });

    controlsButton.addEventListener('click', showControlsModal);
    closeControlsModal.addEventListener('click', () => controlsModal.style.display = 'none');
    
    document.addEventListener('keydown', handleKeydown);
    
    controlInputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            e.preventDefault();
            input.value = e.key;
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
    if (storedAssists) {
        assists = storedAssists;
    } else {
        assists = { bomb: 0, hammer: 0, undo: 0 };
        localStorage.setItem('assists', JSON.stringify(assists));
    }
    updateAssistsDisplay();
    
    const savedTheme = localStorage.getItem('theme') || 'classic';
    setTheme(savedTheme);
    themeSwitcher.value = savedTheme;

    loadKeyBindings();

    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;

    canvas.addEventListener('touchstart', e => {
        if (gameOver || isPaused || !currentPiece) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = touchStartX;
        lastTouchY = touchStartY;
    });

    canvas.addEventListener('touchmove', e => {
        if (gameOver || isPaused || !currentPiece) return;
        e.preventDefault();
        
        const currentTouchX = e.touches[0].clientX;
        const currentTouchY = e.touches[0].clientY;
        const dx = currentTouchX - lastTouchX;
        const dy = currentTouchY - lastTouchY;
        const totalDy = currentTouchY - touchStartY;
        
        if (Math.abs(dx) > TOUCH_MOVE_THRESHOLD_X) {
            if (dx > 0) {
                if (isValidMove(1, 0, currentPiece.shape)) currentPiece.x++;
            } else {
                if (isValidMove(-1, 0, currentPiece.shape)) currentPiece.x--;
            }
            lastTouchX = currentTouchX;
            draw();
        }

        if (dy > TOUCH_MOVE_THRESHOLD_Y && dy > Math.abs(dx)) {
            if (isValidMove(0, 1, currentPiece.shape)) {
                currentPiece.y++;
                lastDropTime = performance.now();
                draw();
                lastTouchY = currentTouchY;
            } else {
                mergePiece();
                lastTouchY = currentTouchY;
            }
        }
    });

    canvas.addEventListener('touchend', e => {
        if (gameOver || isPaused || !currentPiece) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) {
            rotatePiece();
        } 
        else if (dy > BLOCK_SIZE * 3 && dy > Math.abs(dx)) { 
            dropPiece();
        }
        
        draw();
    });

    setCanvasSize();
}

function loadKeyBindings() {
    const savedBindings = JSON.parse(localStorage.getItem('keyBindings'));
    keyBindings = savedBindings || {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        down: 'ArrowDown',
        rotate: 'ArrowUp',
        drop: ' ',
        bomb: 'b',
        hammer: 'h',
        undo: 'u'
    };

    controlInputs.forEach(input => {
        const action = input.dataset.action;
        if (keyBindings[action]) {
            input.value = keyBindings[action];
        }
    });
}

function saveKeyBindings() {
    controlInputs.forEach(input => {
        const action = input.dataset.action;
        keyBindings[action] = input.value;
    });
    localStorage.setItem('keyBindings', JSON.stringify(keyBindings));
}

function showControlsModal() {
    controlsModal.style.display = 'block';
}

function initBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            board[r][c] = 0;
        }
    }
}

function createCurrentPiece() {
    if (currentPieceIndex === undefined) return;
    const shape = TETROMINOES[currentPieceIndex];
    const color = COLORS[currentPieceIndex];
    const pieceWidth = shape[0].length;
    const startX = Math.floor((COLS - pieceWidth) / 2);
    
    currentPiece = {
        shape: shape,
        color: color,
        x: startX,
        y: 0
    };
}

function generateNewPiece() {
    if (nextPieceIndex !== undefined) {
        currentPieceIndex = nextPieceIndex;
    } else {
        currentPieceIndex = Math.floor(Math.random() * TETROMINOES.length);
    }
    
    createCurrentPiece();

    nextPieceIndex = Math.floor(Math.random() * TETROMINOES.length);
    nextPiece = {
        shape: TETROMINOES[nextPieceIndex],
        color: COLORS[nextPieceIndex],
        x: 0,
        y: 0
    };

    drawNextPiece();
    if (!isValidMove(0, 0, currentPiece.shape)) {
        endGame();
    }
}

function setTheme(themeName) {
    currentTheme = themeName;
    const theme = THEMES[themeName];
    if (theme) {
        COLORS = theme.blockColors;
        document.documentElement.style.setProperty('--background-color', theme.background);
        document.documentElement.style.setProperty('--board-bg-color', theme.boardBackground);
        document.documentElement.style.setProperty('--border-color', theme.lineColor);
        document.documentElement.style.setProperty('--main-color', theme.lineColor);
        document.documentElement.style.setProperty('--flash-color', theme.flashColor);
        backgroundImageElement.style.backgroundImage = theme.backgroundImage || 'none';
        localStorage.setItem('theme', themeName);
    }
}

function drawBlock(x, y, color, context = ctx, blockSize = BLOCK_SIZE) {
    if (!context) return;
    
    const lightColor = lightenColor(color, 30);
    const darkColor = darkenColor(color, 40);

    const gradient = context.createLinearGradient(x * blockSize, y * blockSize, x * blockSize + blockSize, y * blockSize + blockSize);
    gradient.addColorStop(0, lightColor);
    gradient.addColorStop(1, darkColor);

    context.fillStyle = gradient;
    context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);

    context.strokeStyle = darkenColor(color, 50);
    context.lineWidth = 1;
    context.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
}

function lightenColor(color, amount) {
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);

    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darkenColor(color, amount) {
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);

    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function drawGhostPiece() {
    if (!currentPiece) return;
    let ghostY = currentPiece.y;
    while (isValidMove(0, 1, currentPiece.shape, ghostY)) {
        ghostY++;
    }

    ctx.globalAlpha = 0.3;
    
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                const color = currentPiece.color;
                ctx.fillStyle = color;
                ctx.fillRect((currentPiece.x + c) * BLOCK_SIZE, (ghostY + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
    ctx.globalAlpha = 1.0;
}

function drawPieceInCanvas(piece, context, canvasEl) {
    if (!piece) {
        context.clearRect(0, 0, canvasEl.width, canvasEl.height);
        return;
    }
    
    const shape = piece.shape;
    const color = piece.color;
    
    context.clearRect(0, 0, canvasEl.width, canvasEl.height);
    
    let shapeWidth = shape[0].length;
    let shapeHeight = shape.length;
    
    const maxDim = Math.max(shapeWidth, shapeHeight);
    const pieceBlockSize = Math.floor(Math.min(canvasEl.width, canvasEl.height) / (maxDim + 1));
    
    const offsetX = (canvasEl.width - shapeWidth * pieceBlockSize) / 2;
    const offsetY = (canvasEl.height - shapeHeight * pieceBlockSize) / 2;

    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                context.save();
                context.translate(offsetX, offsetY);
                drawBlock(c, r, color, context, pieceBlockSize);
                context.restore();
            }
        }
    }
}

function drawNextPiece() {
    drawPieceInCanvas(nextPiece, nextBlockCtx, nextBlockCanvas);
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = THEMES[currentTheme].boardBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawBlock(c, r, board[r][c]);
            }
        }
    }

    ctx.strokeStyle = THEMES[currentTheme].gridColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, i * BLOCK_SIZE);
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
    if (hammerLine !== -1) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fillRect(0, hammerLine * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE);
    }
}

function drawCurrentPiece() {
    if (!currentPiece) return;
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                drawBlock(currentPiece.x + c, currentPiece.y + r, currentPiece.color);
            }
        }
    }
}

function isValidMove(offsetX, offsetY, newShape, currentY = currentPiece.y) {
    if (!currentPiece) return false;
    for (let r = 0; r < newShape.length; r++) {
        for (let c = 0; c < newShape[r].length; c++) {
            if (newShape[r][c]) {
                const newX = currentPiece.x + c + offsetX;
                const newY = currentY + r + offsetY;
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return false;
                }
                if (newY >= 0 && board[newY] && board[newY][newX]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function rotatePiece() {
    if (!currentPiece) return;
    const originalShape = currentPiece.shape;
    const N = originalShape.length;
    const newShape = Array(N).fill(0).map(() => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            newShape[c][N - 1 - r] = originalShape[r][c];
        }
    }
    if (isValidMove(0, 0, newShape)) {
        currentPiece.shape = newShape;
        rotateSound.currentTime = 0;
        rotateSound.play().catch(e => console.error("Greška pri puštanju zvuka za rotaciju:", e));
    } else {
        const kicks = [[0,0], [-1,0], [1,0], [0,1], [-1,1], [1,1]];
        for (const kick of kicks) {
            if (isValidMove(kick[0], kick[1], newShape)) {
                currentPiece.shape = newShape;
                currentPiece.x += kick[0];
                currentPiece.y += kick[1];
                rotateSound.currentTime = 0;
                rotateSound.play().catch(e => console.error("Greška pri puštanju zvuka za rotaciju:", e));
                return;
            }
        }
    }
}

function dropPiece() {
    if (!currentPiece) return;
    const originalY = currentPiece.y;
    while (isValidMove(0, 1, currentPiece.shape)) {
        currentPiece.y++;
    }
    const rowsDropped = currentPiece.y - originalY;
    if (currentMode === 'classic' || currentMode === 'marathon') {
        score += rowsDropped * 2;
    }
    scoreDisplay.textContent = `Score: ${score}`;
    screenShake();
    mergePiece();
    dropSound.currentTime = 0;
    dropSound.play().catch(e => console.error("Greška pri puštanju dropSounda:", e));
}

function mergePiece() {
    if (!currentPiece) return;
    boardHistory.push(JSON.parse(JSON.stringify(board)));
    if(boardHistory.length > 5) boardHistory.shift();
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                if (currentPiece.y + r < 0) {
                    endGame();
                    return;
                }
                if (board[currentPiece.y + r]) {
                    board[currentPiece.y + r][currentPiece.x + c] = currentPiece.color;
                }
            }
        }
    }
    checkLines();
}

function isTSpin() {
    if (currentPieceIndex !== T_SHAPE_INDEX) return false;
    let filledCorners = 0;
    const corners = [
        { x: currentPiece.x, y: currentPiece.y },
        { x: currentPiece.x + 2, y: currentPiece.y },
        { x: currentPiece.x, y: currentPiece.y + 2 },
        { x: currentPiece.x + 2, y: currentPiece.y + 2 }
    ];
    for (const corner of corners) {
        if (corner.x < 0 || corner.x >= COLS || corner.y < 0 || corner.y >= ROWS || (board[corner.y] && board[corner.y][corner.x])) {
            filledCorners++;
        }
    }
    return filledCorners >= 3;
}

function isBoardEmpty() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== 0) {
                return false;
            }
        }
    }
    return true;
}

function checkLines() {
    linesToClear = [];
    for (let r = ROWS - 1; r >= 0; r--) {
        let isFull = true;
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c]) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            linesToClear.push(r);
        }
    }
    if (linesToClear.length > 0) {
        isAnimating = true;
        animationStart = performance.now();
        let isCurrentSpecial = isTSpin() || linesToClear.length === 4;
        updateScore(linesToClear.length, isCurrentSpecial);
        if (linesToClear.length === 4) {
            tetrisSound.currentTime = 0;
            if (tetrisSound.readyState >= 2) tetrisSound.play().catch(e => console.error("Greška pri puštanju Tetris zvuka:", e));
        } else if (isTSpin()) {
            tSpinSound.currentTime = 0;
            if (tSpinSound.readyState >= 2) tSpinSound.play().catch(e => console.error("Greška pri puštanju T-Spin zvuka:", e));
        } else {
            clearSound.currentTime = 0;
            if (clearSound.readyState >= 2) clearSound.play().catch(e => console.error("Greška pri puštanju clear zvuka:", e));
        }
        
    } else {
        lastClearWasSpecial = false;
        generateNewPiece();
    }
    draw();
}
