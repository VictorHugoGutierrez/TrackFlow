import { auth } from './config/firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Acesso autorizado:", user.email);
        
        const userDisplay = document.getElementById('userEmail');
        if (userDisplay) userDisplay.textContent = user.email;

    } else {
        console.warn("Acesso negado. Redirecionando...");
        window.location.href = "index.html";
    }
});

export async function fazerLogout() {
    try {
        await signOut(auth);
        console.log("Logout realizado");
        window.location.href = "index.html";
    } catch (error) {
        console.error("Erro ao sair:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', fazerLogout);
    }
});