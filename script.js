// Postavke platna
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextBlockCanvas = document.getElementById('nextBlockCanvas');
const nextBlockCtx = nextBlockCanvas.getContext('2d');

const COLS = 10;
const ROWS = 18;

const mainGameWrapper = document.getElementById('main-game-wrapper');
let BLOCK_SIZE;

// ----------------------------------------------
// NOVE PROMENLJIVE ZA GAMEPLAY I IZGLED
// ----------------------------------------------
let isAnimating = false; // Za animaciju čišćenja linije
let linesToClear = []; // Redovi koji čekaju na animaciju
let animationStart = 0;
const animationDuration = 200; // u milisekundama

let lastClearWasSpecial = false; // Za Back-to-Back bonuse

let currentTheme = 'classic';
const THEMES = {
    'classic': {
        background: '#1a1a2e',
        boardBackground: '#000',
        lineColor: '#61dafb',
        blockColors: ['#00FFFF', '#0000FF', '#FFA500', '#FFFF00', '#00FF00', '#800080', '#FF0000']
    },
    'dark': {
        background: '#0d0d0d',
        boardBackground: '#1c1c1c',
        lineColor: '#999999',
        blockColors: ['#00FFFF', '#3366FF', '#FF9933', '#FFFF00', '#33CC66', '#9966CC', '#FF3333']
    },
    'forest': {
        background: '#0a1d0d',
        boardBackground: '#263a29',
        lineColor: '#b4cf66',
        blockColors: ['#66FFB2', '#339966', '#FF9900', '#FFFF66', '#33CC66', '#9966CC', '#FF3333']
    }
};

const T_SHAPE_INDEX = 5; // Indeks T bloka u TETROMINOES nizu

// ----------------------------------------------
// FUNKCIJA ZA PRILAGOĐAVANJE VELIČINE (POPRAVLJENA)
// ----------------------------------------------
function setCanvasSize() {
    if (!mainGameWrapper) return;

    const containerWidth = mainGameWrapper.clientWidth;
    const blockSizeFromWidth = Math.floor(containerWidth / COLS);
    
    const gameAreaHeight = window.innerHeight - 150;
    const blockSizeFromHeight = Math.floor(gameAreaHeight / ROWS);
    
    BLOCK_SIZE = Math.min(blockSizeFromWidth, blockSizeFromHeight);

    if (BLOCK_SIZE > 35) {
        BLOCK_SIZE = 35;
    }
    
    if (BLOCK_SIZE < 1) {
        BLOCK_SIZE = 1;
    }

    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;

    const nextBlockContainerSize = Math.floor(BLOCK_SIZE * 4);
    nextBlockCanvas.width = nextBlockContainerSize;
    nextBlockCanvas.height = nextBlockContainerSize;
    
    // VAŽNO: Nakon promene veličine, ponovo crtamo sve
    if (!gameOver && !isPaused) {
        draw();
        drawNextPiece();
    }
}

window.addEventListener('resize', setCanvasSize);

let COLORS;
const TETROMINOES = [
    // I
    [[0, 0, 0, 0],
     [1, 1, 1, 1],
     [0, 0, 0, 0],
     [0, 0, 0, 0]],
    // J
    [[1, 0, 0],
     [1, 1, 1],
     [0, 0, 0]],
    // L
    [[0, 0, 1],
     [1, 1, 1],
     [0, 0, 0]],
    // O
    [[1, 1],
     [1, 1]],
    // S
    [[0, 1, 1],
     [1, 1, 0],
     [0, 0, 0]],
    // T
    [[0, 1, 0],
     [1, 1, 1],
     [0, 0, 0]],
    // Z
    [[1, 1, 0],
     [0, 1, 1],
     [0, 0, 0]]
];

let board = [];
let currentPiece;
let nextPiece;
let score = 0;
let gameOver = false;

// --- PROMENA: ZAMENA setInterval sa requestAnimationFrame ---
let dropInterval = 1000;
let lastDropTime = 0;
let animationFrameId;
// --- KRAJ PROMENE ---

let combo = 0;

let bestScore = 0;
let isPaused = false;
let assists;

let nextAssistReward = 5000;
const assistsContainer = document.getElementById('assists-container');
const assistsCountDisplay = document.getElementById('assists-count');
const bestScoreDisplay = document.getElementById('best-score-display');
const pauseButton = document.getElementById('pause-button');

const dropSound = document.getElementById('dropSound');
const clearSound = document.getElementById('clearSound');
const rotateSound = document.getElementById('rotateSound');
const gameOverSound = document.getElementById('gameOverSound');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScoreDisplay = document.getElementById('final-score');
const controlsDiv = document.getElementById('controls');
const comboDisplay = document.getElementById('combo-display');

const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const themeSwitcher = document.getElementById('theme-switcher');

let currentPieceIndex;
let nextPieceIndex;

function initBoard() {
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

function drawBlock(x, y, color, context = ctx) {
    if (!context) return;
    const lightColor = lightenColor(color, 20);
    const darkColor = darkenColor(color, 20);

    const blockSize = (context === nextBlockCtx) ? BLOCK_SIZE / 2 : BLOCK_SIZE;

    // Lice bloka
    context.fillStyle = color;
    context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);

    // Gornja i leva ivica
    context.fillStyle = lightColor;
    context.beginPath();
    context.moveTo(x * blockSize, y * blockSize);
    context.lineTo((x + 1) * blockSize, y * blockSize);
    context.lineTo((x + 1) * blockSize - 2, y * blockSize + 2);
    context.lineTo(x * blockSize + 2, y * blockSize + 2);
    context.lineTo(x * blockSize + 2, (y + 1) * blockSize - 2);
    context.lineTo(x * blockSize, (y + 1) * blockSize);
    context.closePath();
    context.fill();

    // Donja i desna ivica
    context.fillStyle = darkColor;
    context.beginPath();
    context.moveTo((x + 1) * blockSize, (y + 1) * blockSize);
    context.lineTo((x + 1) * blockSize, y * blockSize);
    context.lineTo((x + 1) * blockSize - 2, y * blockSize + 2);
    context.lineTo((x + 1) * blockSize - 2, (y + 1) * blockSize - 2);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo((x + 1) * blockSize, (y + 1) * blockSize);
    context.lineTo(x * blockSize, (y + 1) * blockSize);
    context.lineTo(x * blockSize + 2, (y + 1) * blockSize - 2);
    context.lineTo((x + 1) * blockSize - 2, (y + 1) * blockSize - 2);
    context.closePath();
    context.fill();

    context.strokeStyle = '#222';
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

    ctx.globalAlpha = 0.1;
    
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                const color = currentPiece.color;
                ctx.fillStyle = color;
                ctx.fillRect((currentPiece.x + c) * BLOCK_SIZE, (ghostY + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect((currentPiece.x + c) * BLOCK_SIZE, (ghostY + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
    ctx.globalAlpha = 1.0;
}

function drawNextPiece() {
    if (nextPieceIndex === undefined) {
        nextBlockCtx.clearRect(0, 0, nextBlockCanvas.width, nextBlockCanvas.height);
        return;
    }
    const nextBlockSize = BLOCK_SIZE / 2;
    nextBlockCtx.clearRect(0, 0, nextBlockCanvas.width, nextBlockCanvas.height);
    
    const nextShape = TETROMINOES[nextPieceIndex];
    const nextColor = COLORS[nextPieceIndex];
    
    const pieceWidth = nextShape[0].length * nextBlockSize;
    const pieceHeight = nextShape.length * nextBlockSize;
    
    const startX = (nextBlockCanvas.width - pieceWidth) / 2;
    const startY = (nextBlockCanvas.height - pieceHeight) / 2;

    for (let r = 0; r < nextShape.length; r++) {
        for (let c = 0; c < nextShape[r].length; c++) {
            if (nextShape[r][c]) {
                drawBlock(startX/nextBlockSize + c, startY/nextBlockSize + r, nextColor, nextBlockCtx);
            }
        }
    }
}

function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawBlock(c, r, board[r][c]);
            } else {
                ctx.fillStyle = THEMES[currentTheme].boardBackground;
                ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
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
    if (!currentPiece) return; // PROVERA DA LI POSTOJI BLOK
    while (isValidMove(0, 1, currentPiece.shape)) {
        currentPiece.y++;
    }
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
                board[currentPiece.y + r][currentPiece.x + c] = currentPiece.color;
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
        
        let isSpecial = false;
        if (isTSpin()) {
            isSpecial = true;
        } else if (linesToClear.length === 4) {
            isSpecial = true;
        }

        if (lastClearWasSpecial && isSpecial) {
            updateScore(linesToClear.length, true, isTSpin());
            lastClearWasSpecial = true;
        } else {
            updateScore(linesToClear.length, false, isTSpin());
            lastClearWasSpecial = isSpecial;
        }

        clearSound.currentTime = 0;
        if (clearSound.readyState >= 2) {
            clearSound.play().catch(e => console.error("Greška pri puštanju clearSounda:", e));
        }
        
        // ZAVRŠAVA FUNKCIJU BEZ GENERISANJA NOVOG BLOKA
        // Novi blok će biti generisan nakon animacije.
        return; 
    } else {
        lastClearWasSpecial = false;
        combo = 0;
        generateNewPiece();
    }
}

function updateScore(lines, isBackToBack, isTSpinClear) {
    let points = 0;
    let type = '';

    if (isTSpinClear) {
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
    
    let comboMultiplier = combo > 0 ? combo : 1;
    let backToBackBonus = isBackToBack ? 1.5 : 1;
    
    score += points * comboMultiplier * backToBackBonus;
    scoreDisplay.textContent = `Score: ${score}`;
    
    if (lines > 0) {
        combo++;
        showComboMessage(type, combo);
    } else {
        combo = 0;
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
    if (comboCount > 1) message += ` ${comboCount}x Combo!`;

    if (message) {
        comboDisplay.textContent = message;
        comboDisplay.style.display = 'block';
        setTimeout(() => {
            comboDisplay.style.display = 'none';
        }, 1500);
    }
}

function gameLoop(timestamp) {
    if (gameOver || isPaused) {
        return;
    }

    if (isAnimating) {
        // Kada je animacija aktivna, samo pozivamo nju i izlazimo
        animateLineClear(timestamp);
        return;
    }
    
    if (timestamp - lastDropTime > dropInterval) {
        if (isValidMove(0, 1, currentPiece.shape)) {
            currentPiece.y++;
        } else {
            mergePiece();
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
        for (const r of linesToClear) {
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
        }
        linesToClear = [];
        generateNewPiece();
        // SADA POKREĆEMO NOVI FRAME GLAVNE PETLJE
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    draw();

    for (const r of linesToClear) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                const blockSize = BLOCK_SIZE * (1 - progress);
                const x = c * BLOCK_SIZE + BLOCK_SIZE * progress / 2;
                const y = r * BLOCK_SIZE + BLOCK_SIZE * progress / 2;
                
                ctx.fillStyle = lightenColor(board[r][c], 100);
                ctx.fillRect(x, y, blockSize, blockSize);
            }
        }
    }
    requestAnimationFrame(animateLineClear);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawGhostPiece();
    drawCurrentPiece();
}

function endGame() {
    gameOver = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    gameOverSound.currentTime = 0;
    if (gameOverSound.readyState >= 2) {
        gameOverSound.play().catch(e => console.error("Greška pri puštanju gameOverSounda:", e));
    }
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        bestScoreDisplay.textContent = `BEST: ${bestScore}`;
    }
    
    gameOverScreen.classList.add('show');
    controlsDiv.style.display = 'none';
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
    
    startScreen.classList.remove('show');
    gameOverScreen.classList.remove('show');
    controlsDiv.style.display = 'flex';
    pauseButton.style.display = 'block';
    
    initBoard();
    setCanvasSize();
    generateNewPiece(); // POPRAVLJENO: Pozivamo generisanje bloka odmah na početku
    
    score = 0;
    combo = 0;
    nextAssistReward = 5000;
    scoreDisplay.textContent = `Score: ${score}`;
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    
    updateAssistsDisplay();
    
    gameOver = false;
    isPaused = false;
    pauseButton.textContent = "PAUSE";
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
    
    draw();
}

function togglePause() {
    if (gameOver || isAnimating) return;
    isPaused = !isPaused;
    if (isPaused) {
        cancelAnimationFrame(animationFrameId);
        pauseButton.textContent = "RESUME";
    } else {
        animationFrameId = requestAnimationFrame(gameLoop);
        pauseButton.textContent = "PAUSE";
    }
}

function updateAssistsDisplay() {
    assistsCountDisplay.textContent = assists;
    if (assists > 0) {
        assistsContainer.classList.add('has-assists');
    } else {
        assistsContainer.classList.remove('has-assists');
    }
}

function useAssist() {
    if (assists > 0 && !gameOver && !isPaused && !isAnimating) {
        initBoard();
        
        assists--;
        localStorage.setItem('assists', assists);
        updateAssistsDisplay();
        
        generateNewPiece(); // POPRAVLJENO: Generišemo novi blok nakon čišćenja table
        
        draw();
    }
}

function setTheme(themeName) {
    currentTheme = themeName;
    COLORS = THEMES[themeName].blockColors;
    document.body.style.background = `linear-gradient(to bottom right, ${THEMES[themeName].background}, #16213e, #0f3460)`; // Popravljena linija
    document.documentElement.style.setProperty('--main-color', THEMES[themeName].lineColor);
    localStorage.setItem('theme', themeName);
    
    setCanvasSize();
}

document.addEventListener('DOMContentLoaded', () => {
    const storedTheme = localStorage.getItem('theme') || 'classic';
    setTheme(storedTheme);
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
    startScreen.classList.add('show');
});

document.addEventListener('keydown', e => {
    if (gameOver || isPaused || isAnimating || !currentPiece) return;
    switch (e.key) {
        case 'ArrowLeft':
            if (isValidMove(-1, 0, currentPiece.shape)) currentPiece.x--;
            break;
        case 'ArrowRight':
            if (isValidMove(1, 0, currentPiece.shape)) currentPiece.x++;
            break;
        case 'ArrowDown':
            if (isValidMove(0, 1, currentPiece.shape)) currentPiece.y++;
            break;
        case 'ArrowUp':
            rotatePiece();
            break;
        case ' ':
            e.preventDefault();
            dropPiece();
            break;
        case 'a':
            useAssist();
            break;
        case 'p':
            togglePause();
            break;
    }
    draw();
});

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);
themeSwitcher.addEventListener('change', (e) => setTheme(e.target.value));

assistsContainer.addEventListener('click', () => {
    if (gameOver || isPaused) return;
    useAssist();
});

let touchStartX = 0;
let touchStartY = 0;
let touchMoveX = 0;
let touchMoveY = 0;
let touchStartTime = 0;
let isDragging = false;
const DRAG_THRESHOLD = 15;
const HARD_DROP_THRESHOLD = 100;

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (gameOver || isPaused || !currentPiece) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchMoveX = touchStartX;
    touchMoveY = touchStartY;
    touchStartTime = new Date().getTime();
    isDragging = false;
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (gameOver || isPaused || !currentPiece) return;

    const newTouchMoveX = e.touches[0].clientX;
    const newTouchMoveY = e.touches[0].clientY;
    const diffX = newTouchMoveX - touchMoveX;
    const diffY = newTouchMoveY - touchMoveY;

    if (Math.abs(diffX) > BLOCK_SIZE) {
        if (diffX > 0) {
            if (isValidMove(1, 0, currentPiece.shape)) currentPiece.x++;
        } else {
            if (isValidMove(-1, 0, currentPiece.shape)) currentPiece.x--;
        }
        touchMoveX = newTouchMoveX;
        isDragging = true;
        draw();
    }
    
    if (diffY > BLOCK_SIZE) {
        if (isValidMove(0, 1, currentPiece.shape)) currentPiece.y++;
        touchMoveY = newTouchMoveY;
        isDragging = true;
        draw();
    }
});

canvas.addEventListener('touchend', e => {
    if (gameOver || isPaused || !currentPiece) return;
    const touchEndTime = new Date().getTime();
    const touchDuration = touchEndTime - touchStartTime;
    const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);

    if (touchDuration < 250 && dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
        rotatePiece();
        draw();
    }
    else if (touchDuration < 250 && dy > HARD_DROP_THRESHOLD) {
        dropPiece();
        draw();
    }
});
