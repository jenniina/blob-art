const BLOB_MIGRATION_PREFIX = '__blob_art_migration__:'

const BLOB_STORAGE_KEY_PATTERN =
  /^(BlobCanvasSize|BlobCanvasOffset|BlobLayerAmount|BackgroundColor|Draggables)\d+$/

interface BlobMigrationPayload {
  source?: string
  timestamp?: number
  storage: Record<string, string>
}

function hasExistingBlobStorage(storageObject: Storage) {
  for (let index = 0; index < storageObject.length; index += 1) {
    const key = storageObject.key(index)
    if (key && BLOB_STORAGE_KEY_PATTERN.test(key)) {
      return true
    }
  }

  return false
}

export function applyBlobMigrationFromWindowName() {
  if (typeof window === 'undefined') return

  const rawName = window.name
  if (!rawName.startsWith(BLOB_MIGRATION_PREFIX)) return

  try {
    if (hasExistingBlobStorage(window.localStorage)) {
      return
    }

    const payload = JSON.parse(
      rawName.slice(BLOB_MIGRATION_PREFIX.length)
    ) as BlobMigrationPayload

    for (const [key, value] of Object.entries(payload.storage ?? {})) {
      if (!BLOB_STORAGE_KEY_PATTERN.test(key) || typeof value !== 'string') {
        continue
      }

      window.localStorage.setItem(key, value)
    }
  } catch (error) {
    console.error('Failed to import blob migration payload:', error)
  } finally {
    if (window.name.startsWith(BLOB_MIGRATION_PREFIX)) {
      window.name = ''
    }
  }
}

export function createBlobMigrationWindowName(
  storage: Record<string, string>,
  source = typeof window !== 'undefined' ? window.location.origin : undefined
) {
  return `${BLOB_MIGRATION_PREFIX}${JSON.stringify({
    source,
    timestamp: Date.now(),
    storage,
  })}`
}

export function collectBlobMigrationStorage(storageObject: Storage) {
  const storage: Record<string, string> = {}

  for (let index = 0; index < storageObject.length; index += 1) {
    const key = storageObject.key(index)
    if (!key || !BLOB_STORAGE_KEY_PATTERN.test(key)) continue

    const value = storageObject.getItem(key)
    if (value != null) {
      storage[key] = value
    }
  }

  return storage
}
