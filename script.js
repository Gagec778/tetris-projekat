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
        backgroundImage: null
    },
    'dark': {
        background: '#0d0d0d',
        boardBackground: '#1c1c1c',
        lineColor: '#999999',
        blockColors: ['#00FFFF', '#3366FF', '#FF9933', '#FFFF00', '#33CC66', '#9966CC', '#FF3333'],
        flashColor: '#CCCCCC',
        backgroundImage: null
    },
    'forest': {
        background: '#0a1d0d',
        boardBackground: '#263a29',
        lineColor: '#b4cf66',
        blockColors: ['#66FFB2', '#339966', '#FF9900', '#FFFF66', '#33CC66', '#9966CC', '#FF3333'],
        flashColor: '#E0FF8C',
        backgroundImage: 'url("images/forest-bg.jpg")'
    },
    'modern': {
        background: '#121212',
        boardBackground: '#1e1e1e',
        lineColor: '#bb86fc',
        blockColors: ['#03dac6', '#cf6679', '#f3a469', '#f0e68c', '#aaff00', '#8c5eff', '#e74c3c'],
        flashColor: '#ffffff',
        backgroundImage: 'url("images/modern-bg.jpg")'
    },
    'lava': {
        background: '#220000',
        boardBackground: '#440000',
        lineColor: '#FF4500',
        blockColors: ['#FFD700', '#FF4500', '#FF1493', '#FF6347', '#FF8C00', '#DC143C', '#B22222'],
        flashColor: '#FF6347',
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
let currentPiece, nextPiece;
let score = 0;
let gameOver = true;
let isPaused = false;
let combo = 0;
let assists = 0;
let bestScore = 0;
let nextAssistReward = 5000;
let bombBonus = 1500;

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
let startScreen, gameOverScreen, pauseScreen, scoreDisplay, finalScoreDisplay, finalTimeDisplay, comboDisplay, startButton, restartButton, resumeButton, themeSwitcher, modeSelector, assistsButton, assistsCountDisplay, bestScoreDisplay, pauseButton, levelDisplay, sprintTimerDisplay, ultraTimerDisplay, startCountdown, restartButtonInline, continueButton;
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
    const gameControls = document.getElementById('game-controls');
    const wrapper = document.getElementById('main-game-wrapper');

    const availableWidth = wrapper.clientWidth - 20;
    const availableHeight = wrapper.clientHeight - infoSection.offsetHeight - gameControls.offsetHeight - 20;

    let tempBlockSize = Math.floor(Math.min(availableWidth / COLS, availableHeight / ROWS));
    
    BLOCK_SIZE = Math.max(12, Math.min(tempBlockSize, 40));

    root.style.setProperty('--block-size', `${BLOCK_SIZE}px`);

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
    scoreDisplay = document.getElementById('score-display');
    finalScoreDisplay = document.getElementById('final-score');
    finalTimeDisplay = document.getElementById('final-time');
    comboDisplay = document.getElementById('combo-display');
    startButton = document.getElementById('start-button');
    restartButton = document.getElementById('restart-button');
    continueButton = document.getElementById('continue-button');
    resumeButton = document.getElementById('resume-button');
    pauseButton = document.getElementById('pause-button');
    restartButtonInline = document.getElementById('restart-button-inline');
    assistsButton = document.getElementById('assist-button');
    assistsCountDisplay = document.getElementById('assists-count');
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
    restartButtonInline.addEventListener('click', () => {
        gameOver = true;
        startGame();
    });
    themeSwitcher.addEventListener('change', (e) => setTheme(e.target.value));
    assistsButton.addEventListener('click', () => {
        if (gameOver || isPaused) return;
        useAssist();
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

    window.addEventListener('resize', setCanvasSize);
    
    const storedBestScore = localStorage.getItem('bestScore');
    if (storedBestScore) {
        bestScore = parseInt(storedBestScore, 10);
        bestScoreDisplay.textContent = `BEST: ${bestScore}`;
    }

    const storedAssists = localStorage.getItem('assists');
    if (storedAssists) {
        assists = parseInt(storedAssists, 10);
    } else {
        assists = 0;
        localStorage.setItem('assists', 0);
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
        hold: 'c',
        assist: 'b'
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
        y: -2
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
            if (clearSound.readyState >= 2) clearSound.play().catch(e => console.error("Greška pri puštanju clearSounda:", e));
        }
        
        return;
    } else {
        lastClearWasSpecial = false;
        combo = 0;
        generateNewPiece();
    }
}

function updateScore(lines, isCurrentSpecial) {
    let points = 0;
    let type = '';
    const backToBackMultiplier = lastClearWasSpecial && isCurrentSpecial ? 1.5 : 1;

    if (isTSpin()) {
        if (lines === 1) { points = 800; type = 'T-Spin Single'; }
        else if (lines === 2) { points = 1200; type = 'T-Spin Double'; }
        else if (lines === 3) { points = 1600; type = 'T-Spin Triple'; }
        else { points = 400; type = 'T-Spin'; }
    } else {
        if (lines === 1) { points = 100; type = 'Single'; }
        else if (lines === 2) { points = 300; type = 'Double'; }
        else if (lines === 3) { points = 500; type = 'Triple'; }
        else if (lines === 4) { points = 800; type = 'Tetris'; }
    }
    
    score += Math.floor(points * backToBackMultiplier);
    scoreDisplay.textContent = `Score: ${score}`;
    
    if (lines > 0) {
        combo++;
        if (isCurrentSpecial && backToBackMultiplier > 1) {
            type = 'B2B ' + type;
        }
        showComboMessage(type, combo);
        lastClearWasSpecial = isCurrentSpecial;
    } else {
        combo = 0;
        lastClearWasSpecial = false;
    }

    if (currentMode === 'sprint') {
        linesClearedTotal += lines;
        if (linesClearedTotal >= 40) {
            endGame(true);
        }
    } else if (currentMode === 'classic' || currentMode === 'marathon') {
        linesClearedThisLevel += lines;
        if (linesClearedThisLevel >= 10) {
            level++;
            linesClearedThisLevel -= 10;
            levelDisplay.textContent = `Level: ${level}`;
            if (currentMode === 'classic' || currentMode === 'marathon') {
                dropInterval = Math.max(100, 1000 - level * 50);
            }
        }
    }

    if (score >= nextAssistReward) {
        assists++;
        nextAssistReward += 5000;
        localStorage.setItem('assists', assists);
        updateAssistsDisplay();
    }
}

function showComboMessage(type, comboCount) {
    let message = '';
    if (type) message = type;
    if (comboCount > 1) message += `\n${comboCount}x Combo!`;

    if (message) {
        comboDisplay.textContent = message;
        comboDisplay.style.display = 'block';
        setTimeout(() => {
            comboDisplay.style.display = 'none';
        }, 1500);
    }
}

function showPerfectClearMessage() {
    let message = 'Perfect Clear!';
    score += 5000;
    scoreDisplay.textContent = `Score: ${score}`;
    comboDisplay.textContent = message;
    comboDisplay.style.display = 'block';
    setTimeout(() => {
        comboDisplay.style.display = 'none';
        generateNewPiece();
    }, 2000);
}

function gameLoop(timestamp) {
    if (gameOver || isPaused) {
        return;
    }

    if (isAnimating) {
        animateLineClear(timestamp);
        return;
    }
    
    if (currentMode === 'sprint') {
        const elapsed = (performance.now() - startTime) / 1000;
        sprintTimerDisplay.textContent = `TIME: ${elapsed.toFixed(2)}s`;
    } else if (currentMode === 'ultra') {
        const elapsed = (performance.now() - startTime) / 1000;
        const remainingTime = ultraTimeLimit - elapsed;
        if (remainingTime <= 0) {
            endGame();
            return;
        }
        ultraTimerDisplay.textContent = `TIME: ${remainingTime.toFixed(2)}s`;
    }

    if (timestamp - lastDropTime > dropInterval) {
        if (currentPiece) {
            if (isValidMove(0, 1, currentPiece.shape)) {
                currentPiece.y++;
            } else {
                mergePiece();
            }
        }
        lastDropTime = timestamp;
    }
    
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function animateLineClear(timestamp) {
    const elapsed = timestamp - animationStart;
    const progress = elapsed / animationDuration;
    
    if (progress >= 1) {
        isAnimating = false;
        
        linesToClear.sort((a, b) => b - a);
        const linesClearedCount = linesToClear.length;

        for (const r of linesToClear) {
            board.splice(r, 1);
        }

        for (let i = 0; i < linesClearedCount; i++) {
            board.unshift(Array(COLS).fill(0));
        }

        linesToClear = [];
        
        if (isBoardEmpty()) {
            showPerfectClearMessage();
        } else {
            generateNewPiece();
        }
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    drawBoard();
    
    for (const r of linesToClear) {
        const lineProgress = Math.sin(progress * Math.PI);
        
        for (let c = 0; c < COLS; c++) {
            const block = board[r][c];
            if (block) {
                const color = block;
                const shrinkSize = BLOCK_SIZE * (1 - lineProgress);
                const offset = (BLOCK_SIZE - shrinkSize) / 2;
                
                ctx.fillStyle = color;
                ctx.fillRect(c * BLOCK_SIZE + offset, r * BLOCK_SIZE + offset, shrinkSize, shrinkSize);
            }
        }
    }
    
    drawCurrentPiece();
    
    requestAnimationFrame(animateLineClear);
}

function screenShake() {
    const wrapper = document.getElementById('main-game-wrapper');
    wrapper.classList.add('screen-shake');
    setTimeout(() => {
        wrapper.classList.remove('screen-shake');
    }, 200);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawGhostPiece();
    drawCurrentPiece();
}

function endGame(isSprintWin = false) {
    gameOver = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    pauseBackgroundMusic();
    
    if (isSprintWin) {
        finalTimeDisplay.textContent = `TIME: ${sprintTimerDisplay.textContent.split(': ')[1]}`;
        finalTimeDisplay.style.display = 'block';
        document.getElementById('game-over-title').textContent = 'PERFECT!';
    } else {
        gameOverSound.currentTime = 0;
        if (gameOverSound.readyState >= 2) {
            gameOverSound.play().catch(e => console.error("Greška pri puštanju gameOverSounda:", e));
        }
        finalTimeDisplay.style.display = 'none';
        document.getElementById('game-over-title').textContent = 'GAME OVER!';
    }

    finalScoreDisplay.textContent = `Your Score: ${score}`;
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        bestScoreDisplay.textContent = `BEST: ${bestScore}`;
    }
    
    gameOverScreen.style.display = 'flex';
    pauseButton.style.display = 'none';
    restartButtonInline.style.display = 'none';
    assistsButton.style.display = 'none';
    
    restartButton.style.display = 'block';
    
    if (assists > 0 && !isSprintWin) {
        continueButton.style.display = 'block';
    } else {
        continueButton.style.display = 'none';
    }
}

function continueGame() {
    assists--;
    localStorage.setItem('assists', assists);
    updateAssistsDisplay();
    
    gameOverScreen.style.display = 'none';
    
    gameOver = false;
    isPaused = false;
    
    pauseButton.style.display = 'block';
    restartButtonInline.style.display = 'block';
    assistsButton.style.display = 'flex';

    playBackgroundMusic();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
        source.onended = () => {
            source.disconnect(audioContext.destination);
        };
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    } catch (e) {
        console.error("Greška pri pokušaju inicijalizacije zvuka (verovatno autoplay blokiran):", e);
    }
    
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    
    startCountdown.style.display = 'flex';
    let countdown = 3;
    startCountdown.textContent = countdown;

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            startCountdown.textContent = countdown;
        } else {
            clearInterval(countdownInterval);
            startCountdown.style.display = 'none';
            initGame();
        }
    }, 1000);
}

function initGame() {
    initBoard();
    setCanvasSize();
    
    score = 0;
    combo = 0;
    level = 1;
    linesClearedThisLevel = 0;
    linesClearedTotal = 0;
    nextAssistReward = 5000;
    
    scoreDisplay.textContent = `Score: ${score}`;
    levelDisplay.textContent = `Level: ${level}`;
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    
    updateAssistsDisplay();
    
    gameOver = false;
    isPaused = false;
    isAnimating = false;
    
    pauseButton.textContent = "PAUSE";
    pauseButton.style.display = 'block';
    restartButtonInline.style.display = 'block';
    assistsButton.style.display = 'flex';

    levelDisplay.style.display = 'none';
    sprintTimerDisplay.style.display = 'none';
    ultraTimerDisplay.style.display = 'none';
    
    switch(currentMode) {
        case 'classic':
            dropInterval = 1000;
            levelDisplay.style.display = 'block';
            break;
        case 'sprint':
            dropInterval = 100;
            sprintTimerDisplay.style.display = 'block';
            startTime = performance.now();
            break;
        case 'zen':
            dropInterval = 1500;
            levelDisplay.textContent = `Level: ∞`;
            levelDisplay.style.display = 'block';
            break;
        case 'marathon':
            dropInterval = 1000;
            levelDisplay.style.display = 'block';
            break;
        case 'ultra':
            dropInterval = 100;
            ultraTimerDisplay.style.display = 'block';
            startTime = performance.now();
            break;
    }

    playBackgroundMusic();
    generateNewPiece();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
    
    draw();
}

function togglePause() {
    if (gameOver || isAnimating) return;
    isPaused = !isPaused;
    if (isPaused) {
        cancelAnimationFrame(animationFrameId);
        pauseScreen.style.display = 'flex';
        pauseButton.textContent = "RESUME";
        pauseBackgroundMusic();
    } else {
        pauseScreen.style.display = 'none';
        animationFrameId = requestAnimationFrame(gameLoop);
        pauseButton.textContent = "PAUSE";
        playBackgroundMusic();
    }
}
function handleKeydown(e) {
    if (gameOver || isPaused) return;

    switch (e.key.toLowerCase()) {
        case keyBindings.left.toLowerCase():
            if (isValidMove(-1, 0, currentPiece.shape)) {
                currentPiece.x--;
                draw();
            }
            break;
        case keyBindings.right.toLowerCase():
            if (isValidMove(1, 0, currentPiece.shape)) {
                currentPiece.x++;
                draw();
            }
            break;
        case keyBindings.down.toLowerCase():
            if (isValidMove(0, 1, currentPiece.shape)) {
                currentPiece.y++;
                lastDropTime = performance.now();
                draw();
            } else {
                mergePiece();
            }
            break;
        case keyBindings.rotate.toLowerCase():
            rotatePiece();
            draw();
            break;
        case keyBindings.drop.toLowerCase():
            dropPiece();
            draw();
            break;
        case keyBindings.assist.toLowerCase():
            useAssist();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
}

function updateAssistsDisplay() {
    assistsCountDisplay.textContent = assists;
    if (assists > 0) {
        assistsButton.classList.remove('disabled');
    } else {
        assistsButton.classList.add('disabled');
    }
}

function useAssist() {
    if (assists > 0 && !isAnimating) {
        assists--;
        localStorage.setItem('assists', assists);
        updateAssistsDisplay();
        
        bombSound.currentTime = 0;
        bombSound.play().catch(e => console.error("Greška pri puštanju zvuka bombe:", e));

        const fragments = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] !== 0) {
                    fragments.push({ x: c * BLOCK_SIZE, y: r * BLOCK_SIZE, color: board[r][c] });
                }
            }
        }
        
        let explosionDelay = 0;
        const explosionDuration = 1500;
        
        fragments.forEach((frag) => {
            const fragmentEl = document.createElement('div');
            fragmentEl.classList.add('bomb-animation');
            fragmentEl.style.width = `${BLOCK_SIZE}px`;
            fragmentEl.style.height = `${BLOCK_SIZE}px`;
            fragmentEl.style.left = `${frag.x}px`;
            fragmentEl.style.top = `${frag.y}px`;
            fragmentEl.style.backgroundColor = frag.color;

            const dx = (Math.random() - 0.5) * 400; 
            const dy = (Math.random() - 0.5) * 400; 
            fragmentEl.style.setProperty('--dx', `${dx}px`);
            fragmentEl.style.setProperty('--dy', `${dy}px`);

            canvas.parentElement.appendChild(fragmentEl);
            
            setTimeout(() => {
                fragmentEl.remove();
            }, explosionDuration);
        });

        isAnimating = true;

        setTimeout(() => {
            initBoard();
            score += bombBonus;
            scoreDisplay.textContent = `Score: ${score}`;
            generateNewPiece();
            isAnimating = false;
        }, explosionDuration);
    }
}

window.addEventListener('load', initDOMAndEventListeners);
