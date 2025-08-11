import { THEMES, PUZZLE_PIECES, PUZZLE_COLS, PUZZLE_ROWS } from './constants.js';
import { drawBlock, lightenColor, darkenColor } from './utils.js';

export class BlockPuzzleGame {
    constructor(dependencies) {
        this.UI = dependencies.UIElements;
        this.playSound = dependencies.playSound;
        this.showScreen = dependencies.showScreen;
        this.gameType = 'blockpuzzle';

        // Inicijalizacija stanja
        this.board = [];
        this.availablePieces = [null, null, null];
        this.score = 0;
        this.gameOver = true;
        this.draggingPiece = null;
        this.puzzleBlockSize = 0;

        this.ctx = this.UI.blockPuzzleCanvas.getContext('2d');
        this.pieceContexts = [
            this.UI.puzzlePieceCanvas0.getContext('2d'),
            this.UI.puzzlePieceCanvas1.getContext('2d'),
            this.UI.puzzlePieceCanvas2.getContext('2d')
        ];
        this.draggingCtx = this.UI.draggingPieceCanvas.getContext('2d');
    }

    start() {
        this.gameOver = false;
        this.score = 0;
        this.board = Array(PUZZLE_ROWS).fill(0).map(() => Array(PUZZLE_COLS).fill(0));
        this.availablePieces = [null, null, null];

        this.resize();
        this.generateAvailablePieces();
        this.draw();

        this.attachEventListeners();
    }
    
    end(goToMainMenu = false) {
        this.gameOver = true;
        this.removeEventListeners();
        if (goToMainMenu) {
            this.showScreen('mainMenu');
        }
    }
    
    resize() {
        const container = this.UI.puzzleCanvasContainer;
        const size = Math.min(container.clientWidth, container.clientHeight) * 0.95;
        this.UI.blockPuzzleCanvas.width = size;
        this.UI.blockPuzzleCanvas.height = size;
        this.puzzleBlockSize = size / PUZZLE_COLS;
        this.draw();
    }
    
    attachEventListeners() {
        this.pieceSlots = [
            this.UI.puzzlePieceCanvas0.parentElement,
            this.UI.puzzlePieceCanvas1.parentElement,
            this.UI.puzzlePieceCanvas2.parentElement
        ];

        this.pieceSlots.forEach((slot, index) => {
            slot.addEventListener('mousedown', (e) => this.handleDragStart(e, index));
            slot.addEventListener('touchstart', (e) => this.handleDragStart(e, index), { passive: false });
        });
    }

    removeEventListeners() {
        // Ukloni listenere da se ne bi duplirali
        this.pieceSlots.forEach((slot, index) => {
            // Teško je ukloniti anonimne funkcije, za sada ostavljamo ovako
            // U budućnosti se ovo može refaktorisati
        });
    }

    // ===== DRAWING =====
    draw() {
        this.drawBoard();
        this.drawAvailablePieces();
    }
    
    drawBoard() {
        // ... Crtanje table i postojećih blokova
    }
    
    drawAvailablePieces() {
        // ... Crtanje 3 figure u slotovima
    }
    
    // ===== DRAG & DROP =====
    handleDragStart(e, index) {
        // ... Logika za početak prevlačenja
    }
    
    handleDragMove(e) {
        // ... Logika za pomeranje prevučenog bloka
    }

    handleDragEnd(e) {
        // ... Logika za kraj prevlačenja, proveru i postavljanje bloka
    }
    
    // ===== GAME RULES =====
    generateAvailablePieces() {
        // ... Logika za generisanje novih figura
    }

    canPlacePiece(piece, gridX, gridY) {
        // ... Provera da li figura može da stane
    }

    placePiece(piece, gridX, gridY) {
        // ... Postavljanje figure na tablu
    }

    checkLines() {
        // ... Provera i čišćenje linija
    }

    isGameOver() {
        // ... Provera da li je kraj igre
    }
}
