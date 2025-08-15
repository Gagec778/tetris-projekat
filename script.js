document.addEventListener('DOMContentLoaded', () => {

    // --- KONFIGURACIJA ZA LIDERBORD ---
    // 1. Idite na sajt https://jsonbin.io/ i registrujte se besplatno.
    // 2. Na kontrolnoj tabli, kliknite na "API Keys" i kopirajte Vaš "Master Key".
    // 3. Nalepite taj ključ ovde umesto "PASTE_YOUR_API_KEY_HERE".
    const X_MASTER_KEY = 'PASTE_YOUR_API_KEY_HERE';

    // 4. Vratite se na "Dashboard", kliknite "Create New Bin". Nazovite ga npr. 'puzzleScores'.
    // 5. Nakon što ga napravite, iz adrese u pretraživaču iskopirajte ID bina.
    //    Primer: https://jsonbin.io/b/663b8d3bead9613602a5c3d4 -> ID je '663b8d3bead9613602a5c3d4'
    // 6. Nalepite taj ID ovde umesto "PASTE_YOUR_BIN_ID_HERE".
    const BIN_ID = 'PASTE_YOUR_BIN_ID_HERE';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    // --- GLOBALNI ELEMENTI ---
    const screens = { mainMenu: document.getElementById('main-menu-screen'), gameMode: document.getElementById('game-mode-screen'), game: document.getElementById('game-screen'),};
    const highscoreElements = { 'tetris-marathon': document.getElementById('highscore-tetris-marathon'), 'block-puzzle-classic': document.getElementById('highscore-block-puzzle-classic'), };
    const countdownOverlay = document.getElementById('countdown-overlay'); const countdownText = document.getElementById('countdown-text');
    const finalScoreElement = document.getElementById('final-score'); const gameOverModal = document.getElementById('game-over-modal');
    const restartBtn = document.getElementById('restart-btn'); const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal'); const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal'); const leaderboardBtn = document.getElementById('leaderboard-btn');
    const leaderboardModal = document.getElementById('leaderboard-modal'); const pauseOverlay = document.getElementById('pause-overlay');
    const resumeBtn = document.getElementById('resume-btn');
    let activeGame = null, activeGameModule = null, activeGameMode = null, activeDifficulty = 'normal';

    // --- MODUL ZA ZVUK ---
    const Sound = { sfx: {}, music: null, sfxVolume: 0.3, musicVolume: 0.2, hapticsEnabled: true,
        init() { try { this.sfx.place = new Audio('assets/sounds/place.mp3'); this.sfx.clear = new Audio('assets/sounds/clear.mp3'); this.sfx.gameOver = new Audio('assets/sounds/gameOver.mp3'); this.sfx.hardDrop = new Audio('assets/sounds/hardDrop.mp3'); this.sfx.bomb = new Audio('assets/sounds/bomb.mp3'); this.music = new Audio('assets/sounds/music.mp3'); this.music.loop = true; this.updateSfxVolume(Settings.sfxSlider.value); this.updateMusicVolume(Settings.musicSlider.value); } catch (e) { console.warn("Greška pri učitavanju zvuka."); } },
        playSfx(name) { if (this.sfx[name]) { this.sfx[name].currentTime = 0; this.sfx[name].play().catch(e => {}); } },
        playMusic() { if(this.music && !this.isPaused) this.music.play().catch(e => {}); },
        stopMusic() { if(this.music) { this.music.pause(); this.music.currentTime = 0; } },
        updateSfxVolume(v) { this.sfxVolume = v; Object.values(this.sfx).forEach(s => s.volume = this.sfxVolume); },
        updateMusicVolume(v) { this.musicVolume = v; if(this.music) this.music.volume = this.musicVolume; },
    };
    
    // --- MODUL PODEŠAVANJA ---
    const Settings = {
        themeSelect: document.getElementById('theme-select'), musicSlider: document.getElementById('music-volume'), sfxSlider: document.getElementById('sfx-volume'), hapticsBtn: document.getElementById('haptics-toggle-btn'), closeBtn: settingsModal.querySelector('.close-modal'),
        init() { const savedTheme = localStorage.getItem('puzzleTheme') || 'dark'; const savedMusicVol = localStorage.getItem('puzzleMusicVol') || '0.2'; const savedSfxVol = localStorage.getItem('puzzleSfxVol') || '0.3'; const savedHaptics = localStorage.getItem('puzzleHaptics') !== 'false'; this.setTheme(savedTheme); this.themeSelect.value = savedTheme; this.musicSlider.value = savedMusicVol; this.sfxSlider.value = savedSfxVol; Sound.init(); this.setHaptics(savedHaptics); this.themeSelect.addEventListener('change', e => this.setTheme(e.target.value)); this.musicSlider.addEventListener('input', e => this.setMusicVolume(e.target.value)); this.sfxSlider.addEventListener('input', e => this.setSfxVolume(e.target.value)); this.hapticsBtn.addEventListener('click', () => this.setHaptics(!Sound.hapticsEnabled)); settingsBtn.addEventListener('click', () => settingsModal.classList.add('active')); this.closeBtn.addEventListener('click', () => settingsModal.classList.remove('active')); },
        setTheme(themeName) { document.body.className = `${themeName}-theme`; localStorage.setItem('puzzleTheme', themeName); },
        setMusicVolume(v) { Sound.updateMusicVolume(v); localStorage.setItem('puzzleMusicVol', v); },
        setSfxVolume(v) { Sound.updateSfxVolume(v); localStorage.setItem('puzzleSfxVol', v); },
        setHaptics(enabled) { Sound.hapticsEnabled = enabled; localStorage.setItem('puzzleHaptics', enabled); this.hapticsBtn.textContent = enabled ? 'ON' : 'OFF'; this.hapticsBtn.classList.toggle('active', enabled); }
    };

    // --- MODUL ZA LOKALNE REKORDE ---
    const HighScore = { get(game, mode, difficulty) { return parseFloat(localStorage.getItem(`highscore_${game}_${mode}_${difficulty}`) || '0'); }, set(game, mode, difficulty, score) { const key = `highscore_${game}_${mode}_${difficulty}`; const currentHigh = this.get(game, mode, difficulty); if (mode === 'sprint') { if (score < currentHigh || currentHigh === 0) { localStorage.setItem(key, score); this.updateDisplay(); return true; } } else { if (score > currentHigh) { localStorage.setItem(key, score); this.updateDisplay(); return true; } } return false; }, updateDisplay() { highscoreElements['tetris-marathon'].textContent = this.get('tetris', 'marathon', 'hard'); highscoreElements['block-puzzle-classic'].textContent = this.get('block-puzzle', 'classic', 'hard');}};
    
    // --- NOVI MODUL ZA ONLINE LIDERBORD ---
    const Leaderboard = {
        modal: leaderboardModal, list: document.getElementById('leaderboard-list'), loading: document.getElementById('leaderboard-loading'), gameFilter: document.getElementById('leaderboard-game-filter'), modeFilter: document.getElementById('leaderboard-mode-filter'), closeBtn: leaderboardModal.querySelector('.close-modal'),
        gameData: { tetris: { name: 'Classic Blocks', modes: { marathon: 'Marathon', sprint: 'Sprint', ultra: 'Ultra' } }, blockPuzzle: { name: 'Puzzle Board', modes: { classic: 'Classic', timeAttack: 'Time Attack', blast: 'Blast' } },},
        init() { leaderboardBtn.addEventListener('click', () => { this.show(); }); this.closeBtn.addEventListener('click', () => { this.modal.classList.remove('active'); }); this.gameFilter.addEventListener('change', () => this.populateModeFilter()); this.modeFilter.addEventListener('change', () => this.handleFilterChange()); },
        show() { this.modal.classList.add('active'); this.populateGameFilter(); },
        populateGameFilter() { this.gameFilter.innerHTML = Object.keys(this.gameData).map(key => `<option value="${key}">${this.gameData[key].name}</option>`).join(''); this.populateModeFilter(); },
        populateModeFilter() { const selectedGame = this.gameFilter.value; const modes = this.gameData[selectedGame].modes; this.modeFilter.innerHTML = Object.keys(modes).map(key => `<option value="${key}">${modes[key]}</option>`).join(''); this.handleFilterChange(); },
        async handleFilterChange() { const game = this.gameFilter.value; const mode = this.modeFilter.value; this.list.innerHTML = ''; this.loading.textContent = 'Učitavanje...'; this.loading.style.display = 'block'; const scores = await this.fetchScores(game, mode); this.render(scores, mode); },
        async fetchScores(game, mode) {
            try {
                const res = await fetch(`${JSONBIN_URL}/latest`);
                if (!res.ok) { if (res.status === 404) return []; throw new Error(`Greška: ${res.status}`); }
                const data = await res.json();
                return data.record[game] && data.record[game][mode] ? data.record[game][mode] : [];
            } catch (error) { console.error("Nije moguće preuzeti rezultate:", error); this.loading.textContent = 'Greška pri učitavanju.'; return []; }
        },
        render(scores, mode) {
            this.loading.style.display = 'none';
            if (scores.length === 0) { this.list.innerHTML = '<li>Nema rezultata za ovaj mod.</li>'; return; }
            this.list.innerHTML = scores.map((entry, index) => `<li><span class="rank">#${index + 1}</span><span class="name">${entry.name}</span><span class="score">${mode === 'sprint' ? entry.score.toFixed(2) + 's' : entry.score}</span></li>`).join('');
        },
        async askForNameAndSubmitScore(score, game, mode) {
            if(activeDifficulty !== 'hard') return;
            const currentLeaderboard = await this.fetchScores(game, mode);
            const isSprint = mode === 'sprint';
            const worstScore = currentLeaderboard.length > 0 ? currentLeaderboard[currentLeaderboard.length - 1].score : (isSprint ? Infinity : 0);
            const isGoodEnough = isSprint ? score < worstScore : score > worstScore;
            if (currentLeaderboard.length < 100 || isGoodEnough) {
                let playerName = localStorage.getItem('puzzlePlayerName') || '';
                playerName = prompt('Uspeli ste da se plasirate na Liderbord! Unesite svoje ime (3-10 karaktera):', playerName);
                if (playerName && playerName.trim().length >= 3 && playerName.trim().length <= 10) { localStorage.setItem('puzzlePlayerName', playerName.trim()); this.submitScore(score, game, mode, playerName.trim()); }
            }
        },
        async submitScore(score, game, mode, name) {
            if (!X_MASTER_KEY.includes('_KEY_HERE') && !BIN_ID.includes('_BIN_ID_HERE')) {
                const res = await fetch(`${JSONBIN_URL}/latest`); let allData = res.ok ? (await res.json()).record : {};
                if (!allData[game]) allData[game] = {}; if (!allData[game][mode]) allData[game][mode] = [];
                let leaderboard = allData[game][mode]; leaderboard.push({ name, score });
                if (mode === 'sprint') { leaderboard.sort((a, b) => a.score - b.score); } else { leaderboard.sort((a, b) => b.score - a.score); }
                allData[game][mode] = leaderboard.slice(0, 100);
                await fetch(JSONBIN_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': X_MASTER_KEY }, body: JSON.stringify(allData) });
            }
        }
    };

    // --- Inicijalizacija ---
    Settings.init(); HighScore.updateDisplay(); MainMenu3D.init(); Leaderboard.init();
    
    // --- NAVIGACIJA I TOK APLIKACIJE ---
    function showScreen(screenName) { Object.values(screens).forEach(s => s.classList.remove('active')); screens[screenName].classList.add('active'); if(screenName === 'mainMenu') MainMenu3D.init(); else MainMenu3D.destroy(); }
    async function startGame(gameType, gameMode, difficulty) {
        activeGameMode = gameMode; activeDifficulty = difficulty;
        document.body.classList.toggle('tetris-active', gameType === 'tetris'); document.body.classList.toggle('puzzle-active', gameType === 'block-puzzle');
        if (gameType === 'tetris') { activeGameModule = Tetris; } else { activeGameModule = BlockPuzzle; }
        showScreen('game'); Sound.playMusic(); await runCountdown();
        activeGameModule.init(gameMode, difficulty);
    }
    async function runCountdown() { /* ... ista kao pre ... */ }
    function showGameOver(score, game, mode) { Sound.stopMusic(); Sound.playSfx('gameOver'); const localHigh = HighScore.set(game, mode, activeDifficulty, score); const title = gameOverModal.querySelector('#game-over-title'); title.textContent = localHigh ? 'NOVI LIČNI REKORD!' : 'Kraj Igre'; gameOverModal.classList.add('active'); animateScore(score); Leaderboard.askForNameAndSubmitScore(score, game, mode); }
    function animateScore(finalScore) { /* ... ista kao pre ... */ }
    function shakeScreen() { /* ... ista kao pre ... */ }
    function pauseGame() { if (activeGameModule && activeGameModule.isRunning) { Sound.stopMusic(); activeGameModule.pause(); pauseOverlay.classList.add('active'); } }
    function resumeGame() { if (activeGameModule && !activeGameModule.isRunning) { Sound.playMusic(); activeGameModule.resume(); pauseOverlay.classList.remove('active'); } }

    document.querySelectorAll('.menu-item').forEach(item => item.addEventListener('click', () => showModeSelect(item.dataset.game)));
    document.querySelectorAll('.back-to-main-menu').forEach(btn => btn.addEventListener('click', () => { if(activeGameModule) activeGameModule.stop(); showScreen('mainMenu'); }));
    document.getElementById('mode-selection-container').addEventListener('click', e => { const modeBtn = e.target.closest('.mode-btn'); if (modeBtn) startGame(activeGame, modeBtn.dataset.mode, activeDifficulty); });
    document.querySelector('.difficulty-selector').addEventListener('click', e => { const diffBtn = e.target.closest('.difficulty-btn'); if (diffBtn) { document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active')); diffBtn.classList.add('active'); activeDifficulty = diffBtn.dataset.difficulty; }});
    restartBtn.addEventListener('click', () => { gameOverModal.classList.remove('active'); if (activeGame) startGame(activeGame, activeGameMode, activeDifficulty); });
    helpBtn.addEventListener('click', () => { helpContentContainer.innerHTML = activeGameModule.getHelpText(); helpModal.classList.add('active'); });
    helpModal.querySelector('.close-modal').addEventListener('click', () => helpModal.classList.remove('active'));
    tetrisUI.pauseBtn.addEventListener('click', pauseGame); tetrisUI.backBtn.addEventListener('click', () => { if(activeGameModule) activeGameModule.stop(); showScreen('mainMenu'); });
    puzzleUI.pauseBtn.addEventListener('click', pauseGame);
    resumeBtn.addEventListener('click', resumeGame);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

    // ===================================================================
    // ================== MODUL: CLASSIC BLOCKS (TETRIS) =================
    // ===================================================================
    const Tetris = {
        // --- Sva svojstva modula ---
        board: null, cellElements: [], boardState: [], rows: 20, cols: 10, player: {},
        colors: [null, '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#f78c6b', '#9d6bf7'],
        dropCounter: 0, dropInterval: 1000, lastTime: 0, isRunning: false, isPaused: false,
        nextPiece: null, animationFrameId: null,
        touchStartX: 0, touchStartY: 0, touchMoveX: 0, touchMoveY: 0,
        mode: 'marathon', difficulty: 'normal', combo: 0, linesCleared: 0, level: 1, timer: 0, timerInterval: null, timeLeft: 180,

        // --- Glavne funkcije ---
        init(mode, difficulty) {
            this.mode = mode; this.difficulty = difficulty;
            this.board = document.getElementById('tetris-board');
            this.player = { pos: {x: 0, y: 0}, matrix: null, score: 0 };
            this.combo = 0; this.linesCleared = 0; this.level = 1;
            this.boardState = this.createMatrix(this.cols, this.rows);
            this.createGridCells();
            this.nextPiece = this.createPiece();
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
                        tetrisUI.level.textContent = `${Math.ceil(this.timeLeft)}`;
                    }
                }
            }, 100);
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
            this.board.innerHTML = '';
            this.cellElements = [];
            for(let i = 0; i < this.rows * this.cols; i++) {
                const cell = document.createElement('div');
                this.cellElements.push(cell);
                this.board.appendChild(cell);
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
                const row = Math.floor(i / this.cols); const col = i % this.cols;
                const value = fullGrid[row][col];
                const cell = this.cellElements[i];
                let newClassName = 'tetris-cell';
                let newStyle = '';
                if (typeof value === 'number' && value !== 0) {
                    newClassName = 'game-block';
                    newStyle = this.colors[value];
                } else if (value === 'ghost') {
                    newClassName = 'tetris-cell ghost';
                }
                if(cell.className !== newClassName) cell.className = newClassName;
                if(cell.style.backgroundColor !== newStyle) cell.style.backgroundColor = newStyle;
            }

            const nextDisplay = tetrisUI.nextPiece; nextDisplay.innerHTML = ''; nextDisplay.style.gridTemplateColumns = `repeat(${this.nextPiece[0].length}, 1fr)`;
            this.nextPiece.forEach(row => { row.forEach(value => { const cell = document.createElement('div'); cell.style.width = '15px'; cell.style.height = '15px'; if (value !== 0) { cell.className = 'game-block'; cell.style.backgroundColor = this.colors[value]; } nextDisplay.appendChild(cell); }); });
        },
        createMatrix(w, h) { const m = []; while(h--) m.push(new Array(w).fill(0)); return m; },
        createPiece() { const p='TJLOSZI'[Math.floor(Math.random()*7)]; switch(p){ case 'T':return [[1,1,1],[0,1,0]]; case 'J':return [[2,0,0],[2,2,2]]; case 'L':return [[0,0,3],[3,3,3]]; case 'O':return [[4,4],[4,4]]; case 'S':return [[0,5,5],[5,5,0]]; case 'Z':return [[6,6,0],[0,6,6]]; case 'I':return [[0,0,0,0],[7,7,7,7],[0,0,0,0]]; }},
        collide(board, player) { const { matrix, pos } = player; for (let y = 0; y < matrix.length; y++) { for (let x = 0; x < matrix[y].length; x++) { if (matrix[y][x] !== 0) { let newY = y + pos.y; let newX = x + pos.x; if (newX < 0 || newX >= this.cols || newY >= this.rows) return true; if (newY >= 0 && board[newY] && board[newY][newX] !== 0) return true; } } } return false; },
        merge() { this.player.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { this.boardState[y + this.player.pos.y][x + this.player.pos.x] = value; } }); }); Sound.playSfx('place'); },
        arenaSweep() { let clearedRows = []; let perfectClear = true; for (let y = this.rows - 1; y >= 0; y--) { if (this.boardState[y].every(value => value !== 0)) { clearedRows.push(y); } else if (this.boardState[y].some(value => value !== 0)) { perfectClear = false; } } if (clearedRows.length > 0) { this.combo++; this.linesCleared += clearedRows.length; this.player.score += (([0, 100, 300, 500, 800][clearedRows.length] * this.level) + (this.combo * 50 * this.level)); if(perfectClear) this.player.score += 10000; Sound.playSfx('clear'); Sound.vibrate(50); Stats.add('tetris_linesCleared', clearedRows.length); clearedRows.reverse().forEach(y_index => { this.boardState.splice(y_index, 1); this.boardState.unshift(new Array(this.cols).fill(0)); }); if (this.mode === 'marathon') { const newLevel = Math.floor(this.linesCleared / 10) + 1; if(newLevel > this.level){ this.level = newLevel; this.dropInterval *= 0.9; } } if (this.mode === 'sprint' && this.linesCleared >= 40) this.gameOver(); } else { this.combo = 0; } this.updateUI(); },
        updateUI() { tetrisUI.score.textContent = this.player.score; tetrisUI.level.textContent = this.level; tetrisUI.bestScore.textContent = HighScore.get('tetris', this.mode, this.difficulty); if(this.mode === 'sprint') { const linesLeft = 40 - this.linesCleared; tetrisUI.level.textContent = `${linesLeft > 0 ? linesLeft : 0}`; } if(this.mode === 'ultra') { tetrisUI.level.textContent = `${Math.ceil(this.timeLeft)}`; } tetrisUI.score.parentElement.classList.add('score-updated'); setTimeout(()=>tetrisUI.score.parentElement.classList.remove('score-updated'), 200); },
        playerReset() { this.player.matrix = this.nextPiece; this.nextPiece = this.createPiece(); this.player.pos.y = -1; this.player.pos.x = Math.floor(this.cols/2)-Math.floor(this.player.matrix[0].length/2); if(this.collide(this.boardState,this.player)) this.gameOver(); },
        playerMove(dir) { if(this.isPaused) return; this.player.pos.x += dir; if(this.collide(this.boardState,this.player)) this.player.pos.x-=dir; },
        playerDrop() { if(this.isPaused) return; this.player.pos.y++; if (this.collide(this.boardState, this.player)) { this.player.pos.y--; this.merge(); this.playerReset(); this.arenaSweep(); } this.dropCounter = 0; },
        rotate(m,d) { for(let y=0;y<m.length;++y){for(let x=0;x<y;++x)[m[x][y],m[y][x]]=[m[y][x],m[x][y]];} d>0?m.forEach(r=>r.reverse()):m.reverse(); },
        playerRotate(dir) { if(this.isPaused) return; const pos = this.player.pos.x; let offset=1; this.rotate(this.player.matrix,dir); while(this.collide(this.boardState,this.player)){ this.player.pos.x+=offset; offset=-(offset+(offset>0?1:-1)); if(offset>this.player.matrix[0].length){this.rotate(this.player.matrix,-dir);this.player.pos.x=pos;return;}}},
        handleKeyDown(e) { if(!this.isRunning || this.isPaused) return; switch(e.keyCode){ case 37:this.playerMove(-1);break; case 39:this.playerMove(1);break; case 40:this.playerDrop();break; case 81:this.playerRotate(-1);break; case 87:case 38:this.playerRotate(1);break; case 32:this.hardDrop();break; }},
        handleTouchStart(e) { if(this.isPaused) return; e.preventDefault(); this.touchStartX=e.touches[0].clientX; this.touchStartY=e.touches[0].clientY; this.touchMoveX=this.touchStartX; this.touchMoveY=this.touchStartY; this.boundTouchMove=this.handleTouchMove.bind(this); this.boundTouchEnd=this.handleTouchEnd.bind(this); this.board.addEventListener('touchmove',this.boundTouchMove,{passive:false}); this.board.addEventListener('touchend',this.boundTouchEnd,{passive:false});},
        handleTouchMove(e) { e.preventDefault(); this.touchMoveX=e.touches[0].clientX; this.touchMoveY=e.touches[0].clientY; },
        handleTouchEnd() { if(this.isPaused) return; this.board.removeEventListener('touchmove',this.boundTouchMove); this.board.removeEventListener('touchend',this.boundTouchEnd); const dX=this.touchMoveX-this.touchStartX; const dY=this.touchMoveY-this.touchStartY; const bW=this.board.clientWidth/this.cols; if(Math.abs(dX)>Math.abs(dY)){if(Math.abs(dX)>bW/2)this.playerMove(dX>0?1:-1);} else {if(dY>bW*2)this.hardDrop();else if(dY>bW/2)this.playerDrop();else if(Math.abs(dX)<20&&Math.abs(dY)<20)this.playerRotate(1);}},
        hardDrop() { if(this.isPaused) return; while(!this.collide(this.boardState,this.player))this.player.pos.y++; this.player.pos.y--; this.merge(); this.playerReset(); this.arenaSweep(); shakeScreen(); Sound.vibrate(50); Sound.playSfx('hardDrop'); },
        gameOver() { this.stop(); let finalValue = this.mode === 'sprint' ? this.timer : this.player.score; showGameOver(finalValue, 'tetris', this.mode); },
        getHelpText() { return `<ul><li><strong>Marathon:</strong> Klasičan mod gde se brzina postepeno povećava. Cilj je najveći skor.</li><li><strong>Sprint:</strong> Očistite 40 linija što je brže moguće.</li><li><strong>Ultra:</strong> Osvojite što više poena za 3 minuta.</li></ul>`;}
    };
    
    Object.assign(BlockPuzzle, {
        boardElement: null, piecesContainer: null, boardState: [], score: 0, isRunning: false, isPaused: false, activeDragPiece: null,
        pieceShapes: [ {shape:[[1,1,1,1,1]]},{shape:[[1,1],[1,1]]},{shape:[[0,1,0],[1,1,1],[0,1,0]]},{shape:[[1,1,1],[1,0,1]]},{shape:[[1,0,1],[1,1,1]]},{shape:[[1,1,0],[0,1,1]]},{shape:[[0,1,1],[1,1,0]]},{shape:[[1,1,1,1]]},{shape:[[1,1,1],[0,0,1]]},{shape:[[1,1,1],[1,0,0]]},{shape:[[1,1],[0,1],[0,1]]},{shape:[[1,1,1]]},{shape:[[1,1]]},{shape:[[1]]} ],
        currentPieces:[], mode: 'classic', difficulty: 'normal', combo: 0, timeLeft: 120, timerInterval: null, bombs: [], movesSinceBomb: 0,
        init(mode, difficulty) { this.mode=mode; this.difficulty=difficulty; this.boardElement=document.getElementById('puzzle-board'); this.piecesContainer=document.getElementById('puzzle-pieces-container'); this.boardState=Tetris.createMatrix(10,10); this.score=0; this.combo=0; this.updateScore(); this.bombs=[]; this.movesSinceBomb=0; this.renderBoard(); this.generateNewPieces(); if(this.boundDragStart){this.piecesContainer.removeEventListener('mousedown',this.boundDragStart);this.piecesContainer.removeEventListener('touchstart',this.boundDragStart);} this.boundDragStart=this.onDragStart.bind(this); this.piecesContainer.addEventListener('mousedown',this.boundDragStart); this.piecesContainer.addEventListener('touchstart',this.boundDragStart,{passive:false}); if (this.timerInterval) clearInterval(this.timerInterval); puzzleUI.header.querySelector('.game-timer').textContent=''; if (this.mode === 'timeAttack') { this.timeLeft = 120; } if (this.mode === 'blast') { this.movesSinceBomb=0;} this.resume(); },
        pause() { this.isPaused = true; this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
        resume() { this.isPaused = false; this.isRunning = true; if(this.mode === 'timeAttack' || this.mode === 'blast') this.startTimer(); },
        startTimer() { let lastTime = Date.now(); this.timerInterval = setInterval(() => { if(!this.isPaused) { const now = Date.now(); const delta = (now - lastTime) / 1000; lastTime = now; if(this.mode === 'timeAttack') { this.timeLeft -= delta; puzzleUI.header.querySelector('.game-timer').textContent = `Vreme: ${Math.max(0, Math.ceil(this.timeLeft))}`; if (this.timeLeft <= 0) this.gameOver(); } if(this.mode === 'blast') { this.updateBombs(); }}}, 1000);},
        stop() { this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
        renderBoard() { this.boardElement.innerHTML=''; this.boardState.forEach((row, r)=>{row.forEach((cellValue, c)=>{ const cell=document.createElement('div'); cell.className='puzzle-cell'; if(cellValue && typeof cellValue === 'string'){const color=cellValue; cell.style.backgroundColor = color; cell.classList.add('filled','game-block'); const bomb = this.bombs.find(b=>b.r===r && b.c===c); if(bomb){ const timerEl = document.createElement('div'); timerEl.className = 'bomb-timer'; timerEl.textContent = bomb.timer; cell.appendChild(timerEl);}} this.boardElement.appendChild(cell); });});},
        generateNewPieces() { this.currentPieces=[]; this.piecesContainer.innerHTML=''; const colors = Tetris.colors.slice(1); for(let i=0;i<3;i++){ const pieceData={...this.pieceShapes[Math.floor(Math.random()*this.pieceShapes.length)]}; pieceData.id=`piece-${Date.now()}-${i}`; pieceData.color = colors[Math.floor(Math.random()*colors.length)]; this.currentPieces.push(pieceData); this.renderPiece(pieceData); } if(this.checkGameOver()){this.gameOver();}},
        renderPiece(pieceData) { const pieceEl=document.createElement('div'); pieceEl.className='puzzle-piece'; pieceEl.dataset.id=pieceData.id; pieceEl.style.gridTemplateColumns=`repeat(${pieceData.shape[0].length},1fr)`; pieceData.shape.forEach(row=>{row.forEach(cell=>{ const cellEl=document.createElement('div'); if(cell){cellEl.className='puzzle-piece-cell game-block'; const color=pieceData.color; cellEl.style.backgroundColor = color; } pieceEl.appendChild(cellEl); });}); this.piecesContainer.appendChild(pieceEl); },
        onDragStart(e) { if(!e.target.closest('.puzzle-piece')||!this.isRunning||this.isPaused) return; e.preventDefault(); const pieceEl=e.target.closest('.puzzle-piece'); const pieceId=pieceEl.dataset.id; const pieceData=this.currentPieces.find(p=>p.id===pieceId); this.activeDragPiece=pieceData; const draggingEl=pieceEl.cloneNode(true); draggingEl.classList.add('dragging'); document.body.appendChild(draggingEl); const rect=pieceEl.getBoundingClientRect(); const touch=e.type==='touchstart'?e.touches[0]:e; this.touchOffsetX = touch.clientX - rect.left; this.touchOffsetY = touch.clientY - rect.top; pieceEl.style.opacity='0.3'; const moveHandler=(moveEvent)=>{ const moveTouch=moveEvent.type==='touchmove'?moveEvent.touches[0]:moveEvent; draggingEl.style.left=`${moveTouch.clientX-this.touchOffsetX}px`; draggingEl.style.top=`${moveTouch.clientY-this.touchOffsetY}px`; this.renderGhost(pieceData,draggingEl); }; const endHandler=(endEvent)=>{ document.removeEventListener('mousemove',moveHandler); document.removeEventListener('touchmove',moveHandler); document.removeEventListener('mouseup',endHandler); document.removeEventListener('touchend',endHandler); this.boardElement.querySelectorAll('.ghost-path').forEach(c=>{c.classList.remove('ghost-path')}); draggingEl.remove(); this.activeDragPiece=null; const {row, col} = this.getDropCoordinates(draggingEl); if(this.canPlacePiece(pieceData,row,col)){ this.placePiece(pieceData,row,col); pieceEl.remove(); this.currentPieces=this.currentPieces.filter(p=>p.id!==pieceId); if(this.currentPieces.length===0)this.generateNewPieces(); } else {pieceEl.style.opacity='1';} }; document.addEventListener('mousemove',moveHandler); document.addEventListener('touchmove',moveHandler); document.addEventListener('mouseup',endHandler); document.addEventListener('touchend',endHandler); },
        getDropCoordinates(draggedEl) { const boardRect=this.boardElement.getBoundingClientRect(); const dragRect=draggedEl.getBoundingClientRect(); const cellWidth=boardRect.width/10; const x = dragRect.left - boardRect.left + (dragRect.width / 2) - this.touchOffsetX; const y = dragRect.top - boardRect.top + (this.touchOffsetY/2); return { row: Math.round(y/cellWidth), col: Math.round(x/cellWidth)}; },
        renderGhost(pieceData,draggingEl) { this.boardElement.querySelectorAll('.ghost-path').forEach(c=>{c.classList.remove('ghost-path')}); if(!pieceData) return; const {row: startRow, col: startCol} = this.getDropCoordinates(draggingEl); for(let r=0;r<pieceData.shape.length;r++){for(let c=0;c<pieceData.shape[r].length;c++){ if(pieceData.shape[r][c]){ const bR=startRow+r; const bC=startCol+c; if(bR<10&&bC<10&&bR>=0&&bC>=0){ const cellIndex=bR*10+bC; const cell=this.boardElement.children[cellIndex]; if(cell&&!this.boardState[bR][bC]){ cell.classList.add('ghost-path'); cell.style.setProperty('--color',pieceData.color);}} }}} },
        canPlacePiece(p,startRow,startCol){for(let r=0;r<p.shape.length;r++){for(let c=0;c<p.shape[r].length;c++){if(p.shape[r][c]){const bR=startRow+r;const bC=startCol+c;if(bR>=10||bC>=10||bR<0||bC<0||this.boardState[bR][bC])return false;}}}return true;},
        placePiece(pieceData,startRow,startCol) { let placedCells=0; pieceData.shape.forEach((row,r)=>{row.forEach((cell,c)=>{ if(cell){this.boardState[startRow+r][startCol+c]=pieceData.color; placedCells++;}});}); this.score+=placedCells; Sound.playSfx('place'); Sound.vibrate(); this.clearLines(); this.renderBoard(); this.updateScore(); if(this.mode === 'blast') { this.movesSinceBomb++; const bombThreshold = {'easy':8, 'normal': 6, 'hard': 4}[this.difficulty]; if(this.movesSinceBomb >= bombThreshold) this.spawnBomb(); }},
        clearLines() { let clearedRows=[],clearedCols=[]; for(let r=0;r<10;r++)if(this.boardState[r].every(cell=>cell))clearedRows.push(r); for(let c=0;c<10;c++)if(this.boardState.every(row=>row[c]))clearedCols.push(c); this.bombs = this.bombs.filter(bomb => !clearedRows.includes(bomb.r) && !clearedCols.includes(bomb.c)); clearedRows.forEach(r=>this.boardState[r].fill(0)); clearedCols.forEach(c=>this.boardState.forEach(row=>row[c]=0)); const clearedCount=clearedRows.length+clearedCols.length; if(clearedCount>0){this.combo++; this.score+=(clearedCount*clearedCount*10)+(this.combo*10);Sound.playSfx('clear'); Sound.vibrate(50); Stats.add('blockPuzzle_linesCleared',clearedCount);} else {this.combo=0;}},
        checkGameOver() { for(const piece of this.currentPieces){ for(let r=0;r<10;r++){ for(let c=0;c<10;c++){ if(this.canPlacePiece(piece,r,c))return false;}}} return true; },
        spawnBomb() { this.movesSinceBomb = 0; const emptyCells = []; for(let r=0;r<10;r++){for(let c=0;c<10;c++){if(!this.boardState[r][c]) emptyCells.push({r,c});}} if(emptyCells.length === 0) return; const cell = emptyCells[Math.floor(Math.random()*emptyCells.length)]; const color = Tetris.colors[Math.floor(Math.random()*Tetris.colors.length -1)+1]; this.boardState[cell.r][cell.c] = color; this.bombs.push({r: cell.r, c: cell.c, timer: 9}); Sound.playSfx('bomb'); this.renderBoard();},
        updateBombs() { this.bombs.forEach(bomb => bomb.timer--); if(this.bombs.some(b=>b.timer<0)) { shakeScreen(); this.gameOver(); return; } this.renderBoard();},
        updateScore() { puzzleUI.score.textContent = this.score; puzzleUI.score.parentElement.classList.add('score-updated'); setTimeout(()=>puzzleUI.score.parentElement.classList.remove('score-updated'), 200); },
        gameOver() { this.stop(); Sound.playSfx('gameOver'); showGameOver(this.score, 'block-puzzle', this.mode); },
        getHelpText() { return `<ul><li><strong>Classic:</strong> Opustite se i ređajte blokove dok imate mesta.</li><li><strong>Time Attack:</strong> Osvojite što više poena za 2 minuta.</li><li><strong>Blast:</strong> Preživite što duže! Povremeno se na tabli pojavljuju bombe koje morate očistiti pre isteka tajmera.</li></ul>`;}
    };
    
    fillFunctions();
});
