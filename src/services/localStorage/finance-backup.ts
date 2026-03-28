/** Todas as chaves persistidas pelo app usam este prefixo (inclui migrações e legado). */
export const FINANCE_LOCAL_STORAGE_PREFIX = "controle-financeiro."

export type FinanceBackupPayload = {
  app: "controle-financeiro"
  formatVersion: 1
  exportedAt: string
  entries: Record<string, string>
}

function collectFinanceKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(FINANCE_LOCAL_STORAGE_PREFIX)) keys.push(k)
  }
  return keys
}

export function buildFinanceBackupPayload(): FinanceBackupPayload {
  const entries: Record<string, string> = {}
  for (const k of collectFinanceKeys()) {
    const v = localStorage.getItem(k)
    if (v !== null) entries[k] = v
  }
  return {
    app: "controle-financeiro",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    entries,
  }
}

export function financeBackupToJson(payload: FinanceBackupPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`
}

export function clearFinanceLocalStorageKeys(): void {
  for (const k of collectFinanceKeys()) {
    localStorage.removeItem(k)
  }
}

export function parseFinanceBackupJson(raw: string): FinanceBackupPayload {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error("Arquivo não é um JSON válido.")
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Formato de backup inválido.")
  }
  const obj = data as Record<string, unknown>
  const entriesRaw = obj.entries
  if (
    !entriesRaw ||
    typeof entriesRaw !== "object" ||
    Array.isArray(entriesRaw)
  ) {
    throw new Error("O backup precisa conter um objeto \"entries\".")
  }

  const entries: Record<string, string> = {}
  for (const [k, v] of Object.entries(entriesRaw)) {
    if (typeof k !== "string" || !k.startsWith(FINANCE_LOCAL_STORAGE_PREFIX)) {
      continue
    }
    if (typeof v !== "string") continue
    entries[k] = v
  }

  if (Object.keys(entries).length === 0) {
    throw new Error("Nenhuma chave reconhecida do app foi encontrada no arquivo.")
  }

  return {
    app: "controle-financeiro",
    formatVersion: 1,
    exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt : "",
    entries,
  }
}

/** Remove todas as chaves do app e aplica o backup; em seguida recarregue a página. */
export function restoreFinanceBackup(payload: FinanceBackupPayload): void {
  clearFinanceLocalStorageKeys()
  for (const [k, v] of Object.entries(payload.entries)) {
    localStorage.setItem(k, v)
  }
}

export function triggerFinanceBackupDownload(): void {
  const payload = buildFinanceBackupPayload()
  const json = financeBackupToJson(payload)
  const blob = new Blob([json], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const day = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `controle-financeiro-backup-${day}.json`
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
