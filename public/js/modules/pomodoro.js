import { showToast } from "./ui.js";

let _pomodoroInterval = null;
let _tempoRestante = 0;
let _modoAtual = "inativo";
let _configs = { foco: 25, pausa: 5 };

export function initPomodoro(settings) {
  if (settings && settings.pomodoro_foco) {
    _configs.foco = settings.pomodoro_foco;
  }
  if (settings && settings.pomodoro_pausa) {
    _configs.pausa = settings.pomodoro_pausa;
  }

  const btnToggle = document.getElementById("btn-pomodoro-toggle");
  if (btnToggle) {
    const newBtn = btnToggle.cloneNode(true);
    btnToggle.parentNode.replaceChild(newBtn, btnToggle);
    newBtn.addEventListener("click", togglePomodoro);
  }
}

export function updatePomodoroSettings(foco, pausa) {
  _configs.foco = foco || 25;
  _configs.pausa = pausa || 5;
}

function togglePomodoro() {
  if (_modoAtual !== "inativo") {
    pararPomodoro();
  } else {
    iniciarFoco();
  }
}

function iniciarFoco() {
  _modoAtual = "foco";
  _tempoRestante = _configs.foco * 60;
  showToast(`Modo Foco iniciado: ${_configs.foco} minutos.`, "success");
  atualizarUi();
  iniciarContagem();
}

function iniciarPausa() {
  _modoAtual = "pausa";
  _tempoRestante = _configs.pausa * 60;
  showToast(`Pausa iniciada: ${_configs.pausa} minutes. Relaxe!`, "success");
  atualizarUi();
  iniciarContagem();
}

function pararPomodoro() {
  clearInterval(_pomodoroInterval);
  _modoAtual = "inativo";
  _tempoRestante = 0;
  atualizarUi();
  showToast("Modo Pomodoro desativado.", "success");
}

function iniciarContagem() {
  if (_pomodoroInterval) clearInterval(_pomodoroInterval);

  _pomodoroInterval = setInterval(() => {
    _tempoRestante--;
    if (_tempoRestante <= 0) {
      clearInterval(_pomodoroInterval);
      if (_modoAtual === "foco") {
        showToast("Tempo de Foco concluído! Iniciando pausa...", "success");
        iniciarPausa();
      } else if (_modoAtual === "pausa") {
        showToast("Pausa concluída! Pronto para outro foco?", "success");
        pararPomodoro();
      }
    } else {
      atualizarUi();
    }
  }, 1000);
}

function atualizarUi() {
  const btnToggle = document.getElementById("btn-pomodoro-toggle");
  if (!btnToggle) return;

  if (_modoAtual === "inativo") {
    btnToggle.classList.remove("running");
    btnToggle.style.color = "var(--text-sub)";
    btnToggle.innerHTML = '<i class="fa-solid fa-stopwatch"></i>';
    btnToggle.title = "Ativar Pomodoro";
  } else {
    btnToggle.classList.add("running");
    btnToggle.style.color = _modoAtual === "foco" ? "var(--play-color)" : "var(--accent-color)";

    const mins = Math.floor(_tempoRestante / 60).toString().padStart(2, "0");
    const secs = (_tempoRestante % 60).toString().padStart(2, "0");
    btnToggle.innerHTML = `<i class="fa-solid fa-stopwatch"></i> ${mins}:${secs}`;
    btnToggle.title = `Pomodoro: ${_modoAtual} (${mins}:${secs})`;
  }
}
