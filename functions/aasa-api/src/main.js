const ENDPOINT = (process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1").replace(/\/$/, "");
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.AASA_DATABASE_ID || "6adc732d002ef31e6c3a";

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
  "/finance": { table: TABLES.finance, read: "finance.read", create: "finance.record", update: "finance.record", module: "finance" },
  "/elections": { table: TABLES.elections, read: "elections.manage", create: "elections.manage", update: "elections.manage", module: "elections" },
};

function response(res, statusCode, body) {
  return res.json(body, statusCode);
}
function query(method, attribute, values) {
  return JSON.stringify({ method, attribute, values: Array.isArray(values) ? values : [values] });
}
async function appwrite(path, { method = "GET", body, jwt, admin = false, queries = [] } = {}) {
  const url = new URL(ENDPOINT + path);
  for (const item of queries) url.searchParams.append("queries[]", item);
  const headers = { "X-Appwrite-Project": PROJECT_ID, "Content-Type": "application/json" };
  if (jwt) headers["X-Appwrite-JWT"] = jwt;
  if (admin) headers["X-Appwrite-Key"] = API_KEY;
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
async function listRows(tableId, queries = []) {
  return appwrite(`/tablesdb/${DATABASE_ID}/tables/${tableId}/rows`, { admin: true, queries });
}
async function createRow(tableId, data) {
  return appwrite(`/tablesdb/${DATABASE_ID}/tables/${tableId}/rows`, {
    method: "POST", admin: true,
    body: { rowId: crypto.randomUUID(), data, permissions: [] },
  });
}
async function updateRow(tableId, rowId, data) {
  return appwrite(`/tablesdb/${DATABASE_ID}/tables/${tableId}/rows/${encodeURIComponent(rowId)}`, {
    method: "PATCH", admin: true, body: { data },
  });
}
function activeExpiry(value) {
  if (!value) return true;
  const time = Date.parse(value);
  return Number.isFinite(time) && time > Date.now();
}
async function resolvePermissions(userId) {
  const assignments = await listRows(TABLES.assignments, [
    query("equal", "auth_user_id", userId),
    query("isNull", "revoked_at", []),
    JSON.stringify({ method: "limit", values: [100] }),
  ]);
  const active = (assignments.rows || []).filter(row => activeExpiry(row.expires_at));
  const roleIds = [...new Set(active.map(row => row.role_id).filter(Boolean))];
  if (!roleIds.length) return [];
  const links = await Promise.all(roleIds.map(roleId =>
    listRows(TABLES.rolePermissions, [
      query("equal", "role_id", roleId),
      JSON.stringify({ method: "limit", values: [200] }),
    ])
  ));
  const permissionIds = [...new Set(links.flatMap(result => (result.rows || []).map(row => row.permission_id).filter(Boolean)))];
  if (!permissionIds.length) return [];
  const registry = await listRows(TABLES.permissions, [JSON.stringify({ method: "limit", values: [200] })]);
  const allowed = new Set(permissionIds);
  return (registry.rows || []).filter(row => allowed.has(row.$id)).map(row => row.permission_key).filter(Boolean);
}
async function writeAudit({ actor, route, action, result, reason, recordId }) {
  try {
    await createRow(TABLES.audit, {
      actor_user_id: actor || null,
      event_type: `api.${route}.${action.toLowerCase()}`,
      module_key: route,
      record_type: route,
      record_id: recordId || null,
      action,
      result,
      reason: reason || null,
      correlation_id: crypto.randomUUID(),
      occurred_at: new Date().toISOString(),
      is_test_record: false,
    });
  } catch (err) {
    // Fail closed for mutations if the audit sink is unavailable.
    if (result === "SUCCESS") throw new Error("Audit write failed; operation result cannot be safely confirmed.");
    console.error("AASA audit write failed", err?.message || err);
  }
}
function cleanInput(route, action, input, userId) {
  const data = { ...input };
  for (const key of ["$id", "$createdAt", "$updatedAt", "$permissions", "is_test_record", "created_by", "updated_by", "recorded_by", "approved_by", "actor_user_id", "assigned_by"]) delete data[key];
  if (route === "members") {
    if (action === "CREATE") {
      if (!String(data.member_number || "").trim() || !String(data.full_name || "").trim()) throw Object.assign(new Error("Member number and full name are required."), { status: 400 });
      data.member_number = String(data.member_number).trim();
      data.full_name = String(data.full_name).trim();
      data.membership_status = "PENDING_VERIFICATION";
      data.created_by = userId;
      data.is_test_record = false;
    } else if (action === "UPDATE") {
      if (data.member_number !== undefined || data.membership_status !== undefined) throw Object.assign(new Error("Member number and membership status changes require a separate authorized workflow."), { status: 400 });
      data.updated_by = userId;
    }
  }
  if (route === "meetings") {
    if (action === "CREATE") {
      if (!String(data.title || "").trim() || !data.starts_at || !String(data.meeting_type || "").trim()) throw Object.assign(new Error("Meeting title, type and start time are required."), { status: 400 });
      data.status = "DRAFT";
      data.created_by = userId;
    }
  }
  if (route === "finance") {
    if (action === "CREATE") {
      if (!["INCOME", "EXPENSE"].includes(data.transaction_type) || !Number.isSafeInteger(data.amount_minor) || data.amount_minor <= 0 || !data.category || !data.transaction_date) {
        throw Object.assign(new Error("Valid transaction type, positive amount in minor units, category and date are required."), { status: 400 });
      }
      data.currency = "NGN";
      data.recorded_by = userId;
      data.approval_status = "SUBMITTED";
      data.is_test_record = false;
    }
  }
  if (route === "elections" && action === "CREATE") {
    if (!String(data.name || "").trim()) throw Object.assign(new Error("Election name is required."), { status: 400 });
    data.status = "DRAFT";
    data.is_test_election = false;
  }
  return data;
}

export default async ({ req, res, log, error }) => {
  const method = String(req.method || "GET").toUpperCase();
  const path = String(req.path || "/").split("?")[0].replace(/\/$/, "") || "/";
  const route = ROUTES[path];
  const jwt = req.headers?.["x-appwrite-user-jwt"] || req.headers?.["X-Appwrite-User-JWT"];
  if (method === "OPTIONS") return res.json({ ok: true });
  if (!PROJECT_ID || !API_KEY) return response(res, 503, { error: "Server configuration is incomplete." });
  if (!jwt) return response(res, 401, { error: "Sign-in required." });

  let account;
  try {
    account = await appwrite("/account", { jwt });
  } catch {
    return response(res, 401, { error: "The user session could not be verified." });
  }
  const userId = account.$id;
  if (!userId) return response(res, 401, { error: "Verified identity is missing." });

  if (path === "/health" && method === "GET") return response(res, 200, { ok: true, authenticated: true });
  if (!route) return response(res, 404, { error: "Unknown API route." });

  const segments = path.split("/").filter(Boolean);
  const rowId = segments.length > 1 ? segments[1] : null;
  let action;
  if (method === "GET" && !rowId) action = "READ";
  else if (method === "POST" && !rowId) action = "CREATE";
  else if (method === "PATCH" && rowId) action = "UPDATE";
  else if (method === "POST" && rowId === "archive" && route.module === "members") action = "ARCHIVE";
  else return response(res, 405, { error: "Method not allowed." });

  try {
    const permissionKey = action === "READ" ? route.read : action === "CREATE" ? route.create : action === "ARCHIVE" ? route.archive : route.update;
    const permissions = await resolvePermissions(userId);
    if (!permissions.includes(permissionKey)) {
      await writeAudit({ actor: userId, route: route.module, action, result: "DENIED", reason: "Missing permission." });
      return response(res, 403, { error: "Permission denied." });
    }

    if (action === "READ") {
      const data = await listRows(route.table, [JSON.stringify({ method: "limit", values: [100] })]);
      await writeAudit({ actor: userId, route: route.module, action, result: "SUCCESS" });
      const rows = (data.rows || []).filter(row => row.is_test_record !== true && row.is_test_election !== true);
      return response(res, 200, { rows, total: rows.length });
    }

    const body = typeof req.bodyJson === "object" && req.bodyJson !== null ? req.bodyJson : {};
    if (action === "ARCHIVE") {
      if (route.module !== "members") return response(res, 400, { error: "Archive is not supported for this resource." });
      const updated = await updateRow(route.table, rowId, { membership_status: "INACTIVE", updated_by: userId });
      await writeAudit({ actor: userId, route: route.module, action: "UPDATE", result: "SUCCESS", recordId: rowId, reason: "Member archived (soft archive)." });
      return response(res, 200, { row: updated });
    }

    const data = cleanInput(route, action, body, userId);
    const saved = action === "CREATE" ? await createRow(route.table, data) : await updateRow(route.table, rowId, data);
    await writeAudit({ actor: userId, route: route.module, action, result: "SUCCESS", recordId: saved.$id || rowId });
    return response(res, action === "CREATE" ? 201 : 200, { row: saved });
  } catch (err) {
    const status = err?.status || 500;
    try { await writeAudit({ actor: userId, route: route.module, action, result: "FAILURE", reason: err?.message || "Operation failed." }); } catch {}
    if (status >= 500) error?.("AASA API operation failed: " + (err?.message || "unknown error"));
    return response(res, status, { error: status >= 500 ? "The operation failed safely. Check server logs and audit records." : err.message });
  }
};
