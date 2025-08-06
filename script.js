// Globalne varijable za stanje igre
let isAnimating = false;
let linesToClear = [];
let animationStart = 0;
const animationDuration = 400;
let lastClearWasSpecial = false;
let gameMode = 'classic';
let gameStartTime;

// Napredni sistem bodovanja
const POINTS = {
    softDrop: 1,
    hardDrop: 2,
    single: 100,
    double: 300,
    triple: 500,
    tetris: 800,
    tSpinMini: 100,
    tSpinSingle: 800,
    tSpinDouble: 1200,
    tSpinTriple: 1600,
    perfectClear: 5000,
    b2bBonus: 1.5,
    comboMultiplier: 50
};

// Konstantne za modove igre
const MODES = {
    classic: { name: 'Classic', description: 'Cilj je preživeti i osvojiti što više poena.' },
    sprint: { name: 'Sprint 40', description: 'Očisti 40 linija što brže možeš!' },
    zen: { name: 'Zen', description: 'Opuštena igra bez kraja.' }
};

const THEMES = {
    'classic': {
        background: '#1a1a2e',
        boardBackground: '#000',
        lineColor: '#61dafb',
        blockColors: ['#00FFFF', '#0000FF', '#FFA500', '#FFFF00', '#00FF00', '#800080', '#FF0000'],
        flashColor: '#FFFFFF'
    },
    'dark': {
        background: '#0d0d0d',
        boardBackground: '#1c1c1c',
        lineColor: '#999999',
        blockColors: ['#00FFFF', '#3366FF', '#FF9933', '#FFFF00', '#33CC66', '#9966CC', '#FF3333'],
        flashColor: '#CCCCCC'
    },
    'forest': {
        background: '#0a1d0d',
        boardBackground: '#263a29',
        lineColor: '#b4cf66',
        blockColors: ['#66FFB2', '#339966', '#FF9900', '#FFFF66', '#33CC66', '#9966CC', '#FF3333'],
        flashColor: '#E0FF8C'
    },
    'modern': {
        background: '#1a1a2e',
        boardBackground: '#0d0d1a',
        lineColor: '#FF6F61',
        blockColors: [
            'linear-gradient(45deg, #27c8ff, #007bff)', // I
            'linear-gradient(45deg, #2e4dff, #00129b)', // J
            'linear-gradient(45deg, #ff9b33, #e57e00)', // L
            'linear-gradient(45deg, #ffff4d, #e5e500)', // O
            'linear-gradient(45deg, #51e651, #00a000)', // S
            'linear-gradient(45deg, #b048d0, #6c1b82)', // T
            'linear-gradient(45deg, #e64b4b, #9f0000)'  // Z
        ],
        flashColor: '#FFD700'
    }
};

const T_SHAPE_INDEX = 5;

let canvas, ctx, nextBlockCanvas, nextBlockCtx, holdBlockCanvas, holdBlockCtx;
let COLS, ROWS, BLOCK_SIZE;

// Napredniji sistem za nasumično biranje komada (7-bag randomizer)
const BAG_OF_PIECES = [0, 1, 2, 3, 4, 5, 6];
let pieceBag = [...BAG_OF_PIECES];

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
let currentPiece, nextPieceQueue, holdPiece;
let hasHeld = false;
let score = 0;
let gameOver = true;
let isPaused = false;
let combo = 0;
let assists = 0;
let bestScore = 0;
let nextAssistReward = 5000;
let linesCleared = 0;
let linesToClearGoal = 40; // za Sprint mod

let dropInterval = 1000;
let level = 1;
let linesClearedThisLevel = 0;

let lastDropTime = 0;
let animationFrameId;
let currentPieceIndex, holdPieceIndex;
let COLORS;
let currentTheme;

let dropSound, clearSound, rotateSound, gameOverSound, holdSound, tSpinSound, tetrisSound, backgroundMusic;
let startScreen, gameOverScreen, pauseScreen, scoreDisplay, finalScoreDisplay, comboDisplay, startButton, restartButton, resumeButton, themeSwitcher, assistsContainer, assistsCountDisplay, bestScoreDisplay, pauseButton, levelDisplay, modeSelector, sprintTimerDisplay, finalTimeDisplay, startCountdownDisplay, holdBlockLabel;

// Super Rotation System (SRS) kick tables
const WALL_KICKS = {
    'I': {
        0: [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
        1: [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
        2: [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
        3: [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]]
    },
    'JLOSZT': {
        0: [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        1: [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        2: [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
        3: [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]
    }
};

let currentRotationState = 0;
let currentPieceType = 'I'; // da bi znali koji SRS kick table da koristimo

function shuffleBag() {
    for (let i = pieceBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
    }
}

function getNextPieceIndex() {
    if (pieceBag.length === 0) {
        pieceBag = [...BAG_OF_PIECES];
        shuffleBag();
    }
    return pieceBag.pop();
}

function setCanvasSize() {
    const mainGameWrapper = document.getElementById('main-game-wrapper');
    const wrapperWidth = mainGameWrapper.clientWidth - 20;
    const availableHeight = window.innerHeight - 20;

    let tempBlockSizeWidth = Math.floor(wrapperWidth / COLS);
    let tempBlockSizeHeight = Math.floor(availableHeight / (ROWS + 2)); // dodao +2 da obezbedi prostor za info

    BLOCK_SIZE = Math.min(tempBlockSizeWidth, tempBlockSizeHeight);
    
    // Ograničimo veličinu bloka da ne bude prevelik na velikim ekranima
    if (BLOCK_SIZE > 35) {
        BLOCK_SIZE = 35;
    }
    
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    
    const nextBlockContainerSize = nextBlockCanvas.parentElement.clientWidth;
    nextBlockCanvas.width = nextBlockContainerSize;
    nextBlockCanvas.height = nextBlockContainerSize * 3; // Povećao visinu za 3 next komada
    
    holdBlockCanvas.width = nextBlockContainerSize;
    holdBlockCanvas.height = nextBlockContainerSize;

    if (!gameOver && !isPaused) {
        draw();
        drawNextPieceQueue();
        drawHoldPiece();
    }
}

function initDOMAndEventListeners() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextBlockCanvas = document.getElementById('nextBlockCanvas');
    nextBlockCtx = nextBlockCanvas.getContext('2d');
    holdBlockCanvas = document.getElementById('holdBlockCanvas');
    holdBlockCtx = holdBlockCanvas.getContext('2d');

    COLS = 10;
    ROWS = 20; // Povećao broj redova za bolji osećaj igre

    // Učitavanje zvukova
    dropSound = document.getElementById('dropSound');
    clearSound = document.getElementById('clearSound');
    rotateSound = document.getElementById('rotateSound');
    gameOverSound = document.getElementById('gameOverSound');
    holdSound = new Audio('sounds/hold.wav');
    tSpinSound = new Audio('sounds/tspin.wav');
    tetrisSound = new Audio('sounds/tetris.wav');
    backgroundMusic = new Audio('sounds/music.mp3');
    backgroundMusic.loop = true;

    // DOM elementi
    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over-screen');
    pauseScreen = document.getElementById('pause-screen');
    scoreDisplay = document.getElementById('score-display');
    finalScoreDisplay = document.getElementById('final-score');
    comboDisplay = document.getElementById('combo-display');
    startButton = document.getElementById('start-button');
    restartButton = document.getElementById('restart-button');
    resumeButton = document.getElementById('resume-button');
    pauseButton = document.getElementById('pause-button');
    assistsContainer = document.getElementById('assists-container');
    assistsCountDisplay = document.getElementById('assists-count');
    bestScoreDisplay = document.getElementById('best-score-display');
    levelDisplay = document.getElementById('level-display');
    themeSwitcher = document.getElementById('theme-switcher');
    modeSelector = document.getElementById('mode-selector');
    sprintTimerDisplay = document.getElementById('sprint-timer');
    finalTimeDisplay = document.getElementById('final-time');
    startCountdownDisplay = document.getElementById('start-countdown');
    holdBlockLabel = document.getElementById('hold-block-label');

    // Dodajem Modern temu
    const modernOption = document.createElement('option');
    modernOption.value = 'modern';
    modernOption.textContent = 'Modern';
    themeSwitcher.appendChild(modernOption);

    // Event listeneri
    startButton.addEventListener('click', () => startCountdown(3));
    restartButton.addEventListener('click', () => startCountdown(3));
    pauseButton.addEventListener('click', togglePause);
    resumeButton.addEventListener('click', togglePause);
    themeSwitcher.addEventListener('change', (e) => setTheme(e.target.value));
    modeSelector.addEventListener('change', (e) => {
        gameMode = e.target.value;
        setGameMode(gameMode);
    });

    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', setCanvasSize);
    
    assistsContainer.addEventListener('click', () => {
        if (gameOver || isPaused) return;
        useAssist();
    });

    setCanvasSize();
    
    // Učitavanje iz localStorage
    const storedBestScore = localStorage.getItem('bestScore');
    if (storedBestScore) {
        bestScore = parseInt(storedBestScore, 10);
        bestScoreDisplay.textContent = `BEST: ${bestScore}`;
    }
    const storedAssists = localStorage.getItem('assists');
    assists = storedAssists ? parseInt(storedAssists, 10) : 0;
    updateAssistsDisplay();
    
    const savedTheme = localStorage.getItem('theme') || 'classic';
    setTheme(savedTheme);
    themeSwitcher.value = savedTheme;

    // Kontrole na dodir
    let touchStartX, touchStartY, lastTouchX;
    let touchMoveThreshold = 0;
    let tapTimeout = null;

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        if (gameOver || isPaused || !currentPiece) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = e.touches[0].clientX;
        touchMoveThreshold = BLOCK_SIZE * 0.4;
        tapTimeout = setTimeout(() => {
            // Dugi pritisak
            dropPiece();
            tapTimeout = null;
        }, 500);
    });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (gameOver || isPaused || !currentPiece) return;
        const dx = e.touches[0].clientX - lastTouchX;
        
        if (Math.abs(dx) > touchMoveThreshold) {
            if (dx > 0) {
                if (isValidMove(1, 0, currentPiece.shape)) currentPiece.x++;
            } else {
                if (isValidMove(-1, 0, currentPiece.shape)) currentPiece.x--;
            }
            lastTouchX = e.touches[0].clientX;
            draw();
        }
    });

    canvas.addEventListener('touchend', e => {
        if (gameOver || isPaused || !currentPiece) return;
        if (tapTimeout) clearTimeout(tapTimeout);

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
            // TAP za rotaciju
            rotatePiece();
        } else if (dy > 30 && dy > Math.abs(dx)) {
            // SWIPE DOLE za hard drop (spuštanje)
            dropPiece();
        } else if (dy < -30 && Math.abs(dx) < 30) {
            // SWIPE GORE za soft drop (jedan red)
            if (isValidMove(0, 1, currentPiece.shape)) {
                currentPiece.y++;
                score += POINTS.softDrop;
            }
        }
        draw();
    });
}

function startCountdown(count) {
    if (count > 0) {
        startCountdownDisplay.textContent = count;
        startCountdownDisplay.style.display = 'block';
        setTimeout(() => startCountdown(count - 1), 1000);
    } else {
        startCountdownDisplay.textContent = 'GO!';
        setTimeout(() => {
            startCountdownDisplay.style.display = 'none';
            startGame();
        }, 500);
    }
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

function createCurrentPiece(pieceIndex) {
    const shape = TETROMINOES[pieceIndex];
    const color = COLORS[pieceIndex];
    const pieceWidth = shape[0].length;
    const startX = Math.floor((COLS - pieceWidth) / 2);
    
    currentPiece = {
        shape: shape,
        color: color,
        x: startX,
        y: 0,
        index: pieceIndex
    };
    currentPieceType = pieceIndex === 0 ? 'I' : pieceIndex === 3 ? 'O' : 'JLOSZT';
    currentRotationState = 0;
}

function generateNewPiece() {
    if (!nextPieceQueue || nextPieceQueue.length === 0) {
        nextPieceQueue = [];
        pieceBag = [...BAG_OF_PIECES];
        shuffleBag();
        for (let i = 0; i < 3; i++) {
            nextPieceQueue.push(getNextPieceIndex());
        }
    }
    
    currentPieceIndex = nextPieceQueue.shift();
    if (pieceBag.length === 0) {
        pieceBag = [...BAG_OF_PIECES];
        shuffleBag();
    }
    nextPieceQueue.push(getNextPieceIndex());
    
    createCurrentPiece(currentPieceIndex);
    drawNextPieceQueue();

    if (!isValidMove(0, 0, currentPiece.shape)) {
        endGame();
    }
    hasHeld = false;
}

function drawBlock(x, y, color, context = ctx, blockSize = BLOCK_SIZE, isModern = false) {
    if (!context) return;
    
    if (isModern) {
        const gradient = context.createLinearGradient(x * blockSize, y * blockSize, x * blockSize + blockSize, y * blockSize + blockSize);
        const colors = THEMES['modern'].blockColors[currentPieceIndex].match(/#\w+/g);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        context.fillStyle = gradient;
        
        context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);

        context.strokeStyle = darkenColor(colors[1], 40);
        context.lineWidth = 1;
        context.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
    } else {
        context.fillStyle = color;
        context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
        context.strokeStyle = darkenColor(color, 40);
        context.lineWidth = 1;
        context.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
    }
}

function lightenColor(color, amount) {
    if (color.includes('linear-gradient')) return color;
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darkenColor(color, amount) {
    if (color.includes('linear-gradient')) return color;
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
    const isModernTheme = currentTheme === 'modern';
    
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                const color = COLORS[currentPiece.index];
                if (isModernTheme) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect((currentPiece.x + c) * BLOCK_SIZE, (ghostY + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.strokeRect((currentPiece.x + c) * BLOCK_SIZE, (ghostY + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                } else {
                    ctx.fillStyle = color;
                    ctx.fillRect((currentPiece.x + c) * BLOCK_SIZE, (ghostY + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }
    ctx.globalAlpha = 1.0;
}

function drawNextPieceQueue() {
    if (!nextPieceQueue) {
        nextBlockCtx.clearRect(0, 0, nextBlockCanvas.width, nextBlockCanvas.height);
        return;
    }
    nextBlockCtx.clearRect(0, 0, nextBlockCanvas.width, nextBlockCanvas.height);
    const isModernTheme = currentTheme === 'modern';

    const padding = 10;
    let offsetY = 10;
    
    for(let i = 0; i < nextPieceQueue.length; i++) {
        const pieceIndex = nextPieceQueue[i];
        const nextShape = TETROMINOES[pieceIndex];
        const nextColor = COLORS[pieceIndex];
        
        const shapeWidth = nextShape[0].length;
        const shapeHeight = nextShape.length;

        const nextBlockSize = Math.floor((nextBlockCanvas.width - 2 * padding) / Math.max(shapeWidth, 4));
        
        const offsetX = (nextBlockCanvas.width - shapeWidth * nextBlockSize) / 2;

        for (let r = 0; r < shapeHeight; r++) {
            for (let c = 0; c < shapeWidth; c++) {
                if (nextShape[r][c]) {
                    if (isModernTheme) {
                        const tempColor = THEMES['modern'].blockColors[pieceIndex];
                        const gradient = nextBlockCtx.createLinearGradient(offsetX + c * nextBlockSize, offsetY + r * nextBlockSize, offsetX + c * nextBlockSize + nextBlockSize, offsetY + r * nextBlockSize + nextBlockSize);
                        const colors = tempColor.match(/#\w+/g);
                        gradient.addColorStop(0, colors[0]);
                        gradient.addColorStop(1, colors[1]);
                        nextBlockCtx.fillStyle = gradient;
                    } else {
                        nextBlockCtx.fillStyle = nextColor;
                    }
                    nextBlockCtx.fillRect(offsetX + c * nextBlockSize, offsetY + r * nextBlockSize, nextBlockSize, nextBlockSize);
                    nextBlockCtx.strokeStyle = darkenColor(isModernTheme ? nextColor : nextColor, 40);
                    nextBlockCtx.lineWidth = 1;
                    nextBlockCtx.strokeRect(offsetX + c * nextBlockSize, offsetY + r * nextBlockSize, nextBlockSize, nextBlockSize);
                }
            }
        }
        offsetY += shapeHeight * nextBlockSize + padding;
    }
}

function drawHoldPiece() {
    if (!holdPiece) {
        holdBlockCtx.clearRect(0, 0, holdBlockCanvas.width, holdBlockCanvas.height);
        return;
    }

    holdBlockCtx.clearRect(0, 0, holdBlockCanvas.width, holdBlockCanvas.height);
    const isModernTheme = currentTheme === 'modern';

    const holdShape = holdPiece.shape;
    const holdColor = holdPiece.color;
    
    const shapeWidth = holdShape[0].length;
    const shapeHeight = holdShape.length;
    
    const holdBlockSize = Math.floor((holdBlockCanvas.width - 20) / Math.max(shapeWidth, 4));
    
    const offsetX = (holdBlockCanvas.width - shapeWidth * holdBlockSize) / 2;
    const offsetY = (holdBlockCanvas.height - shapeHeight * holdBlockSize) / 2;

    for (let r = 0; r < shapeHeight; r++) {
        for (let c = 0; c < shapeWidth; c++) {
            if (holdShape[r][c]) {
                if (isModernTheme) {
                    const tempColor = THEMES['modern'].blockColors[holdPieceIndex];
                    const gradient = holdBlockCtx.createLinearGradient(offsetX + c * holdBlockSize, offsetY + r * holdBlockSize, offsetX + c * holdBlockSize + holdBlockSize, offsetY + r * holdBlockSize + holdBlockSize);
                    const colors = tempColor.match(/#\w+/g);
                    gradient.addColorStop(0, colors[0]);
                    gradient.addColorStop(1, colors[1]);
                    holdBlockCtx.fillStyle = gradient;
                } else {
                    holdBlockCtx.fillStyle = holdColor;
                }
                holdBlockCtx.fillRect(offsetX + c * holdBlockSize, offsetY + r * holdBlockSize, holdBlockSize, holdBlockSize);
                holdBlockCtx.strokeStyle = darkenColor(isModernTheme ? holdColor : holdColor, 40);
                holdBlockCtx.lineWidth = 1;
                holdBlockCtx.strokeRect(offsetX + c * holdBlockSize, offsetY + r * holdBlockSize, holdBlockSize, holdBlockSize);
            }
        }
    }
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isModernTheme = currentTheme === 'modern';

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                if (isModernTheme) {
                    drawBlock(c, r, null, ctx, BLOCK_SIZE, true);
                } else {
                    drawBlock(c, r, board[r][c]);
                }
            } else {
                ctx.fillStyle = THEMES[currentTheme].boardBackground;
                ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
}

function drawCurrentPiece() {
    if (!currentPiece) return;
    const isModernTheme = currentTheme === 'modern';
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                if (isModernTheme) {
                    drawBlock(currentPiece.x + c, currentPiece.y + r, null, ctx, BLOCK_SIZE, true);
                } else {
                    drawBlock(currentPiece.x + c, currentPiece.y + r, currentPiece.color);
                }
            }
        }
    }
}

function isValidMove(offsetX, offsetY, newShape, currentY = currentPiece.y) {
    if (!board.length || !currentPiece) return false;
    
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
    if (!currentPiece || currentPieceType === 'O') return;
    const originalShape = currentPiece.shape;
    const originalRotationState = currentRotationState;
    const N = originalShape.length;
    const newShape = Array(N).fill(0).map(() => Array(N).fill(0));

    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            newShape[c][N - 1 - r] = originalShape[r][c];
        }
    }
    
    const kickTable = WALL_KICKS[currentPieceType][originalRotationState];
    const newRotationState = (originalRotationState + 1) % 4;

    for (const kick of kickTable) {
        if (isValidMove(kick[0], kick[1], newShape)) {
            currentPiece.shape = newShape;
            currentPiece.x += kick[0];
            currentPiece.y += kick[1];
            currentRotationState = newRotationState;
            rotateSound.currentTime = 0;
            rotateSound.play().catch(e => console.error("Greška pri puštanju zvuka za rotaciju:", e));
            return;
        }
    }
}

function dropPiece() {
    if (!currentPiece) return;
    let rowsDropped = 0;
    while (isValidMove(0, 1, currentPiece.shape)) {
        currentPiece.y++;
        rowsDropped++;
    }
    score += rowsDropped * POINTS.hardDrop;
    scoreDisplay.textContent = `Score: ${score}`;
    mergePiece();
    dropSound.currentTime = 0;
    dropSound.play().catch(e => console.error("Greška pri puštanju dropSounda:", e));
}

function softDropPiece() {
    if (!currentPiece) return;
    if (isValidMove(0, 1, currentPiece.shape)) {
        currentPiece.y++;
        score += POINTS.softDrop;
        scoreDisplay.textContent = `Score: ${score}`;
    } else {
        mergePiece();
    }
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
        
        clearSound.currentTime = 0;
        if (clearSound.readyState >= 2) {
            clearSound.play().catch(e => console.error("Greška pri puštanju clearSounda:", e));
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
    let comboBonus = combo > 0 ? (combo - 1) * POINTS.comboMultiplier : 0;
    
    if (isTSpin()) {
        tSpinSound.currentTime = 0;
        tSpinSound.play().catch(e => console.error("Greška pri puštanju tSpinSounda:", e));
        if (lines === 1) { points = POINTS.tSpinSingle; type = 'T-Spin Single'; }
        else if (lines === 2) { points = POINTS.tSpinDouble; type = 'T-Spin Double'; }
        else if (lines === 3) { points = POINTS.tSpinTriple; type = 'T-Spin Triple'; }
        else { points = POINTS.tSpinMini; type = 'T-Spin Mini'; }
    } else {
        if (lines === 1) { points = POINTS.single; type = 'Single'; }
        else if (lines === 2) { points = POINTS.double; type = 'Double'; }
        else if (lines === 3) { points = POINTS.triple; type = 'Triple'; }
        else if (lines === 4) { 
            points = POINTS.tetris; 
            type = 'Tetris';
            tetrisSound.currentTime = 0;
            tetrisSound.play().catch(e => console.error("Greška pri puštanju tetrisSounda:", e));
        }
    }
    
    const backToBackMultiplier = lastClearWasSpecial && isCurrentSpecial ? POINTS.b2bBonus : 1;
    score += Math.floor(points * backToBackMultiplier);
    
    if (lines > 0) {
        combo++;
        score += comboBonus;
        if (isCurrentSpecial && backToBackMultiplier > 1) {
            type = 'B2B ' + type;
        }
        showComboMessage(type, combo);
        lastClearWasSpecial = isCurrentSpecial;
    } else {
        combo = 0;
        lastClearWasSpecial = false;
    }
    
    scoreDisplay.textContent = `Score: ${score}`;
    
    if (gameMode === 'classic') {
        linesClearedThisLevel += lines;
        if (linesClearedThisLevel >= 10) {
            level++;
            linesClearedThisLevel -= 10;
            levelDisplay.textContent = `Level: ${level}`;
            updateDropInterval();
        }

        if (score >= nextAssistReward) {
            assists++;
            nextAssistReward += 5000;
            localStorage.setItem('assists', assists);
            updateAssistsDisplay();
        }
    } else if (gameMode === 'sprint') {
        linesCleared += lines;
        linesClearedThisLevel += lines;
        if (linesCleared >= linesToClearGoal) {
            endGame(true);
        }
        level = Math.floor(linesCleared / 10) + 1;
        levelDisplay.textContent = `LINES: ${linesCleared}/${linesToClearGoal}`;
        updateDropInterval();
    }
}

function updateDropInterval() {
    dropInterval = Math.max(100, 1000 - level * 50);
}

function showComboMessage(type, comboCount) {
    let message = '';
    if (type) message = type;
    if (comboCount > 1) message += ` ${comboCount}x Combo!`;

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
    score += POINTS.perfectClear;
    scoreDisplay.textContent = `Score: ${score}`;
    comboDisplay.textContent = message;
    comboDisplay.style.display = 'block';
    setTimeout(() => {
        comboDisplay.style.display = 'none';
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
    
    if (gameMode === 'sprint') {
        const elapsed = (performance.now() - gameStartTime) / 1000;
        sprintTimerDisplay.textContent = `TIME: ${elapsed.toFixed(2)}s`;
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
        }
        
        generateNewPiece();
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    drawBoard();
    
    ctx.globalAlpha = 1.0 - progress;

    for (const r of linesToClear) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                const blockSize = BLOCK_SIZE * (1 - progress);
                const x = c * BLOCK_SIZE + BLOCK_SIZE * progress / 2;
                const y = r * BLOCK_SIZE + BLOCK_SIZE * progress / 2;
                
                ctx.fillStyle = THEMES[currentTheme].flashColor;
                ctx.fillRect(x, y, blockSize, blockSize);
            }
        }
    }
    ctx.globalAlpha = 1.0;
    drawCurrentPiece();

    requestAnimationFrame(animateLineClear);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawGhostPiece();
    drawCurrentPiece();
}

function setGameMode(mode) {
    // Resetuj UI elemente specifične za modove
    document.getElementById('sprint-mode-info').style.display = 'none';
    document.getElementById('classic-mode-info').style.display = 'none';

    if (mode === 'sprint') {
        document.getElementById('sprint-mode-info').style.display = 'block';
    } else {
        document.getElementById('classic-mode-info').style.display = 'block';
    }
}

function endGame(isSprintWin = false) {
    gameOver = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    backgroundMusic.pause();
    gameOverSound.currentTime = 0;
    if (gameOverSound.readyState >= 2) {
        gameOverSound.play().catch(e => console.error("Greška pri puštanju gameOverSounda:", e));
    }
    
    if (isSprintWin) {
        const finalTime = (performance.now() - gameStartTime) / 1000;
        finalTimeDisplay.textContent = `Vreme: ${finalTime.toFixed(2)}s`;
        finalScoreDisplay.textContent = `Tvoj skor: ${score}`;
        document.getElementById('game-over-title').textContent = 'Pobedio si!';
    } else {
        finalTimeDisplay.textContent = '';
        finalScoreDisplay.textContent = `Tvoj skor: ${score}`;
        document.getElementById('game-over-title').textContent = 'GAME OVER!';
    }
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        bestScoreDisplay.textContent = `BEST: ${bestScore}`;
    }
    
    gameOverScreen.style.display = 'flex';
    pauseButton.style.display = 'none';
}

function startGame() {
    // Omogućavanje zvuka
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
    pauseButton.style.display = 'block';
    
    initBoard();
    setCanvasSize();
    
    score = 0;
    combo = 0;
    level = 1;
    linesClearedThisLevel = 0;
    nextAssistReward = 5000;
    linesCleared = 0;
    hasHeld = false;
    holdPiece = null;
    holdPieceIndex = undefined;
    
    scoreDisplay.textContent = `Score: ${score}`;
    levelDisplay.textContent = `Level: ${level}`;
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    
    if (gameMode === 'sprint') {
        levelDisplay.textContent = `LINES: ${linesCleared}/${linesToClearGoal}`;
        sprintTimerDisplay.style.display = 'block';
        gameStartTime = performance.now();
    } else {
        sprintTimerDisplay.style.display = 'none';
    }

    if (gameMode !== 'zen') {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(e => console.error("Greška pri puštanju muzike:", e));
    }

    updateAssistsDisplay();
    
    gameOver = false;
    isPaused = false;
    isAnimating = false;
    pauseButton.textContent = "PAUSE";
    dropInterval = 1000;
    
    generateNewPiece();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
    
    draw();
}

function togglePause() {
    if (gameOver || isAnimating || gameMode === 'zen') return;
    isPaused = !isPaused;
    if (isPaused) {
        cancelAnimationFrame(animationFrameId);
        pauseScreen.style.display = 'flex';
        pauseButton.textContent = "RESUME";
        backgroundMusic.pause();
    } else {
        pauseScreen.style.display = 'none';
        animationFrameId = requestAnimationFrame(gameLoop);
        pauseButton.textContent = "PAUSE";
        backgroundMusic.play().catch(e => console.error("Greška pri puštanju muzike:", e));
    }
}

function updateAssistsDisplay() {
    if (assistsCountDisplay) {
        assistsCountDisplay.textContent = assists;
    }
}

function useAssist() {
    if (assists > 0 && !gameOver && !isPaused && !isAnimating) {
        initBoard();
        
        assists--;
        localStorage.setItem('assists', assists);
        updateAssistsDisplay();
        
        generateNewPiece();
        
        draw();
    }
}

function setTheme(themeName) {
    currentTheme = themeName;
    const themeData = THEMES[themeName];
    COLORS = themeData.blockColors;
    document.body.style.background = `linear-gradient(to bottom right, ${themeData.background}, #16213e, #0f3460)`;
    document.documentElement.style.setProperty('--main-color', themeData.lineColor);
    localStorage.setItem('theme', themeName);
    
    setCanvasSize();
    if (!gameOver && !isPaused) {
      draw();
      drawNextPieceQueue();
      drawHoldPiece();
    }
}

function handleHoldPiece() {
    if (hasHeld || !currentPiece) return;
    
    holdSound.currentTime = 0;
    holdSound.play().catch(e => console.error("Greška pri puštanju holdSounda:", e));

    if (holdPiece) {
        [holdPiece, currentPiece] = [currentPiece, holdPiece];
        [holdPieceIndex, currentPieceIndex] = [currentPieceIndex, holdPieceIndex];
        currentPiece.x = Math.floor((COLS - currentPiece.shape[0].length) / 2);
        currentPiece.y = 0;
    } else {
        holdPiece = currentPiece;
        holdPieceIndex = currentPieceIndex;
        generateNewPiece();
    }
    
    hasHeld = true;
    drawHoldPiece();
}

function handleKeydown(e) {
    if (gameOver || isPaused || isAnimating || !currentPiece) return;
    switch (e.key) {
        case 'ArrowLeft':
            if (isValidMove(-1, 0, currentPiece.shape)) currentPiece.x--;
            break;
        case 'ArrowRight':
            if (isValidMove(1, 0, currentPiece.shape)) currentPiece.x++;
            break;
        case 'ArrowDown':
            softDropPiece();
            break;
        case 'ArrowUp':
            rotatePiece();
            break;
        case ' ':
            e.preventDefault();
            dropPiece();
            break;
        case 'c':
        case 'C':
            e.preventDefault();
            handleHoldPiece();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
    draw();
}

window.addEventListener('load', initDOMAndEventListeners);
