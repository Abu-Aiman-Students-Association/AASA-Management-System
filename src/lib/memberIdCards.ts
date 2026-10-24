import { ID, Permission, Role, Storage } from "appwrite";
import { appwriteClient, appwriteConfigReady } from "./appwrite";

/**
 * Appwrite bucket created for member ID card files.
 * Keep this ID aligned with the existing AASA Member ID Cards bucket.
 */
export const AASA_MEMBER_ID_CARDS_BUCKET_ID = "6adcad6600158bd47ac5";

const storage = new Storage(appwriteClient);

function requireAppwriteConfig() {
  if (!appwriteConfigReady) {
    throw new Error("Appwrite is not configured. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.");
  }
}

/**
 * Upload a generated member card PDF or image and return the Appwrite file ID.
 * Store the returned ID in member_profiles.id_card_file_id only after the
 * corresponding member record has been successfully updated.
 *
 * Access remains private by default; do not grant public read access to ID cards.
 */
export async function uploadMemberIdCard(
  file: File,
  memberUserId?: string,
): Promise<{ fileId: string; fileName: string }> {
  requireAppwriteConfig();

  const permissions = memberUserId
    ? [
        Permission.read(Role.user(memberUserId)),
        Permission.update(Role.user(memberUserId)),
        Permission.delete(Role.user(memberUserId)),
      ]
    : undefined;

  const uploaded = await storage.createFile({
    bucketId: AASA_MEMBER_ID_CARDS_BUCKET_ID,
    fileId: ID.unique(),
    file,
    ...(permissions ? { permissions } : {}),
  });

  return { fileId: uploaded.$id, fileName: uploaded.name };
}

/** Get a browser preview URL for a previously uploaded card file. */
export function getMemberIdCardPreviewUrl(fileId: string): string {
  requireAppwriteConfig();
  return storage.getFileView({
    bucketId: AASA_MEMBER_ID_CARDS_BUCKET_ID,
    fileId,
  }).toString();
}

/** Get a browser download URL for a previously uploaded card file. */
export function getMemberIdCardDownloadUrl(fileId: string): string {
  requireAppwriteConfig();
  return storage.getFileDownload({
    bucketId: AASA_MEMBER_ID_CARDS_BUCKET_ID,
    fileId,
  }).toString();
}
