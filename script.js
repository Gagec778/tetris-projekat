// Postavke igre
let isAnimating = false;
let linesToClear = [];
let animationStart = 0;
const animationDuration = 400;
let lastClearWasSpecial = false;

const THEMES = {
    'classic': { background: '#1a1a2e', boardBackground: '#000', lineColor: '#61dafb', blockColors: ['#00FFFF', '#0000FF', '#FFA500', '#FFFF00', '#00FF00', '#800080', '#FF0000'], flashColor: '#FFFFFF', gridColor: '#333', backgroundImage: null },
    'dark': { background: '#0d0d0d', boardBackground: '#1c1c1c', lineColor: '#999999', blockColors: ['#00FFFF', '#3366FF', '#FF9933', '#FFFF00', '#33CC66', '#9966CC', '#FF3333'], flashColor: '#CCCCCC', gridColor: '#444', backgroundImage: null },
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

    requestAnimationFrame(() => {
        const containerWidth = canvasContainer.clientWidth;
        const containerHeight = canvasContainer.clientHeight;
        
        const blockSizeW = containerWidth / COLS;
        const blockSizeH = containerHeight / ROWS;
        BLOCK_SIZE = Math.floor(Math.min(blockSizeW, blockSizeH));

        const canvasWidth = COLS * BLOCK_SIZE;
        const canvasHeight = ROWS * BLOCK_SIZE;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;

        const sideCanvasSize = Math.floor(BLOCK_SIZE * 4.5);
        nextBlockCanvas.width = sideCanvasSize;
        nextBlockCanvas.height = sideCanvasSize;

        TOUCH_MOVE_THRESHOLD_X = BLOCK_SIZE * 0.8;
        TOUCH_MOVE_THRESHOLD_Y = BLOCK_SIZE;
        TAP_THRESHOLD = BLOCK_SIZE * 0.5;

        if (!gameOver) {
            draw();
            drawNextPiece();
        }
    });
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
    
    let touchStartX = 0, touchStartY = 0, lastTouchX = 0;
    let isSwipeLocked = false; 
    
    canvas.addEventListener('touchstart', e => {
        if (gameOver || isPaused || !currentPiece) return;
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = touchStartX;
        isSwipeLocked = false;
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if (gameOver || isPaused || !currentPiece) return;
        e.preventDefault();
        
        const currentTouchX = e.touches[0].clientX;
        const currentTouchY = e.touches[0].clientY;
        const dx = currentTouchX - lastTouchX;
        const totalDy = currentTouchY - touchStartY;

        if (totalDy > TOUCH_MOVE_THRESHOLD_Y && !isSwipeLocked) {
            isSwipeLocked = true;
        }

        if (!isSwipeLocked && Math.abs(dx) > TOUCH_MOVE_THRESHOLD_X) {
            movePiece(dx > 0 ? 1 : -1);
            lastTouchX = currentTouchX;
            draw();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        if (gameOver || isPaused || !currentPiece) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        if (dy > TOUCH_MOVE_THRESHOLD_Y * 2 && dy > Math.abs(dx)) {
            dropPiece();
        } 
        else if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) {
            rotatePiece();
        }
        
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
    context.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const { shape, color } = piece;
    if (!shape) return;
    
    // IZMENA: Uklonjen "+ 1" da bi blok bio veći
    const maxDim = Math.max(...shape.map(r => r.length), shape.length);
    const pieceBlockSize = Math.floor(canvasEl.width / maxDim); 
    
    const shapeWidth = shape.reduce((max, row) => Math.max(max, row.lastIndexOf(1) + 1), 0);
    const shapeHeight = shape.filter(row => row.includes(1)).length;
    
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

function drawNextPiece() { drawPieceInCanvas(nextPiece, nextBlockCtx, nextBlockCanvas); }

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = THEMES[currentTheme].boardBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = THEMES[currentTheme].gridColor;
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
        ctx.beginPath(); ctx.moveTo(i * BLOCK_SIZE, 0); ctx.lineTo(i * BLOCK_SIZE, canvas.height); ctx.stroke();
    }
    for (let i = 1; i < ROWS; i++) {
        ctx.beginPath(); ctx.moveTo(0, i * BLOCK_SIZE); ctx.lineTo(canvas.width, i * BLOCK_SIZE); ctx.stroke();
    }
    board.forEach((row, r) => row.forEach((cell, c) => { if (cell) drawBlock(c, r, cell); }));
    if (hammerLine !== -1) { ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; ctx.fillRect(0, hammerLine * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE); }
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
    if (currentMode !== 'zen') score += (currentPiece.y - startY);
    mergePiece();
    dropSound.currentTime = 0; dropSound.play().catch(console.error);
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
    for (let r = ROWS - 1; r >= 0; r--) if (board[r].every(cell => cell)) linesToClear.push(r);
    if (linesToClear.length > 0) { isAnimating = true; animationStart = performance.now(); updateScore(linesToClear.length, isTSpin()); if (linesToClear.length === 4) tetrisSound.play().catch(console.error); else if (isTSpin()) tSpinSound.play().catch(console.error); else clearSound.play().catch(console.error); }
    else { combo = 0; lastClearWasSpecial = false; generateNewPiece(); }
}
function isTSpin() { if (!currentPiece || currentPieceIndex !== T_SHAPE_INDEX) return false; let corners = 0; const {x,y} = currentPiece; if(!board[y] || y+2 >= ROWS) return false; if(x<0 || x+2 >= COLS) return false; if(board[y][x]) corners++; if(board[y][x+2]) corners++; if(board[y+2][x]) corners++; if(board[y+2][x+2]) corners++; return corners >= 3; }
function updateScore(lines, isTSpin) { let points = 0, type = ''; const b2b = lastClearWasSpecial && (isTSpin || lines === 4) ? 1.5 : 1; if (isTSpin) { points = [400, 800, 1200, 1600][lines]; type = `T-Spin ${['', 'Single', 'Double', 'Triple'][lines]}`; } else { points = [0, 100, 300, 500, 800][lines]; type = ['', 'Single', 'Double', 'Triple', 'Tetris'][lines]; } score += Math.floor(points * b2b * level); if (lines > 0) { combo++; if (b2b > 1) type = `B2B ${type}`; showComboMessage(type, combo); lastClearWasSpecial = isTSpin || lines === 4; } else { combo = 0; lastClearWasSpecial = false; } if (score >= nextAssistReward) { let assistType = ['bomb', 'hammer', 'undo'][Math.floor(Math.random() * 3)]; assists[assistType]++; nextAssistReward += 5000; localStorage.setItem('assists', JSON.stringify(assists)); updateAssistsDisplay(); } updateScoreDisplay(); }
function showComboMessage(type, count) { let msg = type; if (count > 1) msg += `\n${count}x Combo!`; if (msg) { comboDisplay.textContent = msg; comboDisplay.style.display = 'block'; setTimeout(() => comboDisplay.style.display = 'none', 1500); } }
function gameLoop(timestamp) {
    if (gameOver || isPaused) return;
    if (isAnimating) { animateLineClear(timestamp); return; }
    if (currentMode === 'sprint') sprintTimerDisplay.textContent = `TIME: ${((performance.now() - startTime) / 1000).toFixed(2)}s`;
    else if (currentMode === 'ultra') { const remaining = ultraTimeLimit - (performance.now() - startTime) / 1000; if (remaining <= 0) { endGame(); return; } ultraTimerDisplay.textContent = `TIME: ${remaining.toFixed(2)}s`; }
    if (timestamp - lastDropTime > dropInterval) { if (currentPiece) { if (isValidMove(0, 1, currentPiece.shape)) currentPiece.y++; else mergePiece(); } lastDropTime = timestamp; }
    draw(); animationFrameId = requestAnimationFrame(gameLoop);
}
function animateLineClear(timestamp) {
    const elapsed = timestamp - animationStart;
    if (elapsed >= animationDuration) {
        isAnimating = false;
        const linesClearedCount = linesToClear.length;
        linesToClear.sort((a, b) => a - b).reverse().forEach(r => board.splice(r, 1));
        for (let i = 0; i < linesClearedCount; i++) board.unshift(Array(COLS).fill(0));
        handleLinesCleared(linesClearedCount); 
        if (board.every(row => row.every(cell => !cell))) { score += 3000 * level; showComboMessage('Perfect Clear!', 0); }
        linesToClear = []; generateNewPiece();
        animationFrameId = requestAnimationFrame(gameLoop); return;
    }
    const progress = elapsed / animationDuration; drawBoard();
    linesToClear.forEach(r => { const p = Math.sin(progress * Math.PI); ctx.globalAlpha = 1 - p; board[r].forEach((cell, c) => { if (cell) drawBlock(c, r, cell); }); ctx.globalAlpha = 1; });
    drawCurrentPiece(); requestAnimationFrame(animateLineClear);
}
function draw() { ctx.clearRect(0, 0, canvas.width, canvas.height); drawBoard(); drawGhostPiece(); drawCurrentPiece(); }
function endGame(isSprintWin = false, exitToMainMenu = false) {
    gameOver = true; if (animationFrameId) cancelAnimationFrame(animationFrameId); pauseBackgroundMusic();
    if (exitToMainMenu) { startScreen.style.display = 'flex'; gameOverScreen.style.display = 'none'; return; }
    if (isSprintWin) { finalTimeDisplay.textContent = `TIME: ${sprintTimerDisplay.textContent.split(': ')[1]}`; finalTimeDisplay.style.display = 'block'; document.getElementById('game-over-title').textContent = 'PERFECT!'; }
    else { gameOverSound.play().catch(console.error); finalTimeDisplay.style.display = 'none'; document.getElementById('game-over-title').textContent = 'GAME OVER!'; }
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    if (score > bestScore) { bestScore = score; localStorage.setItem('bestScore', bestScore); bestScoreDisplay.textContent = `${bestScore}`; }
    gameOverScreen.style.display = 'flex';
}
function startGame() {
    initBoard(); score = 0; level = 1; linesClearedTotal = 0; linesClearedThisLevel = 0; dropInterval = 1000;
    updateScoreDisplay(); updateLevelDisplay(); updateAssistsDisplay(); startTime = performance.now();
    sprintTimerDisplay.style.display = currentMode === 'sprint' ? 'block' : 'none';
    ultraTimerDisplay.style.display = currentMode === 'ultra' ? 'block' : 'none';
    startScreen.style.display = 'none'; gameOverScreen.style.display = 'none'; pauseScreen.style.display = 'none';
    gameOver = false; isPaused = false;
    currentPieceIndex = Math.floor(Math.random() * TETROMINOES.length); nextPieceIndex = Math.floor(Math.random() * TETROMINOES.length);
    generateNewPiece();
    if (currentMode !== 'zen') playBackgroundMusic();
    lastDropTime = performance.now(); animationFrameId = requestAnimationFrame(gameLoop);
}
function updateScoreDisplay() { scoreDisplay.textContent = `Score: ${score}`; }
function updateLevelDisplay() { levelDisplay.textContent = `Level: ${level}`; }
function updateAssistsDisplay() { assistsBombCountDisplay.textContent = assists.bomb; assistsHammerCountDisplay.textContent = assists.hammer; assistsUndoCountDisplay.textContent = assists.undo; }
function togglePause() { if (gameOver) return; isPaused = !isPaused; if (isPaused) { cancelAnimationFrame(animationFrameId); pauseScreen.style.display = 'flex'; pauseBackgroundMusic(); } else { pauseScreen.style.display = 'none'; lastDropTime = performance.now(); animationFrameId = requestAnimationFrame(gameLoop); if (currentMode !== 'zen') playBackgroundMusic(); } }
function showExitModal() { if (isPaused || gameOver) return; isPaused = true; cancelAnimationFrame(animationFrameId); pauseBackgroundMusic(); exitModal.style.display = 'flex'; }
function handleKeydown(e) {
    if (isPaused || gameOver || !currentPiece) return;
    const key = e.key === ' ' ? 'Space' : e.key;
    const action = Object.keys(keyBindings).find(k => keyBindings[k] === key);
    if (!action) return;
    e.preventDefault();
    if (action === 'left') movePiece(-1);
    else if (action === 'right') movePiece(1);
    else if (action === 'down') movePieceDown();
    else if (action === 'rotate') rotatePiece();
    else if (action === 'drop') dropPiece();
    else if (action === 'bomb') useBombAssist();
    else if (action === 'hammer') toggleHammerMode();
    else if (action === 'undo') useUndoAssist();
    draw();
}
function useBombAssist() { if (assists.bomb > 0) { assists.bomb--; let r = Math.floor(Math.random() * 5) + 10; for (let i = 0; i < 3; i++) if (r + i < ROWS) for (let c = 0; c < COLS; c++) board[r + i][c] = 0; bombSound.play().catch(console.error); score += bombBonus; updateAssistsDisplay(); localStorage.setItem('assists', JSON.stringify(assists)); draw(); } }
function toggleHammerMode() { if (assists.hammer > 0) { hammerMode = !hammerMode; canvas.style.cursor = hammerMode ? 'crosshair' : 'default'; if (!hammerMode) { hammerLine = -1; draw(); } } }
function handleCanvasClick(e) { if (hammerMode) { const rect = canvas.getBoundingClientRect(), scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height, col = Math.floor(((e.clientX - rect.left) * scaleX) / BLOCK_SIZE), row = Math.floor(((e.clientY - rect.top) * scaleY) / BLOCK_SIZE); if (board[row]?.[col]) { assists.hammer--; board[row][col] = 0; score += 100; updateAssistsDisplay(); localStorage.setItem('assists', JSON.stringify(assists)); toggleHammerMode(); draw(); } } }
function handleCanvasHover(e) { if (hammerMode) { const rect = canvas.getBoundingClientRect(), scaleY = canvas.height / rect.height, row = Math.floor(((e.clientY - rect.top) * scaleY) / BLOCK_SIZE); if (row !== hammerLine) { hammerLine = row; draw(); } } }
function useUndoAssist() { if (assists.undo > 0 && boardHistory.length > 0) { assists.undo--; board = boardHistory.pop(); score = Math.max(0, score - 500); updateAssistsDisplay(); localStorage.setItem('assists', JSON.stringify(assists)); generateNewPiece(); draw(); } }
function handleLinesCleared(lines) {
    if (lines === 0) return;
    linesClearedTotal += lines; linesClearedThisLevel += lines;
    if (currentMode === 'sprint' && linesClearedTotal >= 40) endGame(true);
    if (currentMode !== 'zen' && currentMode !== 'ultra' && linesClearedThisLevel >= 10) { linesClearedThisLevel -= 10; level++; updateLevelDisplay(); if (currentMode !== 'sprint') dropInterval = Math.max(100, 1000 - (level - 1) * 50); }
    updateScoreDisplay();
}

document.addEventListener('DOMContentLoaded', initDOMAndEventListeners);
