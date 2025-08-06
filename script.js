let isAnimating = false;
let linesToClear = [];
let animationStart = 0;
const animationDuration = 400; // Povećana trajanje animacije
let lastClearWasSpecial = false;

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

const T_SHAPE_INDEX = 5;

let canvas, ctx, nextBlockCanvas, nextBlockCtx;
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
let currentPiece, nextPiece;
let score = 0;
let gameOver = true;
let isPaused = false;
let combo = 0;
let assists = 0;
let bestScore = 0;
let nextAssistReward = 5000;

let dropInterval = 1000;
const dropSpeedDecreaseRate = 20;

let lastDropTime = 0;
let animationFrameId;
let currentPieceIndex, nextPieceIndex;
let COLORS;
let currentTheme;

let dropSound, clearSound, rotateSound, gameOverSound;
let startScreen, gameOverScreen, scoreDisplay, finalScoreDisplay, comboDisplay, startButton, restartButton, themeSwitcher, assistsContainer, assistsCountDisplay, bestScoreDisplay, pauseButton;

function setCanvasSize() {
    const mainGameWrapper = document.getElementById('main-game-wrapper');
    const containerWidth = mainGameWrapper.clientWidth - 20;
    const blockSizeFromWidth = Math.floor(containerWidth / COLS);
    
    const gameAreaHeight = window.innerHeight - 250;
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
    
    const nextBlockContainerSize = nextBlockCanvas.parentElement.clientWidth;
    nextBlockCanvas.width = nextBlockContainerSize;
    nextBlockCanvas.height = nextBlockContainerSize;
    
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
    
    COLS = 10;
    ROWS = 18;

    dropSound = document.getElementById('dropSound');
    clearSound = document.getElementById('clearSound');
    rotateSound = document.getElementById('rotateSound');
    gameOverSound = document.getElementById('gameOverSound');

    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over-screen');
    scoreDisplay = document.getElementById('score-display');
    finalScoreDisplay = document.getElementById('final-score');
    comboDisplay = document.getElementById('combo-display');
    startButton = document.getElementById('start-button');
    restartButton = document.getElementById('restart-button');
    pauseButton = document.getElementById('pause-button');
    assistsContainer = document.getElementById('assists-container');
    assistsCountDisplay = document.getElementById('assists-count');
    bestScoreDisplay = document.getElementById('best-score-display');
    themeSwitcher = document.getElementById('theme-switcher');
    
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    pauseButton.addEventListener('click', togglePause);
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

    // **NOVE, POBOLJŠANE TOUCH KONTROLE**
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let touchMoved = false;
    let lastPieceMoveTime = 0;
    const moveDelay = 100; // Dodato kašnjenje za horizontalni pokret

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        if (gameOver || isPaused || !currentPiece) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = touchStartX;
        lastTouchY = touchStartY;
        touchMoved = false;
        lastPieceMoveTime = performance.now();
    });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (gameOver || isPaused || !currentPiece) return;
        
        const currentTime = performance.now();
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const dx = currentX - lastTouchX;
        const dy = currentY - lastTouchY;
        const touchMoveThreshold = BLOCK_SIZE * 0.5;
        
        // Horizontalno prevlačenje sa odlaganjem
        if (Math.abs(dx) > touchMoveThreshold && currentTime - lastPieceMoveTime > moveDelay) {
            if (dx > 0) {
                if (isValidMove(1, 0, currentPiece.shape)) currentPiece.x++;
            } else {
                if (isValidMove(-1, 0, currentPiece.shape)) currentPiece.x--;
            }
            lastTouchX = currentX;
            touchMoved = true;
            lastPieceMoveTime = currentTime;
        }

        // Soft drop sa odlaganjem (ako se vuče polako, spušta se red po red)
        if (dy > touchMoveThreshold && currentTime - lastPieceMoveTime > moveDelay) {
            if (isValidMove(0, 1, currentPiece.shape)) {
                currentPiece.y++;
                score += 1;
                scoreDisplay.textContent = `Score: ${score}`;
            }
            lastTouchY = currentY;
            touchMoved = true;
            lastPieceMoveTime = currentTime;
        }

        draw();
    });

    canvas.addEventListener('touchend', e => {
        if (gameOver || isPaused || !currentPiece) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        const tapThreshold = 10;
        
        // Hard drop (brzi potez na dole, veći dy)
        if (dy > BLOCK_SIZE * 1.5 && Math.abs(dx) < BLOCK_SIZE) {
            dropPiece();
        }
        // Rotacija (kratak dodir/tap)
        else if (!touchMoved && Math.abs(dx) < tapThreshold && Math.abs(dy) < tapThreshold) {
            rotatePiece();
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
    const lightColor = lightenColor(color, 20);
    const darkColor = darkenColor(color, 20);

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

    const scaleFactor = Math.min(nextBlockCanvas.width / (shapeWidth * BLOCK_SIZE), nextBlockCanvas.height / (shapeHeight * BLOCK_SIZE));
    const nextBlockSize = BLOCK_SIZE * scaleFactor;
    
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
    score += rowsDropped * 2;
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
    
    if (timestamp - lastDropTime > dropInterval) {
        if (currentPiece && isValidMove(0, 1, currentPiece.shape)) {
            currentPiece.y++;
        } else if (currentPiece) {
            mergePiece();
        }
        lastDropTime = timestamp;
    }
    
    dropInterval = Math.max(100, 1000 - Math.floor(score / 100) * dropSpeedDecreaseRate);

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
        
        if (isBoardEmpty()) {
            showPerfectClearMessage();
        }
        
        generateNewPiece();
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
    pauseButton.style.display = 'block';
    
    initBoard();
    setCanvasSize();
    
    score = 0;
    combo = 0;
    nextAssistReward = 5000;
    scoreDisplay.textContent = `Score: ${score}`;
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    
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
                score += 1;
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
        case 'a':
            useAssist();
            break;
        case 'p':
            togglePause();
            break;
    }
    draw();
}

document.addEventListener('DOMContentLoaded', initDOMAndEventListeners);
