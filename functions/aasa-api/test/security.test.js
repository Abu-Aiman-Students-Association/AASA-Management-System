import test from "node:test";
import assert from "node:assert/strict";

process.env.APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
process.env.APPWRITE_PROJECT_ID = "6adbc96b002527d3b7fc";
process.env.APPWRITE_API_KEY = "test-key";
process.env.AASA_DATABASE_ID = "6adc732d002ef31e6c3a";

const { default: handler } = await import("../src/main.js");

function harness({ method = "GET", path = "/members", jwt = "valid-jwt", bodyJson = {}, permissionKeys = [], financeRow = null } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    calls.push({ path: parsed.pathname, method: options.method || "GET", headers: options.headers, body: options.body });
    if (parsed.pathname === "/v1/account") {
      if (options.headers?.["X-Appwrite-JWT"] !== "valid-jwt") {
        return new Response(JSON.stringify({ message: "Invalid JWT" }), { status: 401 });
      }
      return new Response(JSON.stringify({ $id: "verified-user-123", email: "user@example.test" }), { status: 200 });
    }
    if (parsed.pathname.endsWith("/tables/aasa_role_assignments/rows")) {
      const rows = permissionKeys.length ? [{ $id: "assignment", data: { auth_user_id: "verified-user-123", role_id: "test-role", assigned_by: "admin-user", assigned_at: "2026-10-27T00:00:00.000Z", revoked_at: null } }] : [];
      return new Response(JSON.stringify({ rows, total: rows.length }), { status: 200 });
    }
    if (parsed.pathname.endsWith("/tables/aasa_role_permissions/rows")) {
      const rows = permissionKeys.map((key) => ({ $id: "link-" + key, data: { role_id: "test-role", permission_id: key } }));
      return new Response(JSON.stringify({ rows, total: rows.length }), { status: 200 });
    }
    if (parsed.pathname.endsWith("/tables/aasa_permissions/rows")) {
      const rows = permissionKeys.map((key) => ({ $id: key, data: { permission_key: key } }));
      return new Response(JSON.stringify({ rows, total: rows.length }), { status: 200 });
    }
    if (parsed.pathname.includes("/tables/aasa_financial_transactions/rows/") && options.method === "GET") {
      if (!financeRow) return new Response(JSON.stringify({ message: "Not found" }), { status: 404 });
      return new Response(JSON.stringify({ $id: "finance-row", data: financeRow }), { status: 200 });
    }
    if (parsed.pathname.includes("/tables/aasa_financial_transactions/rows/") && options.method === "PATCH") {
      const body = JSON.parse(options.body || "{}");
      return new Response(JSON.stringify({ $id: "finance-row", data: { ...financeRow, ...body.data } }), { status: 200 });
    }
    if (parsed.pathname.endsWith("/tables/aasa_audit_events/rows") && options.method === "POST") {
      return new Response(JSON.stringify({ $id: "audit-row" }), { status: 201 });
    }
    if (parsed.pathname.includes("/tables/aasa_members/rows") && options.method !== "GET") {
      return new Response(JSON.stringify({ $id: "member-row" }), { status: 201 });
    }
    return new Response(JSON.stringify({ rows: [] }), { status: 200 });
  };
  let result;
  const res = { json(body, statusCode = 200) { result = { body, statusCode }; return result; } };
  const req = { method, path, headers: jwt ? { "x-appwrite-user-jwt": jwt } : {}, bodyJson };
  return { calls, run: async () => { await handler({ req, res, log() {}, error() {} }); return result; } };
}

test("rejects protected requests without a user JWT", async () => {
  const h = harness({ jwt: "" });
  const result = await h.run();
  assert.equal(result.statusCode, 401);
  assert.equal(h.calls.length, 0);
});

test("rejects invalid JWTs after asking Appwrite to verify identity", async () => {
  const h = harness({ jwt: "forged-jwt" });
  const result = await h.run();
  assert.equal(result.statusCode, 401);
  assert.equal(h.calls.some(call => call.path === "/v1/account"), true);
});

test("returns registered permission keys for an active permanent admin assignment", async () => {
  const h = harness({ method: "GET", path: "/permissions", permissionKeys: ["members.read", "finance.read"] });
  const result = await h.run();
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.permissions.sort(), ["finance.read", "members.read"]);
});

test("fails closed when a valid user has no active role assignment", async () => {
  const h = harness({ method: "POST", path: "/members", bodyJson: { member_number: "FAKE-1", full_name: "Not a real member" } });
  const result = await h.run();
  assert.equal(result.statusCode, 403);
  assert.equal(h.calls.some(call => call.path.includes("/tables/aasa_members/rows") && call.method === "POST"), false);
  assert.equal(h.calls.some(call => call.path.includes("/tables/aasa_audit_events/rows") && call.method === "POST"), true);
});

test("resolves nested member routes and denies them without permission", async () => {
  const h = harness({ method: "PATCH", path: "/members/real-row", bodyJson: { full_name: "Attempted change", actor_user_id: "SPOOFED" } });
  const result = await h.run();
  assert.equal(result.statusCode, 403);
  assert.equal(h.calls.some(call => call.path.includes("/tables/aasa_members/rows/real-row") && call.method === "PATCH"), false);
});


test("approves a submitted finance transaction only with finance.approve and a different approver", async () => {
  const h = harness({
    method: "POST",
    path: "/finance/finance-row/approve",
    permissionKeys: ["finance.approve"],
    financeRow: { transaction_ref: "AASA-TXN-2026-ABC123", recorded_by: "another-user", approval_status: "SUBMITTED" },
  });
  const result = await h.run();
  assert.equal(result.statusCode, 200);
  assert.equal(h.calls.some(call => call.path.endsWith("/rows/finance-row") && call.method === "PATCH"), true);
  assert.equal(h.calls.some(call => call.path.endsWith("/tables/aasa_audit_events/rows") && call.method === "POST"), true);
});

test("prevents a finance transaction author from approving their own transaction", async () => {
  const h = harness({
    method: "POST",
    path: "/finance/finance-row/approve",
    permissionKeys: ["finance.approve"],
    financeRow: { transaction_ref: "AASA-TXN-2026-ABC123", recorded_by: "verified-user-123", approval_status: "SUBMITTED" },
  });
  const result = await h.run();
  assert.equal(result.statusCode, 403);
  assert.equal(h.calls.some(call => call.path.endsWith("/rows/finance-row") && call.method === "PATCH"), false);
});
