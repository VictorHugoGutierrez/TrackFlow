import { db, auth } from "../../config/firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

export const timeEntryService = {
  async create(
    description,
    projectId,
    clientId,
    startTime,
    endTime,
    durationSeconds,
    taskId = null,
  ) {
    try {
      const docRef = await addDoc(collection(db, "time_entries"), {
        user_id: auth.currentUser.uid,
        description: description ? description.trim() : "",
        project_id: projectId || null,
        client_id: clientId || null,
        task_id: taskId || null,
        start_time: startTime,
        end_time: endTime,
        duration: durationSeconds,
        criado_em: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar registro de tempo:", error);
      throw error;
    }
  },

  listenAll(callback) {
    const q = query(
      collection(db, "time_entries"),
      where("user_id", "==", auth.currentUser.uid),
    );
    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      entries.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
      callback(entries);
    });
  },

  async update(entryId, dados) {
    try {
      const ref = doc(db, "time_entries", entryId);
      await updateDoc(ref, {
        ...dados,
        atualizado_em: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Erro ao atualizar registro de tempo:", error);
      throw error;
    }
  },

  async hardDelete(entryId) {
    try {
      await deleteDoc(doc(db, "time_entries", entryId));
    } catch (error) {
      console.error("Erro ao deletar registro de tempo:", error);
      throw error;
    }
  },

  async delete(entryId) {
    return this.hardDelete(entryId);
  },
};
