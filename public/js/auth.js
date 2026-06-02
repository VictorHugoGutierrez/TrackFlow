import { auth, db } from "./config/firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const DEFAULT_SETTINGS = {
  taxa_horaria_padrao: 0,
  moeda: "BRL",
  tema_interface: "dark",
  pomodoro: { trabalho: 25, pausa: 5 },
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeProviderData(user) {
  return (user.providerData ?? []).map((provider) => ({
    provider_id: provider.providerId,
    uid: provider.uid,
    email: provider.email ?? null,
  }));
}

function getPrimaryProvider(user) {
  return user.providerData?.[0]?.providerId ?? "password";
}

async function ensureUserProfile(user, details = {}) {
  const userRef = doc(db, "users", user.uid);
  const settingsRef = doc(db, "user_settings", user.uid);
  const [userSnapshot, settingsSnapshot] = await Promise.all([
    getDoc(userRef),
    getDoc(settingsRef),
  ]);

  const createdAt = userSnapshot.exists()
    ? userSnapshot.data().criado_em
    : nowIso();

  await setDoc(
    userRef,
    {
      nome: details.nome || user.displayName || user.email || "Usuário",
      email: user.email ?? null,
      photo_url: user.photoURL ?? null,
      email_verified: Boolean(user.emailVerified),
      plano: userSnapshot.exists()
        ? userSnapshot.data().plano ?? "freemium"
        : "freemium",
      provider: getPrimaryProvider(user),
      provider_id: user.providerData?.[0]?.uid ?? user.uid,
      providers: normalizeProviderData(user),
      criado_em: createdAt,
      atualizado_em: nowIso(),
    },
    { merge: true },
  );

  if (!settingsSnapshot.exists()) {
    await setDoc(settingsRef, DEFAULT_SETTINGS);
  }
}

function authErrorMessage(error) {
  const messages = {
    "auth/account-exists-with-different-credential":
      "Já existe uma conta com este e-mail usando outro método de login.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/popup-blocked": "O navegador bloqueou o popup do Google.",
    "auth/popup-closed-by-user": "Login com Google cancelado.",
    "auth/weak-password": "Use uma senha mais forte.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
  };

  return messages[error.code] ?? "Não foi possível concluir a autenticação.";
}

export async function cadastrarUsuario(email, senha, nome) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      senha,
    );
    await ensureUserProfile(userCredential.user, { nome });
    window.location.href = "app.html";
  } catch (error) {
    console.error("Erro no cadastro:", error);
    alert(authErrorMessage(error));
    throw error;
  }
}

export async function loginUsuario(email, senha) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    await ensureUserProfile(userCredential.user);
    window.location.href = "app.html";
  } catch (error) {
    console.error("Erro no login:", error);
    alert(authErrorMessage(error));
    throw error;
  }
}

export async function loginComGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    await ensureUserProfile(result.user);
    window.location.href = "app.html";
  } catch (error) {
    console.error("Erro no login com Google:", error);
    alert(authErrorMessage(error));
    throw error;
  }
}
