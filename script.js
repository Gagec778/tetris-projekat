document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBALNI ELEMENTI ---
    const screens = {
        mainMenu: document.getElementById('main-menu-screen'),
        game: document.getElementById('game-screen'),
    };
    const mainMenuScreen = document.getElementById('main-menu-screen');
    const highscoreElements = {
        tetris: document.getElementById('highscore-tetris'),
        blockPuzzle: document.getElementById('highscore-block-puzzle'),
    };
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownText = document.getElementById('countdown-text');
    const gameTitleElement = screens.game.querySelector('.game-title');
    const scoreElement = document.getElementById('score');
    const finalScoreElement = document.getElementById('final-score');
    const gameOverModal = document.getElementById('game-over-modal');
    const restartBtn = document.getElementById('restart-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const helpTetrisContent = document.getElementById('help-tetris-content');
    const helpBlockPuzzleContent = document.getElementById('help-block-puzzle-content');
    
    const gameAreas = {
        tetris: document.getElementById('tetris-game-area'),
        blockPuzzle: document.getElementById('block-puzzle-game-area'),
        tetrisControls: document.getElementById('tetris-controls'),
    };
    
    let activeGame = null;
    let activeGameModule = null;

    // --- MODUL ZA ZVUK ---
    const Sound = {
        sounds: {}, isMuted: false,
        init() {
            try {
                this.sounds.place = new Audio('assets/sounds/place.mp3');
                this.sounds.clear = new Audio('assets/sounds/clear.mp3');
                this.sounds.gameOver = new Audio('assets/sounds/gameOver.mp3');
                this.sounds.hardDrop = new Audio('assets/sounds/hardDrop.mp3');
                Object.values(this.sounds).forEach(sound => sound.volume = 0.4);
            } catch (e) {
                console.warn("Greška pri učitavanju zvuka. Proverite da li 'assets/sounds/' folder postoji i da li su fajlovi ispravni.");
            }
        },
        play(name) {
            if (!this.isMuted && this.sounds[name]) {
                this.sounds[name].currentTime = 0;
                this.sounds[name].play().catch(e => {});
            }
        }
    };
    Sound.init();

    // --- MODUL PODEŠAVANJA (SETTINGS) ---
    const Settings = {
        themeSelect: document.getElementById('theme-select'),
        muteBtn: document.getElementById('mute-btn'),
        closeBtn: settingsModal.querySelector('.close-modal'),
        init() {
            const savedTheme = localStorage.getItem('puzzleTheme') || 'dark';
            const savedMuteState = localStorage.getItem('puzzleMuted') === 'true';
            this.setTheme(savedTheme);
            this.themeSelect.value = savedTheme;
            Sound.isMuted = savedMuteState;
            this.updateMuteButton();
            
            this.themeSelect.addEventListener('change', (e) => this.setTheme(e.target.value));
            this.muteBtn.addEventListener('click', () => this.toggleMute());
            settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
            this.closeBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
        },
        setTheme(themeName) { document.body.className = `${themeName}-theme`; localStorage.setItem('puzzleTheme', themeName); },
        toggleMute() { Sound.isMuted = !Sound.isMuted; localStorage.setItem('puzzleMuted', Sound.isMuted); this.updateMuteButton(); },
        updateMuteButton() {
            this.muteBtn.textContent = Sound.isMuted ? 'OFF' : 'ON';
            this.muteBtn.classList.toggle('active', !Sound.isMuted);
        }
    };
    
    // --- MODUL ZA NAJBOLJE REZULTATE ---
    const HighScore = {
        get(game) { return parseInt(localStorage.getItem(`highscore_${game}`) || '0', 10); },
        set(game, score) {
            if (score > this.get(game)) { localStorage.setItem(`highscore_${game}`, score); this.updateDisplay(); }
        },
        updateDisplay() {
            highscoreElements.tetris.textContent = this.get('tetris');
            highscoreElements.blockPuzzle.textContent = this.get('block-puzzle');
        }
    };
    
    // --- Inicijalizacija pri učitavanju ---
    HighScore.updateDisplay();
    Settings.init();

    // --- NAVIGACIJA I TOK APLIKACIJE ---
    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    async function startGame(gameType) {
        activeGame = gameType;
        scoreElement.textContent = '0';
        gameOverModal.classList.remove('active');
        Object.values(gameAreas).forEach(area => area.classList.remove('active'));

        if (gameType === 'tetris') {
            activeGameModule = Tetris;
            gameAreas.tetris.classList.add('active');
            gameAreas.tetrisControls.style.display = 'flex';
        } else if (gameType === 'block-puzzle') {
            activeGameModule = BlockPuzzle;
            gameAreas.blockPuzzle.classList.add('active');
            gameAreas.tetrisControls.style.display = 'none';
        }
        
        showScreen('game');
        await runCountdown();
        activeGameModule.init();
    }

    async function runCountdown() {
        countdownOverlay.classList.add('active');
        for (let i = 3; i > 0; i--) { countdownText.textContent = i; await new Promise(res => setTimeout(res, 800)); }
        countdownText.textContent = 'GO!';
        await new Promise(res => setTimeout(res, 500));
        countdownOverlay.classList.remove('active');
    }

    function showGameOver(score, game) {
        finalScoreElement.textContent = '0';
        gameOverModal.classList.add('active');
        animateScore(score);
        HighScore.set(game, score);
    }
    
    function animateScore(finalScore) {
        let currentScore = 0;
        const increment = Math.max(1, Math.floor(finalScore / 100));
        const interval = setInterval(() => {
            currentScore += increment;
            if (currentScore >= finalScore) { currentScore = finalScore; clearInterval(interval); }
            finalScoreElement.textContent = currentScore;
        }, 10);
    }

    function shakeScreen() {
        screens.game.classList.add('screen-shake');
        setTimeout(() => screens.game.classList.remove('screen-shake'), 200);
    }
    
    // --- Svi ostali listeneri ---
    document.querySelectorAll('.menu-item').forEach(item => item.addEventListener('click', () => startGame(item.dataset.game)));
    document.querySelector('.back-btn').addEventListener('click', () => {
        if (activeGameModule && activeGameModule.stop) activeGameModule.stop();
        activeGame = null; activeGameModule = null;
        HighScore.updateDisplay();
        showScreen('mainMenu');
    });
    restartBtn.addEventListener('click', () => { gameOverModal.classList.remove('active'); if (activeGame) startGame(activeGame); });
    helpBtn.addEventListener('click', () => {
        helpBlockPuzzleContent.classList.toggle('active', activeGame === 'block-puzzle');
        helpTetrisContent.classList.toggle('active', activeGame === 'tetris');
        helpModal.classList.add('active');
    });
    helpModal.querySelector('.close-modal').addEventListener('click', () => helpModal.classList.remove('active'));

    // ===================================================================
    // ================== MODUL: CLASSIC TETRIS (ULTIMATE) ===============
    // ===================================================================
    const Tetris = {
        board: null, nextContainer: null, boardState: [], rows: 20, cols: 10, player: {}, 
        colors: [null, '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#f78c6b', '#9d6bf7'],
        dropCounter: 0, dropInterval: 1000, lastTime: 0, isRunning: false,
        nextPieces: [], animationFrameId: null, touchStartX: 0, touchStartY: 0, touchMoveX: 0, touchMoveY: 0,

        init() {
            this.board = document.getElementById('tetris-board');
            this.nextContainer = document.getElementById('tetris-next-container');
            this.boardState = this.createMatrix(this.cols, this.rows);
            this.player = { pos: {x: 0, y: 0}, matrix: null, score: 0 };
            this.updateScore();
            this.nextPieces = [this.createPiece(), this.createPiece(), this.createPiece()];
            this.playerReset();
            this.isRunning = true; this.lastTime = 0;
            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = requestAnimationFrame(this.update.bind(this));
            this.addListeners();
        },
        addListeners() {
            this.boundKeyDown = this.handleKeyDown.bind(this);
            this.boundTouchStart = this.handleTouchStart.bind(this);
            this.boundOnScreenControl = this.handleOnScreenControl.bind(this);
            document.addEventListener('keydown', this.boundKeyDown);
            this.board.addEventListener('touchstart', this.boundTouchStart, {passive: false});
            gameAreas.tetrisControls.addEventListener('click', this.boundOnScreenControl);
        },
        stop() {
            this.isRunning = false;
            document.removeEventListener('keydown', this.boundKeyDown);
            this.board.removeEventListener('touchstart', this.boundTouchStart);
            gameAreas.tetrisControls.removeEventListener('click', this.boundOnScreenControl);
            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        },
        update(time = 0) {
            if (!this.isRunning) return;
            const deltaTime = time - this.lastTime;
            this.lastTime = time; this.dropCounter += deltaTime;
            if (this.dropCounter > this.dropInterval) this.playerDrop();
            this.draw();
            this.animationFrameId = requestAnimationFrame(this.update.bind(this));
        },
        draw() {
            this.board.innerHTML = '';
            const fullGrid = JSON.parse(JSON.stringify(this.boardState));
            const ghost = JSON.parse(JSON.stringify(this.player));
            while (!this.collide(this.boardState, ghost)) ghost.pos.y++;
            ghost.pos.y--;
            ghost.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        const r = y + ghost.pos.y; const c = x + ghost.pos.x;
                        if(r >= 0) fullGrid[r][c] = 'ghost';
                    }
                });
            });
            this.player.matrix.forEach((row, y) => {
                row.forEach((value, x) => { if (value !== 0) fullGrid[y + this.player.pos.y][x + this.player.pos.x] = value; });
            });
            fullGrid.forEach(row => {
                row.forEach(value => {
                    const cell = document.createElement('div');
                    cell.className = 'tetris-cell';
                    if (typeof value === 'number' && value !== 0) {
                        cell.classList.add('game-block');
                        const color = this.colors[value];
                        cell.style.background = `linear-gradient(145deg, ${color}, ${this.darkenColor(color)})`;
                        cell.style.setProperty('--glow-color', color);
                    } else if (value === 'ghost') {
                        cell.classList.add('ghost');
                    }
                    this.board.appendChild(cell);
                });
            });
            this.nextContainer.innerHTML = '';
            this.nextPieces.forEach(pieceMatrix => {
                const display = document.createElement('div');
                display.className = 'next-piece-display';
                display.style.gridTemplateColumns = `repeat(${pieceMatrix[0].length}, 1fr)`;
                pieceMatrix.forEach(row => {
                    row.forEach(value => {
                        const cell = document.createElement('div');
                        cell.style.width = '15px'; cell.style.height = '15px';
                        if (value !== 0) {
                            cell.className = 'game-block';
                            const color = this.colors[value];
                            cell.style.background = `linear-gradient(145deg, ${color}, ${this.darkenColor(color)})`;
                            cell.style.setProperty('--glow-color', color);
                        }
                        display.appendChild(cell);
                    });
                });
                this.nextContainer.appendChild(display);
            });
        },
        darkenColor(color) {
            let [r, g, b] = color.match(/\w\w/g).map((x) => parseInt(x, 16));
            r = Math.floor(r * 0.7); g = Math.floor(g * 0.7); b = Math.floor(b * 0.7);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        },
        createMatrix(w, h) { const m = []; while(h--) m.push(new Array(w).fill(0)); return m; },
        createPiece() {
            const p = 'TJLOSZI'[Math.floor(Math.random()*7)];
            switch(p){
                case 'T': return [[1,1,1],[0,1,0]]; case 'J': return [[0,2,0],[0,2,0],[2,2,0]];
                case 'L': return [[3,0,0],[3,0,0],[3,3,0]]; case 'O': return [[4,4],[4,4]];
                case 'S': return [[0,5,5],[5,5,0]]; case 'Z': return [[6,6,0],[0,6,6]];
                case 'I': return [[0,7,0,0],[0,7,0,0],[0,7,0,0],[0,7,0,0]];
            }
        },
        collide(board, player) {
            for(let y=0;y<player.matrix.length;y++){
                for(let x=0;x<player.matrix[y].length;x++){
                    if(player.matrix[y][x]!==0 && (board[y+player.pos.y]&&board[y+player.pos.y][x+player.pos.x])!==0) return true;
                }
            }
            return false;
        },
        merge() {
            this.player.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        this.boardState[y + this.player.pos.y][x + this.player.pos.x] = value;
                        const cellIndex = (y + this.player.pos.y) * this.cols + (x + this.player.pos.x);
                        if(this.board.children[cellIndex]) this.board.children[cellIndex].classList.add('placed');
                    }
                });
            });
            Sound.play('place');
        },
        arenaSweep() {
            let clearedRows = [];
            outer: for (let y = this.rows - 1; y > 0; --y) {
                if (this.boardState[y].every(value => value !== 0)) clearedRows.push(y);
            }
            if (clearedRows.length > 0) {
                clearedRows.forEach(y => { this.playLineClearEffect(y); const row = this.boardState.splice(y, 1)[0].fill(0); this.boardState.unshift(row); });
                this.player.score += [0, 10, 30, 50, 100][clearedRows.length] * 10;
                this.updateScore();
                Sound.play('clear');
            }
        },
        playLineClearEffect(rowIndex) {
            const boardRect = this.board.getBoundingClientRect();
            for (let i = 0; i < this.cols; i++) {
                const cellIndex = rowIndex * this.cols + i;
                this.board.children[cellIndex].classList.add('line-clearing');
                for(let j = 0; j < 3; j++) {
                    const particle = document.createElement('div'); particle.className = 'particle';
                    const cellRect = this.board.children[cellIndex].getBoundingClientRect();
                    particle.style.background = this.darkenColor(this.colors[Math.ceil(Math.random() * 7)]);
                    particle.style.left = `${cellRect.left-boardRect.left+cellRect.width/2}px`; particle.style.top = `${cellRect.top-boardRect.top+cellRect.height/2}px`;
                    const angle = Math.random()*2*Math.PI; const velocity = Math.random()*50+50;
                    const tx = Math.cos(angle)*velocity; const ty = Math.sin(angle)*velocity;
                    particle.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${tx}px,${ty}px) scale(0)`,opacity:0}],{duration:800,easing:'ease-out'});
                    this.board.appendChild(particle); setTimeout(()=>particle.remove(),800);
                }
            }
        },
        updateScore() { scoreElement.textContent = this.player.score; },
        playerReset() {
            this.player.matrix = this.nextPieces.shift(); this.nextPieces.push(this.createPiece());
            this.player.pos.y = 0; this.player.pos.x = (this.cols/2|0)-(this.player.matrix[0].length/2|0);
            if(this.collide(this.boardState,this.player)) this.gameOver();
        },
        playerMove(dir) { this.player.pos.x += dir; if(this.collide(this.boardState,this.player)) this.player.pos.x-=dir; },
        playerDrop() {
            this.player.pos.y++;
            if (this.collide(this.boardState, this.player)) { this.player.pos.y--; this.merge(); this.playerReset(); this.arenaSweep(); }
            this.dropCounter = 0;
        },
        rotate(m,d) { for(let y=0;y<m.length;++y){for(let x=0;x<y;++x)[m[x][y],m[y][x]]=[m[y][x],m[x][y]];} d>0?m.forEach(r=>r.reverse()):m.reverse(); },
        playerRotate(dir) {
            const pos = this.player.pos.x; let offset=1; this.rotate(this.player.matrix,dir);
            while(this.collide(this.boardState,this.player)){
                this.player.pos.x+=offset; offset=-(offset+(offset>0?1:-1));
                if(offset>this.player.matrix[0].length){this.rotate(this.player.matrix,-dir);this.player.pos.x=pos;return;}
            }
        },
        handleKeyDown(e) {
            if(!this.isRunning) return;
            switch(e.keyCode){
                case 37:this.playerMove(-1);break; case 39:this.playerMove(1);break;
                case 40:this.playerDrop();break; case 81:this.playerRotate(-1);break;
                case 87:case 38:this.playerRotate(1);break; case 32:this.hardDrop();break;
            }
        },
        handleTouchStart(e) {
            e.preventDefault(); this.touchStartX=e.touches[0].clientX; this.touchStartY=e.touches[0].clientY;
            this.touchMoveX=this.touchStartX; this.touchMoveY=this.touchStartY;
            this.boundTouchMove=this.handleTouchMove.bind(this); this.boundTouchEnd=this.handleTouchEnd.bind(this);
            this.board.addEventListener('touchmove',this.boundTouchMove,{passive:false});
            this.board.addEventListener('touchend',this.boundTouchEnd,{passive:false});
        },
        handleTouchMove(e) { e.preventDefault(); this.touchMoveX=e.touches[0].clientX; this.touchMoveY=e.touches[0].clientY; },
        handleTouchEnd(e) {
            this.board.removeEventListener('touchmove',this.boundTouchMove); this.board.removeEventListener('touchend',this.boundTouchEnd);
            const dX=this.touchMoveX-this.touchStartX; const dY=this.touchMoveY-this.touchStartY;
            const bW=this.board.clientWidth/this.cols;
            if(Math.abs(dX)>Math.abs(dY)){if(Math.abs(dX)>bW/2)this.playerMove(dX>0?1:-1);}
            else {if(dY>bW*2)this.hardDrop();else if(dY>bW/2)this.playerDrop();else if(Math.abs(dX)<20&&Math.abs(dY)<20)this.playerRotate(1);}
        },
        handleOnScreenControl(e) {
            if(!e.target.matches('button')) return; const action=e.target.dataset.action;
            switch(action){case 'move-left':this.playerMove(-1);break; case 'move-right':this.playerMove(1);break;
                case 'rotate':this.playerRotate(1);break; case 'hard-drop':this.hardDrop();break;
            }
        },
        hardDrop() { while(!this.collide(this.boardState,this.player))this.player.pos.y++; this.player.pos.y--; this.merge(); this.playerReset(); this.arenaSweep(); shakeScreen(); Sound.play('hardDrop'); },
        gameOver() { this.stop(); Sound.play('gameOver'); showGameOver(this.player.score, 'tetris'); }
    };

    // ===================================================================
    // ================== MODUL: BLOCK PUZZLE (ULTIMATE) =================
    // ===================================================================
    const BlockPuzzle = {
        boardElement: null, piecesContainer: null, boardState: [], score: 0, isRunning: false, activeDragPiece: null,
        pieceShapes: [
            {shape:[[1]],color:'#ef476f'},{shape:[[1,1]],color:'#ffd166'},{shape:[[1],[1]],color:'#ffd166'},
            {shape:[[1,1,1]],color:'#06d6a0'},{shape:[[1],[1],[1]],color:'#06d6a0'},
            {shape:[[1,1],[1,0]],color:'#118ab2'},{shape:[[1,1],[0,1]],color:'#118ab2'},
            {shape:[[1,0],[1,1]],color:'#118ab2'},{shape:[[0,1],[1,1]],color:'#118ab2'},
            {shape:[[1,1,1],[0,1,0]],color:'#073b4c'},{shape:[[1,1],[1,1]],color:'#f78c6b'}
        ],
        currentPieces:[],
        init() {
            this.boardElement=document.getElementById('puzzle-board'); this.piecesContainer=document.getElementById('puzzle-pieces-container');
            this.boardState=Tetris.createMatrix(10,10); this.score=0; this.updateScore(); this.isRunning=true;
            this.renderBoard(); this.generateNewPieces();
            if(this.boundDragStart){this.piecesContainer.removeEventListener('mousedown',this.boundDragStart);this.piecesContainer.removeEventListener('touchstart',this.boundDragStart);}
            this.boundDragStart=this.onDragStart.bind(this);
            this.piecesContainer.addEventListener('mousedown',this.boundDragStart); this.piecesContainer.addEventListener('touchstart',this.boundDragStart);
        },
        stop() { this.isRunning=false; },
        renderBoard() {
            this.boardElement.innerHTML='';
            this.boardState.forEach(row=>{row.forEach(cellValue=>{
                const cell=document.createElement('div'); cell.className='puzzle-cell';
                if(cellValue){cell.style.background=cellValue; cell.classList.add('filled','game-block');}
                this.boardElement.appendChild(cell);
            });});
        },
        generateNewPieces() {
            this.currentPieces=[]; this.piecesContainer.innerHTML='';
            for(let i=0;i<3;i++){
                const pieceData={...this.pieceShapes[Math.floor(Math.random()*this.pieceShapes.length)]};
                pieceData.id=`piece-${Date.now()}-${i}`; this.currentPieces.push(pieceData); this.renderPiece(pieceData);
            }
            if(this.checkGameOver()){this.gameOver();}
        },
        renderPiece(pieceData) {
            const pieceEl=document.createElement('div'); pieceEl.className='puzzle-piece'; pieceEl.dataset.id=pieceData.id;
            pieceEl.style.gridTemplateColumns=`repeat(${pieceData.shape[0].length},1fr)`;
            pieceData.shape.forEach(row=>{row.forEach(cell=>{
                const cellEl=document.createElement('div');
                if(cell){cellEl.className='puzzle-piece-cell game-block'; cellEl.style.background=pieceData.color;}
                pieceEl.appendChild(cellEl);
            });});
            this.piecesContainer.appendChild(pieceEl);
        },
        onDragStart(e) {
            if(!e.target.closest('.puzzle-piece')||!this.isRunning) return; e.preventDefault();
            const pieceEl=e.target.closest('.puzzle-piece'); const pieceId=pieceEl.dataset.id;
            const pieceData=this.currentPieces.find(p=>p.id===pieceId); this.activeDragPiece=pieceData;
            const draggingEl=pieceEl.cloneNode(true); draggingEl.classList.add('dragging'); document.body.appendChild(draggingEl);
            const rect=pieceEl.getBoundingClientRect(); const touch=e.type==='touchstart'?e.touches[0]:e;
            const offsetX=touch.clientX-rect.left; const offsetY=touch.clientY-rect.top;
            pieceEl.style.opacity='0.3';
            const moveHandler=(moveEvent)=>{
                const moveTouch=moveEvent.type==='touchmove'?moveEvent.touches[0]:moveEvent;
                draggingEl.style.left=`${moveTouch.clientX-offsetX}px`; draggingEl.style.top=`${moveTouch.clientY-offsetY}px`;
                this.renderGhost(pieceData,moveTouch);
            };
            const endHandler=(endEvent)=>{
                document.removeEventListener('mousemove',moveHandler); document.removeEventListener('touchmove',moveHandler);
                document.removeEventListener('mouseup',endHandler); document.removeEventListener('touchend',endHandler);
                draggingEl.remove(); this.boardElement.querySelectorAll('.ghost-path').forEach(c=>c.classList.remove('ghost-path')); this.activeDragPiece=null;
                const boardRect=this.boardElement.getBoundingClientRect();
                const endTouch=endEvent.type==='touchend'?endEvent.changedTouches[0]:endEvent;
                const x=endTouch.clientX-boardRect.left; const y=endTouch.clientY-boardRect.top;
                const col=Math.floor(x/(boardRect.width/10)); const row=Math.floor(y/(boardRect.height/10));
                if(this.canPlacePiece(pieceData,row,col)){
                    this.placePiece(pieceData,row,col); pieceEl.remove();
                    this.currentPieces=this.currentPieces.filter(p=>p.id!==pieceId);
                    if(this.currentPieces.length===0)this.generateNewPieces();
                } else {pieceEl.style.opacity='1';}
            };
            document.addEventListener('mousemove',moveHandler); document.addEventListener('touchmove',moveHandler);
            document.addEventListener('mouseup',endHandler); document.addEventListener('touchend',endHandler);
        },
        renderGhost(pieceData,moveTouch) {
            this.boardElement.querySelectorAll('.ghost-path').forEach(c=>c.classList.remove('ghost-path')); if(!pieceData) return;
            const boardRect=this.boardElement.getBoundingClientRect();
            const x=moveTouch.clientX-boardRect.left; const y=moveTouch.clientY-boardRect.top;
            const startCol=Math.floor(x/(boardRect.width/10)); const startRow=Math.floor(y/(boardRect.height/10));
            const isValid=this.canPlacePiece(pieceData,startRow,startCol);
            for(let r=0;r<pieceData.shape.length;r++){for(let c=0;c<pieceData.shape[r].length;c++){
                if(pieceData.shape[r][c]){
                    const bR=startRow+r; const bC=startCol+c;
                    if(bR<10&&bC<10&&bR>=0&&bC>=0){
                        const cellIndex=bR*10+bC; const cell=this.boardElement.children[cellIndex];
                        if(cell&&!this.boardState[bR][bC]){
                            cell.classList.add('ghost-path');
                            cell.style.backgroundColor=isValid?'rgba(0,255,0,0.3)':'rgba(255,0,0,0.3)';
                        }
                    }
                }
            }}
        },
        canPlacePiece(pieceData,startRow,startCol) {
            for(let r=0;r<pieceData.shape.length;r++){for(let c=0;c<pieceData.shape[r].length;c++){
                if(pieceData.shape[r][c]){
                    const bR=startRow+r; const bC=startCol+c;
                    if(bR>=10||bC>=10||bR<0||bC<0||this.boardState[bR][bC]) return false;
                }
            }}
            return true;
        },
        placePiece(pieceData,startRow,startCol) {
            let placedCells=0;
            pieceData.shape.forEach((row,r)=>{row.forEach((cell,c)=>{
                if(cell){
                    this.boardState[startRow+r][startCol+c]=pieceData.color;
                    const cellIndex=(startRow+r)*10+(startCol+c);
                    if(this.boardElement.children[cellIndex])this.boardElement.children[cellIndex].classList.add('placed');
                    placedCells++;
                }
            });});
            this.score+=placedCells; Sound.play('place');
            this.clearLines(); this.renderBoard(); this.updateScore();
        },
        clearLines() {
            let clearedRows=[]; let clearedCols=[];
            for(let r=0;r<10;r++)if(this.boardState[r].every(cell=>cell))clearedRows.push(r);
            for(let c=0;c<10;c++)if(this.boardState.every(row=>row[c]))clearedCols.push(c);
            clearedRows.forEach(r=>this.boardState[r].fill(0)); clearedCols.forEach(c=>this.boardState.forEach(row=>row[c]=0));
            const clearedCount=clearedRows.length+clearedCols.length;
            if(clearedCount>0){this.score+=clearedCount*50;Sound.play('clear');}
        },
        checkGameOver() {
            for(const piece of this.currentPieces){for(let r=0;r<=10-piece.shape.length;r++){
                for(let c=0;c<=10-piece.shape[0].length;c++){if(this.canPlacePiece(piece,r,c))return false;}}
            }
            return true;
        },
        updateScore() { scoreElement.textContent = this.score; },
        gameOver() { this.stop(); Sound.play('gameOver'); showGameOver(this.score, 'block-puzzle'); }
    };
});
