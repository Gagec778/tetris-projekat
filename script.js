
function adjustGameWrapperHeight() {
    const wrapper = document.getElementById("main-game-wrapper");
    if (wrapper) wrapper.style.height = `${window.innerHeight}px`;
}
window.addEventListener("load", adjustGameWrapperHeight);
window.addEventListener("resize", adjustGameWrapperHeight);

let lastDropTime = 0;
function performDrop() {
    const now = Date.now();
    if (now - lastDropTime < 150) return;
    lastDropTime = now;
    dropPiece(); // Replace all dropPiece() calls with performDrop()
}

// Place this function definition somewhere where original dropPiece() was used
function dropPiece() {
    // Actual logic for dropping a piece goes here
}
