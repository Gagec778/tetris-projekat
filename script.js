// ================== GLOBAL STATE ==================
let gems = 100000; // TEST vrednost
let ownedThemes = ["dark"];
let ownedBlocks = ["classic"];
let activeTheme = "dark";
let activeBlock = "classic";

let achievements = [
  { id: 1, title: "Prvih 1000 💎", desc: "Skupi 1000 dijamanata", reward: 100, unlocked: false },
  { id: 2, title: "Kupovina u Shopu", desc: "Kupi nešto u shopu", reward: 200, unlocked: false },
  { id: 3, title: "Prva Tema", desc: "Primeni novu temu", reward: 300, unlocked: false }
];

// ================== HELPERS ==================
function $(id) {
  return document.getElementById(id);
}

function switchScreen(newScreen) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(newScreen).classList.add("active");
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

// ================== SHOP ==================
const shopThemes = [
  { id: "dark", name: "Dark", price: 1500 },
  { id: "light", name: "Light", price: 1500 },
  { id: "neon", name: "Neon", price: 5000 }
];

const shopBlocks = [
  { id: "classic", name: "Classic", price: 1500 },
  { id: "glass", name: "Glass", price: 4000 },
  { id: "gold", name: "Gold", price: 8000 }
];

function renderShop() {
  const themesContainer = $("shop-themes-container");
  const blocksContainer = $("shop-blocks-container");

  themesContainer.innerHTML = "";
  blocksContainer.innerHTML = "";

  shopThemes.forEach(item => {
    const div = document.createElement("div");
    div.classList.add("shop-item");
    div.innerHTML = `
      <img src="assets/themes/${item.id}.png" alt="${item.name}">
      <h3>${item.name}</h3>
      <div class="price">${item.price} 💎</div>
      <button class="primary-btn buy-btn" data-type="theme" data-id="${item.id}" data-price="${item.price}">Kupi</button>
    `;
    themesContainer.appendChild(div);
  });

  shopBlocks.forEach(item => {
    const div = document.createElement("div");
    div.classList.add("shop-item");
    div.innerHTML = `
      <img src="assets/blocks/${item.id}.png" alt="${item.name}">
      <h3>${item.name}</h3>
      <div class="price">${item.price} 💎</div>
      <button class="primary-btn buy-btn" data-type="block" data-id="${item.id}" data-price="${item.price}">Kupi</button>
    `;
    blocksContainer.appendChild(div);
  });

  // event na dugmiće
  document.querySelectorAll(".buy-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      const type = e.target.dataset.type;
      const id = e.target.dataset.id;
      const price = parseInt(e.target.dataset.price);

      if (spendGems(price)) {
        if (type === "theme" && !ownedThemes.includes(id)) {
          ownedThemes.push(id);
          activeTheme = id;
          showNotification(`Tema "${id}" kupljena i primenjena!`);
        }
        if (type === "block" && !ownedBlocks.includes(id)) {
          ownedBlocks.push(id);
          activeBlock = id;
          showNotification(`Blok "${id}" kupljen i primenjen!`);
        }
        checkAchievementProgress("Kupovina u Shopu");
      }
    });
  });
}

// ================== ACHIEVEMENTS ==================
function renderAchievements() {
  const container = $("achievements-container");
  container.innerHTML = "";

  achievements.forEach(a => {
    const div = document.createElement("div");
    div.classList.add("achievement");
    if (!a.unlocked) div.classList.add("locked");

    div.innerHTML = `
      <div>
        <strong>${a.title}</strong>
        <p>${a.desc}</p>
      </div>
      <div>${a.unlocked ? "✔️" : "🔒"}</div>
    `;
    container.appendChild(div);
  });
}

function checkAchievementProgress(trigger) {
  achievements.forEach(a => {
    if (!a.unlocked) {
      if (a.title === "Prvih 1000 💎" && gems >= 1000) unlockAchievement(a);
      if (a.title === "Kupovina u Shopu" && trigger === "Kupovina u Shopu") unlockAchievement(a);
      if (a.title === "Prva Tema" && trigger === "Nova Tema") unlockAchievement(a);
    }
  });
}

function unlockAchievement(a) {
  a.unlocked = true;
  addGems(a.reward);
  showNotification(`🏆 Dostignuće otključano: ${a.title}`);
  renderAchievements();
}

// ================== INIT ==================
window.addEventListener("DOMContentLoaded", () => {
  updateGems();
  renderShop();
  renderAchievements();

  // Navigacija
  $("shop-btn").addEventListener("click", () => switchScreen("shop-screen"));
  $("achievements-btn").addEventListener("click", () => switchScreen("achievements-screen"));
  $("settings-btn").addEventListener("click", () => $("settings-modal").classList.add("active"));
  $("daily-reward-btn").addEventListener("click", () => $("daily-reward-center-modal").classList.add("active"));

  // Tabs u shopu
  document.querySelectorAll(".shop-tab").forEach(tab => {
    tab.addEventListener("click", e => {
      document.querySelectorAll(".shop-tab").forEach(t => t.classList.remove("active"));
      e.target.classList.add("active");

      document.querySelectorAll(".shop-grid").forEach(g => g.classList.remove("active"));
      const target = e.target.dataset.tab;
      $(`shop-${target}-container`).classList.add("active");
    });
  });

  // Povratak u glavni meni
  document.querySelectorAll(".back-to-main-menu").forEach(btn => {
    btn.addEventListener("click", () => switchScreen("main-menu-screen"));
  });

  // Zatvaranje modala
  document.querySelectorAll(".close-modal").forEach(btn => {
    btn.addEventListener("click", e => e.target.closest(".modal-overlay").classList.remove("active"));
  });
});
