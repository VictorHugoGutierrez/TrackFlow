import { clientService } from "./services/clientService.js";
import { projectService } from "./services/projectService.js";
import { timeEntryService } from "./services/timeEntryService.js";

let timerInterval = null;
let timerRunning = false;
let startTime = null;
let secondsElapsed = 0;


let _projetosCache = [];

export function initTimer() {
  const btnToggle = document.getElementById("timer-btn-toggle");
  const selectProj = document.getElementById("timer-projeto");

  if (btnToggle) {
    btnToggle.addEventListener("click", toggleTimer);
  }

  if (selectProj) {
    selectProj.addEventListener("change", (e) => {
      const projId = e.target.value;
      if (projId) {
        const proj = _projetosCache.find((p) => p.id === projId);
        if (proj && proj.client_id) {
          const selectCli = document.getElementById("timer-cliente");
          if (selectCli) {
            selectCli.value = proj.client_id;
          }
        }
      }
    });
  }

  
  carregarDropdownsTimer();
}

export async function carregarDropdownsTimer() {
  try {
    const [clientes, projetos] = await Promise.all([
      clientService.getAllActive(),
      projectService.getAll()
    ]);

    _projetosCache = projetos;

    const selectCli = document.getElementById("timer-cliente");
    const selectProj = document.getElementById("timer-projeto");

    if (selectCli) {
      const options = clientes.map(
        (c) => `<option value="${c.id}">${c.nome}</option>`
      );
      selectCli.innerHTML = '<option value="">Vincular Cliente</option>' + options.join("");
    }

    if (selectProj) {
      const options = projetos.map(
        (p) => `<option value="${p.id}">${p.nome}</option>`
      );
      selectProj.innerHTML = '<option value="">Vincular Projeto</option>' + options.join("");
    }
  } catch (error) {
    console.error("Erro ao carregar dropdowns do timer:", error);
  }
}

function toggleTimer() {
  if (timerRunning) {
    stopTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  timerRunning = true;
  startTime = new Date();
  secondsElapsed = 0;

  const btnToggle = document.getElementById("timer-btn-toggle");
  const cronometro = document.getElementById("timer-cronometro");
  const icon = document.getElementById("timer-icon");

  if (btnToggle) btnToggle.classList.add("running");
  if (cronometro) cronometro.classList.add("running");
  if (icon) {
    icon.className = "fa-solid fa-square";
  }

  timerInterval = setInterval(() => {
    secondsElapsed++;
    if (cronometro) {
      cronometro.textContent = formatTime(secondsElapsed);
    }
  }, 1000);
}

async function stopTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;

  const endTime = new Date();
  const duration = secondsElapsed;

  const inputDesc = document.getElementById("timer-descricao");
  const selectCli = document.getElementById("timer-cliente");
  const selectProj = document.getElementById("timer-projeto");

  const descricaoVal = inputDesc ? inputDesc.value.trim() : "";
  const clientVal = selectCli ? selectCli.value : "";
  const projVal = selectProj ? selectProj.value : "";

  
  const btnToggle = document.getElementById("timer-btn-toggle");
  const cronometro = document.getElementById("timer-cronometro");
  const icon = document.getElementById("timer-icon");

  if (btnToggle) btnToggle.classList.remove("running");
  if (cronometro) {
    cronometro.classList.remove("running");
    cronometro.textContent = "00:00:00";
  }
  if (icon) {
    icon.className = "fa-solid fa-play";
  }

  if (inputDesc) inputDesc.value = "";
  if (selectCli) selectCli.value = "";
  if (selectProj) selectProj.value = "";

  
  try {
    await timeEntryService.create(
      descricaoVal || "Sem Descrição",
      projVal || null,
      clientVal || null,
      startTime.toISOString(),
      endTime.toISOString(),
      duration
    );
  } catch (error) {
    console.error("Erro ao salvar entrada de tempo:", error);
    alert("Erro ao salvar a entrada de tempo!");
  }
}

function formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

function pad(val) {
  return val.toString().padStart(2, "0");
}
