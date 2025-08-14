document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBALNI ELEMENTI ---
    const screens = {
        mainMenu: document.getElementById('main-menu-screen'),
        gameMode: document.getElementById('game-mode-screen'),
        stats: document.getElementById('stats-screen'),
        game: document.getElementById('game-screen'),
    };
    const highscoreElements = {
        'tetris-marathon': document.getElementById('highscore-tetris-marathon'),
        'block-puzzle-classic': document.getElementById('highscore-block-puzzle-classic'),
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
    const helpContentContainer = document.getElementById('help-content-container');
    const firstTimeHelpOverlay = document.getElementById('first-time-help-overlay');
    
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
                this.sfx.place = new Audio('assets/sounds/place.mp3'); this.sfx.clear = new Audio('assets/sounds/clear.mp3');
                this.sfx.gameOver = new Audio('assets/sounds/gameOver.mp3'); this.sfx.hardDrop = new Audio('assets/sounds/hardDrop.mp3');
                this.sfx.bomb = new Audio('assets/sounds/bomb.mp3'); this.music = new Audio('assets/sounds/music.mp3');
                this.music.loop = true;
                this.updateSfxVolume(Settings.sfxSlider.value); this.updateMusicVolume(Settings.musicSlider.value);
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
        themeSelect: document.getElementById('theme-select'), musicSlider: document.getElementById('music-volume'), sfxSlider: document.getElementById('sfx-volume'), closeBtn: settingsModal.querySelector('.close-modal'),
        init() {
            const savedTheme = localStorage.getItem('puzzleTheme') || 'dark'; const savedMusicVol = localStorage.getItem('puzzleMusicVol') || '0.2'; const savedSfxVol = localStorage.getItem('puzzleSfxVol') || '0.3';
            this.setTheme(savedTheme); this.themeSelect.value = savedTheme; this.musicSlider.value = savedMusicVol; this.sfxSlider.value = savedSfxVol;
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
        get(key, defaultValue = 0) { const val = localStorage.getItem(key); return val === null ? defaultValue : val; },
        set(key, value) { localStorage.setItem(key, value); },
        increment(key) { localStorage.setItem(key, parseFloat(this.get(key, 0)) + 1); },
        add(key, value) { localStorage.setItem(key, parseFloat(this.get(key, 0)) + value); },
        render() {
            const container = document.querySelector('.stats-container');
            const fastestSprint = this.get('highscore_tetris_sprint', 'N/A');
            container.innerHTML = `
                <div class="stats-group"><h3>Classic Blocks</h3>
                    <div class="stat-item"><span>Odigrano Partija:</span><span class="value">${this.get('tetris_gamesPlayed')}</span></div>
                    <div class="stat-item"><span>Ukupno Linija:</span><span class="value">${this.get('tetris_linesCleared')}</span></div>
                    <div class="stat-item"><span>Najbrži Sprint (Teško):</span><span class="value">${fastestSprint !== 'N/A' ? fastestSprint + ' s' : 'N/A'}</span></div>
                    <div class="stat-item"><span>Najbolji Ultra Skor (Teško):</span><span class="value">${this.get('highscore_tetris_ultra')}</span></div>
                </div>
                <div class="stats-group"><h3>Puzzle Board</h3>
                    <div class="stat-item"><span>Odigrano Partija:</span><span class="value">${this.get('blockPuzzle_gamesPlayed')}</span></div>
                    <div class="stat-item"><span>Ukupno Linija:</span><span class="value">${this.get('blockPuzzle_linesCleared')}</span></div>
                    <div class="stat-item"><span>Najbolji Time Attack (Teško):</span><span class="value">${this.get('highscore_block-puzzle_timeAttack')}</span></div>
                    <div class="stat-item"><span>Najduže Preživljavanje (Blast):</span><span class="value">${this.get('highscore_block-puzzle_blast')} poena</span></div>
                </div>`;
        }
    };
    const HighScore = {
        get(game, mode) { return parseFloat(localStorage.getItem(`highscore_${game}_${mode}`) || '0'); },
        set(game, mode, score) { const currentHigh = this.get(game, mode); if (mode === 'sprint') { if (score < currentHigh || currentHigh === 0) { localStorage.setItem(`highscore_${game}_${mode}`, score); this.updateDisplay(); return true; } } else { if (score > currentHigh) { localStorage.setItem(`highscore_${game}_${mode}`, score); this.updateDisplay(); return true; } } return false; },
        updateDisplay() { highscoreElements['tetris-marathon'].textContent = this.get('tetris', 'marathon'); highscoreElements['block-puzzle-classic'].textContent = this.get('block-puzzle', 'classic');}
    };
    
    HighScore.updateDisplay();
    Settings.init();

    // --- NAVIGACIJA I TOK APLIKACIJE ---
    function showScreen(screenName) { Object.values(screens).forEach(s => s.classList.remove('active')); screens[screenName].classList.add('active'); }

    function showModeSelect(gameType) {
        activeGame = gameType;
        const container = document.getElementById('mode-selection-container');
        document.getElementById('mode-select-title').textContent = gameType === 'tetris' ? 'Classic Blocks' : 'Puzzle Board';
        if (gameType === 'tetris') {
            container.innerHTML = `
                <div class="mode-btn" data-mode="marathon"><h3>Marathon (Classic)</h3><div class="mode-description"><div class="mode-details"><span>Cilj:</span> Najveći skor</div><div class="mode-details"><span>Brzina:</span> Povećava se</div></div></div>
                <div class="mode-btn" data-mode="sprint"><h3>Sprint</h3><div class="mode-description"><div class="mode-details"><span>Cilj:</span> Očisti 40 linija</div><div class="mode-details"><span>Skor:</span> Vreme</div></div></div>
                <div class="mode-btn" data-mode="ultra"><h3>Ultra</h3><div class="mode-description"><div class="mode-details"><span>Cilj:</span> Najveći skor</div><div class="mode-details"><span>Vreme:</span> 3:00</div></div></div>`;
        } else {
            container.innerHTML = `
                <div class="mode-btn" data-mode="classic"><h3>Classic</h3><div class="mode-description"><div class="mode-details"><span>Cilj:</span> Najveći skor</div><div class="mode-details"><span>Pravilo:</span> Bez žurbe</div></div></div>
                <div class="mode-btn" data-mode="timeAttack"><h3>Time Attack</h3><div class="mode-description"><div class="mode-details"><span>Cilj:</span> Najveći skor</div><div class="mode-details"><span>Vreme:</span> 2:00</div></div></div>
                <div class="mode-btn" data-mode="blast"><h3>Blast</h3><div class="mode-description"><div class="mode-details"><span>Cilj:</span> Preživi</div><div class="mode-details"><span>Pravilo:</span> Čisti bombe!</div></div></div>`;
        }
        showScreen('gameMode');
    }

    async function startGame(gameType, gameMode, difficulty) {
        activeGameMode = gameMode; activeDifficulty = difficulty;
        scoreElement.textContent = '0'; gameTimerElement.textContent = '';
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
        showScreen('game'); Sound.playMusic();
        await showFirstTimeHelp(gameType);
        await runCountdown();
        activeGameModule.init(gameMode, difficulty);
    }
    
    async function showFirstTimeHelp(game) {
        const key = `seenHelp_${game}`;
        if (!localStorage.getItem(key)) {
            const scoreBubble = document.getElementById('help-bubble-score');
            const boardBubble = document.getElementById('help-bubble-board');
            const piecesBubble = document.getElementById('help-bubble-pieces');
            
            if(game === 'tetris') {
                piecesBubble.textContent = "Ovde su sledeći blokovi.";
                boardBubble.textContent = "Prevlači i tapkaj po tabli da igraš.";
            } else {
                piecesBubble.textContent = "Odatle vučeš oblike.";
                boardBubble.textContent = "Prevlači oblike na tablu.";
            }

            firstTimeHelpOverlay.classList.add('active');
            return new Promise(resolve => {
                document.getElementById('dismiss-help-btn').onclick = () => {
                    firstTimeHelpOverlay.classList.remove('active');
                    localStorage.setItem(key, 'true');
                    resolve();
                };
            });
        }
        return Promise.resolve();
    }
    
    async function runCountdown() { /* ... ista kao pre ... */ }
    function showGameOver(score, game, mode, time) {
        Sound.stopMusic(); Sound.playSfx('gameOver');
        finalScoreElement.textContent = '0';
        let newHigh = false;
        if(difficulty === 'hard') { newHigh = HighScore.set(game, mode, score); }
        const title = gameOverModal.querySelector('#game-over-title');
        title.textContent = newHigh ? 'NOVI REKORD!' : 'Kraj Igre';
        gameOverModal.classList.add('active'); animateScore(score); Stats.increment(`${game}_gamesPlayed`);
    }
    function animateScore(finalScore) { /* ... ista kao pre ... */ }
    function shakeScreen() { /* ... ista kao pre ... */ }
    function pauseGame() { if (activeGameModule && activeGameModule.isRunning) { Sound.stopMusic(); activeGameModule.pause(); pauseOverlay.classList.add('active'); } }
    function resumeGame() { if (activeGameModule && !activeGameModule.isRunning) { Sound.playMusic(); activeGameModule.resume(); pauseOverlay.classList.remove('active'); } }

    document.querySelectorAll('.menu-item').forEach(item => item.addEventListener('click', () => showModeSelect(item.dataset.game)));
    document.querySelectorAll('.back-to-main-menu').forEach(btn => btn.addEventListener('click', () => showScreen('mainMenu')));
    document.getElementById('mode-selection-container').addEventListener('click', e => { const modeBtn = e.target.closest('.mode-btn'); if (modeBtn) startGame(activeGame, modeBtn.dataset.mode, activeDifficulty); });
    document.querySelector('.difficulty-selector').addEventListener('click', e => { const diffBtn = e.target.closest('.difficulty-btn'); if (diffBtn) { document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active')); diffBtn.classList.add('active'); activeDifficulty = diffBtn.dataset.difficulty; }});
    statsBtn.addEventListener('click', () => { Stats.render(); showScreen('stats'); });
    restartBtn.addEventListener('click', () => { gameOverModal.classList.remove('active'); if (activeGame) startGame(activeGame, activeGameMode, activeDifficulty); });
    helpBtn.addEventListener('click', () => {
        const helpText = activeGameModule.getHelpText();
        helpContentContainer.innerHTML = helpText;
        helpModal.classList.add('active');
    });
    helpModal.querySelector('.close-modal').addEventListener('click', () => helpModal.classList.remove('active'));
    pauseBtn.addEventListener('click', pauseGame); resumeBtn.addEventListener('click', resumeGame);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

    // ===================================================================
    // ================== MODUL: CLASSIC BLOCKS (TETRIS) =================
    // ===================================================================
    const Tetris = { /* CEO KOD MODULA IDE OVDE */ };

    // ===================================================================
    // ================== MODUL: PUZZLE BOARD (BLOCK PUZZLE) ==============
    // ===================================================================
    const BlockPuzzle = { /* CEO KOD MODULA IDE OVDE */ };

    // --- FINALNO POPUNJAVANJE TELA FUNKCIJA ---
    const fillFunctions = () => {
        Object.assign(Tetris, {
            board: null, nextContainer: null, boardState: [], rows: 20, cols: 10, player: {}, colors: [null, '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#f78c6b', '#9d6bf7'],
            dropCounter: 0, dropInterval: 1000, lastTime: 0, isRunning: false, isPaused: false,
            nextPieces: [], animationFrameId: null, touchStartX: 0, touchStartY: 0, touchMoveX: 0, touchMoveY: 0,
            mode: 'marathon', difficulty: 'normal', combo: 0, linesCleared: 0, timer: 0, timerInterval: null, timeLeft: 180,
            init(mode, difficulty) { this.mode = mode; this.difficulty = difficulty; this.board = document.getElementById('tetris-board'); this.nextContainer = document.getElementById('tetris-next-container'); this.boardState = this.createMatrix(this.cols, this.rows); this.player = { pos: {x: 0, y: 0}, matrix: null, score: 0 }; this.combo = 0; this.linesCleared = 0; this.updateScore(); this.nextPieces = [this.createPiece(), this.createPiece(), this.createPiece()]; this.playerReset(); const dropIntervals = {'easy': 1000, 'normal': 700, 'hard': 400}; this.dropInterval = dropIntervals[this.difficulty]; this.timer = 0; if(this.timerInterval) clearInterval(this.timerInterval); gameTimerElement.textContent = ''; if(this.mode === 'sprint') gameTimerElement.textContent = `Linije: 40`; if(this.mode === 'ultra') this.timeLeft = 180; this.addListeners(); this.resume(); },
            pause() { this.isPaused = true; this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
            resume() { this.isPaused = false; this.isRunning = true; this.lastTime = performance.now(); if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId); this.animationFrameId = requestAnimationFrame(this.update.bind(this)); if(this.mode === 'sprint' || this.mode === 'ultra') this.startTimer();},
            startTimer() { let startTime = Date.now() - this.timer * 1000; this.timerInterval = setInterval(() => { if(!this.isPaused) { if(this.mode === 'sprint') { this.timer = ((Date.now() - startTime) / 1000); gameTimerElement.textContent = `Vreme: ${this.timer.toFixed(2)}s`; } else if (this.mode === 'ultra') { this.timeLeft = 180 - ((Date.now() - startTime)/1000); gameTimerElement.textContent = `Vreme: ${Math.ceil(this.timeLeft)}`; if(this.timeLeft <= 0) this.gameOver(); }}}, 100);},
            addListeners() { this.boundKeyDown = this.handleKeyDown.bind(this); this.boundTouchStart = this.handleTouchStart.bind(this); document.addEventListener('keydown', this.boundKeyDown); this.board.addEventListener('touchstart', this.boundTouchStart, {passive: false}); },
            stop() { this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); document.removeEventListener('keydown', this.boundKeyDown); this.board.removeEventListener('touchstart', this.boundTouchStart); if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId); },
            update(time = 0) { if (!this.isRunning) return; const deltaTime = time - this.lastTime; this.lastTime = time; this.dropCounter += deltaTime; if (this.dropCounter > this.dropInterval) this.playerDrop(); this.draw(); this.animationFrameId = requestAnimationFrame(this.update.bind(this)); },
            draw() { this.board.innerHTML = ''; const fullGrid = JSON.parse(JSON.stringify(this.boardState)); const ghost = {...this.player, matrix: JSON.parse(JSON.stringify(this.player.matrix)) }; while (!this.collide(this.boardState, ghost)) ghost.pos.y++; ghost.pos.y--; ghost.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { const r = y + ghost.pos.y; const c = x + ghost.pos.x; if(r >= 0 && r < this.rows && c >= 0 && c < this.cols) fullGrid[r][c] = 'ghost'; } }); }); this.player.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { const r = y + this.player.pos.y; const c = x + this.player.pos.x; if(r >= 0 && r < this.rows && c >= 0 && c < this.cols) fullGrid[r][c] = value; }}); }); fullGrid.forEach(row => { row.forEach(value => { const cell = document.createElement('div'); if (typeof value === 'number' && value !== 0) { cell.className = 'game-block'; const color = this.colors[value]; cell.style.backgroundColor = color; cell.style.setProperty('--glow-color', color); } else if (value === 'ghost') { cell.className = 'tetris-cell ghost'; } this.board.appendChild(cell); }); }); this.nextContainer.innerHTML = ''; this.nextPieces.forEach(pieceMatrix => { const display = document.createElement('div'); display.className = 'next-piece-display'; display.style.gridTemplateColumns = `repeat(${pieceMatrix[0].length}, 1fr)`; pieceMatrix.forEach(row => { row.forEach(value => { const cell = document.createElement('div'); cell.style.width = '15px'; cell.style.height = '15px'; if (value !== 0) { cell.className = 'game-block'; const color = this.colors[value]; cell.style.backgroundColor = color; cell.style.setProperty('--glow-color', color); } display.appendChild(cell); }); }); this.nextContainer.appendChild(display); }); },
            createMatrix(w, h) { const m = []; while(h--) m.push(new Array(w).fill(0)); return m; },
            createPiece() { const p='TJLOSZI'[Math.floor(Math.random()*7)]; switch(p){ case 'T':return [[1,1,1],[0,1,0]]; case 'J':return [[2,0,0],[2,2,2]]; case 'L':return [[0,0,3],[3,3,3]]; case 'O':return [[4,4],[4,4]]; case 'S':return [[0,5,5],[5,5,0]]; case 'Z':return [[6,6,0],[0,6,6]]; case 'I':return [[0,0,0,0],[7,7,7,7],[0,0,0,0]]; }},
            collide(board, player) { const { matrix, pos } = player; for (let y = 0; y < matrix.length; y++) { for (let x = 0; x < matrix[y].length; x++) { if (matrix[y][x] !== 0) { let newY = y + pos.y; let newX = x + pos.x; if (newX < 0 || newX >= this.cols || newY >= this.rows) return true; if (newY >= 0 && board[newY][newX] !== 0) return true; } } } return false; },
            merge() { this.player.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { this.boardState[y + this.player.pos.y][x + this.player.pos.x] = value; const cellIndex = (y + this.player.pos.y) * this.cols + (x + this.player.pos.x); if(this.board.children[cellIndex]) this.board.children[cellIndex].classList.add('lock-in'); } }); }); Sound.playSfx('place'); },
            arenaSweep() { let clearedRows = []; for (let y = this.rows - 1; y >= 0; y--) { if (this.boardState[y].every(value => value !== 0)) { clearedRows.push(y); }} if (clearedRows.length > 0) { this.combo++; this.linesCleared += clearedRows.length; this.player.score += ([0, 10, 30, 50, 100][clearedRows.length] + (this.combo * 5)) * (this.difficulty === 'hard' ? 2 : 1); this.updateScore(); Sound.playSfx('clear'); Stats.add('tetris_linesCleared', clearedRows.length); clearedRows.reverse().forEach(y_index => { this.playLineClearEffect(y_index); this.boardState.splice(y_index, 1); this.boardState.unshift(new Array(this.cols).fill(0)); }); if (this.mode === 'marathon' && clearedRows.length > 0) this.dropInterval *= Math.pow(0.98, clearedRows.length); if (this.mode === 'sprint') { const linesLeft = 40 - this.linesCleared; gameTimerElement.textContent = `Linije: ${linesLeft > 0 ? linesLeft : 0}`; if(this.linesCleared >= 40) this.gameOver(); }} else { this.combo = 0; }},
            playLineClearEffect(rowIndex) { for (let i = 0; i < this.cols; i++) { const cellIndex = rowIndex * this.cols + i; if(this.board.children[cellIndex])this.board.children[cellIndex].classList.add('line-clearing');}},
            updateScore() { scoreElement.textContent = this.player.score; scoreElement.parentElement.classList.add('score-updated'); setTimeout(()=>scoreElement.parentElement.classList.remove('score-updated'), 200); },
            playerReset() { this.player.matrix = this.nextPieces.shift(); this.nextPieces.push(this.createPiece()); this.player.pos.y = 0; this.player.pos.x = Math.floor(this.cols/2)-Math.floor(this.player.matrix[0].length/2); if(this.collide(this.boardState,this.player)) this.gameOver(); },
            playerMove(dir) { if(this.isPaused) return; this.player.pos.x += dir; if(this.collide(this.boardState,this.player)) this.player.pos.x-=dir; },
            playerDrop() { if(this.isPaused) return; this.player.pos.y++; if (this.collide(this.boardState, this.player)) { this.player.pos.y--; this.merge(); this.playerReset(); this.arenaSweep(); } this.dropCounter = 0; },
            rotate(m,d) { for(let y=0;y<m.length;++y){for(let x=0;x<y;++x)[m[x][y],m[y][x]]=[m[y][x],m[x][y]];} d>0?m.forEach(r=>r.reverse()):m.reverse(); },
            playerRotate(dir) { if(this.isPaused) return; const pos = this.player.pos.x; let offset=1; this.rotate(this.player.matrix,dir); while(this.collide(this.boardState,this.player)){ this.player.pos.x+=offset; offset=-(offset+(offset>0?1:-1)); if(offset>this.player.matrix[0].length){this.rotate(this.player.matrix,-dir);this.player.pos.x=pos;return;}}},
            handleKeyDown(e) { if(!this.isRunning || this.isPaused) return; switch(e.keyCode){ case 37:this.playerMove(-1);break; case 39:this.playerMove(1);break; case 40:this.playerDrop();break; case 81:this.playerRotate(-1);break; case 87:case 38:this.playerRotate(1);break; case 32:this.hardDrop();break; }},
            handleTouchStart(e) { if(this.isPaused) return; e.preventDefault(); this.touchStartX=e.touches[0].clientX; this.touchStartY=e.touches[0].clientY; this.touchMoveX=this.touchStartX; this.touchMoveY=this.touchStartY; this.boundTouchMove=this.handleTouchMove.bind(this); this.boundTouchEnd=this.handleTouchEnd.bind(this); this.board.addEventListener('touchmove',this.boundTouchMove,{passive:false}); this.board.addEventListener('touchend',this.boundTouchEnd,{passive:false});},
            handleTouchMove(e) { e.preventDefault(); this.touchMoveX=e.touches[0].clientX; this.touchMoveY=e.touches[0].clientY; },
            handleTouchEnd() { if(this.isPaused) return; this.board.removeEventListener('touchmove',this.boundTouchMove); this.board.removeEventListener('touchend',this.boundTouchEnd); const dX=this.touchMoveX-this.touchStartX; const dY=this.touchMoveY-this.touchStartY; const bW=this.board.clientWidth/this.cols; if(Math.abs(dX)>Math.abs(dY)){if(Math.abs(dX)>bW/2)this.playerMove(dX>0?1:-1);} else {if(dY>bW*2)this.hardDrop();else if(dY>bW/2)this.playerDrop();else if(Math.abs(dX)<20&&Math.abs(dY)<20)this.playerRotate(1);}},
            hardDrop() { if(this.isPaused) return; while(!this.collide(this.boardState,this.player))this.player.pos.y++; this.player.pos.y--; this.merge(); this.playerReset(); this.arenaSweep(); shakeScreen(); Sound.playSfx('hardDrop'); },
            gameOver() { this.stop(); let finalValue = this.mode === 'sprint' ? parseFloat(this.timer) : this.player.score; showGameOver(finalValue, 'tetris', this.mode, this.mode === 'sprint' ? finalValue : null); },
            getHelpText() { return `<ul><li><strong>Marathon:</strong> Klasičan mod gde se brzina postepeno povećava. Cilj je najveći skor.</li><li><strong>Sprint:</strong> Očistite 40 linija što je brže moguće.</li><li><strong>Ultra:</strong> Osvojite što više poena za 3 minuta.</li></ul>`;}
        });

        Object.assign(BlockPuzzle, {
            boardElement: null, piecesContainer: null, boardState: [], score: 0, isRunning: false, isPaused: false, activeDragPiece: null,
            pieceShapes: [ {shape:[[1]],color:'#ef476f'},{shape:[[1,1]],color:'#ffd166'},{shape:[[1],[1]],color:'#ffd166'}, {shape:[[1,1,1]],color:'#06d6a0'},{shape:[[1],[1],[1]],color:'#06d6a0'}, {shape:[[1,1],[1,0]],color:'#118ab2'},{shape:[[1,1],[0,1]],color:'#118ab2'}, {shape:[[1,0],[1,1]],color:'#118ab2'},{shape:[[0,1],[1,1]],color:'#118ab2'}, {shape:[[1,1,1],[0,1,0]],color:'#073b4c'},{shape:[[1,1],[1,1]],color:'#f78c6b'} ],
            currentPieces:[], mode: 'classic', difficulty: 'normal', combo: 0, timeLeft: 120, timerInterval: null, bombs: [], movesSinceBomb: 0,
            init(mode, difficulty) { this.mode = mode; this.difficulty = difficulty; this.boardElement=document.getElementById('puzzle-board'); this.piecesContainer=document.getElementById('puzzle-pieces-container'); this.boardState=Tetris.createMatrix(10,10); this.score=0; this.combo=0; this.updateScore(); this.bombs=[]; this.movesSinceBomb=0; this.renderBoard(); this.generateNewPieces(); if(this.boundDragStart){this.piecesContainer.removeEventListener('mousedown',this.boundDragStart);this.piecesContainer.removeEventListener('touchstart',this.boundDragStart);} this.boundDragStart=this.onDragStart.bind(this); this.piecesContainer.addEventListener('mousedown',this.boundDragStart); this.piecesContainer.addEventListener('touchstart',this.boundDragStart,{passive:false}); if (this.timerInterval) clearInterval(this.timerInterval); gameTimerElement.textContent = ''; if (this.mode === 'timeAttack') { this.timeLeft = 120; } if (this.mode === 'blast') { this.movesSinceBomb=0;} this.resume(); },
            pause() { this.isPaused = true; this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
            resume() { this.isPaused = false; this.isRunning = true; if(this.mode === 'timeAttack' || this.mode === 'blast') this.startTimer(); },
            startTimer() { let lastTime = Date.now(); this.timerInterval = setInterval(() => { if(!this.isPaused) { const now = Date.now(); const delta = (now - lastTime) / 1000; lastTime = now; if(this.mode === 'timeAttack') { this.timeLeft -= delta; gameTimerElement.textContent = `Vreme: ${Math.ceil(this.timeLeft)}`; if (this.timeLeft <= 0) this.gameOver(); } if(this.mode === 'blast') { this.updateBombs(); }}}, 1000);},
            stop() { this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
            renderBoard() { this.boardElement.innerHTML=''; this.boardState.forEach((row, r)=>{row.forEach((cellValue, c)=>{ const cell=document.createElement('div'); cell.className='puzzle-cell'; if(cellValue){const color=cellValue; cell.style.backgroundColor = color; cell.classList.add('filled','game-block'); const bomb = this.bombs.find(b=>b.r===r && b.c===c); if(bomb){ const timerEl = document.createElement('div'); timerEl.className = 'bomb-timer'; timerEl.textContent = bomb.timer; cell.appendChild(timerEl);}} this.boardElement.appendChild(cell); });});},
            generateNewPieces() { this.currentPieces=[]; this.piecesContainer.innerHTML=''; for(let i=0;i<3;i++){ const pieceData={...this.pieceShapes[Math.floor(Math.random()*this.pieceShapes.length)]}; pieceData.id=`piece-${Date.now()}-${i}`; this.currentPieces.push(pieceData); this.renderPiece(pieceData); } if(this.checkGameOver()){this.gameOver();}},
            renderPiece(pieceData) { const pieceEl=document.createElement('div'); pieceEl.className='puzzle-piece'; pieceEl.dataset.id=pieceData.id; pieceEl.style.gridTemplateColumns=`repeat(${pieceData.shape[0].length},1fr)`; pieceData.shape.forEach(row=>{row.forEach(cell=>{ const cellEl=document.createElement('div'); if(cell){cellEl.className='puzzle-piece-cell game-block'; const color=pieceData.color; cellEl.style.backgroundColor = color; cellEl.style.setProperty('--glow-color', color);} pieceEl.appendChild(cellEl); });}); this.piecesContainer.appendChild(pieceEl); },
            onDragStart(e) { if(!e.target.closest('.puzzle-piece')||!this.isRunning||this.isPaused) return; e.preventDefault(); const pieceEl=e.target.closest('.puzzle-piece'); const pieceId=pieceEl.dataset.id; const pieceData=this.currentPieces.find(p=>p.id===pieceId); this.activeDragPiece=pieceData; const draggingEl=pieceEl.cloneNode(true); draggingEl.classList.add('dragging'); document.body.appendChild(draggingEl); const rect=pieceEl.getBoundingClientRect(); const touch=e.type==='touchstart'?e.touches[0]:e; const pieceCell = pieceEl.querySelector('.game-block'); const cellRect = pieceCell ? pieceCell.getBoundingClientRect() : rect; this.touchOffsetX = touch.clientX - cellRect.left; this.touchOffsetY = touch.clientY - cellRect.top; pieceEl.style.opacity='0.3'; const moveHandler=(moveEvent)=>{ const moveTouch=moveEvent.type==='touchmove'?moveEvent.touches[0]:moveEvent; draggingEl.style.left=`${moveTouch.clientX-this.touchOffsetX}px`; draggingEl.style.top=`${moveTouch.clientY-this.touchOffsetY}px`; this.renderGhost(pieceData,moveTouch); }; const endHandler=(endEvent)=>{ document.removeEventListener('mousemove',moveHandler); document.removeEventListener('touchmove',moveHandler); document.removeEventListener('mouseup',endHandler); document.removeEventListener('touchend',endHandler); draggingEl.remove(); this.boardElement.querySelectorAll('.ghost-path').forEach(c=>{c.classList.remove('ghost-path');c.style.backgroundColor='';}); this.activeDragPiece=null; const boardRect=this.boardElement.getBoundingClientRect(); const endTouch=endEvent.type==='touchend'?endEvent.changedTouches[0]:endEvent; const x=endTouch.clientX-boardRect.left-this.touchOffsetX; const y=endTouch.clientY-boardRect.top-this.touchOffsetY; const cellWidth = boardRect.width/10; const col=Math.round(x/cellWidth); const row=Math.round(y/cellWidth); if(this.canPlacePiece(pieceData,row,col)){ this.placePiece(pieceData,row,col); pieceEl.remove(); this.currentPieces=this.currentPieces.filter(p=>p.id!==pieceId); if(this.currentPieces.length===0)this.generateNewPieces(); } else {pieceEl.style.opacity='1';} }; document.addEventListener('mousemove',moveHandler); document.addEventListener('touchmove',moveHandler); document.addEventListener('mouseup',endHandler); document.addEventListener('touchend',endHandler); },
            renderGhost(pieceData,moveTouch) { this.boardElement.querySelectorAll('.ghost-path').forEach(c=>{c.classList.remove('ghost-path');c.style.backgroundColor='';}); if(!pieceData) return; const boardRect=this.boardElement.getBoundingClientRect(); const x=moveTouch.clientX-boardRect.left-this.touchOffsetX; const y=moveTouch.clientY-boardRect.top-this.touchOffsetY; const cellWidth = boardRect.width/10; const startCol=Math.round(x/cellWidth); const startRow=Math.round(y/cellWidth); for(let r=0;r<pieceData.shape.length;r++){for(let c=0;c<pieceData.shape[r].length;c++){ if(pieceData.shape[r][c]){ const bR=startRow+r; const bC=startCol+c; if(bR<10&&bC<10&&bR>=0&&bC>=0){ const cellIndex=bR*10+bC; const cell=this.boardElement.children[cellIndex]; if(cell&&!this.boardState[bR][bC]){ cell.classList.add('ghost-path'); cell.style.setProperty('--color',pieceData.color);}} }}} },
            canPlacePiece(p,startRow,startCol){for(let r=0;r<p.shape.length;r++){for(let c=0;c<p.shape[r].length;c++){if(p.shape[r][c]){const bR=startRow+r;const bC=startCol+c;if(bR>=10||bC>=10||bR<0||bC<0||this.boardState[bR][bC])return false;}}}return true;},
            placePiece(pieceData,startRow,startCol) { let placedCells=0; pieceData.shape.forEach((row,r)=>{row.forEach((cell,c)=>{ if(cell){this.boardState[startRow+r][startCol+c]=pieceData.color; placedCells++;}});}); this.score+=placedCells; Sound.playSfx('place'); this.clearLines(); this.renderBoard(); this.updateScore(); if(this.mode === 'blast') { this.movesSinceBomb++; if(this.movesSinceBomb >= (10 - this.difficulty.length)) this.spawnBomb(); }},
            clearLines() { let clearedRows=[],clearedCols=[]; for(let r=0;r<10;r++)if(this.boardState[r].every(cell=>cell))clearedRows.push(r); for(let c=0;c<10;c++)if(this.boardState.every(row=>row[c]))clearedCols.push(c); this.bombs = this.bombs.filter(bomb => !clearedRows.includes(bomb.r) && !clearedCols.includes(bomb.c)); clearedRows.forEach(r=>this.boardState[r].fill(0)); clearedCols.forEach(c=>this.boardState.forEach(row=>row[c]=0)); const clearedCount=clearedRows.length+clearedCols.length; if(clearedCount>0){this.combo++; this.score+=(clearedCount*clearedCount*10)+(this.combo*10);Sound.playSfx('clear');Stats.add('blockPuzzle_linesCleared',clearedCount);} else {this.combo=0;}},
            checkGameOver() { for(const piece of this.currentPieces){ for(let r=0;r<10;r++){ for(let c=0;c<10;c++){ if(this.canPlacePiece(piece,r,c))return false;}}} return true; },
            spawnBomb() { this.movesSinceBomb = 0; const filledCells = []; for(let r=0;r<10;r++){for(let c=0;c<10;c++){if(this.boardState[r][c]) filledCells.push({r,c});}} if(filledCells.length === 0) return; const cell = filledCells[Math.floor(Math.random()*filledCells.length)]; if(this.bombs.find(b=>b.r===cell.r && b.c===cell.c)) return; this.bombs.push({r: cell.r, c: cell.c, timer: 9}); Sound.playSfx('bomb'); this.renderBoard();},
            updateBombs() { this.bombs.forEach(bomb => bomb.timer--); if(this.bombs.some(b=>b.timer<0)) { shakeScreen(); this.gameOver(); return; } this.renderBoard();},
            updateScore() { scoreElement.textContent = this.score; scoreElement.parentElement.classList.add('score-updated'); setTimeout(()=>scoreElement.parentElement.classList.remove('score-updated'), 200); },
            gameOver() { this.stop(); Sound.playSfx('gameOver'); showGameOver(this.score, 'block-puzzle', this.mode); },
            getHelpText() { return `<ul><li><strong>Classic:</strong> Opustite se i ređajte blokove dok imate mesta. Cilj je najveći skor.</li><li><strong>Time Attack:</strong> Osvojite što više poena za 2 minuta.</li><li><strong>Blast:</strong> Preživite što duže! Povremeno se pojavljuju bombe koje morate očistiti pre isteka tajmera.</li></ul>`;}
        });
    }
    fillFunctions();
});
