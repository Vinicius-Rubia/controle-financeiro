export interface EntityRepositoryConfig<T extends { id: string }> {
  storageKey: string
  /** Interpreta e valida um item vindo do JSON (tolerante a legado / lixo). */
  parseItem: (raw: unknown) => T | null
}

function readRawArray(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeRawArray(key: string, items: unknown[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

function listValidated<T extends { id: string }>(
  key: string,
  parseItem: (raw: unknown) => T | null
): T[] {
  const out: T[] = []
  for (const raw of readRawArray(key)) {
    const item = parseItem(raw)
    if (item) out.push(item)
  }
  return out
}

/** Lê uma chave qualquer (ex.: legado) e retorna só itens válidos. */
export function parseStoredCollection<T extends { id: string }>(
  key: string,
  parseItem: (raw: unknown) => T | null
): T[] {
  return listValidated(key, parseItem)
}

/**
 * Repositório genérico em localStorage: listar, buscar, criar, atualizar e remover
 * com validação na leitura (itens inválidos são ignorados) e antes de gravar.
 */
export function createLocalStorageRepository<T extends { id: string }>(
  config: EntityRepositoryConfig<T>
) {
  const { storageKey, parseItem } = config

  function list(): T[] {
    return listValidated(storageKey, parseItem)
  }

  function getById(id: string): T | undefined {
    if (!id) return undefined
    return list().find((item) => item.id === id)
  }

  function assertSavable(item: T): void {
    const roundTrip = parseItem(item)
    if (!roundTrip || roundTrip.id !== item.id) {
      throw new Error("Dados inválidos para persistência.")
    }
  }

  function create(
    build: () => T
  ): T {
    const entity = build()
    assertSavable(entity)
    const next = [...list(), entity]
    writeRawArray(
      storageKey,
      next.map((x) => ({ ...x }))
    )
    return entity
  }

  function update(
    id: string,
    patch: Partial<Omit<T, "id">>
  ): T | null {
    const items = list()
    const index = items.findIndex((x) => x.id === id)
    if (index === -1) return null

    const merged = {
      ...items[index],
      ...patch,
      id: items[index].id,
    } as T

    assertSavable(merged)

    const next = [...items]
    next[index] = merged
    writeRawArray(
      storageKey,
      next.map((x) => ({ ...x }))
    )
    return merged
  }

  function remove(id: string): boolean {
    const items = list()
    const next = items.filter((x) => x.id !== id)
    if (next.length === items.length) return false
    writeRawArray(
      storageKey,
      next.map((x) => ({ ...x }))
    )
    return true
  }

  function replaceAll(items: T[]): void {
    for (const item of items) assertSavable(item)
    writeRawArray(
      storageKey,
      items.map((x) => ({ ...x }))
    )
  }

  return {
    list,
    getById,
    create,
    update,
    remove,
    replaceAll,
  }
}

export type LocalStorageRepository<T extends { id: string }> = ReturnType<
  typeof createLocalStorageRepository<T>
>
