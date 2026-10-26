import { Account, Client, Functions } from "appwrite";

const endpoint = (import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined)?.replace(/\/$/, "");
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;
const functionId = "aasa-secure-api";

export const appwriteConfigReady = Boolean(endpoint && projectId);
export const appwriteClient = new Client();
export const account = new Account(appwriteClient);
const functions = new Functions(appwriteClient);

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

/** Call the server-side API using a short-lived JWT for the current session. */
export async function secureApi<T>(path: string, method: "get" | "post" | "patch" = "get", data?: unknown): Promise<T> {
  if (!appwriteConfigReady || !endpoint || !projectId) throw new Error("Appwrite is not configured.");
  const jwt = await account.createJWT();
  const execution = await functions.createExecution(
    functionId,
    data === undefined ? "" : JSON.stringify(data),
    false,
    path,
    method,
    { "x-appwrite-user-jwt": jwt.jwt, "content-type": "application/json" },
  );
  let payload: any = {};
  try { payload = execution.responseBody ? JSON.parse(execution.responseBody) : {}; } catch { payload = {}; }
  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    throw new Error(payload.error || `Secure API request failed (${execution.responseStatusCode}).`);
  }
  return payload as T;
}

/** Permission keys are resolved server-side; frontend values only control navigation. */
export async function getCurrentPermissionKeys(): Promise<string[]> {
  const response = await secureApi<{ permissions?: string[] }>("/permissions");
  return Array.isArray(response.permissions) ? response.permissions : [];
}

export async function signOut() { await account.deleteSession("current"); }

export async function requestPasswordRecovery(email: string) {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured.");
  const redirectUrl = `${window.location.origin}${window.location.pathname}`;
  await account.createRecovery(email.trim(), redirectUrl);
}
