




export function showToast(mensagem, tipo = "success", duracao = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const iconMap = {
    success: "fa-circle-check",
    error:   "fa-circle-xmark",
    info:    "fa-circle-info",
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <i class="fa-solid ${iconMap[tipo] ?? "fa-circle-info"}"></i>
    <span>${mensagem}</span>
  `;

  container.appendChild(toast);

  
  void toast.offsetHeight;
  toast.classList.add("toast-visible");

  
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    toast.classList.add("toast-hiding");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, duracao);
}




export function showConfirm(
  mensagem,
  tituloBotaoConfirm = "Excluir"
) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirm-modal-overlay");
    if (!overlay) {
      
      resolve(window.confirm(mensagem));
      return;
    }

    
    const msgEl = overlay.querySelector("#confirm-modal-message");
    const btnConfirm = overlay.querySelector("#confirm-modal-btn-ok");
    if (msgEl) msgEl.textContent = mensagem;
    if (btnConfirm) btnConfirm.textContent = tituloBotaoConfirm;

    
    overlay.classList.add("open");

    function cleanup() {
      overlay.classList.remove("open");
      btnConfirm?.removeEventListener("click", onConfirm);
      cancelBtn?.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onBackdropClick);
    }

    function onConfirm() {
      cleanup();
      resolve(true);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    function onBackdropClick(e) {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    }

    const cancelBtn = overlay.querySelector("#confirm-modal-btn-cancel");
    btnConfirm?.addEventListener("click", onConfirm, { once: true });
    cancelBtn?.addEventListener("click", onCancel, { once: true });
    overlay.addEventListener("click", onBackdropClick, { once: true });
  });
}
