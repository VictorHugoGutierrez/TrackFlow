"use strict";

const themeToggle = document.getElementById("theme-toggle");
const iconSun = document.getElementById("icon-sun");
const iconMoon = document.getElementById("icon-moon");
const body = document.body;

function applyTheme(theme) {
  body.setAttribute("data-theme", theme);
  localStorage.setItem("trackflow-theme", theme);
  if (theme === "light") {
    iconSun.classList.add("d-none");
    iconMoon.classList.remove("d-none");
    themeToggle.setAttribute("aria-label", "Alternar para tema escuro");
  } else {
    iconSun.classList.remove("d-none");
    iconMoon.classList.add("d-none");
    themeToggle.setAttribute("aria-label", "Alternar para tema claro");
  }
}


const savedTheme = localStorage.getItem("trackflow-theme");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initialTheme = savedTheme || (systemDark ? "dark" : "light");
applyTheme(initialTheme);

themeToggle.addEventListener("click", () => {
  const current = body.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

const header = document.getElementById("header");
let lastScroll = 0;

window.addEventListener(
  "scroll",
  () => {
    const scrollY = window.scrollY;
    header.classList.toggle("scrolled", scrollY > 10);
    lastScroll = scrollY;
  },
  { passive: true },
);

const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobile-menu");

hamburger.addEventListener("click", () => {
  const isOpen = hamburger.classList.toggle("active");
  mobileMenu.classList.toggle("open", isOpen);
  hamburger.setAttribute("aria-expanded", String(isOpen));
  mobileMenu.setAttribute("aria-hidden", String(!isOpen));
});


mobileMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    hamburger.classList.remove("active");
    mobileMenu.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("aria-hidden", "true");
  });
});


document.addEventListener("click", (e) => {
  if (!header.contains(e.target) && !mobileMenu.contains(e.target)) {
    hamburger.classList.remove("active");
    mobileMenu.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("aria-hidden", "true");
  }
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    const href = this.getAttribute("href");
    if (href === "#") return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const navHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--nav-height",
      ),
    );
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top, behavior: "smooth" });
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.12,
    rootMargin: "0px 0px -40px 0px",
  },
);

document.querySelectorAll(".reveal").forEach((el) => {
  revealObserver.observe(el);
});

const playBtn = document.getElementById("mockup-play-btn");
const playIcon = document.getElementById("play-icon");
const stopIcon = document.getElementById("stop-icon");
const timerStatus = document.getElementById("timer-status");
const timerH = document.getElementById("timer-h");
const timerM = document.getElementById("timer-m");
const timerS = document.getElementById("timer-s");

let timerInterval = null;
let timerRunning = false;
let seconds = 0;

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateDisplay() {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  timerH.textContent = pad(h);
  timerM.textContent = pad(m);
  timerS.textContent = pad(s);
}

playBtn.addEventListener("click", () => {
  timerRunning = !timerRunning;

  if (timerRunning) {
    playIcon.style.display = "none";
    stopIcon.style.display = "block";
    playBtn.classList.add("running");
    timerStatus.className = "timer-status active";
    timerStatus.innerHTML = "Status: <span>Rastreando tempo...</span>";
    timerInterval = setInterval(() => {
      seconds++;
      updateDisplay();
    }, 1000);
  } else {
    playIcon.style.display = "block";
    stopIcon.style.display = "none";
    playBtn.classList.remove("running");
    clearInterval(timerInterval);
    timerInterval = null;
    timerStatus.className = "timer-status";
    timerStatus.innerHTML = "Status: <span>Entrada salva ✓</span>";
    setTimeout(() => {
      timerStatus.innerHTML = "Status: <span>Aguardando início</span>";
      seconds = 0;
      updateDisplay();
    }, 2500);
  }
});
