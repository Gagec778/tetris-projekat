document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBALNI ELEMENTI I STANJE APLIKACIJE ---
    const screens = {
        mainMenu: document.getElementById('main-menu-screen'),
        game: document.getElementById('game-screen'),
    };
    const gameTitleElement = screens.game.querySelector('.game-title');
    const scoreElement = document.getElementById('score');
    const finalScoreElement = document.getElementById('final-score');
    const gameOverModal = document.getElementById('game-over-modal');
    const restartBtn = document.getElementById('restart-btn');

    const gameAreas = {
        tetris: document.getElementById('tetris-game-area'),
        blockPuzzle: document.getElementById('block-puzzle-game-area'),
    };
    
    let activeGame = null; // 'tetris' ili 'block-puzzle'
    let activeGameModule = null;

    // --- NAVIGACIJA KROZ APLIKACIJU ---
    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const gameType = item.getAttribute('data-game');
            startGame(gameType);
        });
    });
    
    document.querySelector('.back-btn').addEventListener('click', () => {
        if (activeGameModule && activeGameModule.stop) {
            activeGameModule.stop();
        }
        activeGame = null;
        activeGameModule = null;
        showScreen('mainMenu');
    });

    restartBtn.addEventListener('click', () => {
        gameOverModal.classList.remove('active');
        if (activeGame) {
            startGame(activeGame);
        }
    });

    function startGame(gameType) {
        activeGame = gameType;
        scoreElement.textContent = '0';
        gameOverModal.classList.remove('active');

        Object.values(gameAreas).forEach(area => area.classList.remove('active'));

        if (gameType === 'tetris') {
            gameTitleElement.textContent = 'Classic Tetris';
            gameAreas.tetris.classList.add('active');
            activeGameModule = Tetris;
        } else if (gameType === 'block-puzzle') {
            gameTitleElement.textContent = 'Block Puzzle';
            gameAreas.blockPuzzle.classList.add('active');
            activeGameModule = BlockPuzzle;
        }
        
        activeGameModule.init();
        showScreen('game');
    }

    function showGameOver(score) {
        finalScoreElement.textContent = score;
        gameOverModal.classList.add('active');
    }

    // ===================================================================
    // ================== MODUL: CLASSIC TETRIS IGRA =====================
    // ===================================================================
    const Tetris = {
        // ... (Svi elementi i stanje koje smo definisali ranije)
        canvas: null, context: null, nextCanvas: null, nextContext: null, holdCanvas: null, holdContext: null,
        gridSize: 20, arena: [], player: {}, colors: [null, '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#f78c6b', '#9d6bf7'],
        dropCounter: 0, dropInterval: 1000, lastTime: 0, isRunning: false,
        holdPiece: null, canHold: true, nextPieces: [],
        
        init() {
            // Inicijalizacija kanvasa
            this.canvas = document.getElementById('tetris-canvas');
            this.context = this.canvas.getContext('2d');
            this.canvas.height = 20 * this.gridSize;
            this.canvas.width = 12 * this.gridSize;
            this.context.scale(this.gridSize, this.gridSize);

            this.nextCanvas = document.getElementById('next-canvas');
            this.nextContext = this.nextCanvas.getContext('2d');
            this.nextCanvas.width = 4 * this.gridSize;
            this.nextCanvas.height = 12 * this.gridSize;
            this.nextContext.scale(this.gridSize, this.gridSize);

            this.holdCanvas = document.getElementById('hold-canvas');
            this.holdContext = this.holdCanvas.getContext('2d');
            this.holdCanvas.width = 4 * this.gridSize;
            this.holdCanvas.height = 4 * this.gridSize;
            this.holdContext.scale(this.gridSize, this.gridSize);
            
            // Resetovanje stanja igre
            this.arena = this.createMatrix(12, 20);
            this.player = { pos: {x: 0, y: 0}, matrix: null, score: 0 };
            this.holdPiece = null;
            this.canHold = true;
            this.updateScore();
            
            this.nextPieces = [this.createPiece(), this.createPiece(), this.createPiece()];
            this.playerReset();
            
            this.isRunning = true;
            this.lastTime = 0;
            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = requestAnimationFrame(this.update.bind(this));

            this.boundKeyDown = this.handleKeyDown.bind(this);
            document.removeEventListener('keydown', this.boundKeyDown); // Ukloni stari, ako postoji
            document.addEventListener('keydown', this.boundKeyDown);
        },

        stop() {
            this.isRunning = false;
            document.removeEventListener('keydown', this.boundKeyDown);
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
        },

        // --- Glavna petlja i crtanje ---
        update(time = 0) {
            if (!this.isRunning) return;

            const deltaTime = time - this.lastTime;
            this.lastTime = time;
            this.dropCounter += deltaTime;
            if (this.dropCounter > this.dropInterval) this.playerDrop();

            this.draw();
            this.animationFrameId = requestAnimationFrame(this.update.bind(this));
        },
        
        draw() {
            this.context.fillStyle = 'rgba(0,0,0,0.5)';
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawMatrix(this.arena, {x: 0, y: 0}, this.context);
            this.drawGhostPiece();
            this.drawMatrix(this.player.matrix, this.player.pos, this.context);

            this.nextContext.fillStyle = 'rgba(0,0,0,0.5)';
            this.nextContext.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
            this.nextPieces.forEach((piece, index) => {
                const offset = { x: (4 - piece[0].length) / 2, y: 1 + index * 4 };
                this.drawMatrix(piece, offset, this.nextContext);
            });
            
            this.holdContext.fillStyle = 'rgba(0,0,0,0.5)';
            this.holdContext.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
            if (this.holdPiece) {
                const offset = { x: (4 - this.holdPiece[0].length) / 2, y: (4 - this.holdPiece.length) / 2 };
                this.drawMatrix(this.holdPiece, offset, this.holdContext);
            }
        },

        drawMatrix(matrix, offset, context) {
            matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        context.fillStyle = this.colors[value];
                        context.fillRect(x + offset.x, y + offset.y, 1, 1);
                    }
                });
            });
        },

        drawGhostPiece() {
            const ghost = JSON.parse(JSON.stringify(this.player));
            while (!this.collide(this.arena, ghost)) ghost.pos.y++;
            ghost.pos.y--;
            this.context.globalAlpha = 0.2;
            this.drawMatrix(ghost.matrix, ghost.pos, this.context);
            this.context.globalAlpha = 1.0;
        },

        // --- Logika igre ---
        createMatrix(w, h) {
            const matrix = [];
            while (h--) matrix.push(new Array(w).fill(0));
            return matrix;
        },
        
        createPiece() {
            const pieces = 'TJLOSZI';
            const type = pieces[Math.floor(Math.random() * pieces.length)];
            switch (type) {
                case 'T': return [[1, 1, 1], [0, 1, 0]];
                case 'J': return [[0, 2, 0], [0, 2, 0], [2, 2, 0]];
                case 'L': return [[3, 0, 0], [3, 0, 0], [3, 3, 0]];
                case 'O': return [[4, 4], [4, 4]];
                case 'S': return [[0, 5, 5], [5, 5, 0]];
                case 'Z': return [[6, 6, 0], [0, 6, 6]];
                case 'I': return [[0,7,0,0],[0,7,0,0],[0,7,0,0],[0,7,0,0]];
            }
        },

        collide(arena, player) {
            for (let y = 0; y < player.matrix.length; y++) {
                for (let x = 0; x < player.matrix[y].length; x++) {
                    if (player.matrix[y][x] !== 0 &&
                       (arena[y + player.pos.y] && arena[y + player.pos.y][x + player.pos.x]) !== 0) {
                        return true;
                    }
                }
            }
            return false;
        },

        merge(arena, player) {
            player.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
                });
            });
        },

        arenaSweep() {
            let clearedRows = 0;
            outer: for (let y = this.arena.length - 1; y > 0; --y) {
                for (let x = 0; x < this.arena[y].length; ++x) {
                    if (this.arena[y][x] === 0) continue outer;
                }
                const row = this.arena.splice(y, 1)[0].fill(0);
                this.arena.unshift(row);
                y++;
                clearedRows++;
            }
            if (clearedRows > 0) {
                this.player.score += [0, 10, 30, 50, 100][clearedRows] * 10;
                this.updateScore();
            }
        },

        updateScore() {
            scoreElement.textContent = this.player.score;
        },

        // --- Kontrole igrača ---
        playerReset() {
            this.player.matrix = this.nextPieces.shift();
            this.nextPieces.push(this.createPiece());
            this.player.pos.y = 0;
            this.player.pos.x = (this.arena[0].length / 2 | 0) - (this.player.matrix[0].length / 2 | 0);
            if (this.collide(this.arena, this.player)) this.gameOver();
            this.canHold = true;
        },

        playerMove(dir) {
            this.player.pos.x += dir;
            if (this.collide(this.arena, this.player)) this.player.pos.x -= dir;
        },

        playerDrop() {
            this.player.pos.y++;
            if (this.collide(this.arena, this.player)) {
                this.player.pos.y--;
                this.merge(this.arena, this.player);
                this.playerReset();
                this.arenaSweep();
            }
            this.dropCounter = 0;
        },
        
        rotate(matrix, dir) {
            for (let y = 0; y < matrix.length; ++y) {
                for (let x = 0; x < y; ++x) [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
            dir > 0 ? matrix.forEach(row => row.reverse()) : matrix.reverse();
        },

        playerRotate(dir) {
            const pos = this.player.pos.x;
            let offset = 1;
            this.rotate(this.player.matrix, dir);
            while (this.collide(this.arena, this.player)) {
                this.player.pos.x += offset;
                offset = -(offset + (offset > 0 ? 1 : -1));
                if (offset > this.player.matrix[0].length) {
                    this.rotate(this.player.matrix, -dir);
                    this.player.pos.x = pos;
                    return;
                }
            }
        },

        handleHold() {
            if (!this.canHold) return;
            this.canHold = false;
            if (this.holdPiece) {
                [this.player.matrix, this.holdPiece] = [this.holdPiece, this.player.matrix];
                this.player.pos.y = 0;
                this.player.pos.x = (this.arena[0].length / 2 | 0) - (this.player.matrix[0].length / 2 | 0);
            } else {
                this.holdPiece = this.player.matrix;
                this.playerReset();
            }
        },
        
        handleKeyDown(event) {
            if (!this.isRunning) return;
            switch(event.keyCode) {
                case 37: this.playerMove(-1); break; // Left
                case 39: this.playerMove(1); break;  // Right
                case 40: this.playerDrop(); break;   // Down
                case 81: this.playerRotate(-1); break;// Q - Rotate Left
                case 87: case 38: this.playerRotate(1); break; // W/Up - Rotate Right
                case 67: this.handleHold(); break; // C - Hold
                case 32: // Space - Hard Drop
                    while (!this.collide(this.arena, this.player)) this.player.pos.y++;
                    this.player.pos.y--;
                    this.merge(this.arena, this.player);
                    this.playerReset();
                    this.arenaSweep();
                    break;
            }
        },

        gameOver() {
            this.stop();
            showGameOver(this.player.score);
        }
    };
    
    // ===================================================================
    // ================== MODUL: BLOCK PUZZLE IGRA =======================
    // ===================================================================
    const BlockPuzzle = {
        // ... (Logika za Block Puzzle)
        boardElement: null, piecesContainer: null,
        boardState: [], score: 0, isRunning: false,
        pieceShapes: [
            { shape: [[1]], color: '#ef476f' }, // 1x1
            { shape: [[1, 1]], color: '#ffd166' }, // 1x2
            { shape: [[1], [1]], color: '#ffd166' }, // 2x1
            { shape: [[1, 1, 1]], color: '#06d6a0' }, // 1x3
            { shape: [[1], [1], [1]], color: '#06d6a0' }, // 3x1
            { shape: [[1, 1], [1, 0]], color: '#118ab2' }, // L-shape small
            { shape: [[1, 1], [0, 1]], color: '#118ab2' }, // L-shape small
            { shape: [[1, 1, 1], [0, 1, 0]], color: '#073b4c' }, // T-shape
            { shape: [[1, 1], [1, 1]], color: '#f78c6b' }, // 2x2
        ],
        currentPieces: [],

        init() {
            this.boardElement = document.getElementById('puzzle-board');
            this.piecesContainer = document.getElementById('puzzle-pieces-container');
            this.boardState = Tetris.createMatrix(10, 10);
            this.score = 0;
            this.updateScore();
            this.isRunning = true;

            this.renderBoard();
            this.generateNewPieces();

            // Ukloni stare listenere ako postoje
            if (this.boundDragStart) {
                this.piecesContainer.removeEventListener('mousedown', this.boundDragStart);
                this.piecesContainer.removeEventListener('touchstart', this.boundDragStart);
            }

            this.boundDragStart = this.onDragStart.bind(this);
            this.piecesContainer.addEventListener('mousedown', this.boundDragStart);
            this.piecesContainer.addEventListener('touchstart', this.boundDragStart);
        },

        stop() {
            this.isRunning = false;
        },

        renderBoard() {
            this.boardElement.innerHTML = '';
            this.boardState.forEach(row => {
                row.forEach(cellValue => {
                    const cell = document.createElement('div');
                    cell.className = 'puzzle-cell';
                    if (cellValue) {
                        cell.style.backgroundColor = cellValue;
                        cell.classList.add('filled');
                    }
                    this.boardElement.appendChild(cell);
                });
            });
        },
        
        generateNewPieces() {
            this.currentPieces = [];
            this.piecesContainer.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                const pieceData = { ...this.pieceShapes[Math.floor(Math.random() * this.pieceShapes.length)] };
                pieceData.id = `piece-${Date.now()}-${i}`;
                this.currentPieces.push(pieceData);
                this.renderPiece(pieceData);
            }
             if (this.checkGameOver()) {
                this.gameOver();
            }
        },

        renderPiece(pieceData) {
            const pieceEl = document.createElement('div');
            pieceEl.className = 'puzzle-piece';
            pieceEl.dataset.id = pieceData.id;
            pieceEl.style.gridTemplateColumns = `repeat(${pieceData.shape[0].length}, 1fr)`;
            
            pieceData.shape.forEach(row => {
                row.forEach(cell => {
                    const cellEl = document.createElement('div');
                    if (cell) {
                        cellEl.className = 'puzzle-piece-cell';
                        cellEl.style.backgroundColor = pieceData.color;
                    }
                    pieceEl.appendChild(cellEl);
                });
            });
            this.piecesContainer.appendChild(pieceEl);
        },

        onDragStart(e) {
            if (!e.target.closest('.puzzle-piece')) return;
            e.preventDefault();

            const pieceEl = e.target.closest('.puzzle-piece');
            const pieceId = pieceEl.dataset.id;
            const pieceData = this.currentPieces.find(p => p.id === pieceId);
            
            const draggingEl = pieceEl.cloneNode(true);
            draggingEl.classList.add('dragging');
            document.body.appendChild(draggingEl);

            const rect = pieceEl.getBoundingClientRect();
            const touch = e.type === 'touchstart' ? e.touches[0] : e;
            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;

            pieceEl.style.opacity = '0.3';
            
            const onDragMove = (moveEvent) => {
                const moveTouch = moveEvent.type === 'touchmove' ? moveEvent.touches[0] : moveEvent;
                draggingEl.style.left = `${moveTouch.clientX - offsetX}px`;
                draggingEl.style.top = `${moveTouch.clientY - offsetY}px`;
            };

            const onDragEnd = (endEvent) => {
                document.removeEventListener('mousemove', onDragMove);
                document.removeEventListener('touchmove', onDragMove);
                document.removeEventListener('mouseup', onDragEnd);
                document.removeEventListener('touchend', onDragEnd);
                
                draggingEl.remove();
                
                const boardRect = this.boardElement.getBoundingClientRect();
                const endTouch = endEvent.type === 'touchend' ? endEvent.changedTouches[0] : endEvent;
                
                const x = endTouch.clientX - boardRect.left;
                const y = endTouch.clientY - boardRect.top;
                
                const col = Math.floor(x / (boardRect.width / 10));
                const row = Math.floor(y / (boardRect.height / 10));

                if (this.canPlacePiece(pieceData, row, col)) {
                    this.placePiece(pieceData, row, col);
                    pieceEl.remove();
                    
                    this.currentPieces = this.currentPieces.filter(p => p.id !== pieceId);
                    
                    if (this.currentPieces.length === 0) {
                        this.generateNewPieces();
                    }
                } else {
                    pieceEl.style.opacity = '1';
                }
            };
            
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('touchmove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchend', onDragEnd);
        },
        
        canPlacePiece(pieceData, startRow, startCol) {
            for (let r = 0; r < pieceData.shape.length; r++) {
                for (let c = 0; c < pieceData.shape[r].length; c++) {
                    if (pieceData.shape[r][c]) {
                        const boardRow = startRow + r;
                        const boardCol = startCol + c;
                        if (boardRow >= 10 || boardCol >= 10 || boardRow < 0 || boardCol < 0 || this.boardState[boardRow][boardCol]) {
                            return false;
                        }
                    }
                }
            }
            return true;
        },

        placePiece(pieceData, startRow, startCol) {
            pieceData.shape.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell) this.boardState[startRow + r][startCol + c] = pieceData.color;
                });
            });
            this.score += pieceData.shape.flat().reduce((a, b) => a + b, 0);
            this.clearLines();
            this.renderBoard();
            this.updateScore();
        },
        
        clearLines() {
            let clearedRows = [];
            let clearedCols = [];

            for (let r = 0; r < 10; r++) if (this.boardState[r].every(cell => cell)) clearedRows.push(r);
            for (let c = 0; c < 10; c++) if (this.boardState.every(row => row[c])) clearedCols.push(c);

            clearedRows.forEach(r => this.boardState[r].fill(0));
            clearedCols.forEach(c => this.boardState.forEach(row => row[c] = 0));
            
            const clearedCount = clearedRows.length + clearedCols.length;
            if (clearedCount > 0) this.score += clearedCount * 50;
        },

        checkGameOver() {
            for (const piece of this.currentPieces) {
                for (let r = 0; r <= 10 - piece.shape.length; r++) {
                    for (let c = 0; c <= 10 - piece.shape[0].length; c++) {
                        if (this.canPlacePiece(piece, r, c)) {
                            return false; // Pronađen je bar jedan validan potez
                        }
                    }
                }
            }
            return true; // Nema validnih poteza ni za jedan blok
        },

        updateScore() {
            scoreElement.textContent = this.score;
        },

        gameOver() {
            this.stop();
            showGameOver(this.score);
        }
    };
});
