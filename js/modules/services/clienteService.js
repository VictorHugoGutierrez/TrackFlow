import { db, auth } from '../../config/firebase.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    doc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

export const clientService = {
    async create(nome, contato) {
        try {
            const docRef = await addDoc(collection(db, "clients"), {
                user_id: auth.currentUser.uid,
                nome: nome,
                contato: contato,
                ativo: true,
                criado_em: new Date().toISOString()
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
                where("ativo", "==", true)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Erro ao listar clientes:", error);
            throw error;
        }
    },

    async softDelete(clientId) {
        const clientRef = doc(db, "clients", clientId);
        return await updateDoc(clientRef, { ativo: false });
    }
};