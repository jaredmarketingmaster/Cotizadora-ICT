// Corre una función de Supabase en un puerto fijo (Deno.serve no lee PORT).
//   deno run --allow-net --allow-env --allow-read tests/funciones/servir.ts <puerto> <archivo>
const puerto = Number(Deno.args[0]);
const original = Deno.serve.bind(Deno);
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (manejador: Deno.ServeHandler) =>
  original({ port: puerto, hostname: "127.0.0.1", onListen() {} }, manejador);
await import(new URL(Deno.args[1], `file://${Deno.cwd()}/`).href);
