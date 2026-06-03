import { cadastrarUsuario, loginUsuario, loginComGoogle, processGoogleRedirectResult } from "./auth.js";
import { showToast } from "./modules/ui.js";
import { validateLoginInput, validateSignupInput } from "./modules/validators.js";

document.addEventListener("DOMContentLoaded", () => {
  processGoogleRedirectResult();
  const linkAlternar = document.getElementById("link-alternar-modo");
  if (linkAlternar) {
    linkAlternar.addEventListener("click", (e) => {
      e.preventDefault();
      alternarModo();
    });
  }

  const form = document.getElementById("form-autenticacao");
  const btnGoogle = document.getElementById("btn-google");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btnEntrar = document.getElementById("btnEntrar");
      if (!btnEntrar) return;

      const nome = document.getElementById("input-nome").value?.trim() ?? "";
      const email = document.getElementById("input-email").value?.trim() ?? "";
      const senha = document.getElementById("input-senha").value ?? "";
      const labelOriginal = btnEntrar.textContent;
      const isCadastro = labelOriginal.trim() !== "Entrar";

      const validation = isCadastro
        ? validateSignupInput({ email, password: senha, name: nome })
        : validateLoginInput({ email, password: senha });

      if (validation.error) {
        showToast(validation.error, "error");
        return;
      }

      btnEntrar.disabled = true;
      btnEntrar.textContent =
        labelOriginal.trim() === "Entrar" ? "Entrando..." : "Cadastrando...";

      try {
        if (!isCadastro) {
          await loginUsuario(
            validation.values.email,
            validation.values.password,
          );
        } else {
          await cadastrarUsuario(
            validation.values.email,
            validation.values.password,
            validation.values.name,
          );
        }
      } catch (_error) {
        btnEntrar.disabled = false;
        btnEntrar.textContent = labelOriginal;
      }
    });
  }

  btnGoogle?.addEventListener("click", async () => {
    const labelOriginal = btnGoogle.innerHTML;
    btnGoogle.disabled = true;
    btnGoogle.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';

    try {
      await loginComGoogle();
    } catch (_error) {
      btnGoogle.disabled = false;
      btnGoogle.innerHTML = labelOriginal;
    }
  });
});

function alternarModo() {
  const tituloForm = document.getElementById("titulo-form");
  const campoNome = document.getElementById("nome");
  const btnEntrar = document.getElementById("btnEntrar");
  const linkAlternar = document.getElementById("link-alternar-modo");
  const labelModo = document.getElementById("label-modo");
  const btnEsqueci = document.getElementById("btn-esqueci");

  const modoLogin = tituloForm.textContent.trim() === "Entrar";

  if (modoLogin) {
    tituloForm.textContent = "Criar Conta";
    campoNome.classList.remove("d-none");
    btnEntrar.textContent = "Cadastrar";
    labelModo.textContent = "Já tem conta?";
    linkAlternar.textContent = "Fazer Login";

    if (btnEsqueci) btnEsqueci.parentElement.style.display = "none";
  } else {
    tituloForm.textContent = "Entrar";
    campoNome.classList.add("d-none");
    btnEntrar.textContent = "Entrar";
    labelModo.textContent = "Não tem conta?";
    linkAlternar.textContent = "Criar Conta";

    if (btnEsqueci) btnEsqueci.parentElement.style.display = "block";
  }
}
