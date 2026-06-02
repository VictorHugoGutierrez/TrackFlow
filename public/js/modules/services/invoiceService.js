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
  onSnapshot,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const COLLECTION_NAME = "invoices";
const DEFAULT_LIMIT = 250;
const VALID_STATUSES = new Set([
  "rascunho",
  "pendente",
  "pago",
  "atrasado",
  "cancelado",
]);

function nowIso() {
  return new Date().toISOString();
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function requireUserId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuário não autenticado.");
  return uid;
}

function normalizeNullableString(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeAmount(value) {
  const amount = Number.parseFloat(String(value ?? "0").replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Number(amount.toFixed(2));
}

function normalizeStatus(value) {
  return VALID_STATUSES.has(value) ? value : "pendente";
}

function normalizeInvoicePayload(data) {
  const now = nowIso();
  const mesReferencia = normalizeNullableString(data.mes_referencia);
  const emitidaEm =
    normalizeNullableString(data.emitida_em) ||
    (mesReferencia ? `${mesReferencia}-01` : todayIsoDate());

  return {
    user_id: requireUserId(),
    client_id: normalizeNullableString(data.client_id),
    project_id: normalizeNullableString(data.project_id),
    client_nome: normalizeNullableString(data.client_nome),
    project_nome: normalizeNullableString(data.project_nome),
    numero: normalizeNullableString(data.numero),
    descricao: normalizeNullableString(data.descricao),
    email_to: normalizeNullableString(data.email_to),
    status: normalizeStatus(data.status),
    valor_total: normalizeAmount(data.valor_total),
    total_horas: normalizeAmount(data.total_horas),
    mes_referencia: mesReferencia,
    moeda: normalizeNullableString(data.moeda) || "BRL",
    emitida_em: emitidaEm,
    vencimento_em: normalizeNullableString(data.vencimento_em),
    paga_em: normalizeNullableString(data.paga_em),
    email_status: "nao_enviado",
    email_sent_at: null,
    email_error: null,
    email_request_id: null,
    criado_em: now,
    atualizado_em: now,
  };
}

function legacyPayload(clientId, mesReferencia, totalHoras, valorTotal) {
  const clientLabel =
    clientId && clientId !== "todos" ? null : "Todos os Clientes";

  return {
    client_id: clientId || "todos",
    client_nome: clientLabel,
    mes_referencia: mesReferencia,
    total_horas: totalHoras,
    valor_total: valorTotal,
    status: "pendente",
    moeda: "BRL",
    numero: mesReferencia ? `INV-${mesReferencia}` : null,
    descricao: "Fatura gerada a partir dos registros de tempo.",
    email_to: null,
    emitida_em: mesReferencia ? `${mesReferencia}-01` : todayIsoDate(),
  };
}

export const invoiceService = {
  async create(dataOrClientId, mesReferencia, totalHoras, valorTotal) {
    const data =
      typeof dataOrClientId === "object" && dataOrClientId !== null
        ? dataOrClientId
        : legacyPayload(dataOrClientId, mesReferencia, totalHoras, valorTotal);
    const payload = normalizeInvoicePayload(data);
    const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
    return { id: docRef.id, ...payload };
  },

  async getAll(filters = {}) {
    const conditions = [where("user_id", "==", requireUserId())];

    if (filters.status && filters.status !== "todos") {
      conditions.push(where("status", "==", filters.status));
    }

    if (filters.client_id) {
      conditions.push(where("client_id", "==", filters.client_id));
    }

    if (filters.project_id) {
      conditions.push(where("project_id", "==", filters.project_id));
    }

    if (filters.inicio) {
      conditions.push(where("emitida_em", ">=", filters.inicio));
    }

    if (filters.fim) {
      conditions.push(where("emitida_em", "<=", filters.fim));
    }

    const maxResults = Number.isInteger(filters.limit)
      ? filters.limit
      : DEFAULT_LIMIT;

    const invoicesQuery = query(
      collection(db, COLLECTION_NAME),
      ...conditions,
      orderBy("emitida_em", "desc"),
      limit(maxResults),
    );

    const snapshot = await getDocs(invoicesQuery);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  },

  listenAll(callback) {
    const invoicesQuery = query(
      collection(db, COLLECTION_NAME),
      where("user_id", "==", requireUserId()),
    );
    return onSnapshot(invoicesQuery, (snapshot) => {
      const invoices = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));
      invoices.sort((a, b) => {
        const left = a.criado_em || a.emitida_em || "";
        const right = b.criado_em || b.emitida_em || "";
        return right.localeCompare(left);
      });
      callback(invoices);
    });
  },

  async getById(invoiceId) {
    const snapshot = await getDoc(doc(db, COLLECTION_NAME, invoiceId));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  },

  async update(invoiceId, data) {
    const payload = { atualizado_em: nowIso() };

    if (data.client_id !== undefined)
      payload.client_id = normalizeNullableString(data.client_id);
    if (data.project_id !== undefined)
      payload.project_id = normalizeNullableString(data.project_id);
    if (data.client_nome !== undefined)
      payload.client_nome = normalizeNullableString(data.client_nome);
    if (data.project_nome !== undefined)
      payload.project_nome = normalizeNullableString(data.project_nome);
    if (data.numero !== undefined)
      payload.numero = normalizeNullableString(data.numero);
    if (data.descricao !== undefined)
      payload.descricao = normalizeNullableString(data.descricao);
    if (data.email_to !== undefined)
      payload.email_to = normalizeNullableString(data.email_to);
    if (data.status !== undefined) payload.status = normalizeStatus(data.status);
    if (data.valor_total !== undefined)
      payload.valor_total = normalizeAmount(data.valor_total);
    if (data.moeda !== undefined)
      payload.moeda = normalizeNullableString(data.moeda) || "BRL";
    if (data.emitida_em !== undefined)
      payload.emitida_em = normalizeNullableString(data.emitida_em);
    if (data.vencimento_em !== undefined)
      payload.vencimento_em = normalizeNullableString(data.vencimento_em);
    if (data.paga_em !== undefined)
      payload.paga_em = normalizeNullableString(data.paga_em);

    await updateDoc(doc(db, COLLECTION_NAME, invoiceId), payload);
  },

  async updateEmailStatus(invoiceId, status, details = {}) {
    await updateDoc(doc(db, COLLECTION_NAME, invoiceId), {
      email_status: status,
      email_sent_at: details.email_sent_at ?? null,
      email_error: details.email_error ?? null,
      email_request_id: details.email_request_id ?? null,
      atualizado_em: nowIso(),
    });
  },

  async updateStatus(invoiceId, status) {
    await this.update(invoiceId, {
      status,
      paga_em: status === "pago" ? todayIsoDate() : null,
    });
  },

  async delete(invoiceId) {
    await deleteDoc(doc(db, COLLECTION_NAME, invoiceId));
  },
};
