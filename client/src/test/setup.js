import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock MSAL
const mockMsalInstance = {
  initialize: vi.fn().mockResolvedValue(undefined),
  loginPopup: vi.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresOn: new Date(Date.now() + 3600000).toISOString(),
  }),
  logoutPopup: vi.fn().mockResolvedValue(undefined),
  getActiveAccount: vi.fn().mockReturnValue({
    id: 'mock-account-id',
    name: 'Mock User',
  }),
  setActiveAccount: vi.fn(),
  addEventCallback: vi.fn().mockReturnValue('mock-callback-id'),
  removeEventCallback: vi.fn(),
  getAllAccounts: vi.fn().mockReturnValue([]),
  handleRedirectPromise: vi.fn().mockResolvedValue(null),
};

// Mock PublicClientApplication
vi.mock('@azure/msal-browser', () => ({
  PublicClientApplication: vi.fn().mockImplementation(() => mockMsalInstance),
  EventType: {
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    LOGOUT_SUCCESS: 'logout_success',
    LOGOUT_FAILURE: 'logout_failure',
  },
}));

// Mock IndexedDB
class MockIDBDatabase {
  constructor(name) {
    this.name = name;
    this.objectStores = new Map();
  }
  
  createObjectStore(name, options = {}) {
    const store = new MockIDBObjectStore(name, options);
    this.objectStores.set(name, store);
    return store;
  }
  
  transaction(storeNames, mode = 'readonly') {
    return new MockIDBTransaction(this, storeNames, mode);
  }
  
  close() {}
}

class MockIDBObjectStore {
  constructor(name, options = {}) {
    this.name = name;
    this.keyPath = options.keyPath;
    this.autoIncrement = options.autoIncrement || false;
    this.data = new Map();
  }
  
  put(value, key) {
    const finalKey = key || value[this.keyPath];
    this.data.set(finalKey, value);
    return new MockIDBRequest(value);
  }
  
  get(key) {
    const value = this.data.get(key);
    return new MockIDBRequest(value);
  }
  
  delete(key) {
    this.data.delete(key);
    return new MockIDBRequest(undefined);
  }
  
  clear() {
    this.data.clear();
    return new MockIDBRequest(undefined);
  }
  
  openCursor() {
    const entries = Array.from(this.data.entries());
    return new MockIDBRequest(entries.length > 0 ? { key: entries[0][0], value: entries[0][1] } : null);
  }
}

class MockIDBTransaction {
  constructor(database, storeNames, mode) {
    this.database = database;
    this.storeNames = Array.isArray(storeNames) ? storeNames : [storeNames];
    this.mode = mode;
    this.error = null;
  }
  
  objectStore(name) {
    return this.database.objectStores.get(name);
  }
  
  async done() {
    return Promise.resolve();
  }
}

class MockIDBRequest {
  constructor(result) {
    this.result = result;
    this.error = null;
    this.readyState = 'done';
    this.onsuccess = null;
    this.onerror = null;
    
    // Simulate async behavior
    setTimeout(() => {
      if (this.onsuccess) {
        this.onsuccess({ target: this });
      }
    }, 0);
  }
  
  addEventListener(event, handler) {
    if (event === 'success') {
      this.onsuccess = handler;
    } else if (event === 'error') {
      this.onerror = handler;
    }
  }
  
  removeEventListener(event, handler) {
    if (event === 'success') {
      this.onsuccess = null;
    } else if (event === 'error') {
      this.onerror = null;
    }
  }
  
  _trigger(event) {
    if (event === 'success' && this.onsuccess) {
      this.onsuccess({ target: this });
    } else if (event === 'error' && this.onerror) {
      this.onerror({ target: this });
    }
  }
}

// Mock indexedDB
const mockIndexedDB = {
  open: vi.fn().mockImplementation((name) => {
    const db = new MockIDBDatabase(name);
    const request = new MockIDBRequest(db);
    
    // Simulate database upgrade
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    
    return request;
  }),
  deleteDatabase: vi.fn().mockImplementation((name) => {
    return new MockIDBRequest(undefined);
  }),
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock crypto
const mockCrypto = {
  getRandomValues: vi.fn().mockImplementation((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  },
};

// Mock fetch
global.fetch = vi.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock window.open
window.open = vi.fn();

// Mock window.confirm
window.confirm = vi.fn().mockReturnValue(true);

// Mock window.alert
window.alert = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Set up global mocks
global.indexedDB = mockIndexedDB;
global.localStorage = mockLocalStorage;
global.sessionStorage = mockSessionStorage;

// Mock crypto using Object.defineProperty to avoid getter/setter issues
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
  configurable: true,
});

// Mock IDB types for the idb library
global.IDBDatabase = MockIDBDatabase;
global.IDBObjectStore = MockIDBObjectStore;
global.IDBTransaction = MockIDBTransaction;
global.IDBRequest = MockIDBRequest;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Export mock instances for tests to use
export { mockMsalInstance, mockIndexedDB, mockLocalStorage, mockSessionStorage };

// Add missing IndexedDB globals for idb compatibility
if (typeof global !== 'undefined') {
  global.IDBIndex = class {};
  global.IDBObjectStore = class {};
  global.IDBCursor = class {};
  global.IDBTransaction = class {};
  global.IDBDatabase = class {};
} 