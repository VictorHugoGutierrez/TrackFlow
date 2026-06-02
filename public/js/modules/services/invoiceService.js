import { db, auth } from "../../config/firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

export const invoiceService = {
  
  async create(clientId, mesReferencia, totalHoras, valorTotal) {
    try {
      const docRef = await addDoc(collection(db, "invoices"), {
        user_id: auth.currentUser.uid,
        client_id: clientId || "todos", 
        mes_referencia: mesReferencia,
        total_horas: Number(totalHoras),
        valor_total: Number(valorTotal),
        status: "pendente",
        criado_em: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar fatura:", error);
      throw error;
    }
  },

  
  listenAll(callback) {
    const q = query(
      collection(db, "invoices"),
      where("user_id", "==", auth.currentUser.uid)
    );
    return onSnapshot(q, (snapshot) => {
      const invoices = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      invoices.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
      callback(invoices);
    });
  },

  
  async updateStatus(invoiceId, status) {
    try {
      const ref = doc(db, "invoices", invoiceId);
      await updateDoc(ref, {
        status: status,
        atualizado_em: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro ao atualizar status da fatura:", error);
      throw error;
    }
  },

  
  async delete(invoiceId) {
    try {
      await deleteDoc(doc(db, "invoices", invoiceId));
    } catch (error) {
      console.error("Erro ao deletar fatura:", error);
      throw error;
    }
  }
};
