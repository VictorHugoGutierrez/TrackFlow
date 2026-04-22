import { db, auth } from '../../config/firebase.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

export const projectService = {
    async create(nome, clientId = null, orcamentoHoras = 0) {
        try {
            const docRef = await addDoc(collection(db, "projects"), {
                user_id: auth.currentUser.uid,
                client_id: clientId, 
                nome: nome,
                orcamento_horas: Number(orcamentoHoras),
                status: "em_andamento",
                criado_em: new Date().toISOString()
            });
            return docRef.id;
        } catch (error) {
            console.error("Erro ao criar projeto:", error);
            throw error;
        }
    },

    async getAll() {
        try {
            const q = query(
                collection(db, "projects"), 
                where("user_id", "==", auth.currentUser.uid)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Erro ao listar projetos:", error);
            throw error;
        }
    },

    async hardDelete(projectId) {
        try {
            await deleteDoc(doc(db, "projects", projectId));
            return true;
        } catch (error) {
            console.error("Erro ao deletar projeto:", error);
            throw error;
        }
    }
};