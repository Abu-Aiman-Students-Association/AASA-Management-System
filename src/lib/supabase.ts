import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL || "https://pedmroseihpaflbzqgkf.supabase.co";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_-nxBJ_GpzXqHTqMScffyvw_PTFoQ1xR";
export const supabaseConfigReady = Boolean(url && key);
export const SUPER_ADMIN_EMAIL = "abuaimanstudents@gmail.com";
export const supabase = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
