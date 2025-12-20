import { ref, shallowRef } from 'vue'

/**
 * Generic IndexedDB composable for Vue 3
 * Provides a Promise-based API for IndexedDB operations
 */
export function useIndexedDB(dbName, version = 1) {
  const db = shallowRef(null)
  const error = ref(null)
  const isReady = ref(false)

  /**
   * Open the database and run upgrade callback if needed
   * @param {Function} upgradeCallback - Called during database upgrade
   * @returns {Promise<IDBDatabase>}
   */
  async function open(upgradeCallback) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version)

      request.onerror = () => {
        error.value = request.error?.message || 'Failed to open database'
        reject(request.error)
      }

      request.onsuccess = () => {
        db.value = request.result
        isReady.value = true
        error.value = null
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const database = event.target.result
        if (upgradeCallback) {
          upgradeCallback(database, event.oldVersion, event.newVersion)
        }
      }
    })
  }

  /**
   * Close the database connection
   */
  function close() {
    if (db.value) {
      db.value.close()
      db.value = null
      isReady.value = false
    }
  }

  /**
   * Add a record to a store
   * @param {string} storeName - Object store name
   * @param {object} data - Data to add
   * @returns {Promise<IDBValidKey>} - The key of the added record
   */
  async function add(storeName, data) {
    return new Promise((resolve, reject) => {
      if (!db.value) {
        reject(new Error('Database not open'))
        return
      }

      const transaction = db.value.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(data)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get a record by key
   * @param {string} storeName - Object store name
   * @param {IDBValidKey} key - Record key
   * @returns {Promise<object>}
   */
  async function get(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!db.value) {
        reject(new Error('Database not open'))
        return
      }

      const transaction = db.value.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all records from a store
   * @param {string} storeName - Object store name
   * @returns {Promise<Array>}
   */
  async function getAll(storeName) {
    return new Promise((resolve, reject) => {
      if (!db.value) {
        reject(new Error('Database not open'))
        return
      }

      const transaction = db.value.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all records matching an index value
   * @param {string} storeName - Object store name
   * @param {string} indexName - Index name
   * @param {IDBValidKey} value - Value to match
   * @returns {Promise<Array>}
   */
  async function getAllByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      if (!db.value) {
        reject(new Error('Database not open'))
        return
      }

      const transaction = db.value.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all unique values from an index
   * @param {string} storeName - Object store name
   * @param {string} indexName - Index name
   * @returns {Promise<Array>}
   */
  async function getAllKeys(storeName, indexName) {
    return new Promise((resolve, reject) => {
      if (!db.value) {
        reject(new Error('Database not open'))
        return
      }

      const transaction = db.value.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)

      if (indexName) {
        const index = store.index(indexName)
        const request = index.getAllKeys()
        request.onsuccess = () => {
          // Get unique values
          const unique = [...new Set(request.result)]
          resolve(unique)
        }
        request.onerror = () => reject(request.error)
      } else {
        const request = store.getAllKeys()
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      }
    })
  }

  /**
   * Update a record (or insert if not exists)
   * @param {string} storeName - Object store name
   * @param {object} data - Data to update
   * @returns {Promise<IDBValidKey>}
   */
  async function put(storeName, data) {
    return new Promise((resolve, reject) => {
      if (!db.value) {
        reject(new Error('Database not open'))
        return
      }

      const transaction = db.value.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete a record by key
   * @param {string} storeName - Object store name
   * @param {IDBValidKey} key - Record key
   * @returns {Promise<void>}
   */
  async function remove(storeName, key) {
    return new Promise((resolve, reject) => {
      if (!db.value) {
        reject(new Error('Database not open'))
        return
      }

      const transaction = db.value.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete all records matching an index value
   * @param {string} storeName - Object store name
   * @param {string} indexName - Index name
   * @param {IDBValidKey} value - Value to match
   * @returns {Promise<number>} - Number of deleted records
   */
  async function removeByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      if (!db.value) {
        reject(new Error('Database not open'))
        return
      }

      const transaction = db.value.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.openCursor(IDBKeyRange.only(value))

      let count = 0

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          cursor.delete()
          count++
          cursor.continue()
        } else {
          resolve(count)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all records from a store
   * @param {string} storeName - Object store name
   * @returns {Promise<void>}
   */
  async function clear(storeName) {
    return new Promise((resolve, reject) => {
      if (!db.value) {
        reject(new Error('Database not open'))
        return
      }

      const transaction = db.value.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Count records in a store
   * @param {string} storeName - Object store name
   * @param {string} indexName - Optional index name
   * @param {IDBValidKey} value - Optional value to count
   * @returns {Promise<number>}
   */
  async function count(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      if (!db.value) {
        reject(new Error('Database not open'))
        return
      }

      const transaction = db.value.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)

      let request
      if (indexName && value !== undefined) {
        const index = store.index(indexName)
        request = index.count(value)
      } else {
        request = store.count()
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete the entire database
   * @returns {Promise<void>}
   */
  async function deleteDatabase() {
    close()
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  return {
    // State
    db,
    error,
    isReady,

    // Methods
    open,
    close,
    add,
    get,
    getAll,
    getAllByIndex,
    getAllKeys,
    put,
    remove,
    removeByIndex,
    clear,
    count,
    deleteDatabase
  }
}

export default useIndexedDB
