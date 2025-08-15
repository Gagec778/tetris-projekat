document.addEventListener('DOMContentLoaded', () => {

    // --- KONSTANTE I PODEŠAVANJA IGRE ---
    const CONSTANTS = {
        GAMES: {
            TETRIS: 'tetris',
            BLOCK_PUZZLE: 'block-puzzle'
        },
        MODES: {
            TETRIS_MARATHON: 'marathon',
            TETRIS_SPRINT: 'sprint',
            TETRIS_ULTRA: 'ultra',
            PUZZLE_CLASSIC: 'classic',
            PUZZLE_TIME_ATTACK: 'timeAttack',
            PUZZLE_BLAST: 'blast'
        },
        DIFFICULTY: {
            EASY: 'easy',
            NORMAL: 'normal',
            HARD: 'hard'
        },
        KEYS: {
            LEFT: 37, RIGHT: 39, DOWN: 40, UP: 38,
            SPACE: 32, Q: 81, W: 87, C: 67
        },
        SPRINT_GOAL: 40,
        ULTRA_TIME: 180,
        TIME_ATTACK_TIME: 120
    };

    // --- GLOBALNI ELEMENTI ---
    const screens = {
        mainMenu: document.getElementById('main-menu-screen'),
        gameMode: document.getElementById('game-mode-screen'),
        shop: document.getElementById('shop-screen'),
        achievements: document.getElementById('achievements-screen'),
        game: document.getElementById('game-screen'),
        postGame: document.getElementById('post-game-screen')
    };
    const highscoreElements = {
        'tetris-marathon-hard': document.getElementById('highscore-tetris-marathon-hard'),
        'block-puzzle-classic-hard': document.getElementById('highscore-block-puzzle-classic-hard')
    };
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownText = document.getElementById('countdown-text');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const helpModal = document.getElementById('help-modal');
    const helpContentContainer = document.getElementById('help-content-container');
    const pauseOverlay = document.getElementById('pause-overlay');
    const resumeBtn = document.getElementById('resume-btn');
    const gemBalanceDisplay = document.getElementById('gem-balance');
    
    // UI Elementi specifični za igre
    const tetrisUI = {
        gameArea: document.getElementById('tetris-game-area'),
        score: document.getElementById('tetris-score'),
        bestScore: document.getElementById('tetris-best-score'),
        level: document.getElementById('tetris-level'),
        nextPiece: document.getElementById('tetris-next-piece'),
        holdPiece: document.getElementById('tetris-hold-piece'),
        pauseBtn: document.getElementById('pause-btn-tetris'),
        helpBtn: document.getElementById('help-btn-tetris'),
        backBtn: document.getElementById('back-btn-tetris'),
        holdContainer: document.getElementById('tetris-hold-container')
    };
    const puzzleUI = {
        gameArea: document.getElementById('puzzle-game-area'),
        score: document.getElementById('puzzle-score'),
        header: document.querySelector('.puzzle-only.game-header-bar'),
        pieceWrapper: document.getElementById('puzzle-pieces-container-wrapper'),
        piecesContainer: document.getElementById('puzzle-pieces-container'),
        pauseBtn: document.getElementById('pause-btn-puzzle'),
        helpBtn: document.getElementById('help-btn-puzzle'),
        timer: document.getElementById('game-timer')
    };
    const postGameUI = {
        title: document.getElementById('post-game-title'),
        score: document.getElementById('post-game-score'),
        newBest: document.getElementById('post-game-new-best'),
        stats: document.getElementById('post-game-stats'),
        unlocks: document.getElementById('post-game-unlocks'),
        restartBtn: document.getElementById('restart-btn-pogs'),
        shareBtn: document.getElementById('share-btn'),
        backToMenuBtn: document.getElementById('back-to-menu-btn-pogs'),
    };

    // Globalno stanje igre
    let activeGame = null, activeGameModule = null, activeGameMode = null, activeDifficulty = CONSTANTS.DIFFICULTY.NORMAL;

    // --- PODACI O IGRI (PRODAVNICA, DOSTIGNUĆA) ---
    const GAME_DATA = { /* ... nepromenjeno ... */ };

    // --- MODUL ZA PODATKE IGRAČA ---
    const PlayerData = {
        state: {},
        defaults: {
            gems: 500,
            unlockedThemes: ['dark', 'light'],
            unlockedModes: {
                [CONSTANTS.GAMES.TETRIS]: [CONSTANTS.MODES.TETRIS_MARATHON],
                [CONSTANTS.GAMES.BLOCK_PUZZLE]: [CONSTANTS.MODES.PUZZLE_CLASSIC]
            },
            completedAchievements: [],
            lastLoginDate: null,
            loginStreak: 0,
            stats: { tetris_gamesPlayed: 0, tetris_linesCleared: 0, blockPuzzle_gamesPlayed: 0, blockPuzzle_piecesPlaced: 0, blockPuzzle_linesCleared: 0 }
        },
        load() {
            try {
                const savedData = localStorage.getItem('puzzlePlayerData');
                this.state = savedData ? JSON.parse(savedData) : structuredClone(this.defaults);
            } catch (e) {
                console.error("Greška pri učitavanju podataka, vraćanje na podrazumevane vrednosti.", e);
                this.state = structuredClone(this.defaults);
            }
            this.updateGemDisplay();
        },
        save() {
            localStorage.setItem('puzzlePlayerData', JSON.stringify(this.state));
            this.updateGemDisplay();
        },
        updateGemDisplay() {
            if (gemBalanceDisplay) gemBalanceDisplay.textContent = this.state.gems;
        }
    };

    // --- MODUL ZA ZVUK I VIBRACIJU ---
    const Sound = { /* ... nepromenjeno ... */ };
    
    // --- MODUL PODEŠAVANJA ---
    const Settings = { /* ... uglavnom nepromenjeno, samo koristi konstante ... */ };
    
    // --- MODUL ZA REKORDE ---
    const HighScore = {
        getKey(game, mode, difficulty) { return `highscore_${game}_${mode}_${difficulty}`; },
        get(game, mode, difficulty) { return parseFloat(localStorage.getItem(this.getKey(game, mode, difficulty)) || '0'); },
        set(game, mode, difficulty, score) {
            const key = this.getKey(game, mode, difficulty);
            const currentHigh = this.get(game, mode, difficulty);
            let isNewBest = false;
            
            if (mode === CONSTANTS.MODES.TETRIS_SPRINT) { // Niži skor je bolji
                if (score < currentHigh || currentHigh === 0) {
                    localStorage.setItem(key, score);
                    isNewBest = true;
                }
            } else { // Viši skor je bolji
                if (score > currentHigh) {
                    localStorage.setItem(key, score);
                    isNewBest = true;
                }
            }
            if(isNewBest) this.updateDisplay();
            return isNewBest;
        },
        updateDisplay() {
            if (highscoreElements['tetris-marathon-hard']) {
                highscoreElements['tetris-marathon-hard'].textContent = this.get(CONSTANTS.GAMES.TETRIS, CONSTANTS.MODES.TETRIS_MARATHON, CONSTANTS.DIFFICULTY.HARD);
            }
            if (highscoreElements['block-puzzle-classic-hard']) {
                highscoreElements['block-puzzle-classic-hard'].textContent = this.get(CONSTANTS.GAMES.BLOCK_PUZZLE, CONSTANTS.MODES.PUZZLE_CLASSIC, CONSTANTS.DIFFICULTY.HARD);
            }
        }
    };
    
    // --- OSTALI MODULI (Unlocks, PostGame, MainMenu3D, DailyLogin, Shop) ---
    // ... Njihov kod ostaje uglavnom isti, samo se interno koriste konstante ...
    const PostGame = { /* ... nepromenjeno ... */ };


    // --- TOK APLIKACIJE ---
    function showScreen(screenName) { /* ... nepromenjeno ... */ }
    async function startGame(game, mode, difficulty) { /* ... nepromenjeno ... */ }
    function endGame(runStats) { /* ... nepromenjeno ... */ }
    function pauseGame() { /* ... nepromenjeno ... */ }
    function resumeGame() { /* ... nepromenjeno ... */ }
    async function runCountdown() { /* ... nepromenjeno ... */ }
    function animateScore(element, finalScore) { /* ... nepromenjeno ... */ }
    function shakeScreen() { /* ... nepromenjeno ... */ }
    function showModeSelect(game) { /* ... nepromenjeno ... */ }

    // --- POVEZIVANJE DOGAĐAJA (EVENT LISTENERS) ---
    // ... Svi listeneri ostaju isti ...

    // ===================================================================
    // ================== MODUL: CLASSIC BLOCKS (TETRIS) =================
    // ===================================================================
    const Tetris = {
        board: null, cellElements: [], boardState: [], rows: 20, cols: 10, player: {}, colors: [null, '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#f78c6b', '#9d6bf7'],
        dropCounter: 0, dropInterval: 1000, lastTime: 0, isRunning: false, isPaused: false, nextPiece: null, animationFrameId: null,
        touchStartX: 0, touchStartY: 0, touchMoveX: 0, touchMoveY: 0,
        mode: CONSTANTS.MODES.TETRIS_MARATHON, difficulty: CONSTANTS.DIFFICULTY.NORMAL, combo: 0, linesCleared: 0, level: 1, timer: 0, timerInterval: null, timeLeft: 180,
        runStats: {}, holdPiece: null, canHold: true, holdEnabled: false,

        init(mode, difficulty) {
            this.mode = mode; this.difficulty = difficulty;
            this.runStats = { game: CONSTANTS.GAMES.TETRIS, mode, difficulty, score: 0, level: 1, linesCleared: 0, maxCombo: 0, stats: {tetris_linesCleared: 0} };
            this.board = document.getElementById('tetris-board');
            this.player = { pos: {x: 0, y: 0}, matrix: null, score: 0 };
            this.combo = 0; this.linesCleared = 0; this.level = 1;
            this.boardState = this.createMatrix(this.cols, this.rows);
            this.createGridCells();
            this.nextPiece = this.createPiece();
            this.holdPiece = null;
            this.playerReset();
            const dropIntervals = {
                [CONSTANTS.DIFFICULTY.EASY]: 1000, 
                [CONSTANTS.DIFFICULTY.NORMAL]: 700, 
                [CONSTANTS.DIFFICULTY.HARD]: 400
            };
            this.dropInterval = dropIntervals[this.difficulty];
            this.timer = 0;
            if(this.timerInterval) clearInterval(this.timerInterval);
            this.updateUI();
            if(this.mode === CONSTANTS.MODES.TETRIS_ULTRA) this.timeLeft = CONSTANTS.ULTRA_TIME;
            this.addListeners();
            this.resume();
        },
        pause() { this.isPaused = true; this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
        resume() {
            this.isPaused = false; this.isRunning = true;
            this.lastTime = performance.now();
            if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = requestAnimationFrame(this.update.bind(this));
            if(this.mode === CONSTANTS.MODES.TETRIS_SPRINT || this.mode === CONSTANTS.MODES.TETRIS_ULTRA) this.startTimer();
        },
        startTimer() {
            let startTime = Date.now() - this.timer * 1000;
            this.timerInterval = setInterval(() => {
                if(!this.isPaused) {
                    if(this.mode === CONSTANTS.MODES.TETRIS_SPRINT) {
                        this.timer = ((Date.now() - startTime) / 1000);
                        tetrisUI.score.textContent = `${this.timer.toFixed(2)}s`;
                    } else if (this.mode === CONSTANTS.MODES.TETRIS_ULTRA) {
                        this.timeLeft = CONSTANTS.ULTRA_TIME - ((Date.now() - startTime)/1000);
                        if(this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); }
                        this.updateUI();
                    }
                }
            }, 50);
        },
        addListeners() {
            this.boundKeyDown = this.handleKeyDown.bind(this);
            this.boundTouchStart = this.handleTouchStart.bind(this);
            document.addEventListener('keydown', this.boundKeyDown);
            this.board.addEventListener('touchstart', this.boundTouchStart, {passive: false});
        },
        stop() {
            this.isRunning = false;
            if(this.timerInterval) clearInterval(this.timerInterval);
            document.removeEventListener('keydown', this.boundKeyDown);
            this.board.removeEventListener('touchstart', this.boundTouchStart);
            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        },
        update(time = 0) {
            if (!this.isRunning) return;
            const deltaTime = time - this.lastTime;
            this.lastTime = time;
            this.dropCounter += deltaTime;
            if (this.dropCounter > this.dropInterval) {
                this.playerDrop();
            }
            this.draw();
            this.animationFrameId = requestAnimationFrame(this.update.bind(this));
        },
        createGridCells() { /* ... nepromenjeno ... */ },
        draw() {
            const fullGrid = structuredClone(this.boardState);
            const ghost = structuredClone(this.player);
            while (!this.collide(this.boardState, ghost)) ghost.pos.y++; ghost.pos.y--;
            ghost.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { const r = y + ghost.pos.y, c = x + ghost.pos.x; if(r >= 0 && r < this.rows && c >= 0 && c < this.cols) fullGrid[r][c] = 'ghost'; } }); });
            this.player.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { const r = y + this.player.pos.y, c = x + this.player.pos.x; if(r >= 0 && r < this.rows && c >= 0 && c < this.cols) fullGrid[r][c] = value; }}); });

            // ... ostatak draw funkcije ...
        },
        createMatrix(w, h) { /* ... nepromenjeno ... */ },
        createPiece() { /* ... nepromenjeno ... */ },
        collide(board, player) { /* ... nepromenjeno ... */ },
        merge() { /* ... nepromenjeno ... */ },
        arenaSweep() {
            // ... logika ...
            const scoreMultiplier = {[CONSTANTS.DIFFICULTY.EASY]: 1, [CONSTANTS.DIFFICULTY.NORMAL]: 1.5, [CONSTANTS.DIFFICULTY.HARD]: 2}[this.difficulty];
            // ...
            if (this.mode === CONSTANTS.MODES.TETRIS_MARATHON) { /* ... */ }
            if (this.mode === CONSTANTS.MODES.TETRIS_SPRINT && this.linesCleared >= CONSTANTS.SPRINT_GOAL) this.gameOver();
            // ...
        },
        playLineClearEffect(rowIndex) { /* ... nepromenjeno ... */ },
        updateUI() { 
            tetrisUI.score.textContent = this.player.score; 
            tetrisUI.level.textContent = this.level; 
            tetrisUI.bestScore.textContent = HighScore.get(CONSTANTS.GAMES.TETRIS, this.mode, this.difficulty); 
            if(this.mode === CONSTANTS.MODES.TETRIS_SPRINT) { const linesLeft = CONSTANTS.SPRINT_GOAL - this.linesCleared; tetrisUI.level.textContent = `${linesLeft > 0 ? linesLeft : 0}`; } 
            if(this.mode === CONSTANTS.MODES.TETRIS_ULTRA) { tetrisUI.level.textContent = `${Math.ceil(this.timeLeft)}`; } 
            tetrisUI.score.classList.add('score-updated'); 
            setTimeout(()=>tetrisUI.score.classList.remove('score-updated'), 300); 
        },
        playerReset(getNewPiece = true) { /* ... nepromenjeno ... */ },
        playerMove(dir) { /* ... nepromenjeno ... */ },
        playerDrop() { /* ... nepromenjeno ... */ },
        rotate(m,d) { /* ... nepromenjeno ... */ },
        playerRotate(dir) { /* ... nepromenjeno ... */ },
        handleKeyDown(e) {
            if(!this.isRunning || this.isPaused) return;
            switch(e.keyCode){
                case CONSTANTS.KEYS.C: this.handleHold(); break;
                case CONSTANTS.KEYS.LEFT: this.playerMove(-1); break;
                case CONSTANTS.KEYS.RIGHT: this.playerMove(1); break;
                case CONSTANTS.KEYS.DOWN: this.playerDrop(); break;
                case CONSTANTS.KEYS.Q: this.playerRotate(-1); break;
                case CONSTANTS.KEYS.W: case CONSTANTS.KEYS.UP: this.playerRotate(1); break;
                case CONSTANTS.KEYS.SPACE: this.hardDrop(); break;
            }
        },
        handleTouchStart(e) { /* ... nepromenjeno ... */ },
        handleTouchMove(e) { /* ... nepromenjeno ... */ },
        handleTouchEnd() { /* ... nepromenjeno ... */ },
        hardDrop() { /* ... nepromenjeno ... */ },
        handleHold() { /* ... nepromenjeno ... */ },
        gameOver() {
            this.stop();
            this.runStats.score = this.mode === CONSTANTS.MODES.TETRIS_SPRINT ? this.timer : this.player.score;
            this.runStats.level = this.level;
            endGame(this.runStats);
        },
        getHelpText() { /* ... nepromenjeno ... */ }
    };
    
    // ===================================================================
    // =================== MODUL: PUZZLE BOARD ===========================
    // ===================================================================
    const BlockPuzzle = {
        boardElement: null, piecesContainer: null, boardState: [], score: 0, isRunning: false, isPaused: false, activeDragPiece: null,
        pieceShapes: [ /* ... nepromenjeno ... */ ],
        currentPieces:[], mode: CONSTANTS.MODES.PUZZLE_CLASSIC, difficulty: CONSTANTS.DIFFICULTY.NORMAL, combo: 0, timeLeft: 120, timerInterval: null, bombs: [], movesSinceBomb: 0, runStats: {},
        
        init(mode, difficulty) {
            this.mode = mode; this.difficulty = difficulty;
            this.runStats = { game: CONSTANTS.GAMES.BLOCK_PUZZLE, mode, difficulty, score: 0, piecesPlaced: 0, linesCleared: 0, bombsDefused: 0, stats: {blockPuzzle_piecesPlaced: 0, blockPuzzle_linesCleared: 0} };
            this.boardElement=document.getElementById('puzzle-board'); this.piecesContainer=document.getElementById('puzzle-pieces-container');
            this.boardState=Tetris.createMatrix(10,10); this.score=0; this.combo=0; this.updateScore(); this.bombs=[]; this.movesSinceBomb=0;
            
            if(this.mode === CONSTANTS.MODES.PUZZLE_CLASSIC) this.spawnStoneTiles(difficulty);
            
            this.renderBoard(); this.generateNewPieces();
            if(this.boundDragStart){this.piecesContainer.removeEventListener('mousedown',this.boundDragStart);this.piecesContainer.removeEventListener('touchstart',this.boundDragStart);}
            this.boundDragStart=this.onDragStart.bind(this);
            this.piecesContainer.addEventListener('mousedown',this.boundDragStart); this.piecesContainer.addEventListener('touchstart',this.boundDragStart,{passive:false});
            
            if (this.timerInterval) clearInterval(this.timerInterval);
            puzzleUI.timer.textContent='';
            if (this.mode === CONSTANTS.MODES.PUZZLE_TIME_ATTACK) this.timeLeft = CONSTANTS.TIME_ATTACK_TIME;
            if (this.mode === CONSTANTS.MODES.PUZZLE_BLAST) this.movesSinceBomb=0;
            this.resume();
        },
        pause() { /* ... nepromenjeno ... */ },
        resume() { 
            this.isPaused = false; this.isRunning = true; 
            if(this.mode === CONSTANTS.MODES.PUZZLE_TIME_ATTACK || this.mode === CONSTANTS.MODES.PUZZLE_BLAST) this.startTimer(); 
        },
        startTimer() { /* ... koristi konstante za modove ... */ },
        stop() { /* ... nepromenjeno ... */ },
        renderBoard() { /* ... nepromenjeno ... */ },
        spawnStoneTiles(difficulty) {
            const count = {
                [CONSTANTS.DIFFICULTY.EASY]: 2, 
                [CONSTANTS.DIFFICULTY.NORMAL]: 4, 
                [CONSTANTS.DIFFICULTY.HARD]: 6
            }[difficulty];
            // ... ostatak funkcije
        },
        generateNewPieces() { /* ... nepromenjeno ... */ },
        renderPiece(pieceData) { /* ... nepromenjeno ... */ },
        onDragStart(e) { /* ... nepromenjeno ... */ },
        getDropCoordinates(draggedEl) { /* ... nepromenjeno ... */ },
        renderGhost(pieceData,draggingEl) { /* ... nepromenjeno ... */ },
        canPlacePiece(p,startRow,startCol){ /* ... nepromenjeno ... */ },
        placePiece(pieceData,startRow,startCol) {
            // ...
            if(this.mode === CONSTANTS.MODES.PUZZLE_BLAST) { 
                this.movesSinceBomb++; 
                const bombThreshold = {
                    [CONSTANTS.DIFFICULTY.EASY]:8, 
                    [CONSTANTS.DIFFICULTY.NORMAL]: 6, 
                    [CONSTANTS.DIFFICULTY.HARD]: 4
                }[this.difficulty]; 
                if(this.movesSinceBomb >= bombThreshold) this.spawnBomb(); 
            }
        },
        clearLines() { /* ... nepromenjeno ... */ },
        checkGameOver() { /* ... nepromenjeno ... */ },
        spawnBomb() { /* ... nepromenjeno ... */ },
        updateBombs() { /* ... nepromenjeno ... */ },
        updateScore() { /* ... nepromenjeno ... */ },
        gameOver() { this.stop(); this.runStats.score = this.score; endGame(this.runStats); },
        getHelpText() { /* ... nepromenjeno ... */ }
    };

    // --- INICIJALIZACIJA APLIKACIJE ---
    PlayerData.load();
    Settings.init();
    HighScore.updateDisplay();
    // DailyLogin.init();
    // Shop.init();
    // MainMenu3D.init();
});
