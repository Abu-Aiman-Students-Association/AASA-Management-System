import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PUBLIC_API_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "sb_publishable_-nxBJ_GpzXqHTqMScffyvw_PTFoQ1xR";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);
  if (req.headers.get("apikey") !== PUBLIC_API_KEY) return response({ error: "Unauthorized." }, 401);

  let uploadedPath: string | null = null;
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    const payload = await req.json();
    const application = payload?.application;
    const photo = payload?.photo;
    if (!application || typeof application !== "object" || Array.isArray(application)) {
      return response({ error: "Membership application details are required." }, 400);
    }
    if (!photo || typeof photo.data !== "string" || typeof photo.type !== "string") {
      return response({ error: "A member passport photograph is required." }, 400);
    }

    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
    };
    const ext = mimeToExt[photo.type];
    if (!ext) return response({ error: "Upload a JPG or PNG photograph." }, 400);
    if (photo.data.length > 7_000_000) return response({ error: "The photograph must be 5 MB or smaller." }, 413);

    const binary = atob(photo.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.byteLength === 0 || bytes.byteLength > 5 * 1024 * 1024) {
      return response({ error: "The photograph must be between 1 byte and 5 MB." }, 400);
    }
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    if (!(photo.type === "image/jpeg" && isJpeg) && !(photo.type === "image/png" && isPng)) {
      return response({ error: "The uploaded file content does not match its image type." }, 400);
    }

    uploadedPath = `member-applications/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await db.storage.from("aasa-documents").upload(uploadedPath, bytes, {
      contentType: photo.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const submittedApplication = { ...application, photo_path: uploadedPath };
    const { data, error } = await db.rpc("aasa_submit_member_application", {
      p_application: submittedApplication,
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.member_number) throw new Error("The membership application could not be confirmed.");
    return response({ member_number: result.member_number, status: result.status || "pending" });
  } catch (error) {
    if (uploadedPath) await db.storage.from("aasa-documents").remove([uploadedPath]);
    const message = error instanceof Error ? error.message : "Unable to submit the membership application.";
    return response({ error: message }, 400);
  }
});
