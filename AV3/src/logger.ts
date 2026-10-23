/** Log estruturado (uma linha JSON por evento), pronto para ser analisado depois. */
export function logEstruturado(
  nivel: "info" | "warn" | "error",
  evento: string,
  dados: Record<string, unknown> = {}
): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), nivel, evento, ...dados }));
}
