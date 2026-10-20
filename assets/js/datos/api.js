// Elige el back-end según config.js. El sitio y el panel solo importan esto.
import { CONFIG } from "../../../config.js";

let promesa = null;

export function api() {
  if (!promesa) {
    const usarSupabase = CONFIG.backend === "supabase" && CONFIG.supabase.url && CONFIG.supabase.anonKey;
    if (CONFIG.backend === "supabase" && !usarSupabase) {
      console.warn("config.js: backend \"supabase\" sin url o anonKey; se usa el modo demo.");
    }
    promesa = usarSupabase
      ? import("./supabase.js").then((m) => m.supabase)
      : import("./demo.js").then((m) => m.demo);
  }
  return promesa;
}
