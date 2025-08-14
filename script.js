document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBALNI ELEMENTI I STANJE ---
    const screens = document.querySelectorAll('.screen');
    const mainMenuScreen = document.getElementById('main-menu-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameTitleElement = gameScreen.querySelector('.game-title');
    const scoreElement = document.getElementById('score');
    
    const tetrisGameArea = document.getElementById('tetris-game-area');
    const blockPuzzleGameArea = document.getElementById('block-puzzle-game-area');

    let activeGame = null; // 'tetris' ili 'block-puzzle'

    // --- NAVIGACIJA ---
    function showScreen(screenId) {
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const gameType = item.getAttribute('data-game');
            startGame(gameType);
        });
    });
    
    document.querySelector('.back-btn').addEventListener('click', () => {
        // Ovde možete dodati logiku za pauziranje igre
        activeGame = null;
        showScreen('main-menu-screen');
    });

    function startGame(gameType) {
        activeGame = gameType;
        scoreElement.textContent = '0';
        gameScreen.querySelector('.game-score').style.display = 'block';

        if (gameType === 'tetris') {
            gameTitleElement.textContent = 'Classic Tetris';
            blockPuzzleGameArea.classList.remove('active');
            tetrisGameArea.classList.add('active');
            Tetris.init(); // Pokrećemo Tetris
        } else if (gameType === 'block-puzzle') {
            gameTitleElement.textContent = 'Block Puzzle';
            tetrisGameArea.classList.remove('active');
            blockPuzzleGameArea.classList.add('active');
            // BlockPuzzle.init(); // Pokrećemo Block Puzzle
            alert("Block Puzzle je u izradi! Izaberite Tetris.");
            showScreen('main-menu-screen'); // Vraćamo jer nije gotovo
            return;
        }
        
        showScreen('game-screen');
    }

    // --- MODUL: UNAPREĐENA TETRIS IGRA ---
    const Tetris = {
        canvas: null, context: null,
        nextCanvas: null, nextContext: null,
        holdCanvas: null, holdContext: null,
        gridSize: 20,
        arena: [],
        player: { pos: {x: 0, y: 0}, matrix: null, score: 0 },
        colors: [null, '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#f78c6b', '#9d6bf7'],
        dropCounter: 0, dropInterval: 1000, lastTime: 0,
        isRunning: false,
        
        // NOVE MEHANIKE
        holdPiece: null,
        canHold: true,
        nextPieces: [],

        init() {
            this.canvas = document.getElementById('tetris-canvas');
            this.context = this.canvas.getContext('2d');
            this.canvas.height = 20 * this.gridSize;
            this.canvas.width = 12 * this.gridSize;
            this.context.scale(this.gridSize, this.gridSize);

            this.nextCanvas = document.getElementById('next-canvas');
            this.nextContext = this.nextCanvas.getContext('2d');
            this.nextContext.scale(this.gridSize, this.gridSize);
            
            this.holdCanvas = document.getElementById('hold-canvas');
            this.holdContext = this.holdCanvas.getContext('2d');
            this.holdContext.scale(this.gridSize, this.gridSize);

            this.arena = this.createMatrix(12, 20);
            this.player.score = 0;
            this.updateScore();
            
            this.nextPieces = [this.createPiece(), this.createPiece(), this.createPiece()];
            this.playerReset();
            
            this.isRunning = true;
            this.lastTime = 0;
            requestAnimationFrame(this.update.bind(this));

            // Dodavanje event listenera samo kad je igra aktivna
            this.boundKeyDown = this.handleKeyDown.bind(this);
            document.addEventListener('keydown', this.boundKeyDown);
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
            requestAnimationFrame(this.update.bind(this));
        },
        
        draw() {
            // Crtanje glavnog platna
            this.context.fillStyle = '#000';
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawMatrix(this.arena, {x: 0, y: 0}, this.context);
            this.drawGhostPiece();
            this.drawMatrix(this.player.matrix, this.player.pos, this.context);

            // Crtanje "Next" platna
            this.nextContext.fillStyle = '#000';
            this.nextContext.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
            this.nextPieces.forEach((piece, index) => {
                const offset = { x: 1, y: 1 + index * 3 };
                this.drawMatrix(piece, offset, this.nextContext);
            });
            
            // Crtanje "Hold" platna
            this.holdContext.fillStyle = '#000';
            this.holdContext.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
            if (this.holdPiece) {
                this.drawMatrix(this.holdPiece, {x: 1, y: 1}, this.holdContext);
            }
        },

        // --- Mehanike koje fale (pogledajte prethodni odgovor za kompletan kod) ---
        // createMatrix(w, h), createPiece(), drawMatrix(matrix, offset, ctx)
        // collide(arena, player), merge(arena, player), playerMove(dir)
        // playerDrop(), rotate(matrix, dir), playerRotate(dir)
        // arenaSweep(), updateScore()
        
        // Unapređeni playerReset
        playerReset() {
            this.player.matrix = this.nextPieces.shift();
            this.nextPieces.push(this.createPiece());
            
            this.player.pos.y = 0;
            this.player.pos.x = (this.arena[0].length / 2 | 0) - (this.player.matrix[0].length / 2 | 0);
            
            if (this.collide(this.arena, this.player)) {
                this.gameOver();
            }
            this.canHold = true;
        },

        drawGhostPiece() {
            const ghost = JSON.parse(JSON.stringify(this.player));
            while (!this.collide(this.arena, ghost)) {
                ghost.pos.y++;
            }
            ghost.pos.y--;
            this.context.globalAlpha = 0.3;
            this.drawMatrix(ghost.matrix, ghost.pos, this.context);
            this.context.globalAlpha = 1.0;
        },

        handleHold() {
            if (!this.canHold) return;
            
            if (this.holdPiece) {
                [this.player.matrix, this.holdPiece] = [this.holdPiece, this.player.matrix];
                this.playerReset();
            } else {
                this.holdPiece = this.player.matrix;
                this.playerReset();
            }
            this.canHold = false;
        },

        handleKeyDown(event) {
            if (!this.isRunning) return;
            if (event.keyCode === 37) this.playerMove(-1);       // Levo
            else if (event.keyCode === 39) this.playerMove(1);   // Desno
            else if (event.keyCode === 40) this.playerDrop();     // Dole
            else if (event.keyCode === 81) this.playerRotate(-1); // Q
            else if (event.keyCode === 87) this.playerRotate(1);  // W
            else if (event.keyCode === 32) { // Space - Hard Drop
                while (!this.collide(this.arena, this.player)) {
                    this.player.pos.y++;
                }
                this.player.pos.y--;
                this.merge(this.arena, this.player);
                this.playerReset();
                this.arenaSweep();
                this.updateScore();
            } else if (event.keyCode === 67) this.handleHold(); // C
        },

        gameOver() {
            this.isRunning = false;
            document.removeEventListener('keydown', this.boundKeyDown);
            // Prikazati Game Over modal...
        }
        
        // ... Ovde treba ubaciti sve one pomoćne funkcije iz mog prethodnog odgovora
        // (createMatrix, createPiece, collide, merge, itd.) jer su predugačke
        // da se ponavljaju. Njihova logika ostaje ista.
    };
    
    // --- MODUL: BLOCK PUZZLE IGRA (U IZRADI) ---
    // Logika za Block Puzzle je kompleksna zbog drag-and-drop.
    // Zahteva zaseban, detaljan razvoj.
});
