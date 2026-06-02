import { auth, db } from './config/firebase.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

export async function cadastrarUsuario(email, senha, nome) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            nome: nome,
            email: email,
            plano: 'freemium',
            criado_em: new Date().toISOString()
        });

        await setDoc(doc(db, "user_settings", user.uid), {
            taxa_horaria_padrao: 0,
            moeda: 'BRL',
            tema_interface: 'dark',
            pomodoro: { trabalho: 25, pausa: 5 }
        });


        window.location.href = "app.html";
    } catch (error) {
        console.error("Erro no cadastro:", error.message);
        alert("Erro ao cadastrar: " + error.message);
    }
}

export async function loginUsuario(email, senha) {
    try {
        await signInWithEmailAndPassword(auth, email, senha);
        window.location.href = "app.html";
    } catch (error) {
        console.error("Erro no login:", error.message);
        alert("E-mail ou senha incorretos.");
    }
}