// MSAL IndexedDB Cache Plugin
// See: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/caching.md

const DB_NAME = 'msal_idb_cache';
const STORE_NAME = 'msal';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const msalIdbCachePlugin = {
  beforeCacheAccess: async (cacheContext) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allReq = store.getAll();
    const allKeysReq = store.getAllKeys();
    const [all, allKeys] = await Promise.all([
      new Promise((res, rej) => { allReq.onsuccess = () => res(allReq.result); allReq.onerror = () => rej(allReq.error); }),
      new Promise((res, rej) => { allKeysReq.onsuccess = () => res(allKeysReq.result); allKeysReq.onerror = () => rej(allKeysReq.error); })
    ]);
    const cache = {};
    allKeys.forEach((k, i) => { cache[k] = all[i]; });
    cacheContext.tokenCache.deserialize(JSON.stringify(cache));
  },
  afterCacheAccess: async (cacheContext) => {
    if (cacheContext.cacheHasChanged) {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // Clear store
      const clearReq = store.clear();
      await new Promise((res, rej) => { clearReq.onsuccess = res; clearReq.onerror = () => rej(clearReq.error); });
      // Write all
      const cache = JSON.parse(cacheContext.tokenCache.serialize());
      for (const [key, value] of Object.entries(cache)) {
        store.put(value, key);
      }
      await new Promise((res) => { tx.oncomplete = res; });
    }
  }
}; 