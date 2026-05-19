import { auth } from "./config/firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { clientService } from "./modules/services/clientService.js";
import { projectService } from "./modules/services/projectService.js";
import { taskService } from "./modules/services/taskService.js";

let _clientesCache = [];
let _projetosCache = [];
let _unsubTarefas = null;

// --- PROTEÇÃO E INICIALIZAÇÃO ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userDisplay = document.getElementById("userEmail");
    if (userDisplay) userDisplay.textContent = user.email;
    renderizarListas();
    window.switchPage("page-dashboard");
  } else {
    if (_unsubTarefas) { _unsubTarefas(); _unsubTarefas = null; }
    window.location.href = "index.html";
  }
});

// --- CONTROLE DE PÁGINAS (navbar do header) ---
window.switchPage = (pageId) => {
  document.querySelectorAll(".page-content").forEach((page) => {
    page.style.display = "none";
  });
  const target = document.getElementById(pageId);
  if (target) target.style.display = "block";

  document.querySelectorAll(".nav-page-btn").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("onclick")?.includes(pageId),
    );
  });
};

// --- CONTROLE DE ABAS (sub-nav da Gestão) ---
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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

// ─── RENDERIZAÇÃO ─────────────────────────────────────────────────────────────

async function renderizarListas() {
  if (!auth.currentUser) return;
  try {
    // --- CLIENTES (todos: ativos + inativos) ---
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

    // --- PROJETOS ---
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
            <span class="badge ${TASK_STATUS_CLASS[t.status] ?? "badge-pausado"}">
              ${TASK_STATUS_LABEL[t.status] ?? t.status}
            </span>
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

// ─── AÇÕES DE CLIENTE ─────────────────────────────────────────────────────────

window.desativarCliente = async (id) => {
  if (confirm("Deseja desativar este cliente?")) {
    await clientService.softDelete(id);
    renderizarListas();
  }
};

window.reativarCliente = async (id) => {
  await clientService.reactivate(id);
  renderizarListas();
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
  if (confirm("Excluir projeto permanentemente?")) {
    await projectService.hardDelete(id);
    renderizarListas();
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
  document.getElementById("edit-proj-status").value = proj.status ?? "em_andamento";
  abrirModal("modal-editar-projeto");
};

window.deletarTarefa = async (id) => {
  if (confirm("Excluir tarefa permanentemente?")) {
    await taskService.hardDelete(id);
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

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────

function abrirModal(id) {
  document.getElementById(id)?.classList.add("open");
}

window.fecharModal = (id) => {
  document.getElementById(id)?.classList.remove("open");
};

// Fecha modal clicando no overlay
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
  }
});

// ─── EVENTOS ──────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) iniciarListenerTarefas();
  });

  document.getElementById("btnSair")?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });

  // Form: criar cliente
  document
    .getElementById("form-cliente")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = document.getElementById("cli-nome").value.trim();
      const contato =
        document.getElementById("cli-contato").value.trim() || null;
      await clientService.create(nome, contato);
      e.target.reset();
      renderizarListas();
    });

  // Form: criar projeto
  document
    .getElementById("form-projeto")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = document.getElementById("proj-nome").value.trim();
      const cliId = document.getElementById("proj-cliente").value || null;
      const horas = document.getElementById("proj-horas").value || null;
      await projectService.create(nome, cliId, horas);
      e.target.reset();
      renderizarListas();
      const btnProjetos = document.querySelector(
        ".tab-link[onclick*='tab-projetos']",
      );
      window.switchTab("tab-projetos", btnProjetos);
    });

  // Form: editar cliente
  document
    .getElementById("form-editar-cliente")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-cli-id").value;
      const nome = document.getElementById("edit-cli-nome").value.trim();
      const contato =
        document.getElementById("edit-cli-contato").value.trim() || null;
      await clientService.update(id, { nome, contato });
      window.fecharModal("modal-editar-cliente");
      renderizarListas();
    });

  document
    .getElementById("form-editar-projeto")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-proj-id").value;
      const nome = document.getElementById("edit-proj-nome").value.trim();
      const client_id =
        document.getElementById("edit-proj-cliente").value || null;
      const orcamento_horas =
        document.getElementById("edit-proj-horas").value || null;
      const status = document.getElementById("edit-proj-status").value;
      await projectService.update(id, { nome, client_id, orcamento_horas, status });
      window.fecharModal("modal-editar-projeto");
      renderizarListas();
    });

  document
    .getElementById("form-tarefa")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const projectId = document.getElementById("tar-projeto").value || null;
      const titulo = document.getElementById("tar-titulo").value.trim();
      await taskService.create(projectId, titulo);
      e.target.reset();
    });

  document
    .getElementById("form-editar-tarefa")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-tar-id").value;
      const titulo = document.getElementById("edit-tar-titulo").value.trim();
      const project_id =
        document.getElementById("edit-tar-projeto").value || null;
      await taskService.update(id, { titulo, project_id });
      window.fecharModal("modal-editar-tarefa");
    });
});
