document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBALNI ELEMENTI ---
    const screens = { mainMenu: document.getElementById('main-menu-screen'), gameMode: document.getElementById('game-mode-screen'), game: document.getElementById('game-screen'), postGame: document.getElementById('post-game-screen') };
    const highscoreElements = { 'tetris-marathon-hard': document.getElementById('highscore-tetris-marathon-hard'), 'block-puzzle-classic-hard': document.getElementById('highscore-block-puzzle-classic-hard') };
    const countdownOverlay = document.getElementById('countdown-overlay'); const countdownText = document.getElementById('countdown-text');
    const settingsBtn = document.getElementById('settings-btn'); const settingsModal = document.getElementById('settings-modal');
    const helpBtn = document.getElementById('help-btn'); const helpModal = document.getElementById('help-modal');
    const pauseOverlay = document.getElementById('pause-overlay'); const resumeBtn = document.getElementById('resume-btn');
    const gameTimerElement = document.getElementById('game-timer'); const helpContentContainer = document.getElementById('help-content-container');
    const puzzleUI = { score: document.getElementById('puzzle-score'), header: document.querySelector('.puzzle-only.game-header-bar'), pieceWrapper: document.getElementById('puzzle-pieces-container-wrapper'), pauseBtn: document.getElementById('pause-btn-puzzle')};
    const tetrisUI = { header: document.getElementById('tetris-ui-header'), score: document.getElementById('tetris-score'), bestScore: document.getElementById('tetris-best-score'), level: document.getElementById('tetris-level'), nextPiece: document.getElementById('tetris-next-piece'), holdPiece: document.getElementById('tetris-hold-piece'), pauseBtn: document.getElementById('pause-btn-tetris'), backBtn: document.getElementById('back-btn-tetris'), holdContainer: document.getElementById('tetris-hold-container')};
    const postGameUI = { title: document.getElementById('post-game-title'), score: document.getElementById('post-game-score'), newBest: document.getElementById('post-game-new-best'), stats: document.getElementById('post-game-stats'), unlocks: document.getElementById('post-game-unlocks'), restartBtn: document.getElementById('restart-btn-pogs'), shareBtn: document.getElementById('share-btn'), backToMenuBtn: document.getElementById('back-to-menu-btn-pogs'), };
    let activeGame = null, activeGameModule = null, activeGameMode = null, activeDifficulty = 'normal';

    // --- MODUL ZA ZVUK I VIBRACIJU ---
    const Sound = {
        sfx: {}, music: null, sfxVolume: 0.3, musicVolume: 0.2, hapticsEnabled: true,
        init() {
            try {
                this.sfx.place = new Audio('assets/sounds/place.mp3'); this.sfx.clear = new Audio('assets/sounds/clear.mp3'); this.sfx.gameOver = new Audio('assets/sounds/gameOver.mp3');
                this.sfx.hardDrop = new Audio('assets/sounds/hardDrop.mp3'); this.sfx.unlock = new Audio('assets/sounds/unlock.mp3');
                this.music = new Audio('assets/sounds/music.mp3'); this.music.loop = true;
                this.updateSfxVolume(Settings.sfxSlider.value); this.updateMusicVolume(Settings.musicSlider.value);
            } catch (e) { console.warn("Greška pri učitavanju zvuka. Proverite da li 'assets/sounds/' folder postoji."); }
        },
        playSfx(name) { if (this.sfx[name]) { this.sfx[name].currentTime = 0; this.sfx[name].play().catch(e => {}); } },
        playMusic() { if(this.music && !this.isPaused) this.music.play().catch(e => {}); },
        stopMusic() { if(this.music) { this.music.pause(); this.music.currentTime = 0; } },
        updateSfxVolume(v) { this.sfxVolume = v; Object.values(this.sfx).forEach(s => s.volume = this.sfxVolume); },
        updateMusicVolume(v) { this.musicVolume = v; if(this.music) this.music.volume = this.musicVolume; },
        vibrate(duration = 10) { if(this.hapticsEnabled && 'vibrate' in navigator) navigator.vibrate(duration); }
    };
    
    // --- MODUL PODEŠAVANJA ---
    const Settings = {
        themeSelectContainer: document.getElementById('theme-select-container'), musicSlider: document.getElementById('music-volume'), sfxSlider: document.getElementById('sfx-volume'), hapticsBtn: document.getElementById('haptics-toggle-btn'), holdBtn: document.getElementById('hold-toggle-btn'), closeBtn: settingsModal.querySelector('.close-modal'),
        init() {
            const savedMusicVol = localStorage.getItem('puzzleMusicVol') || '0.2'; const savedSfxVol = localStorage.getItem('puzzleSfxVol') || '0.3';
            const savedHaptics = localStorage.getItem('puzzleHaptics') !== 'false'; const savedHold = localStorage.getItem('puzzleHold') === 'false';
            this.musicSlider.value = savedMusicVol; this.sfxSlider.value = savedSfxVol;
            Sound.init(); this.setHaptics(savedHaptics); this.setHold(savedHold);
            this.musicSlider.addEventListener('input', e => this.setMusicVolume(e.target.value));
            this.sfxSlider.addEventListener('input', e => this.setSfxVolume(e.target.value));
            this.hapticsBtn.addEventListener('click', () => this.setHaptics(!Sound.hapticsEnabled));
            this.holdBtn.addEventListener('click', () => this.setHold(!Tetris.holdEnabled));
            settingsBtn.addEventListener('click', () => { this.renderThemes(); settingsModal.classList.add('active'); });
            this.closeBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
        },
        renderThemes() {
            const unlocked = Unlocks.getUnlockedThemes(); const themes = ['dark', 'light', 'neon', 'gold', 'silver']; const savedTheme = localStorage.getItem('puzzleTheme') || 'dark';
            this.themeSelectContainer.innerHTML = '';
            themes.forEach(theme => {
                const isUnlocked = unlocked.includes(theme); const option = document.createElement('div'); option.className = 'theme-option'; option.dataset.theme = theme;
                option.innerHTML = `<span class="theme-preview" style="background-color: ${theme==='dark'?'#0d1117':theme==='light'?'#f0f2f5':theme==='neon'?'#00ffde':theme==='gold'?'#ffd700':'#d1d5db'}"></span> ${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
                if (!isUnlocked) { option.classList.add('locked'); option.title = `Otključaj dostizanjem cilja u igri!`; option.innerHTML += ' 🔒'; }
                else { option.addEventListener('click', () => this.setTheme(theme)); }
                if(theme === savedTheme) option.classList.add('active'); this.themeSelectContainer.appendChild(option);
            });
            this.setTheme(savedTheme);
        },
        setTheme(themeName) { document.body.className = `${themeName}-theme`; localStorage.setItem('puzzleTheme', themeName); const active = this.themeSelectContainer.querySelector('.active'); if(active) active.classList.remove('active'); const newActive = this.themeSelectContainer.querySelector(`[data-theme="${themeName}"]`); if(newActive) newActive.classList.add('active'); },
        setMusicVolume(v) { Sound.updateMusicVolume(v); localStorage.setItem('puzzleMusicVol', v); },
        setSfxVolume(v) { Sound.updateSfxVolume(v); localStorage.setItem('puzzleSfxVol', v); },
        setHold(enabled) { Tetris.holdEnabled = enabled; localStorage.setItem('puzzleHold', enabled); this.holdBtn.textContent = enabled ? 'ON' : 'OFF'; this.holdBtn.classList.toggle('active', enabled); }
    };

    // --- MODULI ZA STATISTIKU I REKORDE ---
    const Stats = { get(key, defaultValue = 0) { const val = localStorage.getItem(key); return val === null ? defaultValue : val; }, set(key, value) { localStorage.setItem(key, value); }, increment(key) { localStorage.setItem(key, parseFloat(this.get(key, 0)) + 1); }, add(key, value) { localStorage.setItem(key, parseFloat(this.get(key, 0)) + value); }, render() { const container = document.querySelector('.stats-container'); const fastestSprint = this.get('highscore_tetris_sprint_hard', 'N/A'); container.innerHTML = `<div class="stats-group"><h3>Classic Blocks</h3><div class="stat-item"><span>Odigrano Partija:</span><span class="value">${this.get('tetris_gamesPlayed')}</span></div><div class="stat-item"><span>Ukupno Linija:</span><span class="value">${this.get('tetris_linesCleared')}</span></div><div class="stat-item"><span>Najbrži Sprint (Teško):</span><span class="value">${fastestSprint !== 'N/A' ? fastestSprint + ' s' : 'N/A'}</span></div><div class="stat-item"><span>Najbolji Ultra Skor (Teško):</span><span class="value">${this.get('highscore_tetris_ultra_hard')}</span></div></div><div class="stats-group"><h3>Puzzle Board</h3><div class="stat-item"><span>Odigrano Partija:</span><span class="value">${this.get('blockPuzzle_gamesPlayed')}</span></div><div class="stat-item"><span>Ukupno Linija:</span><span class="value">${this.get('blockPuzzle_linesCleared')}</span></div><div class="stat-item"><span>Najbolji Time Attack (Teško):</span><span class="value">${this.get('highscore_block-puzzle_timeAttack_hard')}</span></div><div class="stat-item"><span>Najbolji Blast Skor (Teško):</span><span class="value">${this.get('highscore_block-puzzle_blast_hard')}</span></div></div>`; }};
    const HighScore = { get(game, mode, difficulty) { return parseFloat(localStorage.getItem(`highscore_${game}_${mode}_${difficulty}`) || '0'); }, set(game, mode, difficulty, score) { const key = `highscore_${game}_${mode}_${difficulty}`; const currentHigh = this.get(game, mode, difficulty); if (mode === 'sprint') { if (score < currentHigh || currentHigh === 0) { localStorage.setItem(key, score); this.updateDisplay(); return true; } } else { if (score > currentHigh) { localStorage.setItem(key, score); this.updateDisplay(); return true; } } return false; }, updateDisplay() { highscoreElements['tetris-marathon'].textContent = this.get('tetris', 'marathon', 'hard'); highscoreElements['block-puzzle-classic'].textContent = this.get('block-puzzle', 'classic', 'hard');}};
    
    // --- MODUL ZA OTKLJUČAVANJE NAGRADA ---
    const Unlocks = {
        unlocks: {
            neon: { name: 'Neon Tema', condition: stats => stats.game === 'tetris' && stats.mode === 'marathon' && stats.level >= 15 && stats.difficulty === 'hard' },
            gold: { name: 'Zlatna Tema', condition: stats => stats.game === 'tetris' && stats.mode === 'ultra' && stats.score >= 100000 && stats.difficulty === 'hard' },
            silver: { name: 'Srebrna Tema', condition: stats => stats.game === 'block-puzzle' && stats.mode === 'blast' && stats.bombsDefused >= 5 && stats.difficulty === 'hard' },
        },
        getUnlockedThemes() { return JSON.parse(localStorage.getItem('unlockedThemes') || '["dark", "light"]'); },
        check(runStats) {
            const unlocked = this.getUnlockedThemes(); const newlyUnlocked = [];
            Object.keys(this.unlocks).forEach(key => {
                if (!unlocked.includes(key) && this.unlocks[key].condition(runStats)) {
                    unlocked.push(key); newlyUnlocked.push(this.unlocks[key]); Sound.playSfx('unlock');
                }
            });
            if (newlyUnlocked.length > 0) localStorage.setItem('unlockedThemes', JSON.stringify(unlocked));
            return newlyUnlocked;
        }
    };
    
    // --- MODUL ZA EKRAN POSLE PARTIJE ---
    const PostGame = {
        show(runStats) {
            postGameUI.title.textContent = runStats.newBest ? 'NOVI REKORD!' : 'Kraj Igre';
            postGameUI.newBest.style.display = runStats.newBest ? 'inline-block' : 'none';
            postGameUI.score.textContent = '0';
            let statsHTML = '';
            if(runStats.game === 'tetris') {
                statsHTML = `<div class="stat-line"><span>Nivo:</span><span class="value">${runStats.level}</span></div><div class="stat-line"><span>Linije:</span><span class="value">${runStats.linesCleared}</span></div><div class="stat-line"><span>Najduži kombo:</span><span class="value">${runStats.maxCombo}</span></div>`;
            } else {
                statsHTML = `<div class="stat-line"><span>Postavljeno blokova:</span><span class="value">${runStats.piecesPlaced}</span></div><div class="stat-line"><span>Očišćeno linija:</span><span class="value">${runStats.linesCleared}</span></div>${runStats.mode === 'blast' ? `<div class="stat-line"><span>Deaktivirano bombi:</span><span class="value">${runStats.bombsDefused}</span></div>` : ''}`;
            }
            postGameUI.stats.innerHTML = statsHTML;
            const newlyUnlocked = Unlocks.check(runStats);
            postGameUI.unlocks.innerHTML = newlyUnlocked.map(item => `<div class="unlock-item"><span class="unlock-icon">✨</span><div>Otključali ste:<br><strong>${item.name}</strong></div></div>`).join('');
            showScreen('postGame');
            animateScore(postGameUI.score, runStats.score);
        }
    };
    
    // --- 3D ANIMACIJA MENIJA ---
    const MainMenu3D = { container: document.getElementById('main-menu-screen'), items: document.querySelectorAll('.menu-item'), init() { this.boundMouseMove = this.onMouseMove.bind(this); this.container.addEventListener('mousemove', this.boundMouseMove, { passive: true }); }, destroy() { this.container.removeEventListener('mousemove', this.boundMouseMove); this.items.forEach(item => { item.style.transform = ''; }); }, onMouseMove(e) { const { clientX, clientY } = e; const { innerWidth, innerHeight } = window; const x = (clientX / innerWidth) - 0.5; const y = (clientY / innerHeight) - 0.5; this.items.forEach(item => { item.style.setProperty('--rotate-y', `${x * 15}deg`); item.style.setProperty('--rotate-x', `${-y * 15}deg`); }); } };

    // --- Inicijalizacija ---
    HighScore.updateDisplay(); Settings.init(); MainMenu3D.init();

    // --- NAVIGACIJA I TOK APLIKACIJE ---
    function showScreen(screenName) { Object.values(screens).forEach(s => s.classList.remove('active')); screens[screenName].classList.add('active'); if(screenName === 'mainMenu') MainMenu3D.init(); else MainMenu3D.destroy(); }
    async function startGame(gameType, gameMode, difficulty) { activeGameMode = gameMode; activeDifficulty = difficulty; document.body.className = `${localStorage.getItem('puzzleTheme') || 'dark'}-theme`; document.body.classList.toggle('tetris-active', gameType === 'tetris'); document.body.classList.toggle('puzzle-active', gameType === 'block-puzzle'); document.body.classList.toggle('hold-enabled', gameType === 'tetris' && Tetris.holdEnabled); if (gameType === 'tetris') { activeGameModule = Tetris; } else { activeGameModule = BlockPuzzle; } showScreen('game'); Sound.playMusic(); await runCountdown(); activeGameModule.init(gameMode, difficulty); }
    function endGame(runStats) { Sound.stopMusic(); Sound.playSfx('gameOver'); const newBest = HighScore.set(runStats.game, runStats.mode, runStats.difficulty, runStats.score); runStats.newBest = newBest; PostGame.show(runStats); Stats.increment(`${runStats.game}_gamesPlayed`); if(runStats.linesCleared) Stats.add(`${runStats.game}_linesCleared`, runStats.linesCleared); }
    function pauseGame() { if (activeGameModule && activeGameModule.isRunning) { Sound.stopMusic(); activeGameModule.pause(); pauseOverlay.classList.add('active'); } }
    function resumeGame() { if (activeGameModule && !activeGameModule.isRunning) { Sound.playMusic(); activeGameModule.resume(); pauseOverlay.classList.remove('active'); } }
    async function runCountdown() { countdownOverlay.classList.add('active'); for (let i = 3; i > 0; i--) { countdownText.textContent = i; await new Promise(res => setTimeout(res, 800)); } countdownText.textContent = 'GO!'; await new Promise(res => setTimeout(res, 500)); countdownOverlay.classList.remove('active'); }
    function animateScore(element, finalScore) { let currentScore=0; const inc=Math.max(1,Math.floor(finalScore/100)); const int=setInterval(()=>{currentScore+=inc; if(currentScore>=finalScore){currentScore=finalScore;clearInterval(int);} element.textContent = (finalScore % 1 !== 0) ? parseFloat(currentScore).toFixed(2) : Math.round(currentScore);},10); }
    function shakeScreen() { screens.game.classList.add('screen-shake'); setTimeout(() => screens.game.classList.remove('screen-shake'), 150); }
    
    // --- Event Listeneri ---
    document.querySelectorAll('.menu-item').forEach(item => item.addEventListener('click', () => showModeSelect(item.dataset.game)));
    document.querySelectorAll('.back-to-main-menu').forEach(btn => btn.addEventListener('click', () => { if(activeGameModule) activeGameModule.stop(); HighScore.updateDisplay(); showScreen('mainMenu'); }));
    document.getElementById('mode-selection-container').addEventListener('click', e => { const modeBtn = e.target.closest('.mode-btn'); if (modeBtn) startGame(activeGame, modeBtn.dataset.mode, activeDifficulty); });
    document.querySelector('.difficulty-selector').addEventListener('click', e => { const diffBtn = e.target.closest('.difficulty-btn'); if (diffBtn) { document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active')); diffBtn.classList.add('active'); activeDifficulty = diffBtn.dataset.difficulty; }});
    postGameUI.restartBtn.addEventListener('click', () => { showScreen('gameMode'); });
    postGameUI.backToMenuBtn.addEventListener('click', () => { HighScore.updateDisplay(); showScreen('mainMenu'); });
    postGameUI.shareBtn.addEventListener('click', () => { const text = `Osvojio sam ${postGameUI.score.textContent} poena u Puzzle Universe! Probaj da me pobediš!`; if (navigator.share) { navigator.share({ title: 'Puzzle Universe Rekord!', text: text }).catch(console.error); } else { alert('Funkcija deljenja nije podržana na ovom uređaju.'); }});
    helpBtn.addEventListener('click', () => { helpContentContainer.innerHTML = activeGameModule.getHelpText(); helpModal.classList.add('active'); });
    helpModal.querySelector('.close-modal').addEventListener('click', () => helpModal.classList.remove('active'));
    tetrisUI.pauseBtn.addEventListener('click', pauseGame);
    tetrisUI.backBtn.addEventListener('click', () => { if(confirm('Da li ste sigurni? Napredak će biti izgubljen.')) { if(activeGameModule) activeGameModule.stop(); HighScore.updateDisplay(); showScreen('mainMenu'); }});
    puzzleUI.pauseBtn.addEventListener('click', pauseGame);
    resumeBtn.addEventListener('click', resumeGame);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

    // ===================================================================
    // ================== MODUL: CLASSIC BLOCKS (TETRIS) =================
    // ===================================================================
    const Tetris = {
        board: null, cellElements: [], boardState: [], rows: 20, cols: 10, player: {}, colors: [null, '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#f78c6b', '#9d6bf7'],
        dropCounter: 0, dropInterval: 1000, lastTime: 0, isRunning: false, isPaused: false, nextPiece: null, animationFrameId: null,
        touchStartX: 0, touchStartY: 0, touchMoveX: 0, touchMoveY: 0,
        mode: 'marathon', difficulty: 'normal', combo: 0, linesCleared: 0, level: 1, timer: 0, timerInterval: null, timeLeft: 180,
        runStats: {}, holdPiece: null, canHold: true, holdEnabled: false,

        init(mode, difficulty) {
            this.mode = mode; this.difficulty = difficulty;
            this.runStats = { game: 'tetris', mode, difficulty, score: 0, level: 1, linesCleared: 0, maxCombo: 0 };
            this.board = document.getElementById('tetris-board');
            this.player = { pos: {x: 0, y: 0}, matrix: null, score: 0 };
            this.combo = 0; this.linesCleared = 0; this.level = 1;
            this.boardState = this.createMatrix(this.cols, this.rows);
            this.createGridCells();
            this.nextPiece = this.createPiece();
            this.holdPiece = null;
            this.playerReset();
            const dropIntervals = {'easy': 1000, 'normal': 700, 'hard': 400};
            this.dropInterval = dropIntervals[this.difficulty];
            this.timer = 0;
            if(this.timerInterval) clearInterval(this.timerInterval);
            this.updateUI();
            if(this.mode === 'ultra') this.timeLeft = 180;
            this.addListeners();
            this.resume();
        },
        pause() { this.isPaused = true; this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
        resume() {
            this.isPaused = false; this.isRunning = true;
            this.lastTime = performance.now();
            if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = requestAnimationFrame(this.update.bind(this));
            if(this.mode === 'sprint' || this.mode === 'ultra') this.startTimer();
        },
        startTimer() {
            let startTime = Date.now() - this.timer * 1000;
            this.timerInterval = setInterval(() => {
                if(!this.isPaused) {
                    if(this.mode === 'sprint') {
                        this.timer = ((Date.now() - startTime) / 1000);
                        tetrisUI.score.textContent = `${this.timer.toFixed(2)}s`;
                    } else if (this.mode === 'ultra') {
                        this.timeLeft = 180 - ((Date.now() - startTime)/1000);
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
        createGridCells() {
            if(this.cellElements && this.cellElements.length > 0) return;
            this.board.innerHTML = ''; this.cellElements = [];
            for(let i = 0; i < this.rows * this.cols; i++) {
                const cell = document.createElement('div');
                this.cellElements.push(cell); this.board.appendChild(cell);
            }
        },
        draw() {
            const fullGrid = JSON.parse(JSON.stringify(this.boardState));
            const ghost = {...this.player, matrix: JSON.parse(JSON.stringify(this.player.matrix)) };
            while (!this.collide(this.boardState, ghost)) ghost.pos.y++;
            ghost.pos.y--;
            ghost.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { const r = y + ghost.pos.y, c = x + ghost.pos.x; if(r >= 0 && r < this.rows && c >= 0 && c < this.cols) fullGrid[r][c] = 'ghost'; } }); });
            this.player.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { const r = y + this.player.pos.y, c = x + this.player.pos.x; if(r >= 0 && r < this.rows && c >= 0 && c < this.cols) fullGrid[r][c] = value; }}); });
            for (let i = 0; i < this.cellElements.length; i++) {
                const row = Math.floor(i / this.cols); const col = i % this.cols; const value = fullGrid[row][col];
                const cell = this.cellElements[i]; let newClassName = 'tetris-cell'; let newStyle = '';
                if (typeof value === 'number' && value !== 0) { newClassName = 'game-block'; newStyle = this.colors[value]; } else if (value === 'ghost') { newClassName = 'tetris-cell ghost'; }
                if(cell.className !== newClassName) cell.className = newClassName;
                if(newClassName === 'game-block' && cell.style.backgroundColor !== newStyle) cell.style.backgroundColor = newStyle;
                else if (newClassName !== 'game-block') cell.style.backgroundColor = '';
            }
            const nextDisplay = tetrisUI.nextPiece; nextDisplay.innerHTML = ''; nextDisplay.style.gridTemplateColumns = `repeat(${this.nextPiece[0].length}, 1fr)`;
            this.nextPiece.forEach(row => { row.forEach(value => { const cell = document.createElement('div'); cell.style.width = '15px'; cell.style.height = '15px'; if (value !== 0) { cell.className = 'game-block'; cell.style.backgroundColor = this.colors[value]; } nextDisplay.appendChild(cell); }); });
            const holdDisplay = tetrisUI.holdPiece; holdDisplay.innerHTML = ''; if(this.holdPiece) { holdDisplay.style.gridTemplateColumns = `repeat(${this.holdPiece[0].length}, 1fr)`; this.holdPiece.forEach(row => { row.forEach(value => { const cell = document.createElement('div'); cell.style.width = '15px'; cell.style.height = '15px'; if (value !== 0) { cell.className = 'game-block'; cell.style.backgroundColor = this.colors[value]; } holdDisplay.appendChild(cell); }); });}
        },
        createMatrix(w, h) { const m = []; while(h--) m.push(new Array(w).fill(0)); return m; },
        createPiece() { const p='TJLOSZI'[Math.floor(Math.random()*7)]; switch(p){ case 'T':return [[1,1,1],[0,1,0]]; case 'J':return [[2,0,0],[2,2,2]]; case 'L':return [[0,0,3],[3,3,3]]; case 'O':return [[4,4],[4,4]]; case 'S':return [[0,5,5],[5,5,0]]; case 'Z':return [[6,6,0],[0,6,6]]; case 'I':return [[0,0,0,0],[7,7,7,7],[0,0,0,0]]; }},
        collide(board, player) { const { matrix, pos } = player; for (let y = 0; y < matrix.length; y++) { for (let x = 0; x < matrix[y].length; x++) { if (matrix[y][x] !== 0) { let newY = y + pos.y; let newX = x + pos.x; if (newX < 0 || newX >= this.cols || newY >= this.rows) return true; if (newY >= 0 && board[newY] && board[newY][newX] !== 0) return true; } } } return false; },
        merge() { this.player.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { this.boardState[y + this.player.pos.y][x + this.player.pos.x] = value; } }); }); Sound.playSfx('place'); },
        arenaSweep() {
            let clearedRows = []; let perfectClear = true;
            for (let y = this.rows - 1; y >= 0; y--) {
                if (this.boardState[y].every(value => value !== 0)) clearedRows.push(y);
                else if (this.boardState[y].some(value => value !== 0)) perfectClear = false;
            }
            if (clearedRows.length > 0) {
                this.combo++; this.linesCleared += clearedRows.length;
                this.runStats.linesCleared += clearedRows.length; this.runStats.maxCombo = Math.max(this.runStats.maxCombo, this.combo);
                const scoreMultiplier = {'easy': 1, 'normal': 1.5, 'hard': 2}[this.difficulty];
                this.player.score += (([0, 100, 300, 500, 800][clearedRows.length] * this.level) + (this.combo * 50 * this.level)) * scoreMultiplier;
                if(perfectClear) this.player.score += 8000;
                Sound.playSfx('clear'); Sound.vibrate(50); Stats.add('tetris_linesCleared', clearedRows.length);
                clearedRows.forEach(y_index => { this.playLineClearEffect(y_index); });
                setTimeout(() => {
                    clearedRows.reverse().forEach(y_index => { this.boardState.splice(y_index, 1); this.boardState.unshift(new Array(this.cols).fill(0)); });
                    if (this.mode === 'marathon') { const newLevel = Math.floor(this.linesCleared / 10) + 1; if(newLevel > this.level){ this.level = newLevel; this.dropInterval *= 0.9; } }
                    if (this.mode === 'sprint' && this.linesCleared >= 40) this.gameOver();
                    this.updateUI();
                }, 300);
            } else { this.combo = 0; }
            this.updateUI();
        },
        playLineClearEffect(rowIndex) { for (let i = 0; i < this.cols; i++) { const cell = this.cellElements[rowIndex * this.cols + i]; if(cell) { cell.classList.add('line-clearing'); } }},
        updateUI() { tetrisUI.score.textContent = this.player.score; tetrisUI.level.textContent = this.level; tetrisUI.bestScore.textContent = HighScore.get('tetris', this.mode, this.difficulty); if(this.mode === 'sprint') { const linesLeft = 40 - this.linesCleared; tetrisUI.level.textContent = `${linesLeft > 0 ? linesLeft : 0}`; } if(this.mode === 'ultra') { tetrisUI.level.textContent = `${Math.ceil(this.timeLeft)}`; } tetrisUI.score.classList.add('score-updated'); setTimeout(()=>tetrisUI.score.classList.remove('score-updated'), 300); },
        playerReset(getNewPiece = true) { if(getNewPiece) { this.player.matrix = this.nextPiece; this.nextPiece = this.createPiece(); } this.player.pos.y = 0; this.player.pos.x = Math.floor(this.cols/2)-Math.floor(this.player.matrix[0].length/2); if(this.collide(this.boardState,this.player)) this.gameOver(); this.canHold = true; },
        playerMove(dir) { if(this.isPaused) return; this.player.pos.x += dir; if(this.collide(this.boardState,this.player)) this.player.pos.x-=dir; },
        playerDrop() { if(this.isPaused) return; this.player.pos.y++; if (this.collide(this.boardState, this.player)) { this.player.pos.y--; this.merge(); this.playerReset(); this.arenaSweep(); } this.dropCounter = 0; },
        rotate(m,d) { for(let y=0;y<m.length;++y){for(let x=0;x<y;++x)[m[x][y],m[y][x]]=[m[y][x],m[x][y]];} d>0?m.forEach(r=>r.reverse()):m.reverse(); },
        playerRotate(dir) { if(this.isPaused) return; const originalPos = {...this.player.pos}; const originalMatrix = JSON.parse(JSON.stringify(this.player.matrix)); this.rotate(this.player.matrix, dir); const kickTests = [ [0, 0], [-1, 0], [1, 0], [-1, 1], [1, -1] ]; for (const [x, y] of kickTests) { this.player.pos.x += x; this.player.pos.y += y; if (!this.collide(this.boardState, this.player)) return; this.player.pos.x = originalPos.x; this.player.pos.y = originalPos.y; } this.player.matrix = originalMatrix; },
        handleKeyDown(e) { if(!this.isRunning || this.isPaused) return; switch(e.keyCode){ case 67: this.handleHold(); break; case 37:this.playerMove(-1);break; case 39:this.playerMove(1);break; case 40:this.playerDrop();break; case 81:this.playerRotate(-1);break; case 87:case 38:this.playerRotate(1);break; case 32:this.hardDrop();break; }},
        handleTouchStart(e) { if(this.isPaused) return; e.preventDefault(); this.touchStartX=e.touches[0].clientX; this.touchStartY=e.touches[0].clientY; this.touchMoveX=this.touchStartX; this.touchMoveY=this.touchStartY; this.boundTouchMove=this.handleTouchMove.bind(this); this.boundTouchEnd=this.handleTouchEnd.bind(this); this.board.addEventListener('touchmove',this.boundTouchMove,{passive:false}); this.board.addEventListener('touchend',this.boundTouchEnd,{passive:false});},
        handleTouchMove(e) { e.preventDefault(); this.touchMoveX=e.touches[0].clientX; this.touchMoveY=e.touches[0].clientY; },
        handleTouchEnd() { if(this.isPaused) return; this.board.removeEventListener('touchmove',this.boundTouchMove); this.board.removeEventListener('touchend',this.boundTouchEnd); const dX=this.touchMoveX-this.touchStartX; const dY=this.touchMoveY-this.touchStartY; const bW=this.board.clientWidth/this.cols; if(Math.abs(dX)>Math.abs(dY)){if(Math.abs(dX)>bW/2)this.playerMove(dX>0?1:-1);} else {if(dY>bW*2)this.hardDrop();else if(dY>bW/2)this.playerDrop();else if(Math.abs(dX)<20&&Math.abs(dY)<20)this.playerRotate(1);}},
        hardDrop() { if(this.isPaused) return; while(!this.collide(this.boardState,this.player))this.player.pos.y++; this.player.pos.y--; this.merge(); this.playerReset(); this.arenaSweep(); shakeScreen(); Sound.vibrate(50); Sound.playSfx('hardDrop'); },
        handleHold() { if(!this.isRunning || this.isPaused || !this.holdEnabled || !this.canHold) return; if(this.holdPiece) { [this.player.matrix, this.holdPiece] = [this.holdPiece, this.player.matrix]; this.playerReset(false); } else { this.holdPiece = this.player.matrix; this.playerReset(); } this.canHold = false; },
        gameOver() { this.stop(); this.runStats.score = this.mode === 'sprint' ? this.timer : this.player.score; this.runStats.level = this.level; endGame(this.runStats); },
        getHelpText() { return `<ul><li><strong>Marathon:</strong> Klasičan mod gde se brzina postepeno povećava. Cilj je najveći skor.</li><li><strong>Sprint:</strong> Očistite 40 linija što je brže moguće.</li><li><strong>Ultra:</strong> Osvojite što više poena za 3 minuta.</li></ul>`;}
    };
    
    const BlockPuzzle = {
        boardElement: null, piecesContainer: null, boardState: [], score: 0, isRunning: false, isPaused: false, activeDragPiece: null,
        pieceShapes: [ {shape:[[1,1,1,1,1]]},{shape:[[1,1],[1,1]]},{shape:[[0,1,0],[1,1,1],[0,1,0]]},{shape:[[1,1,1],[1,0,1]]},{shape:[[1,0,1],[1,1,1]]},{shape:[[1,1,0],[0,1,1]]},{shape:[[0,1,1],[1,1,0]]},{shape:[[1,1,1,1]]},{shape:[[1,1,1],[0,0,1]]},{shape:[[1,1,1],[1,0,0]]},{shape:[[1,1],[0,1],[0,1]]},{shape:[[1,1,1]]},{shape:[[1,1]]},{shape:[[1]]} ],
        currentPieces:[], mode: 'classic', difficulty: 'normal', combo: 0, timeLeft: 120, timerInterval: null, bombs: [], movesSinceBomb: 0, runStats: {},
        init(mode, difficulty) { this.mode = mode; this.difficulty = difficulty; this.runStats = { game: 'block-puzzle', mode, difficulty, score: 0, piecesPlaced: 0, linesCleared: 0, bombsDefused: 0 }; this.boardElement=document.getElementById('puzzle-board'); this.piecesContainer=document.getElementById('puzzle-pieces-container'); this.boardState=Tetris.createMatrix(10,10); this.score=0; this.combo=0; this.updateScore(); this.bombs=[]; this.movesSinceBomb=0; if(this.mode === 'classic') this.spawnStoneTiles(difficulty); this.renderBoard(); this.generateNewPieces(); if(this.boundDragStart){this.piecesContainer.removeEventListener('mousedown',this.boundDragStart);this.piecesContainer.removeEventListener('touchstart',this.boundDragStart);} this.boundDragStart=this.onDragStart.bind(this); this.piecesContainer.addEventListener('mousedown',this.boundDragStart); this.piecesContainer.addEventListener('touchstart',this.boundDragStart,{passive:false}); if (this.timerInterval) clearInterval(this.timerInterval); puzzleUI.header.querySelector('.game-timer').textContent=''; if (this.mode === 'timeAttack') { this.timeLeft = 120; } if (this.mode === 'blast') { this.movesSinceBomb=0;} this.resume(); },
        pause() { this.isPaused = true; this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
        resume() { this.isPaused = false; this.isRunning = true; if(this.mode === 'timeAttack' || this.mode === 'blast') this.startTimer(); },
        startTimer() { let lastTime = Date.now(); this.timerInterval = setInterval(() => { if(!this.isPaused) { const now = Date.now(); const delta = (now - lastTime) / 1000; lastTime = now; if(this.mode === 'timeAttack') { this.timeLeft -= delta; puzzleUI.header.querySelector('.game-timer').textContent = `Vreme: ${Math.max(0, Math.ceil(this.timeLeft))}`; if (this.timeLeft <= 0) this.gameOver(); } if(this.mode === 'blast') { this.updateBombs(); }}}, 1000);},
        stop() { this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
        renderBoard() { this.boardElement.innerHTML=''; this.boardState.forEach((row, r)=>{row.forEach((cellData, c)=>{ const cell=document.createElement('div'); cell.className='puzzle-cell'; if(cellData){ cell.classList.add('filled','game-block'); cell.style.backgroundColor = cellData.color; if(cellData.type === 'stone') { cell.classList.add('stone'); if(cellData.health === 1) cell.classList.add('cracked'); } const bomb = this.bombs.find(b=>b.r===r && b.c===c); if(bomb){ const timerEl = document.createElement('div'); timerEl.className = 'bomb-timer'; timerEl.textContent = bomb.timer; cell.appendChild(timerEl);}} this.boardElement.appendChild(cell); });});},
        spawnStoneTiles(difficulty) { const count = {'easy': 2, 'normal': 4, 'hard': 6}[difficulty]; for(let i=0; i<count; i++) { let r,c; do { r = Math.floor(Math.random()*10); c = Math.floor(Math.random()*10); } while(this.boardState[r][c] !== 0); this.boardState[r][c] = {type: 'stone', health: 2, color: '#8d99ae'}; }},
        generateNewPieces() { /* ... ista kao u prethodnoj verziji ... */ },
        renderPiece(pieceData) { /* ... ista kao u prethodnoj verziji ... */ },
        onDragStart(e) { if(!e.target.closest('.puzzle-piece')||!this.isRunning||this.isPaused) return; e.preventDefault(); const pieceEl=e.target.closest('.puzzle-piece'); const pieceId=pieceEl.dataset.id; const pieceData=this.currentPieces.find(p=>p.id===pieceId); this.activeDragPiece=pieceData; const draggingEl=pieceEl.cloneNode(true); draggingEl.classList.add('dragging'); document.body.appendChild(draggingEl); const rect=pieceEl.getBoundingClientRect(); const touch=e.type==='touchstart'?e.touches[0]:e; this.touchOffsetX = touch.clientX - rect.left; this.touchOffsetY = touch.clientY - rect.top; pieceEl.style.opacity='0.3'; const moveHandler=(moveEvent)=>{ const moveTouch=moveEvent.type==='touchmove'?moveEvent.touches[0]:moveEvent; draggingEl.style.left=`${moveTouch.clientX-this.touchOffsetX}px`; draggingEl.style.top=`${moveTouch.clientY-this.touchOffsetY}px`; this.renderGhost(pieceData,draggingEl); }; const endHandler=(endEvent)=>{ document.removeEventListener('mousemove',moveHandler); document.removeEventListener('touchmove',moveHandler); document.removeEventListener('mouseup',endHandler); document.removeEventListener('touchend',endHandler); this.boardElement.querySelectorAll('.ghost-path').forEach(c=>{c.classList.remove('ghost-path')}); draggingEl.remove(); this.activeDragPiece=null; const {row, col} = this.getDropCoordinates(draggingEl); if(this.canPlacePiece(pieceData,row,col)){ this.placePiece(pieceData,row,col); pieceEl.remove(); this.currentPieces=this.currentPieces.filter(p=>p.id!==pieceId); if(this.currentPieces.length===0)this.generateNewPieces(); } else {pieceEl.style.opacity='1';} }; document.addEventListener('mousemove',moveHandler); document.addEventListener('touchmove',moveHandler); document.addEventListener('mouseup',endHandler); document.addEventListener('touchend',endHandler); },
        getDropCoordinates(draggedEl) { const boardRect=this.boardElement.getBoundingClientRect(); const dragRect=draggedEl.getBoundingClientRect(); const cellWidth=boardRect.width/10; const x = dragRect.left - boardRect.left; const y = dragRect.top - boardRect.top; return { row: Math.round(y/cellWidth), col: Math.round(x/cellWidth)}; },
        renderGhost(pieceData,draggingEl) { this.boardElement.querySelectorAll('.ghost-path').forEach(c=>{c.classList.remove('ghost-path')}); if(!pieceData) return; const {row: startRow, col: startCol} = this.getDropCoordinates(draggingEl); for(let r=0;r<pieceData.shape.length;r++){for(let c=0;c<pieceData.shape[r].length;c++){ if(pieceData.shape[r][c]){ const bR=startRow+r; const bC=startCol+c; if(bR<10&&bC<10&&bR>=0&&bC>=0){ const cellIndex=bR*10+bC; const cell=this.boardElement.children[cellIndex]; if(cell&&this.boardState[bR][bC]===0){ cell.classList.add('ghost-path'); cell.style.setProperty('--color',pieceData.color);}} }}} },
        canPlacePiece(p,startRow,startCol){for(let r=0;r<p.shape.length;r++){for(let c=0;c<p.shape[r].length;c++){if(p.shape[r][c]){const bR=startRow+r;const bC=startCol+c;if(bR>=10||bC>=10||bR<0||bC<0||this.boardState[bR][bC]!==0)return false;}}}return true;},
        placePiece(pieceData,startRow,startCol) { this.runStats.piecesPlaced++; pieceData.shape.forEach((row,r)=>{row.forEach((cell,c)=>{ if(cell){this.boardState[startRow+r][startCol+c]={type: 'normal', color: pieceData.color};}});}); this.score+=pieceData.shape.flat().reduce((a,b)=>a+b); Sound.playSfx('place'); Sound.vibrate(); this.clearLines(); this.renderBoard(); this.updateScore(); if(this.mode === 'blast') { this.movesSinceBomb++; const bombThreshold = {'easy':8, 'normal': 6, 'hard': 4}[this.difficulty]; if(this.movesSinceBomb >= bombThreshold) this.spawnBomb(); }},
        clearLines() {
            let clearedRows=[],clearedCols=[]; let linesToClear = { rows: [], cols: [] };
            for(let r=0;r<10;r++)if(this.boardState[r].every(cell=>cell!==0 && (!cell.type || cell.type!=='stone' || cell.health<=1)))linesToClear.rows.push(r);
            for(let c=0;c<10;c++)if(this.boardState.every(row=>row[c]!==0 && (!row[c].type || row[c].type!=='stone' || row[c].health<=1)))linesToClear.cols.push(c);
            let clearedCount = 0;
            for(let r=0;r<10;r++) { for(let c=0;c<10;c++) { const cell = this.boardState[r][c]; if(cell && cell.type === 'stone' && (linesToClear.rows.includes(r) || linesToClear.cols.includes(c))) { cell.health--; if(cell.health < 1) this.boardState[r][c] = 0; else cell.cracked = true; }}}
            for(let r=0;r<10;r++)if(this.boardState[r].every(cell=>cell!==0))clearedRows.push(r);
            for(let c=0;c<10;c++)if(this.boardState.every(row=>row[c]!==0))clearedCols.push(c);
            this.bombs = this.bombs.filter(bomb => { const wasCleared = clearedRows.includes(bomb.r) || clearedCols.includes(bomb.c); if(wasCleared) this.runStats.bombsDefused++; return !wasCleared; });
            clearedRows.forEach(r=>this.boardState[r].fill(0)); clearedCols.forEach(c=>this.boardState.forEach(row=>row[c]=0));
            clearedCount=clearedRows.length+clearedCols.length;
            if (clearedCount>0){this.combo++; this.score+=(clearedCount*clearedCount*10)+(this.combo*10);Sound.playSfx('clear'); Sound.vibrate(50); this.runStats.linesCleared += clearedCount;} else {this.combo=0;}
        },
        checkGameOver() { for(const piece of this.currentPieces){ for(let r=0;r<10;r++){ for(let c=0;c<10;c++){ if(this.canPlacePiece(piece,r,c))return false;}}} return true; },
        spawnBomb() { this.movesSinceBomb = 0; const filledCells = []; for(let r=0;r<10;r++){for(let c=0;c<10;c++){if(this.boardState[r][c] && this.boardState[r][c].type !== 'stone' && !this.bombs.find(b=>b.r===r&&b.c===c)) filledCells.push({r,c});}} if(filledCells.length === 0) return; const cell = filledCells[Math.floor(Math.random()*filledCells.length)]; this.bombs.push({r: cell.r, c: cell.c, timer: 9}); Sound.playSfx('bomb'); this.renderBoard();},
        updateBombs() { this.bombs.forEach(bomb => bomb.timer--); if(this.bombs.some(b=>b.timer<0)) { shakeScreen(); this.gameOver(); return; } this.renderBoard();},
        updateScore() { puzzleUI.score.textContent = this.score; puzzleUI.score.parentElement.classList.add('score-updated'); setTimeout(()=>puzzleUI.score.parentElement.classList.remove('score-updated'), 200); },
        gameOver() { this.stop(); this.runStats.score = this.score; endGame(this.runStats); },
        getHelpText() { return `<ul><li><strong>Classic:</strong> Opustite se i ređajte blokove dok imate mesta. Pazite na kamene blokove!</li><li><strong>Time Attack:</strong> Osvojite što više poena za 2 minuta.</li><li><strong>Blast:</strong> Preživite što duže! Povremeno se pojavljuju bombe koje morate očistiti pre isteka tajmera.</li></ul>`;}
    };
    
    fillFunctions();
});
