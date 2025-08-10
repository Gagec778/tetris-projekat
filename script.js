// =================================================================================
// ===== KONSTANTE I PODEŠAVANJA =====
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
const TAP_DURATION_THRESHOLD = 200; // Vreme za tap
const TAP_DISTANCE_THRESHOLD = 20;  // Maksimalno pomeranje za tap

const TETROMINOES = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[1, 1], [1, 1]],
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
];

// =================================================================================
// ===== GLOBALNE VARIJABLE I STANJE IGRE =====
// =================================================================================
let canvas, ctx, nextBlockCanvas, nextBlockCtx;
let animationFrameId;
let isAnimating = false;
let animationStart = 0;
const animationDuration = 400;
let board = [];
let boardHistory = [];
let currentPiece, nextPiece;
let score = 0, bestScore = 0;
let level = 1, linesClearedThisLevel = 0, linesClearedTotal = 0;
let combo = 0, lastClearWasSpecial = false;
let gameOver = true, isPaused = false, hammerMode = false;
let startTime, lastDropTime = 0, dropInterval = 1000;
const ultraTimeLimit = 120;
let assists = { bomb: 0, hammer: 0, undo: 0 };
let nextAssistReward = 5000;
let bombBonus = 1500;
let hammerLine = -1;
let currentPieceIndex, nextPieceIndex;
let keyBindings;
let dasTimer = null, arrTimer = null, moveDirection = 0;
let visualOffsetX = 0;
let BLOCK_SIZE;
let linesToClear = [];
let COLORS, currentTheme;
let currentMode = 'classic';
let dropSound, clearSound, rotateSound, gameOverSound, tSpinSound, tetrisSound, backgroundMusic, bombSound;
let startScreen, gameOverScreen, pauseScreen, scoreDisplay, finalScoreDisplay, finalTimeDisplay, comboDisplay, startButton, restartButton, resumeButton, themeSwitcher, modeSelector, assistsBombButton, assistsBombCountDisplay, assistsHammerButton, assistsHammerCountDisplay, assistsUndoButton, assistsUndoCountDisplay, bestScoreDisplay, homeButton, pauseButton, levelDisplay, sprintTimerDisplay, ultraTimerDisplay, countdownOverlay;
let backgroundMusicPlaying = false;
let controlsModal, controlsButton, closeControlsModal, controlInputs;
let backgroundImageElement;
// Varijable za Touch kontrole
let touchStartX, touchStartY, touchStartTime, touchCurrentX;
let isSwiping = false;


// ... (ceo kod od drawBlock do handleCanvasHover ostaje isti) ...
// Preskačemo do initDOMAndEventListeners da ne bi bilo predugačko

// =================================================================================
// ===== FUNKCIJE ZA CRTANJE (RENDER) =====
// =================================================================================
function drawBlock(x, y, color, context = ctx, blockSize = BLOCK_SIZE) {
    if (!context || !blockSize) return;
    const lightColor = lightenColor(color, 20);
    const darkColor = darkenColor(color, 20);
    context.fillStyle = lightColor;
    context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
    context.fillStyle = darkColor;
    context.fillRect(x * blockSize + blockSize * 0.1, y * blockSize + blockSize * 0.1, blockSize * 0.8, blockSize * 0.8);
    context.fillStyle = color;
    context.fillRect(x * blockSize + blockSize * 0.2, y * blockSize + blockSize * 0.2, blockSize * 0.6, blockSize * 0.6);
}

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
    if (hammerLine !== -1) { ctx.fillStyle = 'rgba(255, 120, 120, 0.4)'; ctx.fillRect(0, hammerLine * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE); }
}

function drawCurrentPiece() { 
    if (!currentPiece) return;
    ctx.save();
    ctx.translate(visualOffsetX, 0);
    currentPiece.shape.forEach((row, r) => row.forEach((cell, c) => { 
        if (cell) drawBlock(currentPiece.x + c, currentPiece.y + r, currentPiece.color); 
    })); 
    ctx.restore();
}

function drawGhostPiece() {
    if (!currentPiece || !BLOCK_SIZE) return;
    const potentialX = currentPiece.x + Math.round(visualOffsetX / BLOCK_SIZE);
    if (!isValidMove(potentialX - currentPiece.x, 0, currentPiece.shape)) {
        return;
    }
    let ghostY = currentPiece.y;
    while (isValidMove(0, 1, currentPiece.shape, ghostY, potentialX)) {
        ghostY++;
    }
    ctx.globalAlpha = 0.3; 
    currentPiece.shape.forEach((row, r) => row.forEach((cell, c) => { 
        if (cell) drawBlock(potentialX + c, ghostY + r, currentPiece.color); 
    }));
    ctx.globalAlpha = 1.0;
}

function drawPieceInCanvas(piece, context, canvasEl) {
    if (!piece || !context) return;
    context.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const { shape, color } = piece;
    if (!shape) return;
    const maxDim = Math.max(...shape.map(r => r.length), shape.length) + 1;
    const blockSizeW = canvasEl.width / maxDim;
    const blockSizeH = canvasEl.height / maxDim;
    const pieceBlockSize = Math.floor(Math.min(blockSizeW, blockSizeH));
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

function draw() { 
    if(ctx && canvas.width > 0) { 
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        drawBoard(); 
        drawGhostPiece(); 
        drawCurrentPiece(); 
    } 
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
        linesToClear = []; 
        generateNewPiece();
        return;
    }
    const progress = elapsed / animationDuration; 
    drawBoard();
    linesToClear.forEach(r => { 
        const p = Math.sin(progress * Math.PI); 
        ctx.globalAlpha = 1 - p; 
        board[r].forEach((cell, c) => { if (cell) drawBlock(c, r, cell); }); 
        ctx.globalAlpha = 1; 
    });
    drawCurrentPiece(); 
    requestAnimationFrame(animateLineClear);
}

// =================================================================================
// ===== LOGIKA FIGURE (PIECE LOGIC) =====
// =================================================================================
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

function rotatePiece() {
    if (!currentPiece || isPaused || gameOver) return;
    const N = currentPiece.shape.length, newShape = Array(N).fill(0).map(() => Array(N).fill(0));
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) newShape[c][N - 1 - r] = currentPiece.shape[r][c];
    const kicks = [[0, 0], [-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1], [0, -1], [0, -2], [-2, 0], [2, 0]];
    for (const [kx, ky] of kicks) if (isValidMove(kx, ky, newShape)) {
        currentPiece.x += kx; currentPiece.y += ky; currentPiece.shape = newShape;
        rotateSound.currentTime = 0; rotateSound.play().catch(console.error); 
        draw(); // Odmah iscrtaj promenu
        return;
    }
}

function movePiece(direction) { 
    if (currentPiece && isValidMove(direction, 0, currentPiece.shape)) {
        currentPiece.x += direction; 
        draw(); // Odmah iscrtaj promenu
    }
}
function movePieceDown() { if (currentPiece && isValidMove(0, 1, currentPiece.shape)) { currentPiece.y++; lastDropTime = performance.now(); } else { mergePiece(); } draw(); }
function dropPiece() {
    if (!currentPiece) return;
    const startY = currentPiece.y;
    while (isValidMove(0, 1, currentPiece.shape)) currentPiece.y++;
    if (currentMode !== 'zen') score += (currentPiece.y - startY);
    mergePiece();
    dropSound.currentTime = 0; dropSound.play().catch(console.error);
}

// =================================================================================
// ===== LOGIKA TABLE (BOARD LOGIC) =====
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
    if (linesToClear.length > 0) { isAnimating = true; animationStart = performance.now(); updateScore(linesToClear.length, isTSpin()); if (linesToClear.length === 4) tetrisSound.play().catch(console.error); else if (isTSpin()) tSpinSound.play().catch(console.error); else clearSound.play().catch(console.error); }
    else { combo = 0; lastClearWasSpecial = false; generateNewPiece(); }
}

function isTSpin() { if (!currentPiece || currentPieceIndex !== T_SHAPE_INDEX) return false; let corners = 0; const {x,y} = currentPiece; if(!board[y] || y+2 >= ROWS || x<0 || x+2 >= COLS) return false; if(board[y][x]) corners++; if(board[y][x+2]) corners++; if(board[y+2][x]) corners++; if(board[y+2][x+2]) corners++; return corners >= 3; }

// =================================================================================
// ===== KONTROLE (INPUT HANDLERS) =====
// =================================================================================
function handleKeydown(e) {
    if (isPaused || gameOver || !currentPiece || !keyBindings) return;
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
    draw();
}

function handleKeyup(e) {
    if (!keyBindings) return;
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

function handleCanvasClick(e) { if (hammerMode && BLOCK_SIZE > 0) { const rect = canvas.getBoundingClientRect(), scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height, col = Math.floor(((e.clientX - rect.left) * scaleX) / BLOCK_SIZE), row = Math.floor(((e.clientY - rect.top) * scaleY) / BLOCK_SIZE); if (board[row]?.[col]) { assists.hammer--; board[row][col] = 0; score += 100; updateAssistsDisplay(); localStorage.setItem('assists', JSON.stringify(assists)); toggleHammerMode(); draw(); } } }
function handleCanvasHover(e) { if (hammerMode && BLOCK_SIZE > 0) { const rect = canvas.getBoundingClientRect(), scaleY = canvas.height / rect.height, row = Math.floor(((e.clientY - rect.top) * scaleY) / BLOCK_SIZE); if (row !== hammerLine) { hammerLine = row; draw(); } } }

// ===== TOUCH KONTROLE =====
function handleTouchStart(e) {
    if (isPaused || gameOver) return;
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchCurrentX = touchStartX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = performance.now();
    isSwiping = false;
}

function handleTouchMove(e) {
    if (isPaused || gameOver) return;
    e.preventDefault();
    isSwiping = true;
    const newX = e.touches[0].clientX;
    const deltaX = newX - touchCurrentX;
    
    // Pomeranje levo/desno
    if (Math.abs(deltaX) > BLOCK_SIZE) {
        movePiece(deltaX > 0 ? 1 : -1);
        touchCurrentX = newX;
    }
    
    // Soft drop
    const deltaY = e.touches[0].clientY - touchStartY;
    if (deltaY > BLOCK_SIZE * 0.5) { // Ako povuče na dole
        movePieceDown();
        touchStartY = e.touches[0].clientY; // Resetuj Y da bi se moglo nastaviti
    }
}

function handleTouchEnd(e) {
    if (isPaused || gameOver) return;
    e.preventDefault();
    const touchEndTime = performance.now();
    const touchDuration = touchEndTime - touchStartTime;
    
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    if (!isSwiping) { // Ako nije bilo prevlačenja, to je TAP
        if (touchDuration < TAP_DURATION_THRESHOLD && Math.abs(deltaX) < TAP_DISTANCE_THRESHOLD && Math.abs(deltaY) < TAP_DISTANCE_THRESHOLD) {
            rotatePiece();
        }
    } else { // Ako je bilo prevlačenja
        // Hard drop (flick)
        if (deltaY > 50 && touchDuration < 250) { // Brzi pokret na dole
            dropPiece();
        }
    }
    isSwiping = false;
}


// =================================================================================
// ===== GLAVNA LOGIKA IGRE (GAME LOGIC) =====
// =================================================================================
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
    lastDropTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function endGame(isSprintWin = false, exitToMainMenu = false) {
    gameOver = true; if (animationFrameId) cancelAnimationFrame(animationFrameId); pauseBackgroundMusic();
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        bestScoreDisplay.textContent = bestScore;
    }
    if (exitToMainMenu) { startScreen.style.display = 'flex'; gameOverScreen.style.display = 'none'; return; }
    if (isSprintWin) { finalTimeDisplay.textContent = `TIME: ${sprintTimerDisplay.textContent.split(': ')[1]}`; finalTimeDisplay.style.display = 'block'; document.getElementById('game-over-title').textContent = 'PERFECT!'; }
    else { gameOverSound.play().catch(console.error); finalTimeDisplay.style.display = 'none'; document.getElementById('game-over-title').textContent = 'GAME OVER!'; }
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    gameOverScreen.style.display = 'flex';
}

function togglePause() { 
    if (gameOver) return; 
    isPaused = !isPaused; 
    if (isPaused) { 
        cancelAnimationFrame(animationFrameId); 
        pauseScreen.style.display = 'flex'; 
        pauseBackgroundMusic(); 
    } else { 
        pauseScreen.style.display = 'none'; 
        lastDropTime = performance.now(); 
        animationFrameId = requestAnimationFrame(gameLoop); 
        if (currentMode !== 'zen') playBackgroundMusic(); 
    } 
}

function showExitModal() { 
    if (isPaused || gameOver) return; 
    isPaused = true; 
    cancelAnimationFrame(animationFrameId); 
    pauseBackgroundMusic(); 
    exitModal.style.display = 'flex'; 
}

function updateScore(lines, isTSpin) { 
    let points = 0, type = ''; 
    const b2b = lastClearWasSpecial && (isTSpin || lines === 4) ? 1.5 : 1; 
    if (isTSpin) { 
        points = [400, 800, 1200, 1600][lines]; 
        type = `T-Spin ${['', 'Single', 'Double', 'Triple'][lines]}`; 
    } else { 
        points = [0, 100, 300, 500, 800][lines]; 
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
    if (currentMode !== 'zen') {
        linesClearedThisLevel += lines;
    }
    if (currentMode === 'sprint' && linesClearedTotal >= 40) {
        endGame(true);
    }
    if ((currentMode === 'classic' || currentMode === 'marathon') && linesClearedThisLevel >= 10) { 
        linesClearedThisLevel -= 10;
        level++;
        updateLevelDisplay();
        dropInterval = Math.max(100, 1000 - (level - 1) * 50);
    }
    updateScoreDisplay();
}

function useBombAssist() { if (assists.bomb > 0) { bombSound.play().catch(console.error); assists.bomb--; updateAssistsDisplay(); localStorage.setItem('assists', JSON.stringify(assists)); initBoard(); draw(); } }
function toggleHammerMode() { if (assists.hammer > 0) { hammerMode = !hammerMode; canvas.style.cursor = hammerMode ? 'crosshair' : 'default'; if (!hammerMode) { hammerLine = -1; draw(); } } }
function useUndoAssist() { if (assists.undo > 0 && boardHistory.length > 0) { assists.undo--; board = boardHistory.pop(); score = Math.max(0, score - 500); updateAssistsDisplay(); localStorage.setItem('assists', JSON.stringify(assists)); generateNewPiece(); draw(); } }

function gameLoop(timestamp) {
    if (gameOver || isPaused) return;
    if (isAnimating) { requestAnimationFrame(gameLoop); return; }
    if (currentMode === 'sprint') sprintTimerDisplay.textContent = `TIME: ${((performance.now() - startTime) / 1000).toFixed(2)}s`;
    else if (currentMode === 'ultra') { const remaining = ultraTimeLimit - (performance.now() - startTime) / 1000; if (remaining <= 0) { endGame(); return; } ultraTimerDisplay.textContent = `TIME: ${remaining.toFixed(2)}s`; }
    if (timestamp - lastDropTime > dropInterval) { if (currentPiece) { if (isValidMove(0, 1, currentPiece.shape)) currentPiece.y++; else mergePiece(); } lastDropTime = timestamp; }
    draw(); 
    animationFrameId = requestAnimationFrame(gameLoop);
}

// =================================================================================
// ===== POMOĆNE FUNKCIJE (HELPERS) =====
// =================================================================================
function updateScoreDisplay() { scoreDisplay.textContent = `Score: ${score}`; }
function updateLevelDisplay() { levelDisplay.textContent = `Level: ${level}`; }
function updateAssistsDisplay() { 
    assistsBombCountDisplay.textContent = assists.bomb; 
    assistsHammerCountDisplay.textContent = assists.hammer; 
    assistsUndoCountDisplay.textContent = assists.undo; 
}
function showComboMessage(type, count) { 
    let msg = type; 
    if (count > 1) msg += `\n${count}x Combo!`; 
    if (msg) { 
        comboDisplay.textContent = msg; 
        comboDisplay.style.display = 'block'; 
        setTimeout(() => comboDisplay.style.display = 'none', 1500); 
    } 
}
function lightenColor(c, a) { let r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); r = Math.min(255, r + a); g = Math.min(255, g + a); b = Math.min(255, b + a); return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`; }
function darkenColor(c, a) { let r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); r = Math.max(0, r - a); g = Math.max(0, g - a); b = Math.max(0, b - a); return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`; }

// =================================================================================
// ===== INICIJALIZACIJA IGRE, Događaji i Podešavanja =====
// =================================================================================

function initDOMAndEventListeners() {
    // Dohvatanje osnovnih elemenata
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextBlockCanvas = document.getElementById('nextBlockCanvas');
    nextBlockCtx = nextBlockCanvas.getContext('2d');
    backgroundImageElement = document.getElementById('background-image');

    // Dohvatanje ekrana i prikaza
    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over-screen');
    pauseScreen = document.getElementById('pause-screen');
    countdownOverlay = document.getElementById('countdown-overlay');
    scoreDisplay = document.getElementById('score-display');
    finalScoreDisplay = document.getElementById('final-score');
    finalTimeDisplay = document.getElementById('final-time');
    comboDisplay = document.getElementById('combo-display');
    levelDisplay = document.getElementById('level-display');
    sprintTimerDisplay = document.getElementById('sprint-timer');
    ultraTimerDisplay = document.getElementById('ultra-timer');
    bestScoreDisplay = document.getElementById('best-score-display');
    
    // Dohvatanje dugmića
    startButton = document.getElementById('start-button');
    restartButton = document.getElementById('restart-button');
    resumeButton = document.getElementById('resume-button');
    homeButton = document.getElementById('home-button');
    pauseButton = document.getElementById('pause-button');
    
    // Dohvatanje birača
    themeSwitcher = document.getElementById('theme-switcher');
    modeSelector = document.getElementById('mode-selector');

    // Dohvatanje assist elemenata
    assistsBombButton = document.getElementById('assist-bomb-button');
    assistsBombCountDisplay = document.getElementById('assists-bomb-count');
    assistsHammerButton = document.getElementById('assist-hammer-button');
    assistsHammerCountDisplay = document.getElementById('assists-hammer-count');
    assistsUndoButton = document.getElementById('assist-undo-button');
    assistsUndoCountDisplay = document.getElementById('assists-undo-count');
    
    // Dohvatanje modalnih prozora za kontrole
    controlsModal = document.getElementById('controls-modal');
    controlsButton = document.getElementById('controls-button');
    closeControlsModal = document.getElementById('close-controls-modal');
    controlInputs = document.querySelectorAll('.control-item input');
    
    // Zvukovi
    dropSound = document.getElementById('dropSound');
    clearSound = document.getElementById('clearSound');
    rotateSound = document.getElementById('rotateSound');
    gameOverSound = document.getElementById('gameOverSound');
    tSpinSound = document.getElementById('tSpinSound');
    tetrisSound = document.getElementById('tetrisSound');
    backgroundMusic = document.getElementById('backgroundMusic');
    bombSound = document.getElementById('bombSound');

    // Funkcija za promenu veličine igre
    function resizeGame() {
        const container = document.getElementById('canvas-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        BLOCK_SIZE = Math.floor(Math.min(containerWidth / COLS, containerHeight / ROWS));
        
        const canvasWidth = COLS * BLOCK_SIZE;
        const canvasHeight = ROWS * BLOCK_SIZE;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        const nextContainer = document.getElementById('next-block-container');
        if (nextContainer.clientWidth > 0) {
            nextBlockCanvas.width = nextContainer.clientWidth * 0.9;
            nextBlockCanvas.height = nextContainer.clientHeight * 0.9;
        }
        
        draw(); 
        drawNextPiece();
    }

    // Povezivanje događaja (Event Listeners)
    window.addEventListener('resize', resizeGame);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keyup', handleKeyup);
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasHover);
    // DODATI LISTENERI ZA TOUCH
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });


    startButton.addEventListener('click', () => {
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
    
    restartButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        startScreen.style.display = 'flex';
    });

    pauseButton.addEventListener('click', togglePause);
    resumeButton.addEventListener('click', togglePause);
    homeButton.addEventListener('click', () => window.location.reload());

    themeSwitcher.addEventListener('change', (e) => {
        applyTheme(e.target.value);
        localStorage.setItem('theme', e.target.value);
    });

    modeSelector.addEventListener('change', (e) => {
        currentMode = e.target.value;
        localStorage.setItem('mode', currentMode);
    });

    assistsBombButton.addEventListener('click', useBombAssist);
    assistsHammerButton.addEventListener('click', toggleHammerMode);
    assistsUndoButton.addEventListener('click', useUndoAssist);

    // --- Logika za podešavanje kontrola ---
    function updateControlsDisplay() {
        if (!keyBindings) return; // Provera da li su kontrole učitane
        controlInputs.forEach(input => {
            const action = input.dataset.action;
            input.value = keyBindings[action] === ' ' ? 'Space' : keyBindings[action];
        });
    }

    controlsButton.addEventListener('click', () => {
        updateControlsDisplay();
        controlsModal.style.display = 'block';
    });

    closeControlsModal.addEventListener('click', () => {
        controlsModal.style.display = 'none';
    });

    controlInputs.forEach(input => {
        input.addEventListener('click', (e) => {
            const clickedInput = e.target;
            clickedInput.value = '...';
            
            function keydownHandler(event) {
                event.preventDefault();
                const newKey = event.key === ' ' ? 'Space' : event.key;
                const action = clickedInput.dataset.action;
                keyBindings[action] = newKey;
                localStorage.setItem('keyBindings', JSON.stringify(keyBindings));
                updateControlsDisplay(); // Ažuriraj sva polja
                window.removeEventListener('keydown', keydownHandler, true);
            }
            
            window.addEventListener('keydown', keydownHandler, { capture: true, once: true });
        });
    });

    loadSettings();
    resizeGame();
}

function applyTheme(themeName) {
    currentTheme = themeName;
    const theme = THEMES[themeName];
    const root = document.documentElement;
    root.style.setProperty('--main-color', theme.lineColor);
    root.style.setProperty('--background-color', theme.background);
    root.style.setProperty('--board-bg-color', theme.boardBackground);
    root.style.setProperty('--grid-color', theme.gridColor);
    root.style.setProperty('--flash-color', theme.flashColor);
    
    if (theme.backgroundImage) {
        backgroundImageElement.style.backgroundImage = theme.backgroundImage;
        backgroundImageElement.style.opacity = '1';
    } else {
        backgroundImageElement.style.opacity = '0';
    }

    COLORS = theme.blockColors;
    if (!gameOver || (ctx && canvas.width > 0)) {
        draw();
    }
}

function loadSettings() {
    const savedTheme = localStorage.getItem('theme') || 'classic';
    const savedMode = localStorage.getItem('mode') || 'classic';
    bestScore = parseInt(localStorage.getItem('bestScore') || '0', 10);
    assists = JSON.parse(localStorage.getItem('assists') || '{"bomb":1,"hammer":1,"undo":1}');
    keyBindings = JSON.parse(localStorage.getItem('keyBindings')) || {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        down: 'ArrowDown',
        rotate: 'ArrowUp',
        drop: ' ', // Koristimo ' ' za Space
        bomb: 'b',
        hammer: 'h',
        undo: 'u'
    };

    themeSwitcher.value = savedTheme;
    modeSelector.value = savedMode;
    currentMode = savedMode;
    
    bestScoreDisplay.textContent = bestScore;
    updateAssistsDisplay();
    applyTheme(savedTheme);
}

function playBackgroundMusic() {
    if (backgroundMusic && !backgroundMusicPlaying) {
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.3;
        backgroundMusic.play().catch(e => console.log("Muzika je blokirana od strane pregledača. Potrebna je interakcija korisnika.", e));
        backgroundMusicPlaying = true;
    }
}

function pauseBackgroundMusic() {
    if (backgroundMusic) {
       backgroundMusic.pause();
    }
    backgroundMusicPlaying = false;
}

// Glavna ulazna tačka
document.addEventListener('DOMContentLoaded', initDOMAndEventListeners);
