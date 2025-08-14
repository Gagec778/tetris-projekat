document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBALNI ELEMENTI ---
    const screens = {
        mainMenu: document.getElementById('main-menu-screen'),
        gameMode: document.getElementById('game-mode-screen'),
        stats: document.getElementById('stats-screen'),
        game: document.getElementById('game-screen'),
    };
    const highscoreElements = {
        tetris: document.getElementById('highscore-tetris'),
        blockPuzzle: document.getElementById('highscore-block-puzzle'),
    };
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownText = document.getElementById('countdown-text');
    const scoreElement = document.getElementById('score');
    const finalScoreElement = document.getElementById('final-score');
    const gameOverModal = document.getElementById('game-over-modal');
    const restartBtn = document.getElementById('restart-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const statsBtn = document.getElementById('stats-btn');
    const pauseOverlay = document.getElementById('pause-overlay');
    const resumeBtn = document.getElementById('resume-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const gameTimerElement = document.getElementById('game-timer');
    
    const gameAreas = {
        tetris: document.getElementById('tetris-game-area'),
        blockPuzzle: document.getElementById('block-puzzle-game-area'),
        puzzlePiecesWrapper: document.getElementById('puzzle-pieces-container-wrapper'),
    };
    
    let activeGame = null;
    let activeGameModule = null;
    let activeGameMode = null;
    let activeDifficulty = 'normal';

    // --- MODUL ZA ZVUK ---
    const Sound = {
        sfx: {}, music: null, sfxVolume: 0.3, musicVolume: 0.2,
        init() {
            try {
                this.sfx.place = new Audio('assets/sounds/place.mp3');
                this.sfx.clear = new Audio('assets/sounds/clear.mp3');
                this.sfx.gameOver = new Audio('assets/sounds/gameOver.mp3');
                this.sfx.hardDrop = new Audio('assets/sounds/hardDrop.mp3');
                this.music = new Audio('assets/sounds/music.mp3');
                this.music.loop = true;
                this.updateSfxVolume(Settings.sfxSlider.value);
                this.updateMusicVolume(Settings.musicSlider.value);
            } catch (e) { console.warn("Greška pri učitavanju zvuka."); }
        },
        playSfx(name) { if (this.sfx[name]) { this.sfx[name].currentTime = 0; this.sfx[name].play().catch(e => {}); } },
        playMusic() { if(this.music) this.music.play().catch(e => {}); },
        stopMusic() { if(this.music) { this.music.pause(); this.music.currentTime = 0; } },
        updateSfxVolume(volume) { this.sfxVolume = volume; Object.values(this.sfx).forEach(s => s.volume = this.sfxVolume); },
        updateMusicVolume(volume) { this.musicVolume = volume; if(this.music) this.music.volume = this.musicVolume; }
    };
    
    // --- MODUL PODEŠAVANJA (SETTINGS) ---
    const Settings = {
        themeSelect: document.getElementById('theme-select'),
        musicSlider: document.getElementById('music-volume'),
        sfxSlider: document.getElementById('sfx-volume'),
        closeBtn: settingsModal.querySelector('.close-modal'),
        init() {
            const savedTheme = localStorage.getItem('puzzleTheme') || 'dark';
            const savedMusicVol = localStorage.getItem('puzzleMusicVol') || '0.2';
            const savedSfxVol = localStorage.getItem('puzzleSfxVol') || '0.3';

            this.setTheme(savedTheme); this.themeSelect.value = savedTheme;
            this.musicSlider.value = savedMusicVol; this.sfxSlider.value = savedSfxVol;
            
            Sound.init();

            this.themeSelect.addEventListener('change', (e) => this.setTheme(e.target.value));
            this.musicSlider.addEventListener('input', (e) => this.setMusicVolume(e.target.value));
            this.sfxSlider.addEventListener('input', (e) => this.setSfxVolume(e.target.value));
            settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
            this.closeBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
        },
        setTheme(themeName) { document.body.className = `${themeName}-theme`; localStorage.setItem('puzzleTheme', themeName); },
        setMusicVolume(volume) { Sound.updateMusicVolume(volume); localStorage.setItem('puzzleMusicVol', volume); },
        setSfxVolume(volume) { Sound.updateSfxVolume(volume); localStorage.setItem('puzzleSfxVol', volume); }
    };

    // --- MODULI ZA STATISTIKU I REKORDE ---
    const Stats = {
        get(key, defaultValue = 0) { return parseInt(localStorage.getItem(key) || defaultValue, 10); },
        increment(key) { localStorage.setItem(key, this.get(key) + 1); },
        add(key, value) { localStorage.setItem(key, this.get(key) + value); },
        render() {
            const container = document.querySelector('.stats-container');
            container.innerHTML = `
                <div class="stats-group">
                    <h3>Tetris</h3>
                    <div class="stat-item"><span>Odigrano Partija:</span><span class="value">${this.get('tetris_gamesPlayed')}</span></div>
                    <div class="stat-item"><span>Ukupno Linija:</span><span class="value">${this.get('tetris_linesCleared')}</span></div>
                    <div class="stat-item"><span>Najbrži Sprint:</span><span class="value">${this.get('tetris_fastestSprint', 'N/A')} s</span></div>
                </div>
                <div class="stats-group">
                    <h3>Block Puzzle</h3>
                    <div class="stat-item"><span>Odigrano Partija:</span><span class="value">${this.get('blockPuzzle_gamesPlayed')}</span></div>
                    <div class="stat-item"><span>Ukupno Linija:</span><span class="value">${this.get('blockPuzzle_linesCleared')}</span></div>
                    <div class="stat-item"><span>Najbolji Time Attack:</span><span class="value">${this.get('highscore_block-puzzle_timeAttack')}</span></div>
                </div>`;
        }
    };
    const HighScore = {
        get(game, mode) { return parseInt(localStorage.getItem(`highscore_${game}_${mode}`) || '0', 10); },
        set(game, mode, score) { if (score > this.get(game, mode)) { localStorage.setItem(`highscore_${game}_${mode}`, score); this.updateDisplay(); return true; } return false; },
        updateDisplay() { highscoreElements.tetris.textContent = this.get('tetris', 'classic'); highscoreElements.blockPuzzle.textContent = this.get('block-puzzle', 'classic');}
    };
    
    // --- Inicijalizacija ---
    HighScore.updateDisplay();
    Settings.init();

    // --- NAVIGACIJA I TOK APLIKACIJE ---
    function showScreen(screenName) { Object.values(screens).forEach(s => s.classList.remove('active')); screens[screenName].classList.add('active'); }

    function showModeSelect(gameType) {
        activeGame = gameType;
        const container = document.getElementById('mode-selection-container');
        document.getElementById('mode-select-title').textContent = gameType === 'tetris' ? 'Izaberi Mod za Tetris' : 'Izaberi Mod za Puzzle';
        if (gameType === 'tetris') {
            container.innerHTML = `
                <div class="mode-btn" data-mode="classic"><h3>Classic</h3><p>Preživi što duže dok se igra ubrzava.</p></div>
                <div class="mode-btn" data-mode="sprint"><h3>Sprint</h3><p>Očisti 40 linija u najkraćem mogućem roku.</p></div>`;
        } else {
            container.innerHTML = `
                <div class="mode-btn" data-mode="classic"><h3>Classic</h3><p>Igraj bez pritiska dok ne ostaneš bez poteza.</p></div>
                <div class="mode-btn" data-mode="timeAttack"><h3>Time Attack</h3><p>Osvoji što više poena za 2 minuta.</p></div>`;
        }
        showScreen('gameMode');
    }

    async function startGame(gameType, gameMode, difficulty) {
        activeGameMode = gameMode;
        scoreElement.textContent = '0';
        gameTimerElement.textContent = '';
        gameOverModal.classList.remove('active');
        Object.values(gameAreas).forEach(area => area.classList.remove('active'));

        if (gameType === 'tetris') {
            activeGameModule = Tetris;
            gameAreas.tetris.classList.add('active');
            gameAreas.puzzlePiecesWrapper.style.display = 'none';
        } else if (gameType === 'block-puzzle') {
            activeGameModule = BlockPuzzle;
            gameAreas.blockPuzzle.classList.add('active');
            gameAreas.puzzlePiecesWrapper.style.display = 'flex';
        }
        
        showScreen('game');
        Sound.playMusic();
        await runCountdown();
        activeGameModule.init(gameMode, difficulty);
    }

    async function runCountdown() { /* ... ista kao pre ... */ }
    function showGameOver(score, game, mode, time) {
        Sound.stopMusic(); Sound.playSfx('gameOver');
        finalScoreElement.textContent = '0';
        let newHigh = HighScore.set(game, mode, score);
        if (mode === 'sprint' && time) {
            const oldBest = Stats.get(`tetris_fastestSprint`, 9999);
            if (time < oldBest) Stats.set(`tetris_fastestSprint`, time);
        }
        
        const title = gameOverModal.querySelector('#game-over-title');
        title.textContent = newHigh ? 'NOVI REKORD!' : 'Kraj Igre';
        
        gameOverModal.classList.add('active');
        animateScore(score);
        Stats.increment(`${game}_gamesPlayed`);
    }
    function animateScore(finalScore) { /* ... ista kao pre ... */ }
    function shakeScreen() { /* ... ista kao pre ... */ }
    function pauseGame() { if (activeGameModule && activeGameModule.isRunning) { activeGameModule.pause(); pauseOverlay.classList.add('active'); } }
    function resumeGame() { if (activeGameModule && !activeGameModule.isRunning) { activeGameModule.resume(); pauseOverlay.classList.remove('active'); } }

    // --- Svi Event Listeneri ---
    document.querySelectorAll('.menu-item').forEach(item => item.addEventListener('click', () => showModeSelect(item.dataset.game)));
    document.querySelector('.back-btn').addEventListener('click', () => { if(activeGameModule) activeGameModule.stop(); showScreen('mainMenu'); });
    document.querySelectorAll('.back-to-main-menu').forEach(btn => btn.addEventListener('click', () => showScreen('mainMenu')));
    document.getElementById('mode-selection-container').addEventListener('click', e => {
        const modeBtn = e.target.closest('.mode-btn');
        if (modeBtn) startGame(activeGame, modeBtn.dataset.mode, activeDifficulty);
    });
    document.querySelector('.difficulty-selector').addEventListener('click', e => {
        const diffBtn = e.target.closest('.difficulty-btn');
        if (diffBtn) {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            diffBtn.classList.add('active');
            activeDifficulty = diffBtn.dataset.difficulty;
        }
    });
    statsBtn.addEventListener('click', () => { Stats.render(); showScreen('stats'); });
    restartBtn.addEventListener('click', () => { gameOverModal.classList.remove('active'); startGame(activeGame, activeGameMode, activeDifficulty); });
    helpBtn.addEventListener('click', () => { /* ... ista kao pre ... */ });
    helpModal.querySelector('.close-modal').addEventListener('click', () => helpModal.classList.remove('active'));
    pauseBtn.addEventListener('click', pauseGame);
    resumeBtn.addEventListener('click', resumeGame);


    // ===================================================================
    // ================== MODUL: CLASSIC TETRIS (UNIVERSE) ===============
    // ===================================================================
    const Tetris = {
        // ... Sva svojstva
        isRunning: false, isPaused: false, mode: 'classic', difficulty: 'normal',
        combo: 0, linesCleared: 0, timer: 0, timerInterval: null,

        init(mode, difficulty) {
            this.mode = mode; this.difficulty = difficulty;
            this.board = document.getElementById('tetris-board'); this.nextContainer = document.getElementById('tetris-next-container');
            this.boardState = this.createMatrix(this.cols, this.rows);
            this.player = { pos: {x: 0, y: 0}, matrix: null, score: 0 };
            this.combo = 0; this.linesCleared = 0;
            this.updateScore();
            this.nextPieces = [this.createPiece(), this.createPiece(), this.createPiece()];
            this.playerReset();
            
            const dropIntervals = {'easy': 1200, 'normal': 1000, 'hard': 700};
            this.dropInterval = dropIntervals[this.difficulty];
            
            this.timer = 0;
            if(this.timerInterval) clearInterval(this.timerInterval);
            if(this.mode === 'sprint') {
                gameTimerElement.textContent = '40';
            }

            this.resume();
            this.addListeners();
        },
        pause() {
            this.isPaused = true;
            this.isRunning = false;
            if(this.timerInterval) clearInterval(this.timerInterval);
        },
        resume() {
            this.isPaused = false;
            this.isRunning = true;
            this.lastTime = performance.now();
            this.animationFrameId = requestAnimationFrame(this.update.bind(this));
            if(this.mode === 'sprint') this.startTimer();
        },
        startTimer() {
            let startTime = Date.now();
            this.timerInterval = setInterval(() => {
                this.timer = ((Date.now() - startTime) / 1000).toFixed(2);
                gameTimerElement.textContent = `${this.timer}s`;
            }, 100);
        },
        stop() { this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); /* ... ukloni listenere ... */ },
        update(time) { if (!this.isRunning) return; /* ... ista kao pre ... */ },
        arenaSweep() {
            let clearedRows = 0; /* ... */
            if (clearedRows > 0) {
                this.combo++;
                this.linesCleared += clearedRows;
                this.player.score += ([0, 10, 30, 50, 100][clearedRows] + (this.combo * 5)) * 10;
                this.updateScore();
                Sound.playSfx('clear');
                Stats.add('tetris_linesCleared', clearedRows);
                
                if (this.mode === 'classic' && this.linesCleared % 10 === 0) this.dropInterval *= 0.9;
                if (this.mode === 'sprint') {
                    gameTimerElement.textContent = `${40 - this.linesCleared}`;
                    if(this.linesCleared >= 40) this.gameOver();
                }
            } else { this.combo = 0; }
        },
        gameOver() {
            this.stop();
            Sound.playSfx('gameOver');
            let finalValue = this.mode === 'sprint' ? parseFloat(this.timer) : this.player.score;
            showGameOver(finalValue, 'tetris', this.mode, this.mode === 'sprint' ? finalValue : null);
        },
        // ... OSTATAK KODA ZA TETRIS (draw, move, collide, itd.) JE ISTI KAO U PRETHODNOM "LUXE" ODGOVORU
    };

    // ===================================================================
    // ================== MODUL: BLOCK PUZZLE (UNIVERSE) =================
    // ===================================================================
    const BlockPuzzle = {
        // ... Sva svojstva
        isRunning: false, isPaused: false, mode: 'classic', difficulty: 'normal',
        combo: 0, timeLeft: 120, timerInterval: null,

        init(mode, difficulty) {
            this.mode = mode; this.difficulty = difficulty;
            /* ... Ostatak init-a kao pre ... */
            if(this.mode === 'timeAttack') {
                this.timeLeft = 120;
                this.startTimer();
            }
            this.resume();
        },
        pause() { this.isPaused = true; this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
        resume() { this.isPaused = false; this.isRunning = true; if(this.mode === 'timeAttack') this.startTimer(); },
        startTimer() {
            this.timerInterval = setInterval(() => {
                this.timeLeft--;
                gameTimerElement.textContent = `0:${this.timeLeft < 10 ? '0' : ''}${this.timeLeft}`;
                if (this.timeLeft <= 0) {
                    clearInterval(this.timerInterval);
                    this.gameOver();
                }
            }, 1000);
        },
        stop() { this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
        clearLines() {
            /* ... stara logika ... */
            const clearedCount = clearedRows.length + clearedCols.length;
            if (clearedCount > 0) {
                this.combo++;
                this.score += (clearedCount * clearedCount * 10) + (this.combo * 10);
                Sound.playSfx('clear');
                Stats.add('blockPuzzle_linesCleared', clearedCount);
            } else {
                this.combo = 0;
            }
        },
        gameOver() { this.stop(); Sound.playSfx('gameOver'); showGameOver(this.score, 'block-puzzle', this.mode); },
        // ... OSTATAK KODA ZA BLOCK PUZZLE (render, drag&drop, itd.) JE ISTI
    };

    // Sigurnosna provera za dodir, da ne prijavljuje grešku na desktopu
    try {
        document.createEvent("TouchEvent");
    } catch(e){
        // Nema podrške za dodir, ne radimo ništa
    }
});
