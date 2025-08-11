'use strict';

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
let activeGame = null;

// Tetris State
let board, currentPiece, nextPiece, score, level, linesClearedTotal, gameOver, isPaused, isAnimating, visualX;
let animationStart, pauseStartTime, combo, lastClearWasSpecial, dropInterval, assists, hammerLine;
let currentPieceIndex, nextPieceIndex, dasTimer, arrTimer, moveDirection, lastDropTime, boardHistory;

// Block Puzzle State
let puzzleBoard, availablePuzzlePieces, puzzleScore, draggingPiece, puzzleGhost;

// General State
let bestScores = {}, currentTheme = 'classic', currentMode = 'classic', isMuted = false;

// UI Element Variables
let allAudioElements, dropSound, clearSound, rotateSound, gameOverSound, tSpinSound, tetrisSound, backgroundMusic, bombSound, placeSound;
let tetrisWrapper, blockPuzzleWrapper, mainMenu, tetrisMenu, gameOverScreen, pauseScreen, scoreDisplay, finalScoreDisplay, finalTimeDisplay, comboDisplay, startButton, restartButton, resumeButton, themeSwitcher, modeSelector, assistsBombButton, assistsBombCountDisplay, assistsHammerButton, assistsHammerCountDisplay, assistsUndoButton, assistsUndoCountDisplay, bestScoreDisplay, homeButton, pauseButton, levelDisplay, countdownOverlay;
let backgroundMusicPlaying = false;
let controlsModal, controlsButton, closeControlsModal, controlInputs, exitModal, confirmExitButton, cancelExitButton;
let backgroundImageElement, settingsButton, settingsModal, closeSettingsModalButton, soundToggleButton, selectTetrisButton, selectBlockPuzzleButton, backToMainMenuButton, puzzleBackButton, blockPuzzleCanvas, blockPuzzleCtx, puzzleScoreDisplay, puzzleBestScoreDisplay;
let draggingPieceCanvas, draggingPieceCtx, draggingElement;
let canvas, ctx, nextBlockCanvas, nextBlockCtx, BLOCK_SIZE, gameOverTitle;

// Touch Control Variables
let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
let initialPieceX = 0;
let lastTouchY = 0;

// =================================================================================
// ===== HELPER & UI FUNCTIONS =====
// =================================================================================
function lightenColor(c, a) { let r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); r = Math.min(255, r + a); g = Math.min(255, g + a); b = Math.min(255, b + a); return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`; }
function darkenColor(c, a) { let r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); r = Math.max(0, r - a); g = Math.max(0, g - a); b = Math.max(0, b - a); return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`; }

function playSound(soundElement) {
    if (soundElement && !isMuted) {
        soundElement.currentTime = 0;
        soundElement.play().catch(e => {});
    }
}

function toggleSound() {
    isMuted = !isMuted;
    allAudioElements.forEach(audio => audio.muted = isMuted);
    if (soundToggleButton) soundToggleButton.textContent = isMuted ? '🔇' : '🔊';
    localStorage.setItem('isMuted', JSON.stringify(isMuted));
}

function applyTheme(themeName) {
    currentTheme = themeName;
    const theme = THEMES[themeName];
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty('--main-color', theme.lineColor);
    root.style.setProperty('--background-color', theme.background);
    root.style.setProperty('--board-bg-color', theme.boardBackground);
    root.style.setProperty('--grid-color', theme.gridColor);
    
    COLORS = theme.blockColors;
    if (activeGame === 'tetris' && !gameOver) draw();
    if (activeGame === 'blockpuzzle') drawPuzzleBoard();
}

function drawBlock(x, y, color, context, blockSize) {
    if (!context || !blockSize || !color) return;
    const lightColor = lightenColor(color, 20);
    const darkColor = darkenColor(color, 20);
    context.fillStyle = lightColor;
    context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
    context.fillStyle = darkColor;
    context.fillRect(x * blockSize + blockSize * 0.1, y * blockSize + blockSize * 0.1, blockSize * 0.8, blockSize * 0.8);
    context.fillStyle = color;
    context.fillRect(x * blockSize + blockSize * 0.2, y * blockSize + blockSize * 0.2, blockSize * 0.6, blockSize * 0.6);
}

function drawPieceInCanvas(piece, context, canvasEl, customBlockSize = null) {
    if (!piece || !context || !canvasEl) return;
    context.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const { shape, color } = piece;
    if (!shape) return;

    let pieceBlockSize;
    if (customBlockSize) {
        pieceBlockSize = customBlockSize;
    } else {
        const shapeRows = shape.length;
        const shapeCols = shape[0].length;
        const maxDim = Math.max(shapeCols, shapeRows);
        pieceBlockSize = Math.floor(Math.min(canvasEl.width / maxDim, canvasEl.height / maxDim) * 0.8);
    }
    
    const shapeWidth = shape.reduce((max, row) => Math.max(max, row.length), 0);
    const shapeHeight = shape.length;
    const offsetX = (canvasEl.width - shapeWidth * pieceBlockSize) / 2;
    const offsetY = (canvasEl.height - shapeHeight * pieceBlockSize) / 2;

    shape.forEach((row, r) => row.forEach((cell, c) => { 
        if (cell) { 
            context.save(); 
            context.translate(offsetX, offsetY); 
            drawBlock(c, r, color, context, pieceBlockSize); 
            context.restore(); 
        } 
    }));
}


// =================================================================================
// ===== TETRIS: DRAWING FUNCTIONS =====
// =================================================================================
function drawBoard() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = THEMES[currentTheme].boardBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = THEMES[currentTheme].gridColor;
    ctx.lineWidth = 1;
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
    board.forEach((row, r) => row.forEach((cell, c) => { if (cell) drawBlock(c, r, cell, ctx, BLOCK_SIZE); }));
    if (hammerLine !== -1) { ctx.fillStyle = 'rgba(255, 120, 120, 0.4)'; ctx.fillRect(0, hammerLine * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE); }
}

function drawCurrentPiece() { 
    if (!currentPiece) return;
    ctx.save();
    ctx.translate(visualX - (currentPiece.x * BLOCK_SIZE), 0);
    currentPiece.shape.forEach((row, r) => row.forEach((cell, c) => { 
        if (cell) drawBlock(currentPiece.x + c, currentPiece.y + r, currentPiece.color, ctx, BLOCK_SIZE); 
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
    ctx.translate(visualX - (currentPiece.x * BLOCK_SIZE), 0);
    currentPiece.shape.forEach((row, r) => row.forEach((cell, c) => { 
        if (cell) drawBlock(currentPiece.x + c, ghostY + r, currentPiece.color, ctx, BLOCK_SIZE); 
    }));
    ctx.restore();
    ctx.globalAlpha = 1.0;
}

function drawNextPiece() { drawPieceInCanvas(nextPiece, nextBlockCtx, nextBlockCanvas); }

function draw() { 
    if(ctx && canvas.width > 0) { 
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        drawBoard();
        if(!gameOver) {
            drawGhostPiece(); 
            drawCurrentPiece(); 
        }
    } 
}

function animateLineClear(timestamp) {
    if (!isAnimating) return;
    const elapsed = timestamp - animationStart;
    if (elapsed >= animationDuration) {
        isAnimating = false;
        const linesClearedCount = linesToClear.length;
        linesToClear.sort((a, b) => a - b).reverse().forEach(r => board.splice(r, 1));
        for (let i = 0; i < linesClearedCount; i++) board.unshift(Array(COLS).fill(0));
        handleLinesCleared(linesClearedCount); 
        if (board.every(row => row.every(cell => !cell))) { score += 3000 * level; showComboMessage('Perfect Clear!', 0); }
        linesToClear = []; 
        generateNewPiece();
        requestAnimationFrame(gameLoop);
        return;
    }
    const progress = elapsed / animationDuration; 
    drawBoard();
    linesToClear.forEach(r => { 
        const p = Math.sin(progress * Math.PI); 
        ctx.globalAlpha = 1 - p; 
        board[r].forEach((cell, c) => { if (cell) drawBlock(c, r, cell, ctx, BLOCK_SIZE); }); 
        ctx.globalAlpha = 1; 
    });
    drawCurrentPiece(); 
    requestAnimationFrame(animateLineClear);
}

// =================================================================================
// ===== PIECE LOGIC (TETRIS) =====
// =================================================================================
function createCurrentPiece() {
    if (currentPieceIndex === undefined) return;
    const shape = TETROMINOES[currentPieceIndex];
    if (!COLORS || !COLORS[currentPieceIndex]) { return; }
    currentPiece = { shape, color: COLORS[currentPieceIndex], x: Math.floor((COLS - shape[0].length) / 2), y: 0 };
    if (BLOCK_SIZE) {
        visualX = currentPiece.x * BLOCK_SIZE;
    }
}

function generateNewPiece() {
    currentPieceIndex = nextPieceIndex !== undefined ? nextPieceIndex : Math.floor(Math.random() * TETROMINOES.length);
    createCurrentPiece();
    nextPieceIndex = Math.floor(Math.random() * TETROMINOES.length);
    if(COLORS && nextPieceIndex < COLORS.length) {
        nextPiece = { shape: TETROMINOES[nextPieceIndex], color: COLORS[nextPieceIndex] };
        drawNextPiece();
    }
    if (currentPiece && !isValidMove(0, 0, currentPiece.shape)) {
        endGame();
    }
}

function rotatePiece() {
    if (!currentPiece || isPaused || gameOver) return;
    const N = currentPiece.shape.length, newShape = Array(N).fill(0).map(() => Array(N).fill(0));
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) newShape[c][N - 1 - r] = currentPiece.shape[r][c];
    const kicks = [[0, 0], [-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1], [0, -1], [0, -2], [-2, 0], [2, 0]];
    for (const [kx, ky] of kicks) if (isValidMove(kx, ky, newShape)) {
        currentPiece.x += kx; currentPiece.y += ky; currentPiece.shape = newShape;
        playSound(rotateSound);
        return;
    }
}

function movePiece(direction) { 
    if (currentPiece && isValidMove(direction, 0, currentPiece.shape)) {
        currentPiece.x += direction;
    }
}

function movePieceDown() {
    if (!currentPiece) return;
    if (isValidMove(0, 1, currentPiece.shape)) {
        currentPiece.y++;
        lastDropTime = performance.now();
    } else {
        mergePiece();
    }
}

function dropPiece() {
    if (!currentPiece) return;
    const startY = currentPiece.y;
    while (isValidMove(0, 1, currentPiece.shape)) currentPiece.y++;
    if (currentMode !== 'zen') score += (currentPiece.y - startY);
    mergePiece();
    playSound(dropSound);
}

// =================================================================================
// ===== BOARD LOGIC (TETRIS) =====
// =================================================================================
function initBoard() {
    board = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
}

function isValidMove(offsetX, offsetY, newShape, currentY = currentPiece.y, currentX = currentPiece.x) {
    if (!board || board.length === 0) return false;
    for (let r = 0; r < newShape.length; r++) for (let c = 0; c < newShape[r].length; c++) if (newShape[r][c]) {
        const newX = currentX + c + offsetX;
        const newY = currentY + r + offsetY;
        if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY] && board[newY][newX])) return false;
    }
    return true;
}

function mergePiece() {
    if (!currentPiece) return;
    boardHistory.push(JSON.parse(JSON.stringify(board)));
    if (boardHistory.length > 5) boardHistory.shift();
    currentPiece.shape.forEach((row, r) => row.forEach((cell, c) => { if (cell) { if (currentPiece.y + r < 0) { endGame(); return; } if (board[currentPiece.y + r]) board[currentPiece.y + r][currentPiece.x + c] = currentPiece.color; } }));
    checkLines();
}

function checkLines() {
    linesToClear = [];
    for (let r = ROWS - 1; r >= 0; r--) if (board[r] && board[r].every(cell => cell)) linesToClear.push(r);
    
    if (linesToClear.length > 0) {
        isAnimating = true;
        animationStart = performance.now();
        updateScore(linesToClear.length, isTSpin());
        if (linesToClear.length === 4) { playSound(tetrisSound); }
        else if (isTSpin()) { playSound(tSpinSound); }
        else { playSound(clearSound); }
        requestAnimationFrame(animateLineClear);
    } else {
        combo = 0;
        lastClearWasSpecial = false;
        generateNewPiece();
    }
}

function isTSpin() { 
    if (!currentPiece || currentPieceIndex !== T_SHAPE_INDEX) return false;
    let corners = 0; 
    const {x,y} = currentPiece; 
    if(!board[y] || y+2 >= ROWS || x<0 || x+2 >= COLS) return false; 
    if(board[y][x]) corners++; 
    if(board[y][x+2]) corners++; 
    if(board[y+2][x]) corners++; 
    if(board[y+2][x+2]) corners++; 
    return corners >= 3; 
}

// =================================================================================
// ===== INPUT HANDLERS =====
// =================================================================================
function handleKeydown(e) {
    if (activeGame !== 'tetris' || isPaused || gameOver || !currentPiece || !keyBindings) return;
    const key = e.key === ' ' ? 'Space' : e.key;
    if (key === keyBindings.left) {
        if (moveDirection === 1) stopARR();
        if (moveDirection !== -1) startARR(-1);
        moveDirection = -1;
    } else if (key === keyBindings.right) {
        if (moveDirection === -1) stopARR();
        if (moveDirection !== 1) startARR(1);
        moveDirection = 1;
    }
    const action = Object.keys(keyBindings).find(k => keyBindings[k] === key);
    if (!action) return;
    e.preventDefault();
    if (action === 'down') movePieceDown();
    else if (action === 'rotate') rotatePiece();
    else if (action === 'drop') dropPiece();
    else if (action === 'bomb') useBombAssist();
    else if (action === 'hammer') toggleHammerMode();
    else if (action === 'undo') useUndoAssist();
}

function handleKeyup(e) {
    if (activeGame !== 'tetris' || !keyBindings) return;
    const key = e.key === ' ' ? 'Space' : e.key;
    if ((key === keyBindings.left && moveDirection === -1) || (key === keyBindings.right && moveDirection === 1)) {
        stopARR();
        moveDirection = 0;
    }
}

function startARR(direction) {
    stopARR(); 
    movePiece(direction);
    dasTimer = setTimeout(() => {
        arrTimer = setInterval(() => {
            movePiece(direction);
        }, ARR_RATE);
    }, DAS_DELAY);
}

function stopARR() {
    clearTimeout(dasTimer);
    clearInterval(arrTimer);
    dasTimer = null;
    arrTimer = null;
}

function handleCanvasClick(e) { if (activeGame === 'tetris' && hammerMode && BLOCK_SIZE > 0) { const rect = canvas.getBoundingClientRect(), scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height, col = Math.floor(((e.clientX - rect.left) * scaleX) / BLOCK_SIZE), row = Math.floor(((e.clientY - rect.top) * scaleY) / BLOCK_SIZE); if (board[row]?.[col]) { assists.hammer--; board[row][col] = 0; score += 100; updateAssistsDisplay(); toggleHammerMode(); draw(); } } }
function handleCanvasHover(e) { if (activeGame === 'tetris' && hammerMode && BLOCK_SIZE > 0) { const rect = canvas.getBoundingClientRect(), scaleY = canvas.height / rect.height, row = Math.floor(((e.clientY - rect.top) * scaleY) / BLOCK_SIZE); if (row !== hammerLine) { hammerLine = row; draw(); } } }

function handleTouchStart(e) {
    if (activeGame !== 'tetris' || isPaused || gameOver || !currentPiece) return;
    e.preventDefault();
    
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    lastTouchY = touchStartY;
    touchStartTime = performance.now();
    initialPieceX = currentPiece.x;

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function handleTouchMove(e) {
    if (activeGame !== 'tetris' || isPaused || gameOver || !currentPiece) return;
    e.preventDefault();

    let currentX = e.touches[0].clientX;
    let currentY = e.touches[0].clientY;
    let deltaX = currentX - touchStartX;
    
    if (currentY - lastTouchY > BLOCK_SIZE) {
        movePieceDown();
        lastTouchY = currentY; 
    }
    
    const blocksMoved = Math.round(deltaX / BLOCK_SIZE);
    const newX = initialPieceX + blocksMoved;
    
    if (newX !== currentPiece.x) {
        if (isValidMove(newX - currentPiece.x, 0, currentPiece.shape)) {
            currentPiece.x = newX;
        }
    }
}

function handleTouchEnd(e) {
    if (activeGame !== 'tetris' || isPaused || gameOver || !currentPiece) return;
    if (e.changedTouches.length === 0) return;

    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    e.preventDefault();

    let touchEndX = e.changedTouches[0].clientX;
    let touchEndY = e.changedTouches[0].clientY;
    let deltaX = touchEndX - touchStartX;
    let deltaY = touchEndY - touchStartY;
    let touchDuration = performance.now() - touchStartTime;

    if (deltaY > HARD_DROP_MIN_Y_DISTANCE && touchDuration < FLICK_MAX_DURATION) {
        currentPiece.x = initialPieceX;
        dropPiece();
        return;
    }

    if (touchDuration < TAP_MAX_DURATION && Math.abs(deltaX) < TAP_MAX_DISTANCE && Math.abs(deltaY) < TAP_MAX_DISTANCE) {
        rotatePiece();
        return;
    }
}

// =================================================================================
// ===== GAME LOGIC (TETRIS) =====
// =================================================================================
function startGame() {
    activeGame = 'tetris';
    mainMenu.style.display = 'none';
    tetrisMenu.style.display = 'none';
    tetrisWrapper.style.display = 'flex';
    resizeGame();

    initBoard(); score = 0; level = 1; linesClearedTotal = 0;
    dropInterval = LEVEL_SPEED_CONFIG.BASE_INTERVAL;
    updateBestScoreDisplay();
    updateScoreDisplay(); updateLevelDisplay(); updateAssistsDisplay(); startTime = performance.now();
    gameOverScreen.style.display = 'none'; pauseScreen.style.display = 'none';
    gameOver = false; isPaused = false;
    currentPieceIndex = Math.floor(Math.random() * TETROMINOES.length); nextPieceIndex = Math.floor(Math.random() * TETROMINOES.length);
    generateNewPiece();
    playBackgroundMusic();
    lastDropTime = performance.now();
    
    if(animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
}

function endGame(isSprintWin = false, exitToMainMenu = false) {
    gameOver = true; 
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    pauseBackgroundMusic();
    
    const currentBest = bestScores[currentMode] || 0;
    if (score > currentBest) {
        bestScores[currentMode] = score;
        localStorage.setItem('bestScores', JSON.stringify(bestScores));
        updateBestScoreDisplay();
    }

    if (exitToMainMenu) {
        tetrisWrapper.style.display = 'none';
        mainMenu.style.display = 'flex';
        return;
    }
    if (gameOverTitle) {
        if (isSprintWin) { 
            finalTimeDisplay.textContent = `TIME: ${sprintTimerDisplay.textContent.split(': ')[1]}`; 
            finalTimeDisplay.style.display = 'block'; 
            gameOverTitle.textContent = 'PERFECT!'; 
        } else { 
            playSound(gameOverSound); 
            finalTimeDisplay.style.display = 'none'; 
            gameOverTitle.textContent = 'GAME OVER!'; 
        }
    }
    if(finalScoreDisplay) finalScoreDisplay.textContent = `Your Score: ${score}`;
    if(gameOverScreen) gameOverScreen.style.display = 'flex';
}

function togglePause() { 
    if (gameOver) return; 
    isPaused = !isPaused; 
    if (isPaused) { 
        if(animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        pauseStartTime = performance.now();
        pauseScreen.style.display = 'flex'; 
        pauseBackgroundMusic(); 
    } else { 
        const pauseDuration = performance.now() - pauseStartTime;
        lastDropTime += pauseDuration;
        if(isAnimating) animationStart += pauseDuration;
        
        pauseScreen.style.display = 'none'; 
        if (isAnimating) {
            animationFrameId = requestAnimationFrame(animateLineClear);
        } else {
            animationFrameId = requestAnimationFrame(gameLoop);
        }
        playBackgroundMusic(); 
    } 
}

function updateScore(lines, isTSpin) { 
    let points = 0, type = ''; 
    const b2b = lastClearWasSpecial && (isTSpin || lines === 4) ? 1.5 : 1; 
    
    if (isTSpin) {
        points = T_SPIN_POINTS.SINGLE * (lines > 0 ? lines : 0.5);
        type = `T-Spin ${['', 'Single', 'Double', 'Triple'][lines]}`; 
    } else { 
        points = [0, POINTS.SINGLE, POINTS.DOUBLE, POINTS.TRIPLE, POINTS.TETRIS][lines]; 
        type = ['', 'Single', 'Double', 'Triple', 'Tetris'][lines]; 
    } 
    
    score += Math.floor(points * b2b * level); 
    if (lines > 0) { 
        combo++; 
        if (b2b > 1) type = `B2B ${type}`; 
        showComboMessage(type, combo); 
        lastClearWasSpecial = isTSpin || lines === 4; 
    } else { 
        combo = 0; 
        lastClearWasSpecial = false; 
    } 
    if (score >= nextAssistReward) { 
        let assistType = ['bomb', 'hammer', 'undo'][Math.floor(Math.random() * 3)]; 
        assists[assistType]++; 
        nextAssistReward += 5000; 
        localStorage.setItem('assists', JSON.stringify(assists)); 
        updateAssistsDisplay(); 
    } 
    updateScoreDisplay(); 
}

function handleLinesCleared(lines) {
    if (lines === 0) return;
    linesClearedTotal += lines;
    linesClearedThisLevel += lines;

    if (linesClearedThisLevel >= 10) { 
        linesClearedThisLevel -= 10;
        level++;
        updateLevelDisplay();
        const { BASE_INTERVAL, MIN_INTERVAL, SPEED_INCREASE_PER_LEVEL } = LEVEL_SPEED_CONFIG;
        dropInterval = Math.max(MIN_INTERVAL, BASE_INTERVAL - (level - 1) * SPEED_INCREASE_PER_LEVEL);
    }
    updateScoreDisplay();
}

function useBombAssist() { if (!assistsBombButton.disabled) { playSound(bombSound); assists.bomb--; updateAssistsDisplay(); initBoard(); draw(); } }
function toggleHammerMode() { if (!assistsHammerButton.disabled) { hammerMode = !hammerMode; canvas.style.cursor = hammerMode ? 'crosshair' : 'default'; if (!hammerMode) { hammerLine = -1; draw(); } } }
function useUndoAssist() { if (!assistsUndoButton.disabled && boardHistory.length > 0) { assists.undo--; board = boardHistory.pop(); score = Math.max(0, score - 500); updateAssistsDisplay(); generateNewPiece(); draw(); } }

function gameLoop(timestamp) {
    if (gameOver || isPaused || isAnimating) {
        return;
    }
    
    const targetX = currentPiece.x * BLOCK_SIZE;
    visualX += (targetX - visualX) * SMOOTHING_FACTOR;
    
    if (Math.abs(targetX - visualX) < 0.5) {
        visualX = targetX;
    }

    if (timestamp - lastDropTime > dropInterval) { 
        movePieceDown();
    }
    draw(); 
    animationFrameId = requestAnimationFrame(gameLoop);
}

// =================================================================================
// ===== HELPER FUNCTIONS =====
// =================================================================================
// ... (Sve helper funkcije ostaju iste)

// =================================================================================
// ===== INITIALIZATION =====
// =================================================================================
// ... (Init funkcija sa svim proverama i listenerima)
