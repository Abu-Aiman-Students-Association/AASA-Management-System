import { Account, Client, ExecutionMethod, Functions } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || "";
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || "";
const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_ID || "aasa-secure-api";
// Keep execution synchronous so the secure API response body is available to callers.

export const appwriteConfigReady = Boolean(endpoint && projectId);
export const appwriteClient = new Client();
if (endpoint && projectId) appwriteClient.setEndpoint(endpoint).setProject(projectId);

const account = new Account(appwriteClient);
const functions = new Functions(appwriteClient);

export async function getCurrentAccount() {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.");
  return account.get();
}

export async function secureApiRequest<T>(path: string, method: ExecutionMethod = ExecutionMethod.GET, payload?: unknown): Promise<T> {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.");
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid secure API path.");
  const execution = await functions.createExecution({
    functionId,
    body: payload === undefined ? "" : JSON.stringify(payload),
    async: false,
    xpath: path,
    method,
    headers: { "content-type": "application/json" },
  });
  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    throw new Error(execution.responseBody || `Secure API request failed (${execution.responseStatusCode}).`);
  }
  try {
    return JSON.parse(execution.responseBody) as T;
  } catch {
    throw new Error("Secure API returned an invalid response.");
  }
}

export async function secureApi<T>(path: string): Promise<T> {
  return secureApiRequest<T>(path, ExecutionMethod.GET);
}
