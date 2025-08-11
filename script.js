// =================================================================================
// ===== KONSTANTE I PODEŠAVANJA =====
// =================================================================================
// ... (Sve konstante i globalne varijable ostaju iste kao u prethodnoj poruci) ...

// =================================================================================
// ===== GLAVNA LOGIKA IGRE (GAME LOGIC) =====
// =================================================================================
function startGame() {
    // Sakrij menije, prikaži igru
    mainMenu.style.display = 'none';
    tetrisMenu.style.display = 'none';
    gameWrapper.style.display = 'flex';
    resizeGame();

    initBoard(); score = 0; level = 1; linesClearedTotal = 0; linesClearedThisLevel = 0;
    dropInterval = LEVEL_SPEED_CONFIG.BASE_INTERVAL;
    updateBestScoreDisplay();
    updateScoreDisplay(); updateLevelDisplay(); updateAssistsDisplay(); startTime = performance.now();
    sprintTimerDisplay.style.display = currentMode === 'sprint' ? 'block' : 'none';
    ultraTimerDisplay.style.display = currentMode === 'ultra' ? 'block' : 'none';
    gameOverScreen.style.display = 'none'; pauseScreen.style.display = 'none';
    gameOver = false; isPaused = false;
    currentPieceIndex = Math.floor(Math.random() * TETROMINOES.length); nextPieceIndex = Math.floor(Math.random() * TETROMINOES.length);
    generateNewPiece();
    if (currentMode !== 'zen') playBackgroundMusic();
    lastDropTime = performance.now();
    
    if(animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ... (Ostatak koda igre je isti, menjamo samo deo za inicijalizaciju i podešavanja) ...

function toggleSound() {
    isMuted = !isMuted;
    allAudioElements.forEach(audio => {
        audio.muted = isMuted;
    });
    if (soundToggleButton) {
        soundToggleButton.textContent = isMuted ? '🔇' : '🔊';
    }
    localStorage.setItem('isMuted', isMuted);
}

// =================================================================================
// ===== INICIJALIZACIJA IGRE, Događaji i Podešavanja =====
// =================================================================================

function initDOMAndEventListeners() {
    // Dohvatanje kontejnera i menija
    gameWrapper = document.getElementById('main-game-wrapper');
    mainMenu = document.getElementById('main-menu');
    tetrisMenu = document.getElementById('tetris-menu');
    settingsModal = document.getElementById('settings-modal');

    // Dohvatanje canvasa
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextBlockCanvas = document.getElementById('nextBlockCanvas');
    nextBlockCtx = nextBlockCanvas.getContext('2d');
    backgroundImageElement = document.getElementById('background-image');
    
    // Dohvatanje ostalih overlay-a
    gameOverScreen = document.getElementById('game-over-screen');
    pauseScreen = document.getElementById('pause-screen');
    exitModal = document.getElementById('exit-modal');
    countdownOverlay = document.getElementById('countdown-overlay');
    controlsModal = document.getElementById('controls-modal');

    // Dohvatanje prikaza
    scoreDisplay = document.getElementById('score-display');
    finalScoreDisplay = document.getElementById('final-score');
    finalTimeDisplay = document.getElementById('final-time');
    comboDisplay = document.getElementById('combo-display');
    levelDisplay = document.getElementById('level-display');
    sprintTimerDisplay = document.getElementById('sprint-timer');
    ultraTimerDisplay = document.getElementById('ultra-timer');
    bestScoreDisplay = document.getElementById('best-score-display');

    // Dohvatanje svih dugmića
    selectTetrisButton = document.getElementById('select-tetris-button');
    backToMainMenuButton = document.getElementById('back-to-main-menu-button');
    settingsButton = document.getElementById('settings-button');
    closeSettingsModalButton = document.getElementById('close-settings-modal-button');
    soundToggleButton = document.getElementById('sound-toggle-button');
    startButton = document.getElementById('start-button');
    restartButton = document.getElementById('restart-button');
    resumeButton = document.getElementById('resume-button');
    homeButton = document.getElementById('home-button');
    pauseButton = document.getElementById('pause-button');
    confirmExitButton = document.getElementById('confirm-exit-button');
    cancelExitButton = document.getElementById('cancel-exit-button');
    controlsButton = document.getElementById('controls-button');
    closeControlsModal = document.getElementById('close-controls-modal');
    
    // Dohvatanje birača
    themeSwitcher = document.getElementById('theme-switcher');
    modeSelector = document.getElementById('mode-selector');

    // Dohvatanje assist elemenata
    assistsBombButton = document.getElementById('assist-bomb-button');
    assistsBombCountDisplay = document.getElementById('assists-bomb-count');
    assistsHammerButton = document.getElementById('assist-hammer-button');
    assistsHammerCountDisplay = document.getElementById('assists-hammer-count');
    assistsUndoButton = document.getElementById('assist-undo-button');
    assistsUndoCountDisplay = document.getElementById('assists-undo-count');
    
    controlInputs = document.querySelectorAll('.control-item input');
    
    allAudioElements = document.querySelectorAll('audio');
    dropSound = document.getElementById('dropSound');
    clearSound = document.getElementById('clearSound');
    rotateSound = document.getElementById('rotateSound');
    gameOverSound = document.getElementById('gameOverSound');
    tSpinSound = document.getElementById('tSpinSound');
    tetrisSound = document.getElementById('tetrisSound');
    backgroundMusic = document.getElementById('backgroundMusic');
    bombSound = document.getElementById('bombSound');
    
    function resizeGame() {
        if (!canvas) return;
        const container = document.getElementById('canvas-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        BLOCK_SIZE = Math.floor(Math.min(containerWidth / COLS, containerHeight / ROWS));
        canvas.width = COLS * BLOCK_SIZE;
        canvas.height = ROWS * BLOCK_SIZE;
        const nextContainer = document.getElementById('next-block-container');
        if (nextContainer && nextContainer.clientWidth > 0) {
            nextBlockCanvas.width = nextContainer.clientWidth * 0.9;
            nextBlockCanvas.height = nextContainer.clientHeight * 0.9;
        }
        draw(); 
        if(!gameOver) drawNextPiece();
    }

    // --- Povezivanje događaja (Event Listeners) ---
    window.addEventListener('resize', resizeGame);
    if(canvas) {
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('mousemove', handleCanvasHover);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    }
    if(document) {
        document.addEventListener('keydown', handleKeydown);
        document.addEventListener('keyup', handleKeyup);
    }
    
    // Navigacija kroz menije
    if(selectTetrisButton) selectTetrisButton.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        tetrisMenu.style.display = 'flex';
    });

    if(backToMainMenuButton) backToMainMenuButton.addEventListener('click', () => {
        tetrisMenu.style.display = 'none';
        mainMenu.style.display = 'flex';
    });

    // Podešavanja
    if(settingsButton) settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
    });

    if(closeSettingsModalButton) closeSettingsModalButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    if(soundToggleButton) soundToggleButton.addEventListener('click', toggleSound);

    // Akcije u igri
    if(startButton) startButton.addEventListener('click', () => {
        countdownOverlay.style.display = 'flex';
        let count = 3;
        countdownOverlay.textContent = count;
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownOverlay.textContent = count;
            } else {
                clearInterval(countdownInterval);
                countdownOverlay.style.display = 'none';
                startGame();
            }
        }, 1000);
    });

    if(restartButton) restartButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        gameWrapper.style.display = 'none';
        mainMenu.style.display = 'flex';
    });

    if(pauseButton) pauseButton.addEventListener('click', togglePause);
    if(resumeButton) resumeButton.addEventListener('click', togglePause);
    
    if(homeButton) homeButton.addEventListener('click', () => {
        if (gameOver) return;
        isPaused = true;
        if(animationFrameId) cancelAnimationFrame(animationFrameId);
        pauseStartTime = performance.now();
        pauseBackgroundMusic();
        exitModal.style.display = 'flex';
    });

    if(cancelExitButton) cancelExitButton.addEventListener('click', () => {
        exitModal.style.display = 'none';
        isPaused = false;
        togglePause();
    });

    if(confirmExitButton) confirmExitButton.addEventListener('click', () => {
        window.location.reload();
    });

    if(themeSwitcher) themeSwitcher.addEventListener('change', (e) => {
        applyTheme(e.target.value);
        localStorage.setItem('theme', e.target.value);
    });
    if(modeSelector) modeSelector.addEventListener('change', (e) => {
        currentMode = e.target.value;
        localStorage.setItem('mode', currentMode);
        updateBestScoreDisplay();
    });
    if(assistsBombButton) assistsBombButton.addEventListener('click', useBombAssist);
    if(assistsHammerButton) assistsHammerButton.addEventListener('click', toggleHammerMode);
    if(assistsUndoButton) assistsUndoButton.addEventListener('click', useUndoAssist);

    function updateControlsDisplay() {
        if (!keyBindings) return;
        controlInputs.forEach(input => {
            const action = input.dataset.action;
            input.value = keyBindings[action] === ' ' ? 'Space' : keyBindings[action];
        });
    }
    if(controlsButton) controlsButton.addEventListener('click', () => {
        updateControlsDisplay();
        controlsModal.style.display = 'block';
    });
    if(closeControlsModal) closeControlsModal.addEventListener('click', () => {
        controlsModal.style.display = 'none';
    });
    if(controlInputs) controlInputs.forEach(input => {
        input.addEventListener('click', (e) => {
            const clickedInput = e.target;
            controlInputs.forEach(i => i.classList.remove('listening'));
            clickedInput.classList.add('listening');
            clickedInput.value = '...';

            function keydownHandler(event) {
                event.preventDefault();
                const newKey = event.key === ' ' ? 'Space' : event.key;
                const action = clickedInput.dataset.action;
                keyBindings[action] = newKey;
                localStorage.setItem('keyBindings', JSON.stringify(keyBindings));
                updateControlsDisplay();
                clickedInput.classList.remove('listening');
                window.removeEventListener('keydown', keydownHandler, true);
            }
            window.addEventListener('keydown', keydownHandler, { capture: true, once: true });
        });
    });

    loadSettings();
    resizeGame();
}

function loadSettings() {
    // ... (ista kao u prethodnoj verziji)
    const savedTheme = localStorage.getItem('theme') || 'classic';
    const savedMode = localStorage.getItem('mode') || 'classic';
    bestScores = JSON.parse(localStorage.getItem('bestScores') || '{}');
    assists = JSON.parse(localStorage.getItem('assists') || '{"bomb":1,"hammer":1,"undo":1}');
    keyBindings = JSON.parse(localStorage.getItem('keyBindings')) || {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        down: 'ArrowDown',
        rotate: 'ArrowUp',
        drop: ' ',
        bomb: 'b',
        hammer: 'h',
        undo: 'u'
    };
    
    isMuted = JSON.parse(localStorage.getItem('isMuted') || 'false');
    allAudioElements.forEach(audio => {
        audio.muted = isMuted;
    });
    if(soundToggleButton) soundToggleButton.textContent = isMuted ? '🔇' : '🔊';

    if(themeSwitcher) themeSwitcher.value = savedTheme;
    if(modeSelector) modeSelector.value = savedMode;
    currentMode = savedMode;
    
    updateBestScoreDisplay();
    updateAssistsDisplay();
    applyTheme(savedTheme);
}

// ... (sve ostale funkcije ostaju iste)
