import test from "node:test";
import assert from "node:assert/strict";

process.env.APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
process.env.APPWRITE_PROJECT_ID = "6adbc96b002527d3b7fc";
process.env.APPWRITE_API_KEY = "test-key";
process.env.AASA_DATABASE_ID = "6adc732d002ef31e6c3a";

const { default: handler } = await import("../src/main.js");

function harness({ method = "GET", path = "/members", jwt = "valid-jwt", bodyJson = {} } = {}) {
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
      return new Response(JSON.stringify({ rows: [], total: 0 }), { status: 200 });
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
