document.addEventListener('DOMContentLoaded', () => {

    const CONSTANTS = {
        GAMES: { TETRIS: 'tetris', BLOCK_PUZZLE: 'block-puzzle' },
        MODES: { TETRIS_MARATHON: 'marathon', TETRIS_SPRINT: 'sprint', TETRIS_ULTRA: 'ultra', PUZZLE_CLASSIC: 'classic', PUZZLE_TIME_ATTACK: 'timeAttack', PUZZLE_BLAST: 'blast' },
        DIFFICULTY: { EASY: 'easy', NORMAL: 'normal', HARD: 'hard' },
        KEYS: { LEFT: 37, RIGHT: 39, DOWN: 40, UP: 38, SPACE: 32, Q: 81, W: 87, C: 67 },
        SPRINT_GOAL: 40,
        ULTRA_TIME: 180,
        TIME_ATTACK_TIME: 120
    };

    const screens = { mainMenu: document.getElementById('main-menu-screen'), gameMode: document.getElementById('game-mode-screen'), shop: document.getElementById('shop-screen'), achievements: document.getElementById('achievements-screen'), game: document.getElementById('game-screen'), postGame: document.getElementById('post-game-screen') };
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownText = document.getElementById('countdown-text');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const helpModal = document.getElementById('help-modal');
    const helpContentContainer = document.getElementById('help-content-container');
    const pauseOverlay = document.getElementById('pause-overlay');
    const resumeBtn = document.getElementById('resume-btn');
    const gemBalanceDisplay = document.getElementById('gem-balance');
    const tetrisUI = { gameArea: document.getElementById('tetris-game-area'), score: document.getElementById('tetris-score'), level: document.getElementById('tetris-level'), nextPiece: document.getElementById('tetris-next-piece'), holdPiece: document.getElementById('tetris-hold-piece'), pauseBtn: document.getElementById('pause-btn-tetris'), helpBtn: document.getElementById('help-btn-tetris'), backBtn: document.getElementById('back-btn-tetris'), holdContainer: document.getElementById('tetris-hold-container') };
    const puzzleUI = { gameArea: document.getElementById('puzzle-game-area'), score: document.getElementById('puzzle-score'), header: document.querySelector('.puzzle-only.game-header-bar'), piecesContainer: document.getElementById('puzzle-pieces-container'), pauseBtn: document.getElementById('pause-btn-puzzle'), helpBtn: document.getElementById('help-btn-puzzle'), timer: document.getElementById('game-timer') };
    const postGameUI = { title: document.getElementById('post-game-title'), score: document.getElementById('post-game-score'), newBest: document.getElementById('post-game-new-best'), stats: document.getElementById('post-game-stats'), unlocks: document.getElementById('post-game-unlocks'), restartBtn: document.getElementById('restart-btn-pogs'), shareBtn: document.getElementById('share-btn'), backToMenuBtn: document.getElementById('back-to-menu-btn-pogs') };
    let activeGame = null, activeGameModule = null, activeGameMode = null, activeDifficulty = CONSTANTS.DIFFICULTY.NORMAL;

    const GAME_DATA = {
        shop: {
            themes: { neon: {name: 'Neon', price: 5000}, gold: {name: 'Zlatna', price: 10000}, silver: {name: 'Srebrna', price: 7500} },
            modes: {
                [`${CONSTANTS.GAMES.TETRIS}_${CONSTANTS.MODES.TETRIS_SPRINT}`]: {name: 'Sprint', price: 2000},
                [`${CONSTANTS.GAMES.TETRIS}_${CONSTANTS.MODES.TETRIS_ULTRA}`]: {name: 'Ultra', price: 2000},
                [`${CONSTANTS.GAMES.BLOCK_PUZZLE}_${CONSTANTS.MODES.PUZZLE_TIME_ATTACK}`]: {name: 'Time Attack', price: 2500},
                [`${CONSTANTS.GAMES.BLOCK_PUZZLE}_${CONSTANTS.MODES.PUZZLE_BLAST}`]: {name: 'Blast', price: 3000}
            }
        },
        achievements: {
            tetrisNovajlija: { name: 'Tetris Početnik', desc: 'Odigraj 10 partija Tetrisa.', goal: 10, reward: 500, key: 'tetris_gamesPlayed'},
            tetrisMaher: { name: 'Tetris Maher', desc: 'Očisti 1000 linija.', goal: 1000, reward: 1000, key: 'tetris_linesCleared'},
            puzzleUpornost: { name: 'Puzzle Istrajnost', desc: 'Postavi 500 blokova.', goal: 500, reward: 750, key: 'blockPuzzle_piecesPlaced'},
            puzzleCistac: { name: 'Puzzle Čistač', desc: 'Očisti 500 linija.', goal: 500, reward: 1500, key: 'blockPuzzle_linesCleared'}
        }
    };

    const PlayerData = {
        state: {},
        defaults: { gems: 500, unlockedThemes: ['dark', 'light'], unlockedModes: { [CONSTANTS.GAMES.TETRIS]: [CONSTANTS.MODES.TETRIS_MARATHON], [CONSTANTS.GAMES.BLOCK_PUZZLE]: [CONSTANTS.MODES.PUZZLE_CLASSIC] }, lastLoginDate: null, loginStreak: 0, stats: {}},
        load() { try { const d = localStorage.getItem('puzzlePlayerData'); this.state = d ? JSON.parse(d) : structuredClone(this.defaults); } catch (e) { this.state = structuredClone(this.defaults); } this.updateGemDisplay(); },
        save() { localStorage.setItem('puzzlePlayerData', JSON.stringify(this.state)); this.updateGemDisplay(); },
        updateGemDisplay() { if (gemBalanceDisplay) gemBalanceDisplay.textContent = this.state.gems; }
    };

    const Sound = {
        sfx: {}, music: null, sfxVolume: 0.3, musicVolume: 0.2, hapticsEnabled: true,
        init() { try { this.sfx.place = new Audio(); this.sfx.clear = new Audio(); this.sfx.gameOver = new Audio(); this.sfx.hardDrop = new Audio(); this.sfx.unlock = new Audio(); this.music = new Audio(); this.music.loop = true; if (Settings.sfxSlider) this.updateSfxVolume(Settings.sfxSlider.value); if (Settings.musicSlider) this.updateMusicVolume(Settings.musicSlider.value); } catch (e) { console.warn("Audio disabled."); } },
        playSfx(name) { if (this.sfx[name]) { this.sfx[name].currentTime = 0; this.sfx[name].play().catch(() => {}); } },
        playMusic() { if(this.music && activeGameModule && !activeGameModule.isPaused) this.music.play().catch(() => {}); },
        stopMusic() { if(this.music) { this.music.pause(); this.music.currentTime = 0; } },
        updateSfxVolume(v) { this.sfxVolume = v; Object.values(this.sfx).forEach(s => s.volume = this.sfxVolume); },
        updateMusicVolume(v) { this.musicVolume = v; if(this.music) this.music.volume = this.musicVolume; },
        vibrate(d = 10) { if(this.hapticsEnabled && 'vibrate' in navigator) navigator.vibrate(d); }
    };
    
    const Settings = {
        themeSelectContainer: document.getElementById('theme-select-container'), musicSlider: document.getElementById('music-volume'), sfxSlider: document.getElementById('sfx-volume'), hapticsBtn: document.getElementById('haptics-toggle-btn'), holdBtn: document.getElementById('hold-toggle-btn'), closeBtn: settingsModal.querySelector('.close-modal'),
        init() {
            const savedMusicVol = localStorage.getItem('puzzleMusicVol') || '0.2', savedSfxVol = localStorage.getItem('puzzleSfxVol') || '0.3', savedHaptics = localStorage.getItem('puzzleHaptics') !== 'false', savedHold = localStorage.getItem('puzzleHold') === 'true';
            this.musicSlider.value = savedMusicVol; this.sfxSlider.value = savedSfxVol; this.setHaptics(savedHaptics); this.setHold(savedHold);
            this.musicSlider.addEventListener('input', e => this.setMusicVolume(e.target.value)); this.sfxSlider.addEventListener('input', e => this.setSfxVolume(e.target.value)); this.hapticsBtn.addEventListener('click', () => this.setHaptics(!Sound.hapticsEnabled)); this.holdBtn.addEventListener('click', () => this.setHold(!Tetris.holdEnabled)); settingsBtn.addEventListener('click', () => { this.renderThemes(); settingsModal.classList.add('active'); }); this.closeBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
        },
        renderThemes() {
            const allThemes = ['dark', 'light', ...Object.keys(GAME_DATA.shop.themes)], savedTheme = localStorage.getItem('puzzleTheme') || 'dark'; this.themeSelectContainer.innerHTML = '';
            allThemes.forEach(theme => {
                const isUnlocked = PlayerData.state.unlockedThemes.includes(theme), option = document.createElement('div'); option.className = 'theme-option'; option.dataset.theme = theme;
                const themeColors = {dark: '#0d1117', light: '#f0f2f5', neon: '#00ffde', gold: '#ffd700', silver: '#d1d5db'};
                option.innerHTML = `<span class="theme-preview" style="background-color: ${themeColors[theme] || '#fff'}"></span> ${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
                if (!isUnlocked) { option.classList.add('locked'); option.title = 'Otključaj u prodavnici!'; option.innerHTML += ' 🔒'; } else { option.addEventListener('click', () => this.setTheme(theme)); }
                if (theme === savedTheme) option.classList.add('active'); this.themeSelectContainer.appendChild(option);
            }); this.setTheme(savedTheme);
        },
        setTheme(themeName) { document.body.className = `${themeName}-theme`; localStorage.setItem('puzzleTheme', themeName); const active = this.themeSelectContainer.querySelector('.active'); if(active) active.classList.remove('active'); const newActive = this.themeSelectContainer.querySelector(`[data-theme="${themeName}"]`); if(newActive) newActive.classList.add('active'); },
        setMusicVolume(v) { Sound.updateMusicVolume(v); localStorage.setItem('puzzleMusicVol', v); },
        setSfxVolume(v) { Sound.updateSfxVolume(v); localStorage.setItem('puzzleSfxVol', v); },
        setHaptics(e) { Sound.hapticsEnabled = e; localStorage.setItem('puzzleHaptics', e); this.hapticsBtn.textContent = e ? 'ON' : 'OFF'; this.hapticsBtn.classList.toggle('active', e); },
        setHold(e) { Tetris.holdEnabled = e; localStorage.setItem('puzzleHold', e); this.holdBtn.textContent = e ? 'ON' : 'OFF'; this.holdBtn.classList.toggle('active', e); }
    };
    
    const HighScore = {
        getKey(game, mode, difficulty) { return `highscore_${game}_${mode}_${difficulty}`; },
        get(game, mode, difficulty) { return parseFloat(localStorage.getItem(this.getKey(game, mode, difficulty)) || '0'); },
        set(game, mode, difficulty, score) {
            const key = this.getKey(game, mode, difficulty);
            const currentHigh = this.get(game, mode, difficulty);
            let isNewBest = false;
            if (mode === CONSTANTS.MODES.TETRIS_SPRINT) {
                if (score < currentHigh || currentHigh === 0) { localStorage.setItem(key, score); isNewBest = true; }
            } else {
                if (score > currentHigh) { localStorage.setItem(key, score); isNewBest = true; }
            }
            return isNewBest;
        }
    };
    
    const PostGame = {
        show(runStats) {
            postGameUI.title.textContent = runStats.newBest ? 'NOVI REKORD!' : 'Kraj Igre';
            postGameUI.newBest.style.display = runStats.newBest ? 'inline-block' : 'none';
            postGameUI.score.textContent = '0';
            let statsHTML = '';
            if(runStats.game === CONSTANTS.GAMES.TETRIS) {
                statsHTML = `<div class="stat-line"><span>Nivo:</span><span class="value">${runStats.level}</span></div><div class="stat-line"><span>Linije:</span><span class="value">${runStats.linesCleared}</span></div><div class="stat-line"><span>Najduži kombo:</span><span class="value">${runStats.maxCombo}</span></div>`;
            } else {
                statsHTML = `<div class="stat-line"><span>Postavljeno blokova:</span><span class="value">${runStats.piecesPlaced}</span></div><div class="stat-line"><span>Očišćeno linija:</span><span class="value">${runStats.linesCleared}</span></div>${runStats.mode === CONSTANTS.MODES.PUZZLE_BLAST ? `<div class="stat-line"><span>Deaktivirano bombi:</span><span class="value">${runStats.bombsDefused}</span></div>` : ''}`;
            }
            postGameUI.stats.innerHTML = statsHTML;
            showScreen('postGame');
            animateScore(postGameUI.score, runStats.score);
        }
    };

    const MainMenu3D = {
        container: document.getElementById('main-menu-screen'),
        items: document.querySelectorAll('.menu-item'),
        boundMouseMove: null,
        init() { this.boundMouseMove = this.onMouseMove.bind(this); this.container.addEventListener('mousemove', this.boundMouseMove, { passive: true }); },
        destroy() { if (this.boundMouseMove) this.container.removeEventListener('mousemove', this.boundMouseMove); this.items.forEach(item => { item.style.transform = ''; }); },
        onMouseMove(e) { const { clientX, clientY } = e; const { innerWidth, innerHeight } = window; const x = (clientX / innerWidth) - 0.5; const y = (clientY / innerHeight) - 0.5; this.items.forEach(item => { item.style.transform = `perspective(1000px) rotateY(${x * 15}deg) rotateX(${-y * 15}deg) scale(1.05)`; }); }
    };
    
    const DailyLogin = {
        modal: document.getElementById('daily-login-modal'),
        init() {
            const today = new Date().toDateString();
            if (PlayerData.state.lastLoginDate !== today) {
                const yesterday = new Date(Date.now() - 86400000).toDateString();
                if (PlayerData.state.lastLoginDate === yesterday) { PlayerData.state.loginStreak++; } else { PlayerData.state.loginStreak = 1; }
                PlayerData.state.lastLoginDate = today;
                const reward = 50 + (PlayerData.state.loginStreak * 50);
                PlayerData.state.gems += reward; PlayerData.save();
                this.show(reward, PlayerData.state.loginStreak);
            }
        },
        show(reward, streak) { this.modal.querySelector('#daily-login-reward').textContent = `${reward} 💎`; this.modal.querySelector('#daily-login-streak').textContent = `Niz prijavljivanja: ${streak} dan(a)!`; this.modal.classList.add('active'); this.modal.querySelector('.close-modal').onclick = () => this.modal.classList.remove('active');}
    };

    const Shop = {
        container: document.getElementById('shop-screen'),
        themesContainer: document.getElementById('shop-themes-container'),
        init() { document.getElementById('shop-btn').addEventListener('click', () => { this.render(); showScreen('shop'); }); this.container.addEventListener('click', e => this.handleBuy(e)); },
        render() { this.themesContainer.innerHTML = Object.keys(GAME_DATA.shop.themes).map(key => { const item = GAME_DATA.shop.themes[key]; const isOwned = PlayerData.state.unlockedThemes.includes(key); return `<div class="shop-item"><div class="shop-item-preview">${item.name}</div><div class="shop-item-price">${item.price} 💎</div><button class="shop-item-btn" data-id="${key}" data-type="themes" ${isOwned ? 'disabled' : ''}>${isOwned ? 'Kupljeno' : 'Kupi'}</button></div>`; }).join(''); },
        handleBuy(e) {
            const btn = e.target.closest('.shop-item-btn');
            if (!btn || btn.disabled) return;
            const id = btn.dataset.id, type = btn.dataset.type, item = GAME_DATA.shop[type][id];
            if (PlayerData.state.gems >= item.price) {
                PlayerData.state.gems -= item.price;
                if (type === 'themes') PlayerData.state.unlockedThemes.push(id);
                PlayerData.save();
                this.render();
                Sound.playSfx('unlock');
            } else {
                alert('Nemate dovoljno dragulja!');
            }
        }
    };
    
    function showScreen(screenName) { Object.values(screens).forEach(s => s.classList.remove('active')); if (screens[screenName]) screens[screenName].classList.add('active'); if(screenName === 'mainMenu') MainMenu3D.init(); else MainMenu3D.destroy(); }
    
    async function startGame(game, mode, difficulty) {
        activeGame = game; activeGameMode = mode; activeDifficulty = difficulty;
        document.body.classList.toggle('tetris-active', game === CONSTANTS.GAMES.TETRIS);
        document.body.classList.toggle('puzzle-active', game === CONSTANTS.GAMES.BLOCK_PUZZLE);
        document.body.classList.toggle('hold-enabled', game === CONSTANTS.GAMES.TETRIS && Tetris.holdEnabled);
        if (game === CONSTANTS.GAMES.TETRIS) { activeGameModule = Tetris; tetrisUI.gameArea.classList.add('active'); puzzleUI.gameArea.classList.remove('active');
        } else { activeGameModule = BlockPuzzle; puzzleUI.gameArea.classList.add('active'); tetrisUI.gameArea.classList.remove('active'); }
        showScreen('game'); Sound.playMusic(); await runCountdown(); activeGameModule.init(mode, difficulty);
    }
    
    function endGame(runStats) { if (activeGameModule) activeGameModule.stop(); Sound.stopMusic(); Sound.playSfx('gameOver'); PlayerData.state.gems += Math.floor(runStats.score / 100); const statsToAdd = runStats.stats || {}; Object.keys(statsToAdd).forEach(key => { PlayerData.state.stats[key] = (PlayerData.state.stats[key] || 0) + statsToAdd[key]; }); const newBest = HighScore.set(runStats.game, runStats.mode, runStats.difficulty, runStats.score); runStats.newBest = newBest; PlayerData.save(); PostGame.show(runStats); }
    function pauseGame() { if (activeGameModule && activeGameModule.isRunning) { Sound.stopMusic(); activeGameModule.pause(); pauseOverlay.classList.add('active'); } }
    function resumeGame() { if (activeGameModule && !activeGameModule.isRunning) { Sound.playMusic(); activeGameModule.resume(); pauseOverlay.classList.remove('active'); } }
    async function runCountdown() { countdownOverlay.classList.add('active'); for (let i = 3; i > 0; i--) { countdownText.textContent = i; await new Promise(res => setTimeout(res, 800)); } countdownText.textContent = 'GO!'; await new Promise(res => setTimeout(res, 500)); countdownOverlay.classList.remove('active'); }
    function animateScore(element, finalScore) { let cS=0; const inc=Math.max(1,Math.floor(finalScore/100)); const i=setInterval(()=>{cS+=inc; if(cS>=finalScore){cS=finalScore;clearInterval(i);} element.textContent=(finalScore%1!==0)?parseFloat(cS).toFixed(2):Math.round(cS);},10); }
    function shakeScreen() { screens.game.classList.add('screen-shake'); setTimeout(() => screens.game.classList.remove('screen-shake'), 150); }

    function showModeSelect(game) {
        const container = document.getElementById('mode-selection-container'); let modes = [];
        if (game === CONSTANTS.GAMES.TETRIS) { modes = [ { id: CONSTANTS.MODES.TETRIS_MARATHON, name: 'Maraton' }, { id: CONSTANTS.MODES.TETRIS_SPRINT, name: 'Sprint' }, { id: CONSTANTS.MODES.TETRIS_ULTRA, name: 'Ultra' } ]; } 
        else { modes = [ { id: CONSTANTS.MODES.PUZZLE_CLASSIC, name: 'Klasik' }, { id: CONSTANTS.MODES.PUZZLE_TIME_ATTACK, name: 'Trka sa vremenom' }, { id: CONSTANTS.MODES.PUZZLE_BLAST, name: 'Eksplozija' } ]; }
        container.innerHTML = modes.map(mode => {
            const isUnlocked = PlayerData.state.unlockedModes[game]?.includes(mode.id);
            if (isUnlocked) return `<button class="mode-btn" data-mode="${mode.id}">${mode.name}</button>`;
            const modeKey = `${game}_${mode.id}`;
            const modeData = GAME_DATA.shop.modes[modeKey];
            return `<button class="mode-btn" data-mode="${mode.id}" data-price="${modeData.price}"> ${mode.name} 🔒<span class="price-tag">${modeData.price} 💎</span></button>`;
        }).join('');
        showScreen('gameMode');
    }

    document.querySelectorAll('.menu-item').forEach(item => { item.addEventListener('click', () => { activeGame = item.dataset.game; showModeSelect(activeGame); }); });
    document.querySelectorAll('.back-to-main-menu').forEach(btn => btn.addEventListener('click', () => { if(activeGameModule) activeGameModule.stop(); showScreen('mainMenu'); }));
    document.getElementById('mode-selection-container').addEventListener('click', e => {
        const modeBtn = e.target.closest('.mode-btn'); if (!modeBtn) return;
        const mode = modeBtn.dataset.mode;
        const isUnlocked = PlayerData.state.unlockedModes[activeGame]?.includes(mode);
        if (isUnlocked) { startGame(activeGame, mode, activeDifficulty); } 
        else {
            const price = parseInt(modeBtn.dataset.price);
            if (PlayerData.state.gems >= price) {
                if (confirm(`Želite li da otključate ovaj mod za ${price} 💎?`)) {
                    PlayerData.state.gems -= price;
                    if (!PlayerData.state.unlockedModes[activeGame]) PlayerData.state.unlockedModes[activeGame] = [];
                    PlayerData.state.unlockedModes[activeGame].push(mode);
                    PlayerData.save(); Sound.playSfx('unlock'); showModeSelect(activeGame);
                }
            } else { alert('Nemate dovoljno dragulja!'); }
        }
    });
    document.querySelector('.difficulty-selector').addEventListener('click', e => { const diffBtn = e.target.closest('.difficulty-btn'); if (diffBtn) { document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active')); diffBtn.classList.add('active'); activeDifficulty = diffBtn.dataset.difficulty; }});
    postGameUI.restartBtn.addEventListener('click', () => showModeSelect(activeGame));
    postGameUI.backToMenuBtn.addEventListener('click', () => showScreen('mainMenu'));
    document.querySelectorAll('.help-btn').forEach(btn => btn.addEventListener('click', () => { if (activeGameModule) { helpContentContainer.innerHTML = activeGameModule.getHelpText(); helpModal.classList.add('active'); } }));
    helpModal.querySelector('.close-modal').addEventListener('click', () => helpModal.classList.remove('active'));
    tetrisUI.pauseBtn.addEventListener('click', pauseGame);
    puzzleUI.pauseBtn.addEventListener('click', pauseGame);
    resumeBtn.addEventListener('click', resumeGame);
    tetrisUI.backBtn.addEventListener('click', () => { if(confirm('Da li ste sigurni?')) { if(activeGameModule) activeGameModule.stop(); showScreen('mainMenu'); }});
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

    const Tetris = {
        board: null, cellElements: [], boardState: [], rows: 20, cols: 10, player: {}, colors: [null, '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#f78c6b', '#9d6bf7'], dropCounter: 0, dropInterval: 1000, lastTime: 0, isRunning: false, isPaused: false, nextPiece: null, animationFrameId: null, touchStartX: 0, touchStartY: 0, touchMoveX: 0, touchMoveY: 0, mode: CONSTANTS.MODES.TETRIS_MARATHON, difficulty: CONSTANTS.DIFFICULTY.NORMAL, combo: 0, linesCleared: 0, level: 1, timer: 0, timerInterval: null, timeLeft: 180, runStats: {}, holdPiece: null, canHold: true, holdEnabled: false,
        init(mode, difficulty) {
            this.mode = mode; this.difficulty = difficulty; this.runStats = { game: CONSTANTS.GAMES.TETRIS, mode, difficulty, score: 0, level: 1, linesCleared: 0, maxCombo: 0, stats: {tetris_linesCleared: 0} }; this.board = document.getElementById('tetris-board'); this.player = { pos: {x: 0, y: 0}, matrix: null, score: 0 }; this.combo = 0; this.linesCleared = 0; this.level = 1; this.boardState = this.createMatrix(this.cols, this.rows); this.createGridCells(); this.nextPiece = this.createPiece(); this.holdPiece = null; this.playerReset();
            const dropIntervals = { [CONSTANTS.DIFFICULTY.EASY]: 1000, [CONSTANTS.DIFFICULTY.NORMAL]: 700, [CONSTANTS.DIFFICULTY.HARD]: 400 }; this.dropInterval = dropIntervals[this.difficulty];
            this.timer = 0; if(this.timerInterval) clearInterval(this.timerInterval); this.updateUI(); if(this.mode === CONSTANTS.MODES.TETRIS_ULTRA) this.timeLeft = CONSTANTS.ULTRA_TIME;
            this.addListeners(); this.resume();
        },
        pause() { this.isPaused = true; this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
        resume() { this.isPaused = false; this.isRunning = true; this.lastTime = performance.now(); if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId); this.animationFrameId = requestAnimationFrame(this.update.bind(this)); if(this.mode === CONSTANTS.MODES.TETRIS_SPRINT || this.mode === CONSTANTS.MODES.TETRIS_ULTRA) this.startTimer(); },
        startTimer() { let startTime = Date.now() - this.timer * 1000; this.timerInterval = setInterval(() => { if(!this.isPaused) { if(this.mode === CONSTANTS.MODES.TETRIS_SPRINT) { this.timer = ((Date.now() - startTime) / 1000); tetrisUI.score.textContent = `${this.timer.toFixed(2)}s`; } else if (this.mode === CONSTANTS.MODES.TETRIS_ULTRA) { this.timeLeft = CONSTANTS.ULTRA_TIME - ((Date.now() - startTime)/1000); if(this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); } this.updateUI(); } } }, 50); },
        addListeners() { this.boundKeyDown = this.handleKeyDown.bind(this); this.boundTouchStart = this.handleTouchStart.bind(this); document.addEventListener('keydown', this.boundKeyDown); this.board.addEventListener('touchstart', this.boundTouchStart, {passive: false}); },
        stop() { this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); document.removeEventListener('keydown', this.boundKeyDown); this.board.removeEventListener('touchstart', this.boundTouchStart); if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId); },
        update(time = 0) { if (!this.isRunning) return; const deltaTime = time - this.lastTime; this.lastTime = time; this.dropCounter += deltaTime; if (this.dropCounter > this.dropInterval) this.playerDrop(); this.draw(); this.animationFrameId = requestAnimationFrame(this.update.bind(this)); },
        createGridCells() { if(this.cellElements && this.cellElements.length > 0) return; this.board.innerHTML = ''; this.cellElements = []; for(let i = 0; i < this.rows * this.cols; i++) { const cell = document.createElement('div'); cell.className = 'tetris-cell'; this.cellElements.push(cell); this.board.appendChild(cell); }},
        draw() { const fullGrid = structuredClone(this.boardState); const ghost = structuredClone(this.player); while (!this.collide(this.boardState, ghost)) ghost.pos.y++; ghost.pos.y--; ghost.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { const r = y + ghost.pos.y, c = x + ghost.pos.x; if(r >= 0 && r < this.rows && c >= 0 && c < this.cols && fullGrid[r][c] === 0) fullGrid[r][c] = 'ghost'; } }); }); this.player.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) { const r = y + this.player.pos.y, c = x + this.player.pos.x; if(r >= 0 && r < this.rows && c >= 0 && c < this.cols) fullGrid[r][c] = value; }}); }); fullGrid.forEach((row, r) => { row.forEach((value, c) => { const cell = this.cellElements[r * this.cols + c]; let newClassName = 'tetris-cell'; let newStyle = ''; if (typeof value === 'number' && value !== 0) { newClassName = 'tetris-cell game-block'; newStyle = this.colors[value]; } else if (value === 'ghost') { newClassName = 'tetris-cell ghost'; } if(cell.className !== newClassName) cell.className = newClassName; if(newClassName.includes('game-block')) { if(cell.style.backgroundColor !== newStyle) cell.style.backgroundColor = newStyle; } else { cell.style.backgroundColor = ''; } }); }); const nextDisplay = tetrisUI.nextPiece; nextDisplay.innerHTML = ''; nextDisplay.style.gridTemplateColumns = `repeat(${this.nextPiece[0].length}, 1fr)`; this.nextPiece.forEach(row => { row.forEach(value => { const cell = document.createElement('div'); if (value !== 0) { cell.className = 'game-block'; cell.style.backgroundColor = this.colors[value]; } nextDisplay.appendChild(cell); }); }); const holdDisplay = tetrisUI.holdPiece; holdDisplay.innerHTML = ''; if(this.holdPiece) { holdDisplay.style.gridTemplateColumns = `repeat(${this.holdPiece[0].length}, 1fr)`; this.holdPiece.forEach(row => { row.forEach(value => { const cell = document.createElement('div'); if (value !== 0) { cell.className = 'game-block'; cell.style.backgroundColor = this.colors[value]; } holdDisplay.appendChild(cell); }); });}},
        createMatrix(w, h) { const m = []; while(h--) m.push(new Array(w).fill(0)); return m; },
        createPiece() { const p='TJLOSZI'[Math.floor(Math.random()*7)]; switch(p){ case 'T':return [[1,1,1],[0,1,0]]; case 'J':return [[2,0,0],[2,2,2]]; case 'L':return [[0,0,3],[3,3,3]]; case 'O':return [[4,4],[4,4]]; case 'S':return [[0,5,5],[5,5,0]]; case 'Z':return [[6,6,0],[0,6,6]]; case 'I':return [[0,0,0,0],[7,7,7,7],[0,0,0,0]]; }},
        collide(board, player) { const { matrix, pos } = player; for (let y = 0; y < matrix.length; y++) { for (let x = 0; x < matrix[y].length; x++) { if (matrix[y][x] !== 0) { let newY = y + pos.y; let newX = x + pos.x; if (newX < 0 || newX >= this.cols || newY >= this.rows || (newY >= 0 && board[newY] && board[newY][newX] !== 0)) return true; } } } return false; },
        merge() { this.player.matrix.forEach((row, y) => { row.forEach((value, x) => { if (value !== 0) this.boardState[y + this.player.pos.y][x + this.player.pos.x] = value; }); }); Sound.playSfx('place'); },
        arenaSweep() {
            let clearedRows = 0; let rowsToClear = [];
            for (let y = this.rows - 1; y >= 0; y--) { if (this.boardState[y].every(value => value !== 0)) { rowsToClear.push(y); } }
            if (rowsToClear.length > 0) {
                rowsToClear.forEach(y => { for (let x=0; x<this.cols; x++) {this.cellElements[y*this.cols+x].classList.add('line-clearing');}});
                setTimeout(() => {
                    rowsToClear.forEach(y_index => { this.boardState.splice(y_index, 1); this.boardState.unshift(new Array(this.cols).fill(0)); });
                    clearedRows = rowsToClear.length; this.combo++; this.linesCleared += clearedRows; this.runStats.linesCleared += clearedRows; this.runStats.maxCombo = Math.max(this.runStats.maxCombo, this.combo);
                    const scoreMultiplier = {[CONSTANTS.DIFFICULTY.EASY]: 1, [CONSTANTS.DIFFICULTY.NORMAL]: 1.5, [CONSTANTS.DIFFICULTY.HARD]: 2}[this.difficulty];
                    this.player.score += (([0, 100, 300, 500, 800][clearedRows] * this.level) + (this.combo * 50 * this.level)) * scoreMultiplier;
                    Sound.playSfx('clear'); Sound.vibrate(50);
                    if (this.mode === CONSTANTS.MODES.TETRIS_MARATHON) { const newLevel = Math.floor(this.linesCleared / 10) + 1; if(newLevel > this.level){ this.level = newLevel; this.dropInterval *= 0.9; } }
                    if (this.mode === CONSTANTS.MODES.TETRIS_SPRINT && this.linesCleared >= CONSTANTS.SPRINT_GOAL) this.gameOver();
                    this.updateUI();
                }, 300);
            } else { this.combo = 0; }
        },
        updateUI() { tetrisUI.score.textContent = Math.floor(this.player.score); tetrisUI.level.textContent = this.level; if(this.mode === CONSTANTS.MODES.TETRIS_SPRINT) { const linesLeft = CONSTANTS.SPRINT_GOAL - this.linesCleared; tetrisUI.level.textContent = `${linesLeft > 0 ? linesLeft : 0}`; } if(this.mode === CONSTANTS.MODES.TETRIS_ULTRA) { tetrisUI.level.textContent = `${Math.ceil(this.timeLeft)}`; } tetrisUI.score.classList.add('score-updated'); setTimeout(()=>tetrisUI.score.classList.remove('score-updated'), 300); },
        playerReset(getNewPiece = true) { if(getNewPiece) { this.player.matrix = this.nextPiece; this.nextPiece = this.createPiece(); } this.player.pos.y = 0; this.player.pos.x = Math.floor(this.cols/2)-Math.floor(this.player.matrix[0].length/2); if(this.collide(this.boardState,this.player)) this.gameOver(); this.canHold = true; },
        playerMove(dir) { if(this.isPaused) return; this.player.pos.x += dir; if(this.collide(this.boardState,this.player)) this.player.pos.x-=dir; },
        playerDrop() { if(this.isPaused) return; this.player.pos.y++; if (this.collide(this.boardState, this.player)) { this.player.pos.y--; this.merge(); this.playerReset(); this.arenaSweep(); } this.dropCounter = 0; },
        rotate(m,d) { for(let y=0;y<m.length;++y){for(let x=0;x<y;++x)[m[x][y],m[y][x]]=[m[y][x],m[x][y]];} d>0?m.forEach(r=>r.reverse()):m.reverse(); },
        playerRotate(dir) { if(this.isPaused) return; const originalPos = this.player.pos.x; let offset = 1; this.rotate(this.player.matrix, dir); while(this.collide(this.boardState, this.player)) { this.player.pos.x += offset; offset = -(offset + (offset > 0 ? 1 : -1)); if (offset > this.player.matrix[0].length) { this.rotate(this.player.matrix, -dir); this.player.pos.x = originalPos; return; } } },
        handleKeyDown(e) { if(!this.isRunning || this.isPaused) return; switch(e.keyCode){ case CONSTANTS.KEYS.C: this.handleHold(); break; case CONSTANTS.KEYS.LEFT:this.playerMove(-1);break; case CONSTANTS.KEYS.RIGHT:this.playerMove(1);break; case CONSTANTS.KEYS.DOWN:this.playerDrop();break; case CONSTANTS.KEYS.Q:this.playerRotate(-1);break; case CONSTANTS.KEYS.W:case CONSTANTS.KEYS.UP:this.playerRotate(1);break; case CONSTANTS.KEYS.SPACE:this.hardDrop();break; }},
        handleTouchStart(e) { if(this.isPaused) return; e.preventDefault(); this.touchStartX=e.touches[0].clientX; this.touchStartY=e.touches[0].clientY; this.touchMoveX=this.touchStartX; this.touchMoveY=this.touchStartY; this.boundTouchMove=this.handleTouchMove.bind(this); this.boundTouchEnd=this.handleTouchEnd.bind(this); this.board.addEventListener('touchmove',this.boundTouchMove,{passive:false}); this.board.addEventListener('touchend',this.boundTouchEnd,{passive:false});},
        handleTouchMove(e) { e.preventDefault(); this.touchMoveX=e.touches[0].clientX; this.touchMoveY=e.touches[0].clientY; },
        handleTouchEnd() { if(this.isPaused) return; this.board.removeEventListener('touchmove',this.boundTouchMove); this.board.removeEventListener('touchend',this.boundTouchEnd); const dX=this.touchMoveX-this.touchStartX; const dY=this.touchMoveY-this.touchStartY; const bW=this.board.clientWidth/this.cols; if(Math.abs(dX)>Math.abs(dY)){const moveCount=Math.round(Math.abs(dX)/bW); for(let i=0; i<moveCount; i++) this.playerMove(dX>0?1:-1);} else {if(dY>bW*2)this.hardDrop();else if(dY>bW/2)this.playerDrop();else if(Math.abs(dX)<20&&Math.abs(dY)<20)this.playerRotate(1);}},
        hardDrop() { if(this.isPaused) return; while(!this.collide(this.boardState,this.player))this.player.pos.y++; this.player.pos.y--; this.merge(); this.playerReset(); this.arenaSweep(); shakeScreen(); Sound.vibrate(50); Sound.playSfx('hardDrop'); },
        handleHold() { if(!this.isRunning || this.isPaused || !this.holdEnabled || !this.canHold) return; if(this.holdPiece) { [this.player.matrix, this.holdPiece] = [this.holdPiece, this.player.matrix]; this.playerReset(false); } else { this.holdPiece = this.player.matrix; this.playerReset(); } this.canHold = false; },
        gameOver() { this.stop(); this.runStats.score = this.mode === CONSTANTS.MODES.TETRIS_SPRINT ? this.timer : this.player.score; this.runStats.level = this.level; endGame(this.runStats); },
        getHelpText() { return `<ul><li><strong>Maraton:</strong> Klasičan mod gde se brzina postepeno povećava. Cilj je najveći skor.</li><li><strong>Sprint:</strong> Očistite 40 linija što je brže moguće.</li><li><strong>Ultra:</strong> Osvojite što više poena za 3 minuta.</li></ul>`;}
    };
    
    const BlockPuzzle = {
        boardElement: null, piecesContainer: null, boardState: [], score: 0, isRunning: false, isPaused: false, activeDragPiece: null, pieceShapes: [ {shape:[[1,1,1,1,1]]},{shape:[[1,1],[1,1]]},{shape:[[0,1,0],[1,1,1],[0,1,0]]},{shape:[[1,1,1],[1,0,1]]},{shape:[[1,0,1],[1,1,1]]},{shape:[[1,1,0],[0,1,1]]},{shape:[[0,1,1],[1,1,0]]},{shape:[[1,1,1,1]]},{shape:[[1,1,1],[0,0,1]]},{shape:[[1,1,1],[1,0,0]]},{shape:[[1,1],[0,1],[0,1]]},{shape:[[1,1,1]]},{shape:[[1,1]]},{shape:[[1]]} ], currentPieces:[], mode: CONSTANTS.MODES.PUZZLE_CLASSIC, difficulty: CONSTANTS.DIFFICULTY.NORMAL, combo: 0, timeLeft: 120, timerInterval: null, bombs: [], movesSinceBomb: 0, runStats: {},
        init(mode, difficulty) {
            this.mode = mode; this.difficulty = difficulty; this.runStats = { game: CONSTANTS.GAMES.BLOCK_PUZZLE, mode, difficulty, score: 0, piecesPlaced: 0, linesCleared: 0, bombsDefused: 0, stats: {blockPuzzle_piecesPlaced: 0, blockPuzzle_linesCleared: 0} }; this.boardElement=document.getElementById('puzzle-board'); this.piecesContainer=document.getElementById('puzzle-pieces-container'); this.boardState=this.createMatrix(10,10); this.score=0; this.combo=0; this.updateScore(); this.bombs=[]; this.movesSinceBomb=0;
            if(this.mode === CONSTANTS.MODES.PUZZLE_CLASSIC) this.spawnStoneTiles(difficulty);
            this.renderBoard(); this.generateNewPieces(); if(this.boundDragStart){this.piecesContainer.removeEventListener('mousedown',this.boundDragStart);this.piecesContainer.removeEventListener('touchstart',this.boundDragStart);} this.boundDragStart=this.onDragStart.bind(this); this.piecesContainer.addEventListener('mousedown',this.boundDragStart); this.piecesContainer.addEventListener('touchstart',this.boundDragStart,{passive:false}); if (this.timerInterval) clearInterval(this.timerInterval); puzzleUI.timer.textContent=''; if (this.mode === CONSTANTS.MODES.PUZZLE_TIME_ATTACK) { this.timeLeft = CONSTANTS.TIME_ATTACK_TIME; } if (this.mode === CONSTANTS.MODES.PUZZLE_BLAST) { this.movesSinceBomb=0;} this.resume();
        },
        pause() { this.isPaused = true; this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); },
        resume() { this.isPaused = false; this.isRunning = true; if(this.mode === CONSTANTS.MODES.PUZZLE_TIME_ATTACK || this.mode === CONSTANTS.MODES.PUZZLE_BLAST) this.startTimer(); },
        startTimer() { let lastTime = Date.now(); this.timerInterval = setInterval(() => { if(!this.isPaused) { const now = Date.now(); const delta = (now - lastTime) / 1000; lastTime = now; if(this.mode === CONSTANTS.MODES.PUZZLE_TIME_ATTACK) { this.timeLeft -= delta; puzzleUI.timer.textContent = `Vreme: ${Math.max(0, Math.ceil(this.timeLeft))}`; if (this.timeLeft <= 0) this.gameOver(); } if(this.mode === CONSTANTS.MODES.PUZZLE_BLAST) { this.updateBombs(); } } }, 1000); },
        stop() { this.isRunning = false; if(this.timerInterval) clearInterval(this.timerInterval); if(this.boundDragStart){this.piecesContainer.removeEventListener('mousedown',this.boundDragStart);this.piecesContainer.removeEventListener('touchstart',this.boundDragStart);}},
        renderBoard() { this.boardElement.innerHTML=''; this.boardState.forEach((row, r)=>{row.forEach((cellData, c)=>{ const cell=document.createElement('div'); cell.className='puzzle-cell'; if(cellData){ cell.classList.add('game-block'); cell.style.backgroundColor = cellData.color; if(cellData.type === 'stone') { cell.classList.add('stone'); if(cellData.health === 1) cell.classList.add('cracked'); } const bomb = this.bombs.find(b=>b.r===r && b.c===c); if(bomb){ const timerEl = document.createElement('div'); timerEl.className = 'bomb-timer'; timerEl.textContent = bomb.timer; cell.appendChild(timerEl);}} this.boardElement.appendChild(cell); });});},
        spawnStoneTiles(difficulty) { const count = {[CONSTANTS.DIFFICULTY.EASY]: 2, [CONSTANTS.DIFFICULTY.NORMAL]: 4, [CONSTANTS.DIFFICULTY.HARD]: 6}[difficulty]; for(let i=0; i<count; i++) { let r,c; do { r = Math.floor(Math.random()*10); c = Math.floor(Math.random()*10); } while(this.boardState[r][c] !== 0); this.boardState[r][c] = {type: 'stone', health: 2, color: '#8d99ae'}; }},
        generateNewPieces() { this.currentPieces=[]; this.piecesContainer.innerHTML=''; const colors = Tetris.colors.slice(1); for(let i=0;i<3;i++){ const pieceData=structuredClone(this.pieceShapes[Math.floor(Math.random()*this.pieceShapes.length)]); pieceData.id=`piece-${Date.now()}-${i}`; pieceData.color = colors[Math.floor(Math.random()*colors.length)]; this.currentPieces.push(pieceData); this.renderPiece(pieceData); } if(this.checkGameOver()){this.gameOver();}},
        renderPiece(pieceData) { const pieceEl=document.createElement('div'); pieceEl.className='puzzle-piece'; pieceEl.dataset.id=pieceData.id; const shapeWidth = pieceData.shape[0].length; pieceEl.style.gridTemplateColumns=`repeat(${shapeWidth},1fr)`; pieceData.shape.forEach(row=>{ for (let i=0; i<shapeWidth; i++) { const cell = row[i] || 0; const cellEl=document.createElement('div'); cellEl.className = 'puzzle-piece-cell'; if(cell){ cellEl.classList.add('game-block'); cellEl.style.backgroundColor = pieceData.color; } pieceEl.appendChild(cellEl); }}); this.piecesContainer.appendChild(pieceEl); },
        onDragStart(e) { if(!e.target.closest('.puzzle-piece')||!this.isRunning||this.isPaused) return; e.preventDefault(); const pieceEl=e.target.closest('.puzzle-piece'); const pieceId=pieceEl.dataset.id; const pieceData=this.currentPieces.find(p=>p.id===pieceId); this.activeDragPiece=pieceData; const draggingEl=pieceEl.cloneNode(true); draggingEl.classList.add('dragging'); document.body.appendChild(draggingEl); const rect=pieceEl.getBoundingClientRect(); const touch=e.type==='touchstart'?e.touches[0]:e; this.touchOffsetX = touch.clientX - rect.left; this.touchOffsetY = touch.clientY - rect.top; pieceEl.style.opacity='0.3'; const moveHandler=(moveEvent)=>{ const moveTouch=moveEvent.type==='touchmove'?moveEvent.touches[0]:moveEvent; draggingEl.style.left=`${moveTouch.clientX-this.touchOffsetX}px`; draggingEl.style.top=`${moveTouch.clientY-this.touchOffsetY}px`; this.renderGhost(pieceData,draggingEl); }; const endHandler=()=>{ document.removeEventListener('mousemove',moveHandler); document.removeEventListener('touchmove',moveHandler); document.removeEventListener('mouseup',endHandler); document.removeEventListener('touchend',endHandler); this.boardElement.querySelectorAll('.ghost-path').forEach(c=>{c.classList.remove('ghost-path')}); draggingEl.remove(); this.activeDragPiece=null; const {row, col} = this.getDropCoordinates(draggingEl); if(this.canPlacePiece(pieceData,row,col)){ this.placePiece(pieceData,row,col); pieceEl.remove(); this.currentPieces=this.currentPieces.filter(p=>p.id!==pieceId); if(this.currentPieces.length===0)this.generateNewPieces(); } else {pieceEl.style.opacity='1';} }; document.addEventListener('mousemove',moveHandler); document.addEventListener('touchmove',moveHandler); document.addEventListener('mouseup',endHandler); document.addEventListener('touchend',endHandler); },
        getDropCoordinates(draggedEl) { const boardRect=this.boardElement.getBoundingClientRect(); const dragRect=draggedEl.getBoundingClientRect(); const cellWidth=boardRect.width/10; const x = dragRect.left - boardRect.left; const y = dragRect.top - boardRect.top; return { row: Math.round(y/cellWidth), col: Math.round(x/cellWidth)}; },
        renderGhost(pieceData,draggingEl) { this.boardElement.querySelectorAll('.ghost-path').forEach(c=>{c.classList.remove('ghost-path')}); if(!pieceData) return; const {row: startRow, col: startCol} = this.getDropCoordinates(draggingEl); for(let r=0;r<pieceData.shape.length;r++){for(let c=0;c<pieceData.shape[r].length;c++){ if(pieceData.shape[r][c]){ const bR=startRow+r; const bC=startCol+c; if(bR<10&&bC<10&&bR>=0&&bC>=0){ const cellIndex=bR*10+bC; const cell=this.boardElement.children[cellIndex]; if(cell&&this.boardState[bR][bC]===0){ cell.classList.add('ghost-path');}} }}} },
        canPlacePiece(p,startRow,startCol){for(let r=0;r<p.shape.length;r++){for(let c=0;c<p.shape[r].length;c++){if(p.shape[r][c]){const bR=startRow+r;const bC=startCol+c;if(bR>=10||bC>=10||bR<0||bC<0||this.boardState[bR][bC]!==0)return false;}}}return true;},
        placePiece(pieceData,startRow,startCol) { this.runStats.piecesPlaced++; PlayerData.state.stats.blockPuzzle_piecesPlaced = (PlayerData.state.stats.blockPuzzle_piecesPlaced || 0) + 1; pieceData.shape.forEach((row,r)=>{row.forEach((cell,c)=>{ if(cell){this.boardState[startRow+r][startCol+c]={type: 'normal', color: pieceData.color};}});}); this.score+=pieceData.shape.flat().reduce((a,b)=>a+b); Sound.playSfx('place'); Sound.vibrate(); this.clearLines(); this.renderBoard(); this.updateScore(); if(this.mode === CONSTANTS.MODES.PUZZLE_BLAST) { this.movesSinceBomb++; const bombThreshold = {[CONSTANTS.DIFFICULTY.EASY]:8, [CONSTANTS.DIFFICULTY.NORMAL]: 6, [CONSTANTS.DIFFICULTY.HARD]: 4}[this.difficulty]; if(this.movesSinceBomb >= bombThreshold) this.spawnBomb(); } },
        clearLines() { let linesToClear = { rows: [], cols: [] }; for(let r=0;r<10;r++)if(this.boardState[r].every(cell=>cell !== 0))linesToClear.rows.push(r); for(let c=0;c<10;c++)if(this.boardState.every(row=>row[c] !== 0))linesToClear.cols.push(c); let linesActuallyCleared = { rows: [], cols: [] }; linesToClear.rows.forEach(r => { let canClear = true; for(let c=0;c<10;c++){ const cell = this.boardState[r][c]; if(cell.type === 'stone') { canClear=false; cell.health--; if(cell.health < 1) this.boardState[r][c] = {type:'stone', health: 0}; else cell.cracked=true; }} if(canClear) linesActuallyCleared.rows.push(r); }); linesToClear.cols.forEach(c => { let canClear = true; for(let r=0;r<10;r++){ const cell = this.boardState[r][c]; if(cell.type === 'stone') { canClear=false; cell.health--; if(cell.health < 1) this.boardState[r][c] = {type:'stone', health: 0}; else cell.cracked=true; }} if(canClear) linesActuallyCleared.cols.push(c); }); this.bombs = this.bombs.filter(bomb => { const wasCleared = linesActuallyCleared.rows.includes(bomb.r) || linesActuallyCleared.cols.includes(bomb.c); if(wasCleared) this.runStats.bombsDefused++; return !wasCleared; }); linesActuallyCleared.rows.forEach(r=>this.boardState[r].fill(0)); linesActuallyCleared.cols.forEach(c=>this.boardState.forEach(row=>row[c]=0)); const clearedCount=linesActuallyCleared.rows.length+linesActuallyCleared.cols.length; if (clearedCount>0){this.combo++; this.score+=(clearedCount*clearedCount*10)+(this.combo*10);Sound.playSfx('clear'); Sound.vibrate(50); this.runStats.linesCleared += clearedCount; PlayerData.state.stats.blockPuzzle_linesCleared = (PlayerData.state.stats.blockPuzzle_linesCleared || 0) + clearedCount;} else {this.combo=0;} },
        checkGameOver() { for(const piece of this.currentPieces){ for(let r=0;r<=10-piece.shape.length;r++){ for(let c=0;c<=10-piece.shape[0].length;c++){ if(this.canPlacePiece(piece,r,c))return false;}}} return true; },
        spawnBomb() { this.movesSinceBomb = 0; const filledCells = []; for(let r=0;r<10;r++){for(let c=0;c<10;c++){if(this.boardState[r][c] && this.boardState[r][c].type !== 'stone' && !this.bombs.find(b=>b.r===r&&b.c===c)) filledCells.push({r,c});}} if(filledCells.length === 0) return; const cell = filledCells[Math.floor(Math.random()*filledCells.length)]; this.bombs.push({r: cell.r, c: cell.c, timer: 9}); Sound.playSfx('bomb'); this.renderBoard();},
        updateBombs() { this.bombs.forEach(bomb => bomb.timer--); if(this.bombs.some(b=>b.timer<0)) { shakeScreen(); this.gameOver(); return; } this.renderBoard();},
        updateScore() { puzzleUI.score.textContent = this.score; puzzleUI.score.classList.add('score-updated'); setTimeout(()=>puzzleUI.score.classList.remove('score-updated'), 200); },
        createMatrix(w, h) { const m = []; while(h--) m.push(new Array(w).fill(0)); return m; },
        gameOver() { this.stop(); this.runStats.score = this.score; endGame(this.runStats); },
        getHelpText() { return `<ul><li><strong>Klasik:</strong> Opustite se i ređajte blokove dok imate mesta. Pazite na kamene blokove!</li><li><strong>Trka sa vremenom:</strong> Osvojite što više poena za 2 minuta.</li><li><strong>Eksplozija:</strong> Preživite što duže! Povremeno se na tabli pojavljuju bombe koje morate očistiti pre isteka tajmera.</li></ul>`;}
    };

    PlayerData.load(); Settings.init(); Sound.init(); DailyLogin.init(); Shop.init(); MainMenu3D.init();
});
