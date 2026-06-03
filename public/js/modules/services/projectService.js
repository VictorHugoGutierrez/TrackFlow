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

export const projectService = {
  async create(nome, clientId = null, orcamentoHoras = null, taxaHoraria = null) {
    try {
      const horas =
        orcamentoHoras !== null && orcamentoHoras !== ""
          ? Number(parseFloat(orcamentoHoras).toFixed(2))
          : null;

      const taxa =
        taxaHoraria !== null && taxaHoraria !== ""
          ? Number(parseFloat(taxaHoraria).toFixed(2))
          : null;

      const docRef = await addDoc(collection(db, "projects"), {
        user_id: auth.currentUser.uid,
        client_id: clientId || null,
        nome: nome.trim(),
        orcamento_horas: horas,
        taxa_horaria: taxa,
        status: "em_andamento",
        criado_em: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
      throw error;
    }
  },

  async getAll(status = null) {
    try {
      const conditions = [where("user_id", "==", auth.currentUser.uid)];
      if (status) conditions.push(where("status", "==", status));

      const q = query(collection(db, "projects"), ...conditions);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Erro ao listar projetos:", error);
      throw error;
    }
  },

  async getById(projectId) {
    try {
      const snap = await getDoc(doc(db, "projects", projectId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    } catch (error) {
      console.error("Erro ao buscar projeto:", error);
      throw error;
    }
  },

  async getByClient(clientId) {
    try {
      const q = query(
        collection(db, "projects"),
        where("user_id", "==", auth.currentUser.uid),
        where("client_id", "==", clientId),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Erro ao listar projetos do cliente:", error);
      throw error;
    }
  },

  async update(projectId, dados) {
    try {
      const ref = doc(db, "projects", projectId);
      const payload = { atualizado_em: new Date().toISOString() };

      if (dados.nome !== undefined) payload.nome = dados.nome.trim();
      if (dados.client_id !== undefined)
        payload.client_id = dados.client_id || null;
      if (dados.status !== undefined) payload.status = dados.status;
      if (dados.taxa_horaria !== undefined) {
        payload.taxa_horaria =
          dados.taxa_horaria !== null && dados.taxa_horaria !== ""
            ? Number(parseFloat(dados.taxa_horaria).toFixed(2))
            : null;
      }
      if (dados.orcamento_horas !== undefined) {
        payload.orcamento_horas =
          dados.orcamento_horas !== null && dados.orcamento_horas !== ""
            ? Number(parseFloat(dados.orcamento_horas).toFixed(2))
            : null;
      }

      await updateDoc(ref, payload);
    } catch (error) {
      console.error("Erro ao atualizar projeto:", error);
      throw error;
    }
  },

  async updateStatus(projectId, novoStatus) {
    try {
      await updateDoc(doc(db, "projects", projectId), {
        status: novoStatus,
        atualizado_em: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      throw error;
    }
  },

  async hardDelete(projectId) {
    try {
      const userId = auth.currentUser.uid;

      
      const qTasks = query(
        collection(db, "tasks"),
        where("user_id", "==", userId),
        where("project_id", "==", projectId),
      );
      const snapTasks = await getDocs(qTasks);
      const taskPromises = snapTasks.docs.map((d) => updateDoc(d.ref, { project_id: null, atualizado_em: new Date().toISOString() }));
      
      
      const qEntries = query(
        collection(db, "time_entries"),
        where("user_id", "==", userId),
        where("project_id", "==", projectId),
      );
      const snapEntries = await getDocs(qEntries);
      const entryPromises = snapEntries.docs.map((d) => updateDoc(d.ref, { project_id: null, atualizado_em: new Date().toISOString() }));

      await Promise.all([...taskPromises, ...entryPromises]);
      await deleteDoc(doc(db, "projects", projectId));

      return true;
    } catch (error) {
      console.error("Erro ao deletar projeto:", error);
      throw error;
    }
  },
};
