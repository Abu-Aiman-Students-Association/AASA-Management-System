import { Account, Client } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;

export const appwriteConfigReady = Boolean(endpoint && projectId);
export const appwriteClient = new Client();
export const account = new Account(appwriteClient);

if (endpoint && projectId) {
  appwriteClient.setEndpoint(endpoint).setProject(projectId);
}

export async function checkAppwriteConnection(): Promise<void> {
  if (!appwriteConfigReady) {
    throw new Error("Appwrite settings are missing. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.");
  }
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

export async function signOut() {
  await account.deleteSession("current");
}

export async function requestPasswordRecovery(email: string) {
  if (!appwriteConfigReady) throw new Error("Appwrite is not configured.");
  const redirectUrl = `${window.location.origin}${window.location.pathname}`;
  await account.createRecovery(email.trim(), redirectUrl);
}
