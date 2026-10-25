import { Account, Client, Query, TablesDB } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;

export const appwriteConfigReady = Boolean(endpoint && projectId);
export const appwriteClient = new Client();
export const account = new Account(appwriteClient);
const tables = new TablesDB(appwriteClient);
const DATABASE_ID = "6adc732d002ef31e6c3a";

if (endpoint && projectId) appwriteClient.setEndpoint(endpoint).setProject(projectId);

export async function checkAppwriteConnection(): Promise<void> {
  if (!appwriteConfigReady) throw new Error("Appwrite settings are missing. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.");
  await appwriteClient.ping();
}

export async function signInWithEmail(email: string, password: string) {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured.");
  await account.createEmailPasswordSession(email.trim(), password);
  return account.get();
}

export async function getCurrentAccount() {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured.");
  return account.get();
}

/**
 * UI navigation hint only; not a replacement for Appwrite table permissions
 * or server-side authorization. Missing/denied role data fails closed.
 */
export async function getCurrentPermissionKeys(): Promise<string[]> {
  const current = await getCurrentAccount();
  const assignments = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: "aasa_role_assignments",
    queries: [Query.equal("auth_user_id", current.$id), Query.isNull("revoked_at"), Query.limit(25)],
    total: false,
  });
  const now = Date.now();
  const activeAssignments = (assignments.rows as Array<Record<string, unknown>>).filter((row) => {
    const expiry = typeof row.expires_at === "string" ? Date.parse(row.expires_at) : NaN;
    return !Number.isFinite(expiry) || expiry > now;
  });
  if (activeAssignments.length === 0) return [];

  const roleIds = [...new Set(activeAssignments.map((row) => row.role_id).filter((id): id is string => typeof id === "string" && id.length > 0))];
  const rolePermissionRows = await Promise.all(roleIds.map((roleId) => tables.listRows({
    databaseId: DATABASE_ID,
    tableId: "aasa_role_permissions",
    queries: [Query.equal("role_id", roleId), Query.limit(100)],
    total: false,
  })));
  const permissionIds = [...new Set(rolePermissionRows.flatMap((response) =>
    (response.rows as Array<Record<string, unknown>>).map((row) => row.permission_id).filter((id): id is string => typeof id === "string" && id.length > 0)
  ))];
  if (permissionIds.length === 0) return [];

  const permissionRows = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: "aasa_permissions",
    queries: [Query.limit(200)],
    total: false,
  });
  const allowedIds = new Set(permissionIds);
  return (permissionRows.rows as Array<Record<string, unknown>>)
    .filter((row) => allowedIds.has(String(row.$id)))
    .map((row) => row.permission_key)
    .filter((key): key is string => typeof key === "string");
}

export async function signOut() { await account.deleteSession("current"); }

export async function requestPasswordRecovery(email: string) {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured.");
  const redirectUrl = `${window.location.origin}${window.location.pathname}`;
  await account.createRecovery(email.trim(), redirectUrl);
}
