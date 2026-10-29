import { Account, Client, Functions } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || "";
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || "";
const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_ID || "aasa-secure-api";

export const appwriteConfigReady = Boolean(endpoint && projectId);
export const appwriteClient = new Client();
if (endpoint && projectId) appwriteClient.setEndpoint(endpoint).setProject(projectId);

const account = new Account(appwriteClient);
const functions = new Functions(appwriteClient);

export async function getCurrentAccount() {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.");
  return account.get();
}

export async function secureApi<T>(path: string): Promise<T> {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.");
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid secure API path.");
  const execution = await functions.createExecution({
    functionId,
    body: "",
    async: false,
    path,
    method: "GET",
  });
  if (execution.statusCode < 200 || execution.statusCode >= 300) {
    throw new Error(execution.responseBody || `Secure API request failed (${execution.statusCode}).`);
  }
  try {
    return JSON.parse(execution.responseBody) as T;
  } catch {
    throw new Error("Secure API returned an invalid response.");
  }
}
