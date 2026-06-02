import { auth } from "../config/firebase.js";
import { invoiceService } from "./services/invoiceService.js";

const PAGE_SIZE = 8;

const STATUS_LABEL = {
  rascunho: "Rascunho",
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

const STATUS_CLASS = {
  rascunho: "badge-rascunho",
  pendente: "badge-pendente",
  pago: "badge-pago",
  atrasado: "badge-atrasado",
  cancelado: "badge-cancelado",
};

const state = {
  initialized: false,
  invoices: [],
  filtered: [],
  page: 1,
  sortBy: "emitida_em",
  sortDir: "desc",
  search: "",
  filters: {},
};

export function initRelatorios() {
  if (!document.getElementById("page-relatorios")) return;

  if (!state.initialized) {
    _initFiltros();
    _initBusca();
    _initOrdenacao();
    _initBotoesExport();
    state.initialized = true;
  }

  refreshRelatorios();
}

export async function refreshRelatorios() {
  if (!document.getElementById("page-relatorios") || !auth.currentUser) return;

  state.filters = _coletarFiltros();
  state.page = 1;
  _renderLoading();

  try {
    state.invoices = await invoiceService.getAll({
      status: state.filters.status,
      inicio: state.filters.inicio,
      fim: state.filters.fim,
      limit: 300,
    });
    _aplicarFiltrosLocais();
    _renderAll();
  } catch (error) {
    console.error("Erro ao carregar relatórios:", error);
    _renderError();
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value) {
  if (!value) return "—";
  const normalized = String(value).includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function parseDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(value) {
  const date = parseDateInput(`${value}T00:00:00`);
  if (!date) return "Sem data";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  if (key === "Sem data") return key;
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date);
}

function invoiceAmount(invoice) {
  return Number(invoice.valor_total ?? 0);
}

function isReceivable(invoice) {
  return invoice.status !== "cancelado";
}

function _initFiltros() {
  const selectPeriodo = document.getElementById("rel-filtro-periodo");
  const customDatas = document.getElementById("rel-filtro-custom-datas");
  const btnAplicar = document.getElementById("rel-filtro-aplicar");
  const btnReset = document.getElementById("rel-filtro-reset");

  selectPeriodo?.addEventListener("change", () => {
    if (customDatas) {
      customDatas.classList.toggle("d-none", selectPeriodo.value !== "custom");
      customDatas.style.display =
        selectPeriodo.value === "custom" ? "contents" : "none";
    }
  });

  btnAplicar?.addEventListener("click", () => {
    refreshRelatorios();
  });

  btnReset?.addEventListener("click", () => {
    if (selectPeriodo) selectPeriodo.value = "todos";
    if (customDatas) {
      customDatas.classList.add("d-none");
      customDatas.style.display = "none";
    }

    const selectCat = document.getElementById("rel-filtro-categoria");
    const selectStatus = document.getElementById("rel-filtro-status");
    const inputInicio = document.getElementById("rel-filtro-inicio");
    const inputFim = document.getElementById("rel-filtro-fim");

    if (selectCat) selectCat.value = "todos";
    if (selectStatus) selectStatus.value = "todos";
    if (inputInicio) inputInicio.value = "";
    if (inputFim) inputFim.value = "";
    refreshRelatorios();
  });
}

function _initBusca() {
  const inputBusca = document.getElementById("rel-busca");
  inputBusca?.addEventListener("input", () => {
    state.search = inputBusca.value.trim().toLowerCase();
    state.page = 1;
    _aplicarFiltrosLocais();
    _renderAll();
  });
}

function _initOrdenacao() {
  document.querySelectorAll("#rel-table-head th[data-col]").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (state.sortBy === col) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortBy = col;
        state.sortDir = col === "valor_total" ? "desc" : "asc";
      }
      _aplicarFiltrosLocais();
      _renderTable();
    });
  });
}

function _initBotoesExport() {
  document.getElementById("rel-imprimir")?.addEventListener("click", () => {
    window.print();
  });

  document.getElementById("rel-exportar-csv")?.addEventListener("click", () => {
    _exportCsv();
  });
}

function _coletarFiltros() {
  const periodo = document.getElementById("rel-filtro-periodo")?.value;
  const tipo = document.getElementById("rel-filtro-categoria")?.value;
  const status = document.getElementById("rel-filtro-status")?.value;
  let inicio = document.getElementById("rel-filtro-inicio")?.value;
  let fim = document.getElementById("rel-filtro-fim")?.value;

  if (periodo && periodo !== "todos" && periodo !== "custom") {
    const today = new Date();
    const daysMap = { "7d": 7, "30d": 30, "90d": 90, "1a": 365 };
    inicio = toIsoDate(addDays(today, -daysMap[periodo]));
    fim = toIsoDate(today);
  }

  return {
    periodo,
    tipo,
    status,
    inicio: inicio || null,
    fim: fim || null,
  };
}

function _aplicarFiltrosLocais() {
  const tipo = state.filters.tipo;
  const search = state.search;

  state.filtered = state.invoices.filter((invoice) => {
    if (tipo === "com_cliente" && !invoice.client_id) return false;
    if (tipo === "interno" && invoice.client_id) return false;

    if (!search) return true;
    const haystack = [
      invoice.numero,
      invoice.client_nome,
      invoice.project_nome,
      invoice.descricao,
      invoice.email_to,
      invoice.status,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });

  state.filtered.sort((a, b) => {
    const left = _sortValue(a, state.sortBy);
    const right = _sortValue(b, state.sortBy);
    if (left < right) return state.sortDir === "asc" ? -1 : 1;
    if (left > right) return state.sortDir === "asc" ? 1 : -1;
    return 0;
  });
}

function _sortValue(invoice, key) {
  const values = {
    cliente: invoice.client_nome || "Projeto Interno",
    projeto: invoice.project_nome || "Sem projeto",
    valor_total: Number(invoice.valor_total ?? 0),
  };
  return values[key] ?? invoice[key] ?? "";
}

function _renderAll() {
  _renderKpis();
  _renderBarChart();
  _renderPieChart();
  _renderLineChart();
  _renderTable();
}

function _renderLoading() {
  const kpiGrid = document.getElementById("rel-kpi-grid");
  const tbody = document.getElementById("rel-tbody");
  const info = document.getElementById("rel-table-info");

  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="rel-kpi-card"><div class="rel-kpi-label">Carregando</div><div class="rel-kpi-value">...</div></div>
      <div class="rel-kpi-card"><div class="rel-kpi-label">Carregando</div><div class="rel-kpi-value">...</div></div>
      <div class="rel-kpi-card"><div class="rel-kpi-label">Carregando</div><div class="rel-kpi-value">...</div></div>
      <div class="rel-kpi-card"><div class="rel-kpi-label">Carregando</div><div class="rel-kpi-value">...</div></div>
    `;
  }
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" class="rel-table-empty">Carregando faturas...</td></tr>`;
  }
  if (info) info.textContent = "Carregando...";
}

function _renderError() {
  const tbody = document.getElementById("rel-tbody");
  const info = document.getElementById("rel-table-info");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" class="rel-table-empty">Não foi possível carregar os relatórios.</td></tr>`;
  }
  if (info) info.textContent = "Erro ao carregar dados.";
}

function _renderKpis() {
  const kpiGrid = document.getElementById("rel-kpi-grid");
  if (!kpiGrid) return;

  const totalEmitido = state.filtered
    .filter(isReceivable)
    .reduce((sum, invoice) => sum + invoiceAmount(invoice), 0);
  const totalRecebido = state.filtered
    .filter((invoice) => invoice.status === "pago")
    .reduce((sum, invoice) => sum + invoiceAmount(invoice), 0);
  const totalPendente = state.filtered
    .filter((invoice) => ["pendente", "rascunho", "atrasado"].includes(invoice.status))
    .reduce((sum, invoice) => sum + invoiceAmount(invoice), 0);
  const atrasadas = state.filtered.filter(
    (invoice) => invoice.status === "atrasado",
  ).length;

  const cards = [
    {
      icon: "fa-file-invoice-dollar",
      label: "Total emitido",
      value: formatCurrency(totalEmitido),
      delta: `${state.filtered.length} fatura(s)`,
      tone: "59, 130, 246",
      accent: "#3b82f6",
    },
    {
      icon: "fa-circle-check",
      label: "Recebido",
      value: formatCurrency(totalRecebido),
      delta: "Status pago",
      tone: "16, 185, 129",
      accent: "#10b981",
    },
    {
      icon: "fa-clock",
      label: "Pendente",
      value: formatCurrency(totalPendente),
      delta: "Aberto ou atrasado",
      tone: "234, 179, 8",
      accent: "#eab308",
    },
    {
      icon: "fa-triangle-exclamation",
      label: "Atrasadas",
      value: String(atrasadas),
      delta: "Exigem atenção",
      tone: "239, 68, 68",
      accent: "#ef4444",
    },
  ];

  kpiGrid.innerHTML = cards
    .map(
      (card) => `
      <article class="rel-kpi-card" style="--kpi-rgb:${card.tone}; --kpi-accent:${card.accent}">
        <div class="rel-kpi-icon"><i class="fa-solid ${card.icon}"></i></div>
        <div class="rel-kpi-label">${card.label}</div>
        <div class="rel-kpi-value">${card.value}</div>
        <div class="rel-kpi-delta neutral">${card.delta}</div>
      </article>`,
    )
    .join("");
}

function _monthlyTotals() {
  const months = new Map();

  state.filtered.forEach((invoice) => {
    const key = monthKey(invoice.emitida_em);
    const current = months.get(key) ?? { emitido: 0, recebido: 0 };
    if (isReceivable(invoice)) current.emitido += invoiceAmount(invoice);
    if (invoice.status === "pago") current.recebido += invoiceAmount(invoice);
    months.set(key, current);
  });

  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);
}

function _renderBarChart() {
  const container = document.getElementById("rel-grafico-barras");
  if (!container) return;

  const months = _monthlyTotals();
  if (months.length === 0) {
    container.innerHTML = `<div class="rel-table-empty">Sem dados para o período.</div>`;
    return;
  }

  const maxValue = Math.max(
    1,
    ...months.flatMap(([, totals]) => [totals.emitido, totals.recebido]),
  );

  container.innerHTML = `
    <div class="rel-bar-chart">
      ${months
        .map(([key, totals]) => {
          const emittedHeight = Math.max(4, (totals.emitido / maxValue) * 100);
          const receivedHeight = Math.max(4, (totals.recebido / maxValue) * 100);
          return `
            <div class="rel-bar-group">
              <div class="rel-bar-wrap">
                <div class="rel-bar" style="height:${emittedHeight}%; background:#10b981">
                  <span class="rel-bar-tooltip">${formatCurrency(totals.emitido)}</span>
                </div>
                <div class="rel-bar" style="height:${receivedHeight}%; background:#3b82f6">
                  <span class="rel-bar-tooltip">${formatCurrency(totals.recebido)}</span>
                </div>
              </div>
              <span class="rel-bar-label">${escapeHtml(monthLabel(key))}</span>
            </div>`;
        })
        .join("")}
    </div>`;
}

function _renderPieChart() {
  const container = document.getElementById("rel-grafico-pizza");
  if (!container) return;

  const totals = state.filtered.reduce((acc, invoice) => {
    acc[invoice.status] = (acc[invoice.status] ?? 0) + invoiceAmount(invoice);
    return acc;
  }, {});

  const entries = Object.entries(totals).filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  if (entries.length === 0) {
    container.innerHTML = `<div class="rel-table-empty">Sem dados para o período.</div>`;
    return;
  }

  const colors = {
    rascunho: "#94a3b8",
    pendente: "#eab308",
    pago: "#10b981",
    atrasado: "#ef4444",
    cancelado: "#64748b",
  };
  let offset = 25;

  container.innerHTML = `
    <div class="rel-pie-wrap">
      <div class="rel-pie-svg-wrap">
        <svg viewBox="0 0 42 42" width="160" height="160">
          ${entries
            .map(([status, value]) => {
              const percent = (value / total) * 100;
              const circle = `<circle r="15.915" cx="21" cy="21" fill="transparent"
                stroke="${colors[status] ?? "#3b82f6"}" stroke-width="6"
                stroke-dasharray="${percent} ${100 - percent}" stroke-dashoffset="${offset}" />`;
              offset -= percent;
              return circle;
            })
            .join("")}
        </svg>
        <div class="rel-pie-center">
          <div class="rel-pie-center-value">${entries.length}</div>
          <div class="rel-pie-center-label">status</div>
        </div>
      </div>
      <div class="rel-pie-legend">
        ${entries
          .map(([status, value]) => {
            const percent = Math.round((value / total) * 100);
            return `
              <div class="rel-pie-legend-item">
                <div class="rel-pie-legend-left">
                  <span class="rel-legend-dot" style="background:${colors[status] ?? "#3b82f6"}"></span>
                  <span class="rel-pie-legend-name">${STATUS_LABEL[status] ?? status}</span>
                </div>
                <span class="rel-pie-legend-pct">${percent}%</span>
              </div>`;
          })
          .join("")}
      </div>
    </div>`;
}

function _renderLineChart() {
  const container = document.getElementById("rel-grafico-linha");
  if (!container) return;

  const months = _monthlyTotals();
  if (months.length === 0) {
    container.innerHTML = `<div class="rel-table-empty">Sem dados para o período.</div>`;
    return;
  }

  const values = months.map(([, totals]) => totals.emitido);
  const maxValue = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x = months.length === 1 ? 50 : (index / (months.length - 1)) * 100;
    const y = 95 - (value / maxValue) * 80;
    return `${x},${y}`;
  });

  container.innerHTML = `
    <div class="rel-line-chart-wrap">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="#3b82f6"
          stroke-width="2.5"
          points="${points.join(" ")}"
        />
      </svg>
    </div>
    <div class="rel-line-x-labels">
      ${months
        .map(([key]) => `<span>${escapeHtml(monthLabel(key))}</span>`)
        .join("")}
    </div>`;
}

function _renderTable() {
  const tbody = document.getElementById("rel-tbody");
  const info = document.getElementById("rel-table-info");
  const pagination = document.getElementById("rel-paginacao");
  if (!tbody || !info || !pagination) return;

  _updateSortHeaders();

  if (state.filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="rel-table-empty"><i class="fa-regular fa-folder-open"></i>Nenhuma fatura encontrada.</td></tr>`;
    info.textContent = "0 faturas encontradas.";
    pagination.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(state.filtered.length / PAGE_SIZE);
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = state.filtered.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = pageItems
    .map(
      (invoice) => `
      <tr>
        <td>${formatDate(invoice.emitida_em)}</td>
        <td>${escapeHtml(invoice.numero || invoice.id.slice(0, 8))}</td>
        <td>${escapeHtml(invoice.client_nome || "Projeto Interno")}</td>
        <td>${escapeHtml(invoice.project_nome || "Sem projeto")}</td>
        <td>${formatCurrency(invoice.valor_total, invoice.moeda)}</td>
        <td>
          <span class="badge ${STATUS_CLASS[invoice.status] ?? "badge-pendente"}">
            ${STATUS_LABEL[invoice.status] ?? escapeHtml(invoice.status)}
          </span>
        </td>
      </tr>`,
    )
    .join("");

  const end = Math.min(start + PAGE_SIZE, state.filtered.length);
  info.textContent = `Mostrando ${start + 1}-${end} de ${state.filtered.length} fatura(s).`;
  pagination.innerHTML = _paginationHtml(totalPages);

  pagination.querySelectorAll("button[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = Number(button.dataset.page);
      _renderTable();
    });
  });
}

function _updateSortHeaders() {
  document.querySelectorAll("#rel-table-head th[data-col]").forEach((th) => {
    th.classList.toggle(
      "sort-asc",
      th.dataset.col === state.sortBy && state.sortDir === "asc",
    );
    th.classList.toggle(
      "sort-desc",
      th.dataset.col === state.sortBy && state.sortDir === "desc",
    );
  });
}

function _paginationHtml(totalPages) {
  if (totalPages <= 1) return "";

  const buttons = [];
  for (let page = 1; page <= totalPages; page += 1) {
    buttons.push(`
      <button
        type="button"
        class="rel-page-btn ${page === state.page ? "active" : ""}"
        data-page="${page}"
        aria-label="Página ${page}"
      >
        ${page}
      </button>`);
  }
  return buttons.join("");
}

function _exportCsv() {
  if (state.filtered.length === 0) {
    _showToast("Nenhuma fatura para exportar.");
    return;
  }

  const rows = [
    ["emissao", "numero", "cliente", "projeto", "valor", "status", "email"],
    ...state.filtered.map((invoice) => [
      invoice.emitida_em ?? "",
      invoice.numero ?? "",
      invoice.client_nome ?? "Projeto Interno",
      invoice.project_nome ?? "Sem projeto",
      String(invoice.valor_total ?? 0).replace(".", ","),
      STATUS_LABEL[invoice.status] ?? invoice.status ?? "",
      invoice.email_to ?? "",
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(";"),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trackflow-faturas-${toIsoDate(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function _showToast(message) {
  const toast = document.createElement("div");
  toast.className = "rel-toast";
  toast.innerHTML = `<i class="fa-solid fa-circle-info"></i>${escapeHtml(message)}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}
