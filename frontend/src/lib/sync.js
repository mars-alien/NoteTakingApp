import api from './api';
import { db } from './db';

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let syncInProgress = false;
let syncRetryDelay = 1000; 
const MAX_RETRY_DELAY = 60000; 

// Listen to online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    syncRetryDelay = 1000; // Reset retry delay
    triggerSync();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
  });
}

// Get sync status
export const getSyncStatus = () => ({
  isOnline,
  syncInProgress,
});

// Add note to sync queue
export const addToSyncQueue = async (noteId, action, data) => {
  try {
    await db.syncQueue.add({
      noteId,
      action,
      data,
      timestamp: new Date(),
      retries: 0,
    });
    if (isOnline) {
      triggerSync();
    }
  } catch (error) {
    console.error('Error adding to sync queue:', error);
  }
};

/**
 * Sync all pending changes to the server
 * 
 * This function implements a sophisticated sync algorithm:
 * 1. Prevents concurrent syncs with syncInProgress flag
 * 2. Processes queue in chronological order
 * 3. Deduplicates multiple updates to same note (keeps latest)
 * 4. Handles deletions separately before creates/updates
 * 5. Implements conflict resolution (last-write-wins)
 * 6. Uses exponential backoff for retries
 * 
 * @returns {Promise<boolean>} True if sync completed successfully
 */
export const triggerSync = async () => {
  // Prevent concurrent sync operations
  if (!isOnline || syncInProgress) {
    return false;
  }

  syncInProgress = true;

  try {
    // Fetch all queued operations, ordered by timestamp (oldest first)
    const queue = await db.syncQueue.orderBy('timestamp').toArray();
    
    // If no pending changes, just check for server updates
    if (queue.length === 0) {
      await syncFromServer();
      syncInProgress = false;
      return true;
    }

    const notesToSync = [];
    const processedIds = new Set(); // Track which notes we've already processed
    const deleteIds = [];

    /**
     * Process queue items:
     * - Separate deletions from creates/updates
     * - For creates/updates, only keep the latest version of each note
     *   This prevents sending outdated data if user made multiple edits offline
     */
    for (const item of queue) {
      if (item.action === 'delete' && item.data?.id) {
        // Collect all deletions
        deleteIds.push(item.data.id);
      } else if (!processedIds.has(item.noteId)) {
        // Find the latest update for this note (excluding deletes)
        // This ensures we only sync the most recent version
        const latest = queue
          .filter((q) => q.noteId === item.noteId && q.action !== 'delete')
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        
        if (latest) {
          processedIds.add(item.noteId);
          notesToSync.push(latest.data);
        }
      }
    }

    // Handle deletions first
    for (const id of deleteIds) {
      try {
        await api.delete(`/notes/${id}`);
      } catch (error) {
        console.error('Error deleting note on server:', error);
      }
    }

    if (notesToSync.length > 0) {
      const response = await api.post('/notes/sync', { notes: notesToSync });
      const { created, updated, conflicts } = response.data;

      // Update local database with server IDs
      for (const note of [...created, ...updated]) {
        const noteId = note._id || note.id;
        // Try to find by serverId first
        let localNote = await db.notes
          .where('serverId')
          .equals(noteId)
          .first();
        
        // If not found, try to find by matching title/content (for newly created notes)
        if (!localNote) {
          localNote = await db.notes
            .where('title')
            .equals(note.title)
            .and((n) => !n.serverId)
            .first();
        }
        
        if (localNote) {
          await db.notes.update(localNote.id, {
            serverId: noteId,
            title: note.title,
            content: note.content,
            synced: true,
            lastModified: new Date(note.lastModified || note.updatedAt),
          });
        } else {
          // New note from server, add it
          await db.notes.add({
            serverId: noteId,
            title: note.title,
            content: note.content,
            lastModified: new Date(note.lastModified || note.updatedAt),
            synced: true,
            userId: note.userId,
          });
        }
      }

      // Handle conflicts
      if (conflicts && conflicts.length > 0) {
        console.warn('Sync conflicts detected:', conflicts);
        // For now, we'll use server version (last-write-wins)
        for (const conflict of conflicts) {
          if (conflict.serverNote) {
            const localNote = await db.notes
              .where('serverId')
              .equals(conflict.id)
              .first();
            
            if (localNote) {
              await db.notes.update(localNote.id, {
                title: conflict.serverNote.title,
                content: conflict.serverNote.content,
                lastModified: new Date(conflict.serverNote.lastModified || conflict.serverNote.updatedAt),
                synced: true,
              });
            }
          }
        }
      }
    }

    // Remove processed items from queue (including deletions)
    const processedQueueIds = queue
      .filter((q) => processedIds.has(q.noteId) || (q.action === 'delete' && deleteIds.includes(q.data?.id)))
      .map((q) => q.id);
    await db.syncQueue.bulkDelete(processedQueueIds);

    // Sync from server to get any updates
    await syncFromServer();

    syncRetryDelay = 1000; // Reset on success
    return true;
  } catch (error) {
    console.error('Sync error:', error);
    
    // Exponential backoff
    syncRetryDelay = Math.min(syncRetryDelay * 2, MAX_RETRY_DELAY);
    
    // Increment retry count for failed items
    const queue = await db.syncQueue.toArray();
    for (const item of queue) {
      await db.syncQueue.update(item.id, {
        retries: item.retries + 1,
      });
    }

    // Retry after delay
    setTimeout(() => {
      if (isOnline) {
        triggerSync();
      }
    }, syncRetryDelay);
    return false;
  } finally {
    syncInProgress = false;
  }
};

// Sync notes from server
export const syncFromServer = async () => {
  try {
    const lastSync = localStorage.getItem('lastSync');
    const timestamp = lastSync || new Date(0).toISOString();

    const response = await api.get(`/notes/sync/after/${timestamp}`);
    const serverNotes = response.data;

    if (serverNotes && serverNotes.length > 0) {
      for (const note of serverNotes) {
        const noteId = note._id || note.id;
        // Check if note already exists
        const existingNote = await db.notes
          .where('serverId')
          .equals(noteId)
          .first();
        
        if (existingNote) {
          // Update existing note
          await db.notes.update(existingNote.id, {
            title: note.title,
            content: note.content,
            lastModified: new Date(note.lastModified || note.updatedAt),
            synced: true,
          });
        } else {
          // Add new note from server
          await db.notes.add({
            serverId: noteId,
            title: note.title,
            content: note.content,
            lastModified: new Date(note.lastModified || note.updatedAt),
            synced: true,
            userId: note.userId,
          });
        }
      }
    }

    localStorage.setItem('lastSync', new Date().toISOString());
  } catch (error) {
    console.error('Error syncing from server:', error);
  }
};

// Initialize sync on app start
if (typeof window !== 'undefined') {
  // Sync immediately if online
  if (isOnline) {
    setTimeout(triggerSync, 1000);
  }

  // Periodic sync every 30 seconds when online
  setInterval(() => {
    if (isOnline && !syncInProgress) {
      triggerSync();
    }
  }, 30000);
}

