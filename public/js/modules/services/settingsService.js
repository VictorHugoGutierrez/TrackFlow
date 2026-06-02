import { db, auth } from "../../config/firebase.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

export const settingsService = {
  
  async get() {
    try {
      const snap = await getDoc(doc(db, "user_settings", auth.currentUser.uid));
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (error) {
      console.error("Erro ao obter configurações do usuário:", error);
      throw error;
    }
  },

  
  async update(dados) {
    try {
      const ref = doc(db, "user_settings", auth.currentUser.uid);
      await setDoc(ref, {
        ...dados,
        atualizado_em: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Erro ao atualizar configurações do usuário:", error);
      throw error;
    }
  }
};

