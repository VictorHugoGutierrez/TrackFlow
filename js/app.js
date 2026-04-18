import { auth } from './config/firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Acesso autorizado:", user.email);
    } else {
        console.warn("Acesso negado. Redirecionando...");
        window.location.href = "index.html";
    }
});

export async function fazerLogout() {
    await signOut(auth);
    window.location.href = "index.html";
}