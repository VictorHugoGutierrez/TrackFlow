import { db, auth } from "../../config/firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

export const clientService = {
  async create(nome, contato = null) {
    try {
      const docRef = await addDoc(collection(db, "clients"), {
        user_id: auth.currentUser.uid,
        nome: nome.trim(),
        contato: contato ? contato.trim() : null,
        ativo: true,
        criado_em: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      throw error;
    }
  },

  async getAllActive() {
    try {
      const q = query(
        collection(db, "clients"),
        where("user_id", "==", auth.currentUser.uid),
        where("ativo", "==", true),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Erro ao listar clientes:", error);
      throw error;
    }
  },

  // Retorna todos os clientes (ativos e inativos)
  async getAll() {
    try {
      const q = query(
        collection(db, "clients"),
        where("user_id", "==", auth.currentUser.uid),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Erro ao listar todos os clientes:", error);
      throw error;
    }
  },

  async getById(clientId) {
    try {
      const snap = await getDoc(doc(db, "clients", clientId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      throw error;
    }
  },

  async update(clientId, dados) {
    try {
      const ref = doc(db, "clients", clientId);
      await updateDoc(ref, {
        ...(dados.nome !== undefined && { nome: dados.nome.trim() }),
        ...(dados.contato !== undefined && {
          contato: dados.contato?.trim() ?? null,
        }),
        atualizado_em: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      throw error;
    }
  },

  async softDelete(clientId) {
    try {
      const ref = doc(db, "clients", clientId);
      await updateDoc(ref, {
        ativo: false,
        atualizado_em: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Erro ao desativar cliente:", error);
      throw error;
    }
  },

  // Reativa um cliente desativado
  async reactivate(clientId) {
    try {
      const ref = doc(db, "clients", clientId);
      await updateDoc(ref, {
        ativo: true,
        atualizado_em: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Erro ao reativar cliente:", error);
      throw error;
    }
  },
};
