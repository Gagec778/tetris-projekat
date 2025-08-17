// ================== GLOBAL STATE ==================
let gems = 100000; // TEST vrednost, kasnije smanjiti
let currentScreen = "main-menu-screen";
let ownedThemes = ["dark"];
let ownedBlocks = ["classic"];
let activeTheme = "dark";
let activeBlock = "classic";

let achievements = [];
let unlockedAchievements = [];
let adViews = {}; // za premium stvari

// ================== HELPERS ==================
function $(id) {
  return document.getElementById(id);
}

function switchScreen(newScreen) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(newScreen).classList.add("active");
  currentScreen = newScreen;
}

// ================== GEM SYSTEM ==================
function updateGems() {
  $("gem-balance").textContent = gems;
}

function addGems(amount) {
  gems += amount;
  updateGems();
  showNotification(`+${amount} 💎`);
}

function spendGems(amount) {
  if (gems >= amount) {
    gems -= amount;
    updateGems();
    return true;
  } else {
    showNotification("Nemaš dovoljno dijamanata!");
    return false;
  }
}

// ================== NOTIFICATIONS ==================
function showNotification(msg) {
  const area = $("notification-area");
  const note = document.createElement("div");
  note.classList.add("notification");
  note.textContent = msg;
  area.appendChild(note);
  setTimeout(() => note.remove(), 3000);
}

// ================== NAVIGATION BUTTONS ==================
window.addEventListener("DOMContentLoaded", () => {
  updateGems();

  // Main menu → shop
  $("shop-btn").addEventListener("click", () => switchScreen("shop-screen"));
  $("achievements-btn").addEventListener("click", () => switchScreen("achievements-screen"));
  $("settings-btn").addEventListener("click", () => $("settings-modal").classList.add("active"));
  $("daily-reward-btn").addEventListener("click", () => $("daily-reward-center-modal").classList.add("active"));

  // Back buttons
  document.querySelectorAll(".back-to-main-menu").forEach(btn => {
    btn.addEventListener("click", () => switchScreen("main-menu-screen"));
  });

  // Close modals
  document.querySelectorAll(".close-modal").forEach(btn => {
    btn.addEventListener("click", e => e.target.closest(".modal-overlay").classList.remove("active"));
  });
});
