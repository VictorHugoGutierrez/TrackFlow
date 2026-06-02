





export function initRelatorios() {
  
  if (!document.getElementById("page-relatorios")) return;

  _initFiltros();
  _initBotoesExport();
}



function _initFiltros() {
  const selectPeriodo = document.getElementById("rel-filtro-periodo");
  const customDatas = document.getElementById("rel-filtro-custom-datas");
  const btnAplicar = document.getElementById("rel-filtro-aplicar");
  const btnReset = document.getElementById("rel-filtro-reset");

  
  selectPeriodo?.addEventListener("change", () => {
    if (customDatas) {
      customDatas.style.display =
        selectPeriodo.value === "custom" ? "contents" : "none";
    }
  });

  
  btnAplicar?.addEventListener("click", () => {

  });

  
  btnReset?.addEventListener("click", () => {
    if (selectPeriodo) selectPeriodo.value = "todos";
    if (customDatas) customDatas.style.display = "none";

    const selectCat = document.getElementById("rel-filtro-categoria");
    const selectStatus = document.getElementById("rel-filtro-status");
    const inputInicio = document.getElementById("rel-filtro-inicio");
    const inputFim = document.getElementById("rel-filtro-fim");

    if (selectCat) selectCat.value = "todos";
    if (selectStatus) selectStatus.value = "todos";
    if (inputInicio) inputInicio.value = "";
    if (inputFim) inputFim.value = "";
  });
}

function _coletarFiltros() {
  return {
    periodo: document.getElementById("rel-filtro-periodo")?.value,
    categoria: document.getElementById("rel-filtro-categoria")?.value,
    status: document.getElementById("rel-filtro-status")?.value,
    inicio: document.getElementById("rel-filtro-inicio")?.value,
    fim: document.getElementById("rel-filtro-fim")?.value,
  };
}



function _initBotoesExport() {
  document.getElementById("rel-imprimir")?.addEventListener("click", () => {
    window.print();
  });

  document.getElementById("rel-exportar-csv")?.addEventListener("click", () => {

  });
}
