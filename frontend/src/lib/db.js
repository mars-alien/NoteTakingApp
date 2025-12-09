import Dexie from 'dexie';

// IndexedDB database for offline storage
export const db = new Dexie('NoteTakingApp');

db.version(1).stores({
  notes: '++id, serverId, title, content, lastModified, synced, userId',
  syncQueue: '++id, noteId, action, data, timestamp, retries',
  user: 'id, email, name, token',
});

export default db;

