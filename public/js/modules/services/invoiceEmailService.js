import { db, auth } from "../../config/firebase.js";
import {
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { invoiceService } from "./invoiceService.js";

const COLLECTION_NAME = "invoice_email_requests";

function nowIso() {
  return new Date().toISOString();
}

function requireUserId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuário não autenticado.");
  return uid;
}

function normalizeEmail(value) {
  return String(value ?? "").trim();
}

function buildSubject(invoice) {
  const number = invoice.numero ? ` ${invoice.numero}` : "";
  return `Fatura TrackFlow${number}`;
}

export const invoiceEmailService = {
  async requestSend(invoice) {
    const emailTo = normalizeEmail(invoice.email_to);
    if (!emailTo) {
      throw new Error("Esta fatura não possui e-mail cadastrado.");
    }

    const now = nowIso();
    const payload = {
      user_id: requireUserId(),
      invoice_id: invoice.id,
      to: emailTo,
      subject: buildSubject(invoice),
      status: "pendente",
      attempts: 0,
      error: null,
      created_at: now,
      updated_at: now,
    };

    const requestRef = await addDoc(collection(db, COLLECTION_NAME), payload);
    await invoiceService.updateEmailStatus(invoice.id, "pendente", {
      email_request_id: requestRef.id,
    });

    return { id: requestRef.id, ...payload };
  },
};
