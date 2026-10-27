import { Account, Client, ExecutionMethod, Functions } from "appwrite";

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

const AASA_SUPER_ADMIN_ID = "6adc5b630006ac99c6bb";
const AASA_SUPER_ADMIN_EMAIL = "abuaimanstudents@gmail.com";

export async function requestSignInOtp(email: string) {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured.");
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== AASA_SUPER_ADMIN_EMAIL) throw new Error("This email is not authorized for AASA Super Admin access.");
  await account.createEmailToken(AASA_SUPER_ADMIN_ID, normalizedEmail);
}

export async function verifySignInOtp(email: string, secret: string) {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured.");
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== AASA_SUPER_ADMIN_EMAIL) throw new Error("This email is not authorized for AASA Super Admin access.");
  const code = secret.trim();
  if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code sent to your email.");
  await account.createSession(AASA_SUPER_ADMIN_ID, code);
  const current = await account.get();
  if (current.$id !== AASA_SUPER_ADMIN_ID || current.email.toLowerCase() !== AASA_SUPER_ADMIN_EMAIL) {
    try { await account.deleteSession("current"); } catch { /* no session to clear */ }
    throw new Error("The signed-in account is not the authorized AASA Super Admin.");
  }
  return current;
}

export async function getCurrentAccount() {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured.");
  return account.get();
}

/** Call the server-side API using a short-lived JWT for the current session. */
export async function secureApi<T>(path: string, method: "get" | "post" | "patch" = "get", data?: unknown): Promise<T> {
  if (!appwriteConfigReady || !endpoint || !projectId) throw new Error("Appwrite is not configured.");
  const jwt = await account.createJWT();
  const sdkMethod = method === "post" ? ExecutionMethod.POST : method === "patch" ? ExecutionMethod.PATCH : ExecutionMethod.GET;
  const execution = await functions.createExecution(
    functionId,
    data === undefined ? "" : JSON.stringify(data),
    false,
    path,
    sdkMethod,
    { "x-appwrite-user-jwt": jwt.jwt, "authorization": "Bearer " + jwt.jwt, "content-type": "application/json" },
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
