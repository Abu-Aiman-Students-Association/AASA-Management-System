import { Client } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;

export const appwriteConfigReady = Boolean(endpoint && projectId);

export const appwriteClient = new Client();

if (endpoint && projectId) {
  appwriteClient.setEndpoint(endpoint).setProject(projectId);
}

export async function checkAppwriteConnection(): Promise<void> {
  if (!appwriteConfigReady) {
    throw new Error("Appwrite settings are missing. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.");
  }

  // Appwrite's client ping verifies that the configured endpoint is reachable.
  await appwriteClient.ping();
}