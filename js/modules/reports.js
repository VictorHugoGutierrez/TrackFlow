// ── reports.js ────────────────────────────────────────────────
// Módulo de Relatórios — TrackFlow
// Exporta initRelatorios(), chamado pelo app.js no DOMContentLoaded.
// ──────────────────────────────────────────────────────────────

/**
 * Inicializa todos os comportamentos da página de Relatórios:
 * filtros, KPI cards, gráficos e tabela dinâmica.
 * Chamado uma única vez, após o login ser confirmado.
 */
export function initRelatorios() {
  // Só executa se a seção de relatórios existir no DOM
  if (!document.getElementById("page-relatorios")) return;

  _initFiltros();
  _initBotoesExport();
}

// ── Filtros ───────────────────────────────────────────────────

function _initFiltros() {
  const selectPeriodo = document.getElementById("rel-filtro-periodo");
  const customDatas   = document.getElementById("rel-filtro-custom-datas");
  const btnAplicar    = document.getElementById("rel-filtro-aplicar");
  const btnReset      = document.getElementById("rel-filtro-reset");

  // Mostrar/ocultar campos de data customizada
  selectPeriodo?.addEventListener("change", () => {
    if (customDatas) {
      customDatas.style.display =
        selectPeriodo.value === "custom" ? "contents" : "none";
    }
  });

  // Aplicar filtros (placeholder — conecte à sua fonte de dados)
  btnAplicar?.addEventListener("click", () => {
    console.log("Filtros aplicados:", _coletarFiltros());
  });

  // Limpar filtros
  btnReset?.addEventListener("click", () => {
    if (selectPeriodo) selectPeriodo.value = "todos";
    if (customDatas)   customDatas.style.display = "none";

    const selectCat    = document.getElementById("rel-filtro-categoria");
    const selectStatus = document.getElementById("rel-filtro-status");
    const inputInicio  = document.getElementById("rel-filtro-inicio");
    const inputFim     = document.getElementById("rel-filtro-fim");

    if (selectCat)    selectCat.value    = "todos";
    if (selectStatus) selectStatus.value = "todos";
    if (inputInicio)  inputInicio.value  = "";
    if (inputFim)     inputFim.value     = "";
  });
}

function _coletarFiltros() {
  return {
    periodo:   document.getElementById("rel-filtro-periodo")?.value,
    categoria: document.getElementById("rel-filtro-categoria")?.value,
    status:    document.getElementById("rel-filtro-status")?.value,
    inicio:    document.getElementById("rel-filtro-inicio")?.value,
    fim:       document.getElementById("rel-filtro-fim")?.value,
  };
}

// ── Botões de exportação ──────────────────────────────────────

function _initBotoesExport() {
  document.getElementById("rel-imprimir")?.addEventListener("click", () => {
    window.print();
  });

  document.getElementById("rel-exportar-csv")?.addEventListener("click", () => {
    console.log("Exportar CSV — a implementar");
  });
}
