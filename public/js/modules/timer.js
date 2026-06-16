import { clientService } from "./services/clientService.js";
import { projectService } from "./services/projectService.js";
import { taskService } from "./services/taskService.js";
import { timeEntryService } from "./services/timeEntryService.js";
import { showToast } from "./ui.js";

let timerInterval = null;
let timerRunning = false;
let startTime = null;
let secondsElapsed = 0;

// Caches locais para o timer
let _projetosTimerCache = [];

export function initTimer() {
  const btnToggle = document.getElementById("timer-btn-toggle");
  const selectCli = document.getElementById("timer-cliente");
  const selectProj = document.getElementById("timer-projeto");
  const selectTar = document.getElementById("timer-tarefa");

  if (btnToggle) {
    btnToggle.addEventListener("click", toggleTimer);
  }

  // ─── Cascata: Cliente → Projeto → Tarefa ───
  if (selectCli) {
    selectCli.addEventListener("change", async () => {
      const clientId = selectCli.value;
      await carregarProjetosTimerFiltrados(clientId);
      resetSelectTarefa(selectTar);
    });
  }

  if (selectProj) {
    selectProj.addEventListener("change", async () => {
      const projId = selectProj.value;

      // Auto-selecionar cliente do projeto (se existir)
      if (projId && selectCli) {
        const proj = _projetosTimerCache.find((p) => p.id === projId);
        if (proj && proj.client_id) {
          selectCli.value = proj.client_id;
        }
      }

      if (projId) {
        await carregarTarefasTimer(projId);
      } else {
        resetSelectTarefa(selectTar);
      }
    });
  }

  carregarDropdownsTimer();
}

/**
 * Carrega todos os dropdowns do timer (carga inicial).
 * Clientes ativos + todos os projetos em_andamento.
 */
export async function carregarDropdownsTimer() {
  try {
    const [clientes, projetos] = await Promise.all([
      clientService.getAllActive(),
      projectService.getAll("em_andamento"),
    ]);

    _projetosTimerCache = projetos;

    const selectCli = document.getElementById("timer-cliente");
    const selectProj = document.getElementById("timer-projeto");
    const selectTar = document.getElementById("timer-tarefa");

    if (selectCli) {
      const options = clientes.map(
        (c) => `<option value="${c.id}">${c.nome}</option>`
      );
      selectCli.innerHTML =
        '<option value="">Vincular Cliente</option>' + options.join("");
    }

    if (selectProj) {
      const options = projetos.map(
        (p) => `<option value="${p.id}">${p.nome}</option>`
      );
      selectProj.innerHTML =
        '<option value="">Vincular Projeto</option>' + options.join("");
    }

    resetSelectTarefa(selectTar);
  } catch (error) {
    console.error("Erro ao carregar dropdowns do timer:", error);
    if (error.code === "failed-precondition" || error.message?.includes("index")) {
      console.error(
        "⚠️ Possível falta de Índice Composto no Firestore. Verifique o console do Firebase."
      );
    }
  }
}

/**
 * Filtra projetos pelo cliente selecionado (ativo + em_andamento).
 * Se clientId vazio, mostra todos os projetos em_andamento.
 */
async function carregarProjetosTimerFiltrados(clientId) {
  const selectProj = document.getElementById("timer-projeto");
  if (!selectProj) return;

  try {
    let projetos;
    if (clientId) {
      const todosProjCliente = await projectService.getByClient(clientId);
      projetos = todosProjCliente.filter((p) => p.status === "em_andamento");
    } else {
      projetos = await projectService.getAll("em_andamento");
    }

    _projetosTimerCache = projetos;

    const options = projetos.map(
      (p) => `<option value="${p.id}">${p.nome}</option>`
    );
    selectProj.innerHTML =
      '<option value="">Vincular Projeto</option>' + options.join("");
  } catch (error) {
    console.error("Erro ao filtrar projetos do timer:", error);
    if (error.code === "failed-precondition" || error.message?.includes("index")) {
      console.error(
        "⚠️ Possível falta de Índice Composto no Firestore para projects (client_id + status)."
      );
    }
  }
}

/**
 * Carrega tarefas de um projeto específico no select do timer.
 * Filtra apenas tarefas com status 'todo' ou 'doing'.
 */
async function carregarTarefasTimer(projectId) {
  const selectTar = document.getElementById("timer-tarefa");
  if (!selectTar) return;

  try {
    // Usa listenAll e filtra localmente por project_id e status
    const todasTarefas = await new Promise((resolve, reject) => {
      const unsub = taskService.listenAll((tarefas) => {
        unsub(); // Desinscrever imediatamente após primeira emissão
        resolve(tarefas);
      });
      // Timeout de segurança
      setTimeout(() => reject(new Error("Timeout ao buscar tarefas")), 8000);
    });

    const tarefasFiltradas = todasTarefas.filter(
      (t) => t.project_id === projectId && t.status !== "done"
    );

    if (tarefasFiltradas.length === 0) {
      selectTar.innerHTML = '<option value="">Nenhuma tarefa disponível</option>';
      selectTar.disabled = true;
      return;
    }

    const options = tarefasFiltradas.map(
      (t) => `<option value="${t.id}">${t.titulo}</option>`
    );
    selectTar.innerHTML =
      '<option value="">Vincular Tarefa</option>' + options.join("");
    selectTar.disabled = false;
  } catch (error) {
    console.error("Erro ao carregar tarefas do timer:", error);
    if (error.code === "failed-precondition" || error.message?.includes("index")) {
      console.error(
        "⚠️ Possível falta de Índice Composto no Firestore para tasks (project_id + status)."
      );
    }
    resetSelectTarefa(selectTar);
  }
}

/**
 * Reseta o select de tarefas para o estado padrão (disabled, sem opções).
 */
function resetSelectTarefa(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = '<option value="">Vincular Tarefa</option>';
  selectEl.disabled = true;
  selectEl.value = "";
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
  const selectTar = document.getElementById("timer-tarefa");

  const descricaoVal = inputDesc ? inputDesc.value.trim() : "";
  const clientVal = selectCli ? selectCli.value : "";
  const projVal = selectProj ? selectProj.value : "";
  const taskVal = selectTar ? selectTar.value : "";

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
  resetSelectTarefa(selectTar);

  carregarProjetosTimerFiltrados("");

  // Salvar a entrada de tempo com task_id (Fricção Zero: null se não selecionado)
  try {
    await timeEntryService.create(
      descricaoVal || "Sem Descrição",
      projVal || null,
      clientVal || null,
      startTime.toISOString(),
      endTime.toISOString(),
      duration,
      taskVal || null
    );
  } catch (error) {
    console.error("Erro ao salvar entrada de tempo:", error);
    showToast("Erro ao salvar a entrada de tempo!", "error");
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
