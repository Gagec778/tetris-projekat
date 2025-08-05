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
// FUNKCIJA ZA PRILAGOĐAVANJE VELIČINE (ISPRAVLJENA)
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
}

// OBRISAN JE POZIV setCanvasSize() ODAVDE. SADA SE POZIVA SAMO KADA JE POTREBNO.
window.addEventListener('resize', () => {
    setCanvasSize();
    draw(); // Dodatno crtanje nakon promene veličine
    drawNextPiece();
});

const COLORS = [
    '#00FFFF', // I - Cyan
    '#0000FF', // J - Blue
    '#FFA500', // L - Orange
    '#FFFF00', // O - Yellow
    '#00FF00', // S - Green
    '#800080', // T - Purple
    '#FF0000'  // Z - Red
];

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
let gameInterval;
let dropInterval = 1000;
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

// NOVE PROMENLJIVE ZA ČUVANJE INDEKSA BLOKOVA
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

// ----------------------------------------------
// NOVE POMOĆNE FUNKCIJE ZA KREIRANJE BLOKOVA
// ----------------------------------------------
function createCurrentPiece() {
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

// ----------------------------------------------
// ISPRAVLJENA I POJEDNOSTAVLJENA FUNKCIJA generateNewPiece()
// ----------------------------------------------
function generateNewPiece() {
    if (nextPieceIndex !== undefined) {
        // Ako postoji sledeći blok, promovišemo ga
        currentPieceIndex = nextPieceIndex;
    } else {
        // Generišemo prvi blok na početku igre
        currentPieceIndex = Math.floor(Math.random() * TETROMINOES.length);
    }
    
    // Uvek kreiramo 'currentPiece' objekat sa pravilnim koordinatama
    createCurrentPiece();

    // Generišemo novi indeks za sledeći blok
    nextPieceIndex = Math.floor(Math.random() * TETROMINOES.length);
    nextPiece = {
        shape: TETROMINOES[nextPieceIndex],
        color: COLORS[nextPieceIndex],
        x: 0, // Ove koordinate su samo za prikaz u malom prozoru
        y: 0
    };

    drawNextPiece();

    if (!isValidMove(0, 0, currentPiece.shape)) {
        endGame();
    }
}

function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// ----------------------------------------------
// ISPRAVLJENA FUNKCIJA drawPiece()
// ----------------------------------------------
function drawPiece(piece, context, blockSizeOverride = null) {
    if (!piece) return; // PROVERA KOJA SPREČAVA GREŠKU
    
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    const currentBlockSize = blockSizeOverride !== null ? blockSizeOverride : BLOCK_SIZE;

    let drawX = piece.x;
    let drawY = piece.y;
    if (context === nextBlockCtx) {
        const pieceWidth = piece.shape[0].length * (currentBlockSize / 2);
        const pieceHeight = piece.shape.length * (currentBlockSize / 2);
        drawX = (context.canvas.width - pieceWidth) / (2 * (currentBlockSize / 2));
        drawY = (context.canvas.height - pieceHeight) / (2 * (currentBlockSize / 2));
    }

    for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c]) {
                context.fillStyle = piece.color;
                context.fillRect((c + drawX) * currentBlockSize, (r + drawY) * currentBlockSize, currentBlockSize, currentBlockSize);
                context.strokeStyle = '#222';
                context.lineWidth = 1;
                context.strokeRect((c + drawX) * currentBlockSize, (r + drawY) * currentBlockSize, currentBlockSize, currentBlockSize);
            }
        }
    }
}


// ----------------------------------------------
// ISPRAVLJENA FUNKCIJA drawNextPiece()
// ----------------------------------------------
function drawNextPiece() {
    if (nextPieceIndex === undefined) { // PROVERA KOJA SPREČAVA GREŠKU
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
                nextBlockCtx.fillStyle = nextColor;
                nextBlockCtx.fillRect(startX + c * nextBlockSize, startY + r * nextBlockSize, nextBlockSize, nextBlockSize);
                nextBlockCtx.strokeStyle = '#222';
                nextBlockCtx.lineWidth = 1;
                nextBlockCtx.strokeRect(startX + c * nextBlockSize, startY + r * nextBlockSize, nextBlockSize, nextBlockSize);
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
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
}

// ----------------------------------------------
// ISPRAVLJENA FUNKCIJA drawCurrentPiece()
// ----------------------------------------------
function drawCurrentPiece() {
    if (!currentPiece) return; // PROVERA KOJA SPREČAVA GREŠKU
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                drawBlock(currentPiece.x + c, currentPiece.y + r, currentPiece.color);
            }
        }
    }
}

function isValidMove(offsetX, offsetY, newShape) {
    for (let r = 0; r < newShape.length; r++) {
        for (let c = 0; c < newShape[r].length; c++) {
            if (newShape[r][c]) {
                const newX = currentPiece.x + c + offsetX;
                const newY = currentPiece.y + r + offsetY;

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
    while (isValidMove(0, 1, currentPiece.shape)) {
        currentPiece.y++;
    }
    mergePiece();
    dropSound.currentTime = 0;
    dropSound.play().catch(e => console.error("Greška pri puštanju dropSounda:", e));
}

function mergePiece() {
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
    generateNewPiece();
}

function checkLines() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        let isFull = true;
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c]) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            linesCleared++;
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
            r++;
            clearSound.currentTime = 0;
            if (clearSound.readyState >= 2) {
                clearSound.play().catch(e => console.error("Greška pri puštanju clearSounda:", e));
            }
        }
    }

    if (linesCleared > 0) {
        combo++;
        showComboMessage(linesCleared, combo);
        updateScore(linesCleared, combo);
        
        if (score % 500 === 0 && dropInterval > 100) {
            dropInterval -= 50;
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, dropInterval);
        }
    } else {
        combo = 0;
    }
}

function updateScore(lines, comboCount) {
    const scoreMap = [0, 100, 300, 500, 800];
    let comboMultiplier = comboCount > 1 ? comboCount * 2 : 1;
    
    if (lines > 0) {
        const addedScore = scoreMap[lines] * comboMultiplier;
        score += addedScore;
    }
    scoreDisplay.textContent = `Score: ${score}`;

    if (score >= nextAssistReward) {
        assists++;
        nextAssistReward += 5000;
        localStorage.setItem('assists', assists);
        updateAssistsDisplay();
    }
}

// ----------------------------------------------
// ISPRAVLJENA FUNKCIJA showComboMessage()
// ----------------------------------------------
function showComboMessage(linesCleared, comboCount) {
    let message = '';

    // Ako je u pitanju uzastopno brisanje linija (combo chain), prikaži dužinu lanca
    if (comboCount > 1) {
        message = `${comboCount}x COMBO!`;
    } 
    // Inače, ako je prvi put obrisano više linija, prikaži broj obrisanih linija
    else if (linesCleared > 1) {
        message = `${linesCleared}x COMBO!`;
    }

    if (message) {
        comboDisplay.textContent = message;
        comboDisplay.style.display = 'block';
        setTimeout(() => {
            comboDisplay.style.display = 'none';
        }, 1500);
    }
}

function gameLoop() {
    if (gameOver || isPaused) return;

    if (isValidMove(0, 1, currentPiece.shape)) {
        currentPiece.y++;
    } else {
        mergePiece();
    }
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawCurrentPiece();
}

function endGame() {
    gameOver = true;
    clearInterval(gameInterval);
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
    
    gameOverScreen.style.display = 'flex';
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

    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    controlsDiv.style.display = 'flex';
    pauseButton.style.display = 'block';
    
    // VAŽNO: Ovde prvo inicijalizujemo ploču, pa generišemo delove
    initBoard();
    setCanvasSize(); // VAŽNO: Nakon što su elementi vidljivi, postavljamo veličinu
    generateNewPiece();
    
    score = 0;
    combo = 0;
    nextAssistReward = 5000;
    scoreDisplay.textContent = `Score: ${score}`;
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    
    updateAssistsDisplay();
    
    gameOver = false;
    isPaused = false;
    pauseButton.textContent = "PAUSE";
    dropInterval = 1000;
    
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, dropInterval);
    
    draw(); // VAŽNO: Tek sada pozivamo crtanje, kada su delovi kreirani
}

function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        clearInterval(gameInterval);
        pauseButton.textContent = "RESUME";
    } else {
        gameInterval = setInterval(gameLoop, dropInterval);
        pauseButton.textContent = "PAUSE";
    }
}

function updateAssistsDisplay() {
    assistsCountDisplay.textContent = assists;
}

function useAssist() {
    if (assists > 0) {
        initBoard();
        
        assists--;
        localStorage.setItem('assists', assists);
        updateAssistsDisplay();
        
        draw();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setCanvasSize(); // Pozivamo setCanvasSize samo na početku, ne i unutar funkcije
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
    // Ne pozivamo draw() ovde, jer delovi jos uvek ne postoje
});

document.addEventListener('keydown', e => {
    if (gameOver || isPaused || !currentPiece) return;
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

