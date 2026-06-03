import { auth, db } from "./config/firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { clientService } from "./modules/services/clientService.js";
import { projectService } from "./modules/services/projectService.js";
import { taskService } from "./modules/services/taskService.js";
import { timeEntryService } from "./modules/services/timeEntryService.js";
import { invoiceService } from "./modules/services/invoiceService.js";
import { invoiceEmailService } from "./modules/services/invoiceEmailService.js";
import { settingsService } from "./modules/services/settingsService.js";
import { initTimer, carregarDropdownsTimer } from "./modules/timer.js";
import { initPomodoro, updatePomodoroSettings } from "./modules/pomodoro.js";
import { initRelatorios, refreshRelatorios } from "./modules/reports.js";
import { showToast, showConfirm } from "./modules/ui.js";
import {
  VALID_CURRENCIES,
  VALID_THEMES,
  VALIDATION_LIMITS,
  getFirstValidationError,
  validateAllowedValue,
  validateEmail,
  validateIntegerInRange,
  validateOptionalNonNegativeNumber,
  validateOptionalText,
  validateRequiredText,
} from "./modules/validators.js";

let _clientesCache = [];
let _projetosCache = [];
let _unsubTarefas = null;
let _unsubTimeEntries = null;
let _unsubInvoices = null;
let _settingsCache = { taxa_horaria_padrao: 0 };
let _faturaEmailPendente = null;

function showValidationError(...validations) {
  const error = getFirstValidationError(...validations);
  if (!error) return false;
  showToast(error, "error");
  return true;
}

function getInitialsFromName(value) {
  const fallback = "US";
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return fallback;

  const nameSource = normalizedValue.includes("@")
    ? normalizedValue.split("@")[0].replace(/[._-]+/g, " ")
    : normalizedValue;
  const words = nameSource.split(/\s+/).filter(Boolean);

  if (words.length === 0) return fallback;
  if (words.length === 1) {
    return words[0].slice(0, 2).toLocaleUpperCase("pt-BR");
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase("pt-BR");
}

function updateSidebarUserProfile(displayName) {
  const normalizedName = String(displayName ?? "").trim() || "Usuario";
  const userDisplay = document.getElementById("userEmail");
  const userAvatar = document.getElementById("userAvatar");

  if (userDisplay) userDisplay.textContent = normalizedName;
  if (userAvatar) {
    userAvatar.textContent = getInitialsFromName(normalizedName);
    userAvatar.title = normalizedName;
    userAvatar.setAttribute("aria-label", `Usuario ${normalizedName}`);
  }
}

async function loadSidebarUserProfile(user) {
  const fallbackName = user.displayName || user.email || "Usuario";
  updateSidebarUserProfile(fallbackName);

  try {
    const userSnapshot = await getDoc(doc(db, "users", user.uid));
    const profileName = userSnapshot.exists()
      ? userSnapshot.data().nome
      : null;

    updateSidebarUserProfile(profileName || fallbackName);
  } catch (error) {
    console.warn("Nao foi possivel carregar o perfil do usuario:", error);
  }
}


onAuthStateChanged(auth, (user) => {
  if (user) {
    loadSidebarUserProfile(user);
    
    
    renderizarListas().then(() => {
      initTimer();
      iniciarListenerTimeEntries();
      carregarConfiguracoes();
      iniciarListenerInvoices();
    });
    
    window.switchPage("page-dashboard");
  } else {
    if (_unsubTarefas) {
      _unsubTarefas();
      _unsubTarefas = null;
    }
    if (_unsubTimeEntries) {
      _unsubTimeEntries();
      _unsubTimeEntries = null;
    }
    if (_unsubInvoices) {
      _unsubInvoices();
      _unsubInvoices = null;
    }
    window.location.href = "../index.html";
  }
});


window.switchPage = (pageId, tabId = null) => {
  document.querySelectorAll(".page-content").forEach((page) => {
    page.style.display = "none";
  });
  const target = document.getElementById(pageId);
  if (target) target.style.display = "block";

  
  if (pageId === "page-gestao" && tabId) {
    const tabBtn = document.querySelector(`.tab-link[onclick*='${tabId}']`);
    window.switchTab(tabId, tabBtn);
  }

  if (pageId === "page-relatorios") {
    refreshRelatorios();
  }

  
  document.querySelectorAll(".sidebar-link").forEach((btn) => {
    const clickAttr = btn.getAttribute("onclick") || "";
    if (pageId === "page-gestao" && tabId) {
      btn.classList.toggle("active", clickAttr.includes(pageId) && clickAttr.includes(tabId));
    } else {
      btn.classList.toggle("active", clickAttr.includes(pageId) && !clickAttr.includes("tab-"));
    }
  });
};


window.switchTab = (tabId, btnEl) => {
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.style.display = "none";
  });
  const target = document.getElementById(tabId);
  if (target) target.style.display = "block";

  document
    .querySelectorAll(".tab-link")
    .forEach((btn) => btn.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");

  if (tabId === "tab-projetos") carregarSelectClientes();
  if (tabId === "tab-tarefas") carregarSelectProjetos();
  renderizarListas();
};



function nomeCliente(clientId) {
  if (!clientId) return "Projeto Interno";
  const cli = _clientesCache.find((c) => c.id === clientId);
  return cli ? cli.nome : "Cliente removido";
}

const STATUS_LABEL = {
  em_andamento: "Em andamento",
  concluido: "Concluído",
  pausado: "Pausado",
};

const STATUS_CLASS = {
  em_andamento: "badge-em-andamento",
  concluido: "badge-concluido",
  pausado: "badge-pausado",
};



async function renderizarListas() {
  if (!auth.currentUser) return;
  try {
    
    const clientes = await clientService.getAll();
    _clientesCache = clientes;

    const listaCli = document.getElementById("lista-clientes");
    if (listaCli) {
      if (clientes.length === 0) {
        listaCli.innerHTML = `<li class="list-empty">Nenhum cliente cadastrado ainda.</li>`;
      } else {
        listaCli.innerHTML = clientes
          .map(
            (c) => `
            <li class="${c.ativo ? "" : "item-inativo"}">
              <div class="item-info">
                <strong>${c.nome}</strong>
                <span class="item-sub">${c.contato ?? "—"}</span>
              </div>
              <div class="item-actions">
                ${
                  c.ativo
                    ? `<span class="badge badge-concluido">Ativo</span>`
                    : `<span class="badge badge-pausado">Inativo</span>`
                }
                <button class="btn-icon btn-edit" title="Editar"
                  onclick="abrirEdicaoCliente('${c.id}')">
                  <i class="fa-solid fa-pen"></i>
                </button>
                ${
                  c.ativo
                    ? `<button class="btn-icon btn-delete" title="Desativar"
                        onclick="desativarCliente('${c.id}')">
                        <i class="fa-solid fa-ban"></i>
                      </button>`
                    : `<button class="btn-icon btn-activate" title="Reativar"
                        onclick="reativarCliente('${c.id}')">
                        <i class="fa-solid fa-circle-check"></i>
                      </button>`
                }
              </div>
            </li>`,
          )
          .join("");
      }
    }

    
    const projetos = await projectService.getAll();
    const listaProj = document.getElementById("lista-projetos");
    if (listaProj) {
      if (projetos.length === 0) {
        listaProj.innerHTML = `<li class="list-empty">Nenhum projeto cadastrado ainda.</li>`;
      } else {
        listaProj.innerHTML = projetos
          .map(
            (p) => `
            <li>
              <div class="item-info">
                <strong>${p.nome}</strong>
                <span class="item-sub">
                  <i class="fa-solid fa-user-tie fa-xs"></i> ${nomeCliente(p.client_id)}
                  &nbsp;·&nbsp;
                  <i class="fa-regular fa-clock fa-xs"></i> ${p.orcamento_horas ?? "—"} h
                </span>
              </div>
              <div class="item-actions">
                <span class="badge ${STATUS_CLASS[p.status] ?? ""}">
                  ${STATUS_LABEL[p.status] ?? p.status}
                </span>
                <button class="btn-icon btn-edit" title="Editar"
                  onclick="abrirEdicaoProjeto('${p.id}')">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-icon btn-delete" title="Excluir"
                  onclick="deletarProjeto('${p.id}')">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </li>`,
          )
          .join("");
      }
    }
  } catch (error) {
    console.error("Erro ao renderizar:", error);
  }
  carregarDropdownsTimer();
  carregarSelectClientesBilling();
}

async function carregarSelectClientes(selectId = "proj-cliente") {
  if (!auth.currentUser) return;
  const clientes = await clientService.getAllActive();
  const select = document.getElementById(selectId);
  if (select) {
    const options = clientes.map(
      (c) => `<option value="${c.id}">${c.nome}</option>`,
    );
    select.innerHTML =
      '<option value="">Projeto Interno</option>' + options.join("");
  }
}

async function carregarSelectProjetos(selectId = "tar-projeto") {
  if (!auth.currentUser) return;
  const projetos = await projectService.getAll();
  _projetosCache = projetos;
  const select = document.getElementById(selectId);
  if (select) {
    const options = projetos.map(
      (p) => `<option value="${p.id}">${p.nome}</option>`,
    );
    select.innerHTML =
      '<option value="">Selecione um Projeto</option>' + options.join("");
  }
}

function nomeProjeto(projectId) {
  if (!projectId) return "Sem Projeto";
  const proj = _projetosCache.find((p) => p.id === projectId);
  return proj ? proj.nome : "Projeto removido";
}

const TASK_STATUS_LABEL = {
  todo: "A fazer",
  doing: "Em progresso",
  done: "Concluída",
};

const TASK_STATUS_CLASS = {
  todo: "badge-pausado",
  doing: "badge-em-andamento",
  done: "badge-concluido",
};

async function iniciarListenerTarefas() {
  if (_unsubTarefas) _unsubTarefas();
  if (_projetosCache.length === 0) {
    const projetos = await projectService.getAll();
    _projetosCache = projetos;
  }
  await carregarSelectProjetos("tar-projeto");
  _unsubTarefas = taskService.listenAll((tarefas) => {
    const lista = document.getElementById("lista-tarefas");
    if (!lista) return;
    if (tarefas.length === 0) {
      lista.innerHTML = `<li class="list-empty">Nenhuma tarefa cadastrada ainda.</li>`;
      return;
    }
    lista.innerHTML = tarefas
      .map(
        (t) => `
        <li>
          <div class="item-info">
            <strong>${t.titulo}</strong>
            <span class="item-sub">
              <i class="fa-solid fa-diagram-project fa-xs"></i> ${nomeProjeto(t.project_id)}
            </span>
          </div>
          <div class="item-actions">
            <select class="task-status-select" onchange="alterarStatusTarefa('${t.id}', this.value)">
              <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>A fazer</option>
              <option value="doing" ${t.status === 'doing' ? 'selected' : ''}>Em progresso</option>
              <option value="done" ${t.status === 'done' ? 'selected' : ''}>Concluída</option>
            </select>
            <button class="btn-icon btn-edit" title="Editar"
              onclick="abrirEdicaoTarefa('${t.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon btn-delete" title="Excluir"
              onclick="deletarTarefa('${t.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </li>`,
      )
      .join("");
  });
}



window.desativarCliente = async (id) => {
  const confirmado = await showConfirm("Deseja desativar este cliente?", "Desativar");
  if (confirmado) {
    try {
      await clientService.softDelete(id);
      await renderizarListas();
      showToast("Cliente desativado com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao desativar cliente: " + error.message, "error");
    }
  }
};

window.reativarCliente = async (id) => {
  try {
    await clientService.reactivate(id);
    await renderizarListas();
    showToast("Cliente reativado com sucesso!", "success");
  } catch (error) {
    showToast("Erro ao reativar cliente: " + error.message, "error");
  }
};

window.abrirEdicaoCliente = async (id) => {
  const cli = await clientService.getById(id);
  if (!cli) return;

  document.getElementById("edit-cli-id").value = id;
  document.getElementById("edit-cli-nome").value = cli.nome;
  document.getElementById("edit-cli-contato").value = cli.contato ?? "";
  abrirModal("modal-editar-cliente");
};

window.deletarProjeto = async (id) => {
  const confirmado = await showConfirm("Excluir projeto permanentemente?");
  if (confirmado) {
    try {
      await projectService.hardDelete(id);
      await renderizarListas();
      showToast("Projeto excluído com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao excluir projeto: " + error.message, "error");
    }
  }
};

window.abrirEdicaoProjeto = async (id) => {
  const proj = await projectService.getById(id);
  if (!proj) return;
  await carregarSelectClientes("edit-proj-cliente");
  document.getElementById("edit-proj-id").value = id;
  document.getElementById("edit-proj-nome").value = proj.nome;
  document.getElementById("edit-proj-cliente").value = proj.client_id ?? "";
  document.getElementById("edit-proj-horas").value = proj.orcamento_horas ?? "";
  document.getElementById("edit-proj-taxa").value = proj.taxa_horaria ?? "";
  document.getElementById("edit-proj-status").value =
    proj.status ?? "em_andamento";
  abrirModal("modal-editar-projeto");
};

window.deletarTarefa = async (id) => {
  const confirmado = await showConfirm("Excluir tarefa permanentemente?");
  if (confirmado) {
    try {
      await taskService.hardDelete(id);
      showToast("Tarefa excluída com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao excluir tarefa: " + error.message, "error");
    }
  }
};

window.abrirEdicaoTarefa = async (id) => {
  const tar = await taskService.getById(id);
  if (!tar) return;
  await carregarSelectProjetos("edit-tar-projeto");
  document.getElementById("edit-tar-id").value = id;
  document.getElementById("edit-tar-titulo").value = tar.titulo;
  document.getElementById("edit-tar-projeto").value = tar.project_id ?? "";
  abrirModal("modal-editar-tarefa");
};



function iniciarListenerTimeEntries() {
  if (_unsubTimeEntries) _unsubTimeEntries();
  _unsubTimeEntries = timeEntryService.listenAll((entries) => {
    _timeEntriesCache = entries;
    renderDashboard(entries);
  });
}

function renderDashboard(entries) {
  const listEl = document.getElementById("dashboard-activities-list");
  if (!listEl) return;

  
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const entriesHoje = entries.filter((e) => {
    const d = new Date(e.start_time);
    return d >= hoje && d < amanha;
  });

  
  const dayOfWeek = hoje.getDay(); 
  const startOfWeek = new Date(hoje);
  const diff = hoje.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0,0,0,0);
  
  const entriesSemana = entries.filter((e) => {
    const d = new Date(e.start_time);
    return d >= startOfWeek;
  });

  
  const totalHojeSegundos = entriesHoje.reduce((sum, e) => sum + (e.duration || 0), 0);
  const totalSemanaSegundos = entriesSemana.reduce((sum, e) => sum + (e.duration || 0), 0);
  
  const totalHojeHoras = totalHojeSegundos / 3600;
  const totalSemanaHoras = totalSemanaSegundos / 3600;

  
  const elHoje = document.getElementById("metric-total-hoje");
  const elSemana = document.getElementById("metric-total-semana");
  const elReceita = document.getElementById("metric-receita-estimada");
  const elProjetos = document.getElementById("metric-projetos-ativos");

  if (elHoje) elHoje.textContent = `${totalHojeHoras.toFixed(1)}h`;
  if (elSemana) elSemana.textContent = `${totalSemanaHoras.toFixed(1)}h`;
  if (elReceita) {
    let receitaHoje = 0;
    entriesHoje.forEach((e) => {
      let taxa = _settingsCache.taxa_horaria_padrao || 0;
      if (e.project_id) {
        const proj = _projetosCache.find((p) => p.id === e.project_id);
        if (proj && proj.taxa_horaria !== undefined && proj.taxa_horaria !== null && proj.taxa_horaria > 0) {
          taxa = proj.taxa_horaria;
        }
      }
      receitaHoje += ((e.duration || 0) / 3600) * taxa;
    });
    elReceita.textContent = receitaHoje.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }
  const elTaxBase = document.getElementById("metric-taxa-base");
  if (elTaxBase) {
    const baseTaxFormatted = (_settingsCache.taxa_horaria_padrao || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
    elTaxBase.textContent = `Taxa Base: ${baseTaxFormatted}/h`;
  }
  if (elProjetos) {
    
    const ativosCount = _projetosCache.filter((p) => p.status === "em_andamento" || !p.status).length;
    elProjetos.textContent = ativosCount || 0;
  }

  
  if (entriesHoje.length === 0) {
    listEl.innerHTML = `<div class="list-empty">Nenhum registro rastreado hoje ainda.</div>`;
    return;
  }

  listEl.innerHTML = entriesHoje
    .map((e) => {
      const duracaoStr = formatDuration(e.duration || 0);
      const desc = e.description ? e.description : "Sem Descrição";
      const descClass = e.description ? "" : "empty";

      
      const startD = new Date(e.start_time);
      const endD = new Date(e.end_time);
      const timeStr = `${formatHour(startD)} - ${formatHour(endD)}`;

      
      let tagsHTML = "";
      if (e.project_id) {
        const projName = nomeProjeto(e.project_id);
        tagsHTML += `<span class="tag-project">${projName}</span>`;
      }
      if (e.client_id) {
        const cliName = nomeCliente(e.client_id);
        tagsHTML += `<span class="tag-client">${cliName}</span>`;
      }

      
      if (!e.project_id && !e.client_id) {
        tagsHTML += `<button class="btn-link-action" onclick="abrirEdicaoTimeEntry('${e.id}')">Vincular Cliente/Projeto</button>`;
      }

      return `
        <div class="activity-item">
          <div class="activity-left">
            <i class="fa-solid fa-circle-play activity-play-indicator"></i>
            <span class="activity-duration">${duracaoStr}</span>
            <div class="activity-details">
              <span class="activity-description ${descClass}">${desc}</span>
              <div class="activity-tags">
                ${tagsHTML}
              </div>
            </div>
          </div>
          <div class="activity-right">
            <span class="activity-time">${timeStr}</span>
            <button class="btn-edit-activity" onclick="abrirEdicaoTimeEntry('${e.id}')" title="Editar Registro" style="background:transparent; border:none; color:var(--text-sub); cursor:pointer; font-size:1rem; padding:0.5rem; transition:color 0.2s;">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-delete-activity" onclick="deletarRegistroTempo('${e.id}')" title="Excluir Registro">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function formatDuration(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatHour(dateObj) {
  const hrs = dateObj.getHours().toString().padStart(2, "0");
  const mins = dateObj.getMinutes().toString().padStart(2, "0");
  return `${hrs}:${mins}`;
}

window.deletarRegistroTempo = async (id) => {
  const confirmado = await showConfirm("Excluir este registro de tempo permanentemente?");
  if (confirmado) {
    try {
      await timeEntryService.delete(id);
      showToast("Registro de tempo excluído com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao excluir registro de tempo: " + error.message, "error");
    }
  }
};

window.abrirEdicaoTimeEntry = async (id) => {
  const entry = _timeEntriesCache.find(e => e.id === id);
  if (!entry) return;

  
  await carregarSelectClientes("edit-te-cliente");
  await carregarSelectProjetos("edit-te-projeto");

  document.getElementById("edit-te-id").value = id;
  document.getElementById("edit-te-desc").value = entry.description || "";
  document.getElementById("edit-te-cliente").value = entry.client_id || "";
  document.getElementById("edit-te-projeto").value = entry.project_id || "";

  abrirModal("modal-editar-time-entry");
};



let _timeEntriesCache = [];
let _generatedReport = null;

async function carregarSelectClientesBilling() {
  if (!auth.currentUser) return;
  try {
    const clientes = await clientService.getAllActive();
    const select = document.getElementById("billing-client");
    if (select) {
      const options = clientes.map(
        (c) => `<option value="${c.id}">${c.nome}</option>`
      );
      select.innerHTML = '<option value="todos">Todos os Clientes</option>' + options.join("");
    }
  } catch (error) {
    console.error("Erro ao carregar clientes faturamento:", error);
  }
}

async function carregarConfiguracoes() {
  try {
    const settings = await settingsService.get();
    if (settings) {
      _settingsCache = settings;
      const inputTaxa = document.getElementById("config-taxa-padrao");
      if (inputTaxa) inputTaxa.value = settings.taxa_horaria_padrao || 0;
      
      const inputMoeda = document.getElementById("config-moeda");
      if (inputMoeda && settings.moeda) inputMoeda.value = settings.moeda;
      
      const inputTema = document.getElementById("config-tema");
      if (inputTema && settings.tema) {
        inputTema.value = settings.tema;
        document.body.dataset.theme = settings.tema;
        localStorage.setItem("tf-tema", settings.tema);
        if (window.atualizarIconeTema) window.atualizarIconeTema();
      }

      const inputFoco = document.getElementById("config-pomodoro-foco");
      if (inputFoco && settings.pomodoro_foco) inputFoco.value = settings.pomodoro_foco;

      const inputPausa = document.getElementById("config-pomodoro-pausa");
      if (inputPausa && settings.pomodoro_pausa) inputPausa.value = settings.pomodoro_pausa;

      initPomodoro(settings);

      
      if (_timeEntriesCache && _timeEntriesCache.length > 0) {
        renderDashboard(_timeEntriesCache);
      }
    }
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
  }
}

function iniciarListenerInvoices() {
  if (_unsubInvoices) _unsubInvoices();
  _unsubInvoices = invoiceService.listenAll((invoices) => {
    renderInvoices(invoices);
  });
}

function renderInvoices(invoices) {
  const tbody = document.getElementById("billing-invoices-tbody");
  if (!tbody) return;

  if (invoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-sub); font-size: 0.875rem;">
          Nenhuma fatura cadastrada.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = invoices
    .map((inv) => {
      let clientName = "Todos os Clientes";
      if (inv.client_id !== "todos") {
        clientName = nomeCliente(inv.client_id);
      }

      const totalValueFormatted = inv.valor_total.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });

      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 0.875rem 1rem; color: var(--text-main); font-weight: 500;">${clientName}</td>
          <td style="padding: 0.875rem 1rem; color: var(--text-main); font-family: monospace;">${inv.mes_referencia}</td>
          <td style="padding: 0.875rem 1rem; color: var(--text-main); font-family: monospace;">${inv.total_horas.toFixed(1)}h</td>
          <td style="padding: 0.875rem 1rem; color: var(--text-main); font-weight: 600;">${totalValueFormatted}</td>
          <td style="padding: 0.875rem 1rem;">
            <select class="task-status-select" onchange="alterarStatusFatura('${inv.id}', this.value)" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; border-radius: 4px; background-color: var(--input-bg); border: 1px solid var(--border-color); color: var(--text-main);">
              <option value="pendente" ${inv.status === "pendente" ? "selected" : ""}>Pendente</option>
              <option value="pago" ${inv.status === "pago" ? "selected" : ""}>Pago</option>
              <option value="cancelado" ${inv.status === "cancelado" ? "selected" : ""}>Cancelado</option>
            </select>
          </td>
          <td style="padding: 0.875rem 1rem; text-align: right;">
            <button class="btn-delete-activity" onclick="deletarFatura('${inv.id}')" title="Excluir Fatura">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

window.alterarStatusFatura = async (id, status) => {
  try {
    await invoiceService.updateStatus(id, status);
    showToast("Status da fatura atualizado!", "success");
  } catch (error) {
    showToast("Erro ao alterar status da fatura: " + error.message, "error");
  }
};

window.deletarFatura = async (id) => {
  const confirmado = await showConfirm("Excluir esta fatura permanentemente?");
  if (confirmado) {
    try {
      await invoiceService.delete(id);
      showToast("Fatura excluída com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao deletar fatura: " + error.message, "error");
    }
  }
};

window.alterarStatusTarefa = async (id, status) => {
  try {
    await taskService.updateStatus(id, status);
    showToast("Status da tarefa atualizado!", "success");
  } catch (error) {
    showToast("Erro ao alterar status da tarefa: " + error.message, "error");
  }
};

function gerarRelatorioFaturamento() {
  const monthInput = document.getElementById("billing-month");
  const clientSelect = document.getElementById("billing-client");

  if (!monthInput || !monthInput.value) {
    showToast("Selecione o mês de referência.", "error");
    return;
  }

  const selectedMonth = monthInput.value; 
  const selectedClient = clientSelect ? clientSelect.value : "todos";

  
  const filteredEntries = _timeEntriesCache.filter((e) => {
    if (!e.start_time.startsWith(selectedMonth)) return false;
    if (selectedClient !== "todos" && e.client_id !== selectedClient) return false;
    return true;
  });

  let totalDurationSeconds = 0;
  let totalValue = 0;

  filteredEntries.forEach((entry) => {
    totalDurationSeconds += entry.duration || 0;

    
    let taxa = 0;
    if (entry.project_id) {
      const proj = _projetosCache.find((p) => p.id === entry.project_id);
      if (proj && proj.taxa_horaria !== undefined && proj.taxa_horaria !== null && proj.taxa_horaria > 0) {
        taxa = proj.taxa_horaria;
      } else {
        taxa = _settingsCache.taxa_horaria_padrao || 0;
      }
    } else {
      taxa = _settingsCache.taxa_horaria_padrao || 0;
    }

    const value = ((entry.duration || 0) / 3600) * taxa;
    totalValue += value;
  });

  const totalHours = totalDurationSeconds / 3600;

  
  const elHours = document.getElementById("billing-total-hours");
  const elValue = document.getElementById("billing-total-value");
  const btnSave = document.getElementById("btn-billing-save");

  if (elHours) elHours.textContent = `${totalHours.toFixed(1)}h`;
  if (elValue) {
    elValue.textContent = totalValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  if (btnSave) {
    btnSave.disabled = false;
  }

  _generatedReport = {
    client_id: selectedClient,
    mes_referencia: selectedMonth,
    total_horas: totalHours,
    valor_total: totalValue
  };
}

async function salvarFaturaGerada() {
  if (!_generatedReport) return;
  const btnSave = document.getElementById("btn-billing-save");
  if (btnSave) btnSave.disabled = true;

  try {
    const cliente =
      _generatedReport.client_id && _generatedReport.client_id !== "todos"
        ? _clientesCache.find((c) => c.id === _generatedReport.client_id)
        : null;
    const fatura = await invoiceService.create({
      client_id: _generatedReport.client_id,
      client_nome: cliente?.nome ?? "Todos os Clientes",
      email_to: cliente?.contato ?? null,
      mes_referencia: _generatedReport.mes_referencia,
      total_horas: _generatedReport.total_horas,
      valor_total: _generatedReport.valor_total,
      status: "pendente",
      moeda: _settingsCache.moeda || "BRL",
      numero: `INV-${_generatedReport.mes_referencia}`,
      descricao: "Fatura gerada a partir dos registros de tempo.",
      emitida_em: `${_generatedReport.mes_referencia}-01`,
    });

    showToast("Fatura salva com sucesso!", "success");
    abrirModalEnvioFatura(fatura);

    
    _generatedReport = null;
    const elHours = document.getElementById("billing-total-hours");
    const elValue = document.getElementById("billing-total-value");
    if (elHours) elHours.textContent = "0.0h";
    if (elValue) elValue.textContent = "R$ 0,00";

    const monthInput = document.getElementById("billing-month");
    if (monthInput) monthInput.value = "";
  } catch (error) {
    showToast("Erro ao salvar fatura: " + error.message, "error");
    if (btnSave) btnSave.disabled = false;
  }
}

function abrirModalEnvioFatura(fatura) {
  _faturaEmailPendente = fatura;

  const idInput = document.getElementById("email-invoice-id");
  const target = document.getElementById("email-invoice-target");
  const feedback = document.getElementById("email-invoice-feedback");
  const btnSim = document.getElementById("btn-email-sim");

  if (idInput) idInput.value = fatura.id;
  if (target) {
    target.textContent = fatura.email_to
      ? `E-mail associado: ${fatura.email_to}`
      : "Esta fatura não possui e-mail associado.";
  }
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "modal-feedback";
  }
  if (btnSim) btnSim.disabled = !fatura.email_to;

  abrirModal("modal-enviar-email-fatura");
}



function abrirModal(id) {
  document.getElementById(id)?.classList.add("open");
}

window.fecharModal = (id) => {
  document.getElementById(id)?.classList.remove("open");
};


document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
  }
});



document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) iniciarListenerTarefas();
  });

  const logoutAction = async () => {
    await signOut(auth);
    window.location.href = "./login.html";
  };
  document.getElementById("btnSair")?.addEventListener("click", logoutAction);
  document.getElementById("btn-config-rapida")?.addEventListener("click", logoutAction);
  document.getElementById("btnSairConfig")?.addEventListener("click", logoutAction);

  
  const btnTema = document.getElementById("btn-tema");
  const body    = document.body;

  window.atualizarIconeTema = function() {
    const isDark = body.dataset.theme === "dark";
    if (!btnTema) return;
    btnTema.innerHTML = isDark
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
    btnTema.title = isDark ? "Ativar modo claro" : "Ativar modo escuro";
  };

  btnTema?.addEventListener("click", () => {
    const isDark = body.dataset.theme === "dark";
    body.dataset.theme = isDark ? "light" : "dark";
    localStorage.setItem("tf-tema", body.dataset.theme);
    atualizarIconeTema();
  });

  
  const temaSalvo = localStorage.getItem("tf-tema");
  if (temaSalvo) body.dataset.theme = temaSalvo;
  atualizarIconeTema();

  
  initRelatorios();

  
  document.getElementById("btn-novo-cliente")?.addEventListener("click", () => {
    abrirModal("modal-novo-cliente");
  });

  document.getElementById("btn-novo-projeto")?.addEventListener("click", async () => {
    await carregarSelectClientes("new-proj-cliente");
    abrirModal("modal-novo-projeto");
  });

  document.getElementById("btn-nova-tarefa")?.addEventListener("click", async () => {
    await carregarSelectProjetos("new-tar-projeto");
    abrirModal("modal-nova-tarefa");
  });

  
  document
    .getElementById("form-novo-cliente")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nomeValidation = validateRequiredText(
        document.getElementById("new-cli-nome").value,
        {
          fieldName: "Nome do cliente",
          min: VALIDATION_LIMITS.clientNameMin,
          max: VALIDATION_LIMITS.clientNameMax,
        },
      );
      const contatoValidation = validateEmail(
        document.getElementById("new-cli-contato").value,
        { required: false, label: "E-mail de contato" },
      );

      if (showValidationError(nomeValidation, contatoValidation)) {
        return;
      }

      try {
        await clientService.create(
          nomeValidation.value,
          contatoValidation.value || null,
        );
        e.target.reset();
        window.fecharModal("modal-novo-cliente");
        await renderizarListas();
        showToast("Cliente cadastrado com sucesso!", "success");
      } catch (error) {
        showToast("Erro ao cadastrar cliente: " + error.message, "error");
      }
    });

  
  document
    .getElementById("form-novo-projeto")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cliId = document.getElementById("new-proj-cliente").value || null;
      const nomeValidation = validateRequiredText(
        document.getElementById("new-proj-nome").value,
        {
          fieldName: "Nome do projeto",
          min: VALIDATION_LIMITS.projectNameMin,
          max: VALIDATION_LIMITS.projectNameMax,
        },
      );
      const horasValidation = validateOptionalNonNegativeNumber(
        document.getElementById("new-proj-horas").value,
        "Orçamento de horas",
      );
      const taxaValidation = validateOptionalNonNegativeNumber(
        document.getElementById("new-proj-taxa").value,
        "Taxa horária",
      );

      if (showValidationError(nomeValidation, horasValidation, taxaValidation)) {
        return;
      }

      try {
        await projectService.create(
          nomeValidation.value,
          cliId,
          horasValidation.value,
          taxaValidation.value,
        );
        e.target.reset();
        window.fecharModal("modal-novo-projeto");
        await renderizarListas();
        showToast("Projeto criado com sucesso!", "success");
      } catch (error) {
        showToast("Erro ao criar projeto: " + error.message, "error");
      }
    });

  
  document
    .getElementById("form-editar-cliente")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-cli-id").value;
      const nomeValidation = validateRequiredText(
        document.getElementById("edit-cli-nome").value,
        {
          fieldName: "Nome do cliente",
          min: VALIDATION_LIMITS.clientNameMin,
          max: VALIDATION_LIMITS.clientNameMax,
        },
      );
      const contatoValidation = validateEmail(
        document.getElementById("edit-cli-contato").value,
        { required: false, label: "E-mail de contato" },
      );

      if (showValidationError(nomeValidation, contatoValidation)) {
        return;
      }

      try {
        await clientService.update(id, {
          nome: nomeValidation.value,
          contato: contatoValidation.value || null,
        });
        window.fecharModal("modal-editar-cliente");
        await renderizarListas();
        showToast("Cliente atualizado com sucesso!", "success");
      } catch (error) {
        showToast("Erro ao atualizar cliente: " + error.message, "error");
      }
    });

  
  document
    .getElementById("form-editar-projeto")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-proj-id").value;
      const client_id =
        document.getElementById("edit-proj-cliente").value || null;
      const status = document.getElementById("edit-proj-status").value;
      const nomeValidation = validateRequiredText(
        document.getElementById("edit-proj-nome").value,
        {
          fieldName: "Nome do projeto",
          min: VALIDATION_LIMITS.projectNameMin,
          max: VALIDATION_LIMITS.projectNameMax,
        },
      );
      const horasValidation = validateOptionalNonNegativeNumber(
        document.getElementById("edit-proj-horas").value,
        "Orçamento de horas",
      );
      const taxaValidation = validateOptionalNonNegativeNumber(
        document.getElementById("edit-proj-taxa").value,
        "Taxa horária",
      );

      if (showValidationError(nomeValidation, horasValidation, taxaValidation)) {
        return;
      }

      try {
        await projectService.update(id, {
          nome: nomeValidation.value,
          client_id,
          orcamento_horas: horasValidation.value,
          taxa_horaria: taxaValidation.value,
          status,
        });
        window.fecharModal("modal-editar-projeto");
        await renderizarListas();
        showToast("Projeto atualizado com sucesso!", "success");
      } catch (error) {
        showToast("Erro ao atualizar projeto: " + error.message, "error");
      }
    });

  
  document
    .getElementById("form-nova-tarefa")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const projectId = document.getElementById("new-tar-projeto").value || null;
      const tituloValidation = validateRequiredText(
        document.getElementById("new-tar-titulo").value,
        {
          fieldName: "Título da tarefa",
          min: VALIDATION_LIMITS.taskTitleMin,
          max: VALIDATION_LIMITS.taskTitleMax,
        },
      );

      if (showValidationError(tituloValidation)) {
        return;
      }

      try {
        await taskService.create(projectId, tituloValidation.value);
        e.target.reset();
        window.fecharModal("modal-nova-tarefa");
        showToast("Tarefa criada com sucesso!", "success");
      } catch (error) {
        showToast("Erro ao criar tarefa: " + error.message, "error");
      }
    });

  
  document
    .getElementById("form-editar-tarefa")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-tar-id").value;
      const project_id =
        document.getElementById("edit-tar-projeto").value || null;
      const tituloValidation = validateRequiredText(
        document.getElementById("edit-tar-titulo").value,
        {
          fieldName: "Título da tarefa",
          min: VALIDATION_LIMITS.taskTitleMin,
          max: VALIDATION_LIMITS.taskTitleMax,
        },
      );

      if (showValidationError(tituloValidation)) {
        return;
      }

      try {
        await taskService.update(id, {
          titulo: tituloValidation.value,
          project_id,
        });
        window.fecharModal("modal-editar-tarefa");
        showToast("Tarefa atualizada com sucesso!", "success");
      } catch (error) {
        showToast("Erro ao atualizar tarefa: " + error.message, "error");
      }
    });

  
  document
    .getElementById("form-editar-time-entry")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-te-id").value;
      const client_id = document.getElementById("edit-te-cliente").value || null;
      const project_id = document.getElementById("edit-te-projeto").value || null;
      const descriptionValidation = validateOptionalText(
        document.getElementById("edit-te-desc").value,
        {
          fieldName: "A descrição",
          max: VALIDATION_LIMITS.timeEntryDescriptionMax,
        },
      );

      if (showValidationError(descriptionValidation)) {
        return;
      }

      try {
        await timeEntryService.update(id, {
          description: descriptionValidation.value,
          client_id,
          project_id,
        });
        window.fecharModal("modal-editar-time-entry");
        showToast("Apontamento atualizado com sucesso!", "success");
      } catch (error) {
        showToast("Erro ao atualizar apontamento: " + error.message, "error");
      }
    });

  
  document
    .getElementById("form-configuracoes")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const taxaValidation = validateOptionalNonNegativeNumber(
        document.getElementById("config-taxa-padrao").value,
        "Taxa horária padrão",
      );
      const moedaValidation = validateAllowedValue(
        document.getElementById("config-moeda").value,
        { fieldName: "Valor da moeda", allowedValues: VALID_CURRENCIES },
      );
      const temaValidation = validateAllowedValue(
        document.getElementById("config-tema").value,
        { fieldName: "Tema", allowedValues: VALID_THEMES },
      );
      const focoValidation = validateIntegerInRange(
        document.getElementById("config-pomodoro-foco").value,
        {
          fieldName: "Tempo de foco Pomodoro",
          min: VALIDATION_LIMITS.pomodoroFocusMin,
          max: VALIDATION_LIMITS.pomodoroFocusMax,
          defaultValue: 25,
        },
      );
      const pausaValidation = validateIntegerInRange(
        document.getElementById("config-pomodoro-pausa").value,
        {
          fieldName: "Tempo de pausa Pomodoro",
          min: VALIDATION_LIMITS.pomodoroPauseMin,
          max: VALIDATION_LIMITS.pomodoroPauseMax,
          defaultValue: 5,
        },
      );

      if (
        showValidationError(
          taxaValidation,
          moedaValidation,
          temaValidation,
          focoValidation,
          pausaValidation,
        )
      ) {
        return;
      }

      const taxa = taxaValidation.value ?? 0;
      const moeda = moedaValidation.value;
      const tema = temaValidation.value;
      const pomodoro_foco = focoValidation.value;
      const pomodoro_pausa = pausaValidation.value;

      try {
        await settingsService.update({ 
          taxa_horaria_padrao: taxa,
          moeda,
          tema,
          pomodoro_foco,
          pomodoro_pausa
        });

        
        document.body.dataset.theme = tema;
        localStorage.setItem("tf-tema", tema);
        if (window.atualizarIconeTema) window.atualizarIconeTema();
        updatePomodoroSettings(pomodoro_foco, pomodoro_pausa);

        showToast("Configurações salvas com sucesso!", "success");
        _settingsCache = { ..._settingsCache, taxa_horaria_padrao: taxa, moeda, tema, pomodoro_foco, pomodoro_pausa };
        
        if (_timeEntriesCache && _timeEntriesCache.length > 0) {
          renderDashboard(_timeEntriesCache);
        }
      } catch (error) {
        showToast("Erro ao salvar configurações: " + error.message, "error");
      }
    });

  
  document
    .getElementById("btn-billing-generate")
    ?.addEventListener("click", gerarRelatorioFaturamento);

  document
    .getElementById("btn-billing-save")
    ?.addEventListener("click", salvarFaturaGerada);

  document.getElementById("btn-email-nao")?.addEventListener("click", () => {
    window.fecharModal("modal-enviar-email-fatura");
  });

  document.getElementById("btn-email-sim")?.addEventListener("click", async () => {
    if (!_faturaEmailPendente) return;

    const emailValidation = validateEmail(_faturaEmailPendente.email_to, {
      label: "E-mail de destino",
    });

    if (showValidationError(emailValidation)) {
      return;
    }

    const feedback = document.getElementById("email-invoice-feedback");
    const btnSim = document.getElementById("btn-email-sim");
    const btnNao = document.getElementById("btn-email-nao");

    if (feedback) {
      feedback.textContent = "Registrando solicitação de envio...";
      feedback.className = "modal-feedback";
    }
    if (btnSim) btnSim.disabled = true;
    if (btnNao) btnNao.disabled = true;

    try {
      await invoiceEmailService.requestSend(_faturaEmailPendente);
      if (feedback) {
        feedback.textContent = "Solicitação de envio registrada com sucesso.";
        feedback.className = "modal-feedback success";
      }
      showToast("Solicitação de envio registrada.", "success");
      setTimeout(() => window.fecharModal("modal-enviar-email-fatura"), 900);
    } catch (error) {
      if (feedback) {
        feedback.textContent =
          error.message || "Não foi possível solicitar o envio.";
        feedback.className = "modal-feedback error";
      }
      showToast("Erro ao solicitar envio: " + error.message, "error");
    } finally {
      if (btnSim) btnSim.disabled = false;
      if (btnNao) btnNao.disabled = false;
    }
  });
});
