import { cadastrarUsuario, loginUsuario } from "./auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const linkAlternar = document.getElementById('link-alternar-modo');
    if (linkAlternar) {
        linkAlternar.addEventListener('click', (e) => {
            e.preventDefault(); 
            alternarModo();
        });
    }

    const btnEntrar = document.getElementById("btnEntrar");
    if(btnEntrar){
        const nome = document.getElementById("input-nome").textContent ?? "";
        const email = document.getElementById("input-email").textContent ?? ""; 
        const senha = document.getElementById("input-senha").textContent ?? "";

        btnEntrar.addEventListener("click", () => {
            if(btnEntrar.textContent === "Entrar"){
                loginUsuario(email, senha)
            }else{
                cadastrarUsuario(email, senha, nome)
            }
        })
    }
});


function alternarModo() {
    const tituloForm = document.getElementById('titulo-form');
    const campoNome = document.getElementById('nome'); 
    const btnEntrar = document.getElementById('btnEntrar');
    const linkAlternar = document.getElementById('link-alternar-modo');
    const labelModo = document.getElementById('label-modo');
    const btnEsqueci = document.getElementById('btn-esqueci');

    const modoLogin = tituloForm.textContent.trim() === 'Entrar';
    
    if (modoLogin) {
        tituloForm.textContent = 'Criar Conta';
        campoNome.style.display = 'block'; 
        btnEntrar.textContent = 'Cadastrar';
        labelModo.textContent = 'Já tem conta?';
        linkAlternar.textContent = 'Fazer Login';
        
        if (btnEsqueci) btnEsqueci.parentElement.style.display = 'none';
        
    } else {
        tituloForm.textContent = 'Entrar';
        campoNome.style.display = 'none'; 
        btnEntrar.textContent = 'Entrar';
        labelModo.textContent = 'Não tem conta?';
        linkAlternar.textContent = 'Criar Conta';
        
        if (btnEsqueci) btnEsqueci.parentElement.style.display = 'block';
    }
}