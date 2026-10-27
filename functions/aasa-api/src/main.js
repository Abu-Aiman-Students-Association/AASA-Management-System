const ENDPOINT = (process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1").replace(/\/$/, "");
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const CONFIGURED_API_KEY = process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.AASA_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "6adc732d002ef31e6c3a";

const TABLES = {
  assignments: "aasa_role_assignments",
  rolePermissions: "aasa_role_permissions",
  permissions: "aasa_permissions",
  members: "aasa_members",
  meetings: "aasa_meetings",
  finance: "aasa_financial_transactions",
  elections: "aasa_elections",
  audit: "aasa_audit_events",
};

const ROUTES = {
  "/members": { table: TABLES.members, read: "members.read", create: "members.create", update: "members.update", archive: "members.archive", module: "members" },
  "/meetings": { table: TABLES.meetings, read: "meetings.manage", create: "meetings.manage", update: "meetings.manage", module: "meetings" },
  "/finance": { table: TABLES.finance, read: "finance.read", create: "finance.record", update: "finance.record", approve: "finance.approve", module: "finance" },
  "/elections": { table: TABLES.elections, read: "elections.manage", create: "elections.manage", update: "elections.manage", module: "elections" },
};

function response(res, statusCode, body) { return res.json(body, statusCode); }
function getUserJwt(req) {
  const headers = req.headers || {};
  const entries = Object.entries(headers);
  const appwriteHeader = entries.find(([key, value]) => key.toLowerCase() === "x-appwrite-user-jwt" && typeof value === "string" && value.trim());
  if (appwriteHeader) return appwriteHeader[1].trim();
  const authorization = entries.find(([key, value]) => key.toLowerCase() === "authorization" && typeof value === "string");
  if (authorization) {
    const match = authorization[1].match(/^Bearer\\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  return "";
}
function query(method, attribute, values) {
  return JSON.stringify({ method, attribute, values: Array.isArray(values) ? values : [values] });
}
async function appwrite(path, { method = "GET", body, jwt, admin = false, queries = [], apiKey } = {}) {
  const url = new URL(ENDPOINT + path);
  for (const item of queries) url.searchParams.append("queries[]", item);
  const headers = { "X-Appwrite-Project": PROJECT_ID, "Content-Type": "application/json" };
  if (jwt) headers["X-Appwrite-JWT"] = jwt;
  if (admin) headers["X-Appwrite-Key"] = apiKey || CONFIGURED_API_KEY;
  const result = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await result.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!result.ok) {
    const error = new Error(data.message || "Appwrite request failed");
    error.status = result.status;
    throw error;
  }
  return data;
}
async function listRows(tableId, queries = [], apiKey) {
  return appwrite(`/tablesdb/${DATABASE_ID}/tables/${tableId}/rows`, { admin: true, queries, apiKey });
}
async function createRow(tableId, data, apiKey) {
  return appwrite(`/tablesdb/${DATABASE_ID}/tables/${tableId}/rows`, {
    method: "POST", admin: true, apiKey,
    body: { rowId: crypto.randomUUID(), data, permissions: [] },
  });
}
async function getRow(tableId, rowId, apiKey) {
  return appwrite(`/tablesdb/${DATABASE_ID}/tables/${tableId}/rows/${encodeURIComponent(rowId)}`, { admin: true, apiKey });
}
async function updateRow(tableId, rowId, data, apiKey) {
  return appwrite(`/tablesdb/${DATABASE_ID}/tables/${tableId}/rows/${encodeURIComponent(rowId)}`, {
    method: "PATCH", admin: true, apiKey, body: { data },
  });
}
function activeExpiry(value) {
  if (!value) return true;
  const time = Date.parse(value);
  return Number.isFinite(time) && time > Date.now();
}
async function resolvePermissions(userId, apiKey) {
  // Fetch by identity first, then evaluate revocation and expiry locally. Appwrite
  // TablesDB's isNull query can omit rows whose nullable field was never set,
  // which incorrectly hides valid permanent assignments.
  const assignments = await listRows(TABLES.assignments, [
    query("equal", "auth_user_id", userId),
    JSON.stringify({ method: "limit", values: [100] }),
  ], apiKey);
  const active = (assignments.rows || []).filter(row => {
    const data = row.data || {};
    const notRevoked = data.revoked_at === null || data.revoked_at === undefined || data.revoked_at === "";
    return notRevoked && activeExpiry(data.expires_at);
  });
  const roleIds = [...new Set(active.map(row => row.data?.role_id).filter(Boolean))];
  if (!roleIds.length) return [];
  const links = await Promise.all(roleIds.map(roleId => listRows(TABLES.rolePermissions, [
    query("equal", "role_id", roleId),
    JSON.stringify({ method: "limit", values: [200] }),
  ], apiKey)));
  const permissionIds = [...new Set(links.flatMap(result => (result.rows || []).map(row => row.data?.permission_id).filter(Boolean)))];
  if (!permissionIds.length) return [];
  const registry = await listRows(TABLES.permissions, [JSON.stringify({ method: "limit", values: [200] })], apiKey);
  const allowed = new Set(permissionIds);
  return (registry.rows || []).filter(row => allowed.has(row.$id)).map(row => row.data?.permission_key).filter(Boolean);
}
async function writeAudit({ actor, route, action, result, reason, recordId, apiKey }) {
  try {
    await createRow(TABLES.audit, {
      actor_user_id: actor || null, event_type: `api.${route}.${action.toLowerCase()}`,
      module_key: route, record_type: route, record_id: recordId || null, action, result,
      reason: reason || null, correlation_id: crypto.randomUUID(), occurred_at: new Date().toISOString(), is_test_record: false,
    }, apiKey);
  } catch (err) {
    if (result === "SUCCESS") throw new Error("Audit write failed; operation result cannot be safely confirmed.");
    console.error("AASA audit write failed", err?.message || err);
  }
}
function cleanInput(route, action, input, userId) {
  const allowed = {
    members: action === "CREATE" ? ["member_number", "full_name", "email", "phone_number", "whatsapp_number", "gender", "date_of_birth", "address", "state", "town", "profile_photo_file_id"] : ["full_name", "email", "phone_number", "whatsapp_number", "gender", "date_of_birth", "address", "state", "town", "profile_photo_file_id"],
    meetings: ["title", "meeting_type", "starts_at", "ends_at", "venue", "online_link"],
    finance: action === "CREATE" ? ["transaction_type", "category", "amount_minor", "transaction_date", "payment_reference", "evidence_file_id"] : ["payment_reference", "evidence_file_id"],
    elections: ["name", "purpose", "nomination_starts_at", "nomination_ends_at", "voting_starts_at", "voting_ends_at"],
  }[route] || [];
  const data = Object.fromEntries(Object.entries(input || {}).filter(([key]) => allowed.includes(key)));
  if (route === "members") {
    if (action === "CREATE") {
      if (!String(data.member_number || "").trim() || !String(data.full_name || "").trim()) throw Object.assign(new Error("Member number and full name are required."), { status: 400 });
      data.member_number = String(data.member_number).trim(); data.full_name = String(data.full_name).trim();
      data.membership_status = "PENDING_VERIFICATION"; data.created_by = userId; data.is_test_record = false;
    } else if (action === "UPDATE") {
      if (data.member_number !== undefined || data.membership_status !== undefined) throw Object.assign(new Error("Member number and membership status changes require a separate authorized workflow."), { status: 400 });
      data.updated_by = userId;
    }
  }
  if (route === "meetings" && action === "CREATE") {
    if (!String(data.title || "").trim() || !data.starts_at || !String(data.meeting_type || "").trim()) throw Object.assign(new Error("Meeting title, type and start time are required."), { status: 400 });
    data.status = "DRAFT"; data.created_by = userId;
  }
  if (route === "finance" && action === "CREATE") {
    if (!["INCOME", "EXPENSE"].includes(data.transaction_type) || !Number.isSafeInteger(data.amount_minor) || data.amount_minor <= 0 || !data.category || !data.transaction_date) throw Object.assign(new Error("Valid transaction type, positive amount in minor units, category and date are required."), { status: 400 });
    data.transaction_ref = `AASA-TXN-${new Date().getUTCFullYear()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    data.currency = "NGN"; data.recorded_by = userId; data.approval_status = "SUBMITTED"; data.is_test_record = false;
  }
  if (route === "elections" && action === "CREATE") {
    if (!String(data.name || "").trim()) throw Object.assign(new Error("Election name is required."), { status: 400 });
    data.status = "DRAFT"; data.is_test_election = false;
  }
  return data;
}

export default async ({ req, res, error }) => {
  const method = String(req.method || "GET").toUpperCase();
  const path = String(req.path || "/").split("?")[0].replace(/\/$/, "") || "/";
  const segments = path.split("/").filter(Boolean);
  const route = ROUTES["/" + (segments[0] || "")];
  const jwt = getUserJwt(req);
  if (method === "OPTIONS") return res.json({ ok: true });
  const apiKey = req.headers?.["x-appwrite-key"] || req.headers?.["X-Appwrite-Key"] || CONFIGURED_API_KEY;
  if (!PROJECT_ID || !apiKey) return response(res, 503, { error: "Server configuration is incomplete." });
  if (!jwt) return response(res, 401, { error: "Sign-in required." });

  let account;
  try { account = await appwrite("/account", { jwt }); }
  catch { return response(res, 401, { error: "The user session could not be verified." }); }
  const userId = account.$id;
  if (!userId) return response(res, 401, { error: "Verified identity is missing." });

  if (path === "/health" && method === "GET") return response(res, 200, { ok: true, authenticated: true });
  if (path === "/permissions" && method === "GET") {
    try { return response(res, 200, { permissions: await resolvePermissions(userId, apiKey) }); }
    catch (err) {
      error?.("AASA permission lookup failed: " + (err?.message || "unknown error"));
      return response(res, 500, { error: "Permissions could not be verified. Access remains blocked." });
    }
  }
  if (!route) return response(res, 404, { error: "Unknown API route." });

  const rowId = segments.length > 1 ? segments[1] : null;
  let action;
  if (method === "GET" && segments.length === 1) action = "READ";
  else if (method === "POST" && segments.length === 1) action = "CREATE";
  else if (method === "PATCH" && segments.length === 2 && rowId) action = "UPDATE";
  else if (method === "POST" && segments.length === 3 && segments[2] === "archive" && route.module === "members" && rowId) action = "ARCHIVE";
  else if (method === "POST" && segments.length === 3 && segments[2] === "approve" && route.module === "finance" && rowId) action = "APPROVE";
  else return response(res, 405, { error: "Method not allowed." });

  try {
    const permissionKey = action === "READ" ? route.read : action === "CREATE" ? route.create : action === "ARCHIVE" ? route.archive : action === "APPROVE" ? route.approve : route.update;
    const permissions = await resolvePermissions(userId, apiKey);
    if (!permissions.includes(permissionKey)) {
      await writeAudit({ actor: userId, route: route.module, action, result: "DENIED", reason: "Missing permission.", apiKey });
      return response(res, 403, { error: "Permission denied." });
    }
    if (action === "READ") {
      const data = await listRows(route.table, [JSON.stringify({ method: "limit", values: [100] })], apiKey);
      await writeAudit({ actor: userId, route: route.module, action, result: "SUCCESS", apiKey });
      const rows = (data.rows || []).filter(row => row.data?.is_test_record !== true && row.data?.is_test_election !== true);
      return response(res, 200, { rows, total: rows.length });
    }
    const body = typeof req.bodyJson === "object" && req.bodyJson !== null ? req.bodyJson : {};
    if (action === "APPROVE") {
      let existing;
      try { existing = await getRow(route.table, rowId, apiKey); } catch (err) { if (err?.status === 404) return response(res, 404, { error: "Financial transaction not found." }); throw err; }
      if (existing.data?.approval_status !== "SUBMITTED") return response(res, 409, { error: "Only submitted financial transactions can be approved." });
      if (existing.data?.recorded_by === userId) {
        await writeAudit({ actor: userId, route: route.module, action, result: "DENIED", reason: "A user cannot approve their own financial transaction.", recordId: rowId, apiKey });
        return response(res, 403, { error: "You cannot approve a transaction you recorded." });
      }
      const updated = await updateRow(route.table, rowId, { approval_status: "APPROVED", approved_by: userId }, apiKey);
      await writeAudit({ actor: userId, route: route.module, action, result: "SUCCESS", recordId: rowId, apiKey });
      return response(res, 200, { row: updated });
    }
    if (action === "ARCHIVE") {
      const updated = await updateRow(route.table, rowId, { membership_status: "INACTIVE", updated_by: userId }, apiKey);
      await writeAudit({ actor: userId, route: route.module, action: "UPDATE", result: "SUCCESS", recordId: rowId, reason: "Member archived (soft archive).", apiKey });
      return response(res, 200, { row: updated });
    }
    const data = cleanInput(route.module, action, body, userId);
    if (route.module === "finance" && action === "UPDATE") {
      let existing;
      try { existing = await getRow(route.table, rowId, apiKey); } catch (err) { if (err?.status === 404) return response(res, 404, { error: "Financial transaction not found." }); throw err; }
      if (existing.data?.approval_status === "APPROVED") return response(res, 409, { error: "Approved financial transactions are locked. Use an audited reversal or correction workflow." });
    }
    const saved = action === "CREATE" ? await createRow(route.table, data, apiKey) : await updateRow(route.table, rowId, data, apiKey);
    await writeAudit({ actor: userId, route: route.module, action, result: "SUCCESS", recordId: saved.$id || rowId, apiKey });
    return response(res, action === "CREATE" ? 201 : 200, { row: saved });
  } catch (err) {
    const status = err?.status || 500;
    try { await writeAudit({ actor: userId, route: route.module, action, result: "FAILURE", reason: err?.message || "Operation failed.", apiKey }); } catch {}
    if (status >= 500) error?.("AASA API operation failed: " + (err?.message || "unknown error"));
    return response(res, status, { error: status >= 500 ? "The operation failed safely. Check server logs and audit records." : err.message });
  }
};
