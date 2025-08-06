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
        background: '#121212',
        boardBackground: '#1e1e1e',
        lineColor: '#bb86fc',
        blockColors: ['#03dac6', '#cf6679', '#f3a469', '#f0e68c', '#aaff00', '#8c5eff', '#e74c3c'],
        flashColor: '#ffffff'
    }
};

const T_SHAPE_INDEX = 5;

let canvas, ctx, nextBlockCanvas, nextBlockCtx, holdBlockCanvas, holdBlockCtx;
let COLS, ROWS, BLOCK_SIZE;

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
let currentPiece, nextPiece, heldPiece;
let score = 0;
let gameOver = true;
let isPaused = false;
let combo = 0;
let assists = 0;
let bestScore = 0;
let nextAssistReward = 5000;

let dropInterval = 1000;
let level = 1;
let linesClearedThisLevel = 0;
let linesClearedTotal = 0;
let startTime;
let sprintTimer;

let lastDropTime = 0;
let animationFrameId;
let currentPieceIndex, nextPieceIndex;
let COLORS;
let currentTheme;
let currentMode = 'classic';
let hasSwappedThisTurn = false;

let dropSound, clearSound, rotateSound, gameOverSound, holdSound, tSpinSound, tetrisSound, backgroundMusic;
let startScreen, gameOverScreen, pauseScreen, scoreDisplay, finalScoreDisplay, finalTimeDisplay, comboDisplay, startButton, restartButton, resumeButton, themeSwitcher, modeSelector, assistsContainer, assistsCountDisplay, bestScoreDisplay, pauseButton, levelDisplay, sprintTimerDisplay, startCountdown;
let backgroundMusicPlaying = false;

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
    const mainGameWrapper = document.getElementById('main-game-wrapper');
    const containerWidth = mainGameWrapper.clientWidth - 20;
    const infoSectionHeight = document.getElementById('info-section').clientHeight;
    const pauseButtonHeight = document.getElementById('pause-button').clientHeight;
    const gap = 10;
    const totalVerticalPadding = 20;
    const availableHeight = mainGameWrapper.clientHeight - infoSectionHeight - pauseButtonHeight - gap * 2 - totalVerticalPadding;

    let tempBlockSizeWidth = Math.floor(containerWidth / (COLS + 5)); // Dodao sam 5 kolona da bih izbegao da canvas bude prevelik
    let tempBlockSizeHeight = Math.floor(availableHeight / ROWS);
    
    BLOCK_SIZE = Math.min(tempBlockSizeWidth, tempBlockSizeHeight);

    if (BLOCK_SIZE > 35) {
        BLOCK_SIZE = 35;
    }
    
    if (BLOCK_SIZE < 1) {
        BLOCK_SIZE = 1;
    }

    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    
    const nextBlockContainer = document.getElementById('next-block-container');
    const holdBlockContainer = document.getElementById('hold-block-container');
    const containerSize = nextBlockContainer.clientWidth;
    nextBlockCanvas.width = containerSize;
    nextBlockCanvas.height = containerSize;
    holdBlockCanvas.width = containerSize;
    holdBlockCanvas.height = containerSize;
    
    if (!gameOver && !isPaused) {
        draw();
        drawNextPiece();
        drawHeldPiece();
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
    ROWS = 20;

    dropSound = document.getElementById('dropSound');
    clearSound = document.getElementById('clearSound');
    rotateSound = document.getElementById('rotateSound');
    gameOverSound = document.getElementById('gameOverSound');
    holdSound = document.getElementById('holdSound');
    tSpinSound = document.getElementById('tSpinSound');
    tetrisSound = document.getElementById('tetrisSound');
    backgroundMusic = document.getElementById('backgroundMusic');

    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over-screen');
    pauseScreen = document.getElementById('pause-screen');
    scoreDisplay = document.getElementById('score-display');
    finalScoreDisplay = document.getElementById('final-score');
    finalTimeDisplay = document.getElementById('final-time');
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
    startCountdown = document.getElementById('start-countdown');

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
    themeSwitcher.addEventListener('change', (e) => setTheme(e.target.value));
    
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', setCanvasSize);
    
    assistsContainer.addEventListener('click', () => {
        if (gameOver || isPaused) return;
        useAssist();
    });

    setCanvasSize();
    
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

    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    
    const tapThreshold = 20;
    let touchMoveThreshold = 0;

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        if (gameOver || isPaused || !currentPiece) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = e.touches[0].clientX;
        
        touchMoveThreshold = BLOCK_SIZE * 0.4;
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
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        if (Math.abs(dx) < tapThreshold && Math.abs(dy) < tapThreshold) {
            rotatePiece();
        } else if (dy > tapThreshold && dy > Math.abs(dx)) {
            dropPiece();
        }
        
        draw();
    });
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
    hasSwappedThisTurn = false;
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

function drawBlock(x, y, color, context = ctx, blockSize = BLOCK_SIZE) {
    if (!context) return;
    context.fillStyle = color;
    context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
    context.strokeStyle = darkenColor(color, 40);
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

function drawNextPiece() {
    if (!nextPiece) {
        nextBlockCtx.clearRect(0, 0, nextBlockCanvas.width, nextBlockCanvas.height);
        return;
    }
    const nextShape = nextPiece.shape;
    const nextColor = nextPiece.color;
    
    nextBlockCtx.clearRect(0, 0, nextBlockCanvas.width, nextBlockCanvas.height);
    
    let shapeWidth = 0;
    for (let r = 0; r < nextShape.length; r++) {
        let rowWidth = 0;
        for (let c = 0; c < nextShape[r].length; c++) {
            if (nextShape[r][c]) {
                rowWidth = c + 1;
            }
        }
        if (rowWidth > shapeWidth) {
            shapeWidth = rowWidth;
        }
    }
    const shapeHeight = nextShape.length;

    const canvasSize = Math.min(nextBlockCanvas.width, nextBlockCanvas.height);
    const pieceSize = Math.max(shapeWidth, shapeHeight);
    const nextBlockSize = Math.floor(canvasSize / (pieceSize + 1));
    
    const offsetX = (nextBlockCanvas.width - shapeWidth * nextBlockSize) / 2;
    const offsetY = (nextBlockCanvas.height - shapeHeight * nextBlockSize) / 2;

    for (let r = 0; r < nextShape.length; r++) {
        for (let c = 0; c < nextShape[r].length; c++) {
            if (nextShape[r][c]) {
                nextBlockCtx.fillStyle = nextColor;
                nextBlockCtx.fillRect(offsetX + c * nextBlockSize, offsetY + r * nextBlockSize, nextBlockSize, nextBlockSize);
                nextBlockCtx.strokeStyle = darkenColor(nextColor, 40);
                nextBlockCtx.lineWidth = 1;
                nextBlockCtx.strokeRect(offsetX + c * nextBlockSize, offsetY + r * nextBlockSize, nextBlockSize, nextBlockSize);
            }
        }
    }
}

function drawHeldPiece() {
    if (!heldPiece) {
        holdBlockCtx.clearRect(0, 0, holdBlockCanvas.width, holdBlockCanvas.height);
        return;
    }
    const heldShape = heldPiece.shape;
    const heldColor = heldPiece.color;

    holdBlockCtx.clearRect(0, 0, holdBlockCanvas.width, holdBlockCanvas.height);
    
    let shapeWidth = 0;
    for (let r = 0; r < heldShape.length; r++) {
        let rowWidth = 0;
        for (let c = 0; c < heldShape[r].length; c++) {
            if (heldShape[r][c]) {
                rowWidth = c + 1;
            }
        }
        if (rowWidth > shapeWidth) {
            shapeWidth = rowWidth;
        }
    }
    const shapeHeight = heldShape.length;
    
    const canvasSize = Math.min(holdBlockCanvas.width, holdBlockCanvas.height);
    const pieceSize = Math.max(shapeWidth, shapeHeight);
    const heldBlockSize = Math.floor(canvasSize / (pieceSize + 1));

    const offsetX = (holdBlockCanvas.width - shapeWidth * heldBlockSize) / 2;
    const offsetY = (holdBlockCanvas.height - shapeHeight * heldBlockSize) / 2;

    for (let r = 0; r < heldShape.length; r++) {
        for (let c = 0; c < heldShape[r].length; c++) {
            if (heldShape[r][c]) {
                holdBlockCtx.fillStyle = heldColor;
                holdBlockCtx.fillRect(offsetX + c * heldBlockSize, offsetY + r * heldBlockSize, heldBlockSize, heldBlockSize);
                holdBlockCtx.strokeStyle = darkenColor(heldColor, 40);
                holdBlockCtx.lineWidth = 1;
                holdBlockCtx.strokeRect(offsetX + c * heldBlockSize, offsetY + r * heldBlockSize, heldBlockSize, heldBlockSize);
            }
        }
    }
}


function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawBlock(c, r, board[r][c]);
            } else {
                ctx.fillStyle = THEMES[currentTheme].boardBackground;
                ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
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
    if (!currentPiece) return;
    const originalShape = currentPiece.shape;
    const N = originalShape.length;
    const newShape = Array(N).fill(0).map(() => Array(N).fill(0));

    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            newShape[c][N - 1 - r] = originalShape[r][c];
        }
    }
    
    let isTSpinRotation = false;
    if (currentPieceIndex === T_SHAPE_INDEX) {
        isTSpinRotation = true;
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
    if (currentMode === 'classic') {
        score += rowsDropped * 2;
    }
    scoreDisplay.textContent = `Score: ${score}`;
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

function holdPiece() {
    if (hasSwappedThisTurn) return;

    holdSound.currentTime = 0;
    holdSound.play().catch(e => console.error("Greška pri puštanju hold sounda:", e));

    if (!heldPiece) {
        heldPiece = {
            shape: TETROMINOES[currentPieceIndex],
            color: COLORS[currentPieceIndex],
            x: 0,
            y: 0
        };
        generateNewPiece();
    } else {
        const tempPiece = {
            shape: TETROMINOES[currentPieceIndex],
            color: COLORS[currentPieceIndex],
            x: 0,
            y: 0
        };

        currentPieceIndex = heldPiece.shape === TETROMINOES[0] ? 0 :
                            heldPiece.shape === TETROMINOES[1] ? 1 :
                            heldPiece.shape === TETROMINOES[2] ? 2 :
                            heldPiece.shape === TETROMINOES[3] ? 3 :
                            heldPiece.shape === TETROMINOES[4] ? 4 :
                            heldPiece.shape === TETROMINOES[5] ? 5 :
                            heldPiece.shape === TETROMINOES[6] ? 6 : undefined;
        
        createCurrentPiece();
        heldPiece = tempPiece;
    }
    hasSwappedThisTurn = true;
    draw();
    drawHeldPiece();
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
    } else if (currentMode === 'classic') {
        linesClearedThisLevel += lines;
        if (linesClearedThisLevel >= 10) {
            level++;
            linesClearedThisLevel -= 10;
            levelDisplay.textContent = `Level: ${level}`;
            dropInterval = Math.max(100, 1000 - level * 50);
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
                
                ctx.fillStyle = board[r][c];
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
    heldPiece = null;
    hasSwappedThisTurn = false;
    
    scoreDisplay.textContent = `Score: ${score}`;
    levelDisplay.textContent = `Level: ${level}`;
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    
    updateAssistsDisplay();
    
    gameOver = false;
    isPaused = false;
    isAnimating = false;
    pauseButton.textContent = "PAUSE";
    pauseButton.style.display = 'block';
    
    if (currentMode === 'classic') {
        dropInterval = 1000;
        levelDisplay.style.display = 'block';
        sprintTimerDisplay.style.display = 'none';
    } else if (currentMode === 'sprint') {
        dropInterval = 100; // Brži drop u sprint modu
        levelDisplay.style.display = 'none';
        sprintTimerDisplay.style.display = 'block';
        startTime = performance.now();
    } else if (currentMode === 'zen') {
        dropInterval = 1500;
        levelDisplay.textContent = `Level: ∞`;
        levelDisplay.style.display = 'block';
        sprintTimerDisplay.style.display = 'none';
    }

    playBackgroundMusic();
    generateNewPiece();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
    
    draw();
    drawHeldPiece();
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
    COLORS = THEMES[themeName].blockColors;
    document.body.style.background = `linear-gradient(to bottom right, ${THEMES[themeName].background}, #16213e, #0f3460)`;
    document.documentElement.style.setProperty('--main-color', THEMES[themeName].lineColor);
    localStorage.setItem('theme', themeName);
    
    setCanvasSize();
    if (!gameOver && !isPaused) {
      draw();
    }
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
            if (isValidMove(0, 1, currentPiece.shape)) {
                currentPiece.y++;
                if (currentMode !== 'zen') {
                    score += 1;
                }
                scoreDisplay.textContent = `Score: ${score}`;
            }
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
            holdPiece();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
    draw();
}

document.addEventListener('DOMContentLoaded', initDOMAndEventListeners);
