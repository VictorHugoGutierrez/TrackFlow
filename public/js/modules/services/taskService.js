import { db, auth } from "../../config/firebase.js";
import {
  collection,
  addDoc,
  getDoc,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

export const taskService = {
  async create(projectId, titulo) {
    const docRef = await addDoc(collection(db, "tasks"), {
      user_id: auth.currentUser.uid,
      project_id: projectId || null,
      titulo: titulo.trim(),
      status: "todo",
      criado_em: new Date().toISOString(),
    });
    return docRef.id;
  },

  listenAll(callback) {
    const q = query(
      collection(db, "tasks"),
      where("user_id", "==", auth.currentUser.uid),
    );
    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(tasks);
    });
  },

  async getById(taskId) {
    const snap = await getDoc(doc(db, "tasks", taskId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  async update(taskId, dados) {
    const ref = doc(db, "tasks", taskId);
    const payload = { atualizado_em: new Date().toISOString() };
    if (dados.titulo !== undefined) payload.titulo = dados.titulo.trim();
    if (dados.project_id !== undefined) payload.project_id = dados.project_id || null;
    if (dados.status !== undefined) payload.status = dados.status;
    await updateDoc(ref, payload);
  },

  async updateStatus(taskId, status) {
    const ref = doc(db, "tasks", taskId);
    await updateDoc(ref, {
      status: status,
      atualizado_em: new Date().toISOString()
    });
  },

  async hardDelete(taskId) {
    await deleteDoc(doc(db, "tasks", taskId));
  },
};
