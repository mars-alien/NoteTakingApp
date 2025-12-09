'use client';

import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { addToSyncQueue, triggerSync } from '@/lib/sync';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Lazy load heavy components for code splitting and better performance
const NoteSidebar = lazy(() => import('@/components/NoteSidebar'));
const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));
const ConnectionIndicator = lazy(() => import('@/components/ConnectionIndicator'));

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [currentNote, setCurrentNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isOnline } = useConnectionStatus();
  const saveTimeoutRef = useRef(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    initializeDefaultNotes(parsedUser);

    // initialize theme state
    setIsDark(document.documentElement.classList.contains('dark'));
  }, [router]);

  const initializeDefaultNotes = async (userData) => {
    try {
      if (!userData) return;

      // Prevent reseeding on fast refresh or repeat mounts
      const seededKey = `seeded_demo_notes_${userData.id}`;
      const alreadySeeded = localStorage.getItem(seededKey) === 'true';
      const userNoteCount = await db.notes.where('userId').equals(userData.id).count();
      if (alreadySeeded || userNoteCount > 0) {
        await cleanupDuplicateDemoNotes(userData.id);
        return;
      }

      const demoNotes = [
        {
          title: 'Welcome to Your Notes',
          content:
            '<h1>Welcome to Your Notes!</h1><p>This is a powerful note-taking application with offline support.</p><h2>Features:</h2><ul><li><strong>Offline Support:</strong> Work without internet connection</li><li><strong>Auto-Save:</strong> Changes are saved automatically</li><li><strong>Rich Text:</strong> Format your notes with headings, lists, and more</li><li><strong>Multi-Device:</strong> Sync across your devices</li></ul><p>Start typing to create your first note!</p>',
        },
        {
          title: 'Try Me Offline!',
          content:
            '<h1>Test Offline Functionality</h1><p>To test offline features:</p><ol><li>Disconnect your internet</li><li>Create or edit a note</li><li>See the orange "Offline" indicator</li><li>Reconnect to sync your changes</li></ol><p>The app will automatically sync when you come back online.</p>',
        },
      ];

      for (const note of demoNotes) {
        const existing = await db.notes
          .where('title')
          .equals(note.title)
          .and((n) => n.userId === userData.id)
          .first();

        if (!existing) {
          const payload = {
            ...note,
            serverId: null,
            lastModified: new Date(),
            synced: false,
            userId: userData.id,
          };

          await db.notes.add(payload);
          await addToSyncQueue(null, 'create', {
            title: payload.title,
            content: payload.content,
            lastModified: payload.lastModified.toISOString(),
          });
        }
      }

      if (isOnline) {
        triggerSync();
      }

      localStorage.setItem(seededKey, 'true');
      await cleanupDuplicateDemoNotes(userData.id);
    } catch (error) {
      console.error('Error initializing default notes:', error);
    }
  };

  // Remove duplicate seeded demo notes (keep the newest per title/user)
  const cleanupDuplicateDemoNotes = async (userId) => {
    try {
      const demoTitles = ['Welcome to Your Notes', 'Try Me Offline!'];
      for (const title of demoTitles) {
        const notes = await db.notes
          .where('title')
          .equals(title)
          .and((n) => n.userId === userId)
          .sortBy('lastModified');

        if (notes.length > 1) {
          // Keep the newest, delete the rest
          const toDelete = notes.slice(0, -1).map((n) => n.id);
          await db.notes.bulkDelete(toDelete);
        }
      }
    } catch (error) {
      console.error('Error cleaning demo note duplicates:', error);
    }
  };

  const handleSelectNote = async (noteId) => {
    if (!noteId) {
      setSelectedNoteId(null);
      setCurrentNote(null);
      return;
    }

    try {
      const note = await db.notes.get(noteId);
      if (note) {
        setSelectedNoteId(noteId);
        setCurrentNote(note);
      }
    } catch (error) {
      console.error('Error loading note:', error);
      toast.error('Failed to load note');
    }
  };

  const handleNewNote = () => {
    setSelectedNoteId(null);
    setCurrentNote({
      title: '',
      content: '',
      lastModified: new Date(),
      synced: false,
      serverId: null,
      userId: user?.id,
    });
  };

  const handleTitleChange = (title) => {
    if (!currentNote) return;

    const updatedNote = {
      ...currentNote,
      title,
      lastModified: new Date(),
      synced: false,
    };

    setCurrentNote(updatedNote);
    debouncedSave(updatedNote);
  };

  const handleContentChange = (content) => {
    if (!currentNote) return;

    const updatedNote = {
      ...currentNote,
      content,
      lastModified: new Date(),
      synced: false,
    };

    setCurrentNote(updatedNote);
    debouncedSave(updatedNote);
  };

  /**
   * Debounced save function
   * 
   * Implements auto-save with debouncing to:
   * - Reduce database writes (performance optimization)
   * - Batch rapid changes into single save operation
   * - Prevent excessive API calls
   * 
   * Debounce delay: 800ms (good balance between responsiveness and efficiency)
   */
  const debouncedSave = async (note) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const markSyncedIfNoQueue = async (noteId) => {
      if (!noteId) return;
      const pending = await db.syncQueue.count();
      if (pending === 0) {
        await db.notes.update(noteId, { synced: true });
        const fresh = await db.notes.get(noteId);
        if (fresh) setCurrentNote(fresh);
      }
    };

    const refreshCurrent = async (id) => {
      if (!id) return;
      const fresh = await db.notes.get(id);
      if (fresh) {
        setCurrentNote(fresh);
      }
    };
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (note.id) {
          // Update existing note
          await db.notes.update(note.id, {
            ...note,
            synced: false,
          });
          await addToSyncQueue(note.serverId || note.id, 'update', {
            id: note.serverId,
            title: note.title,
            content: note.content,
            lastModified: note.lastModified.toISOString(),
          });
        } else {
          // Create new note
          const { id, ...noteData } = note;
          const newId = await db.notes.add({
            ...noteData,
            serverId: note.serverId || null,
            userId: note.userId || user?.id,
            synced: false,
          });
          const savedNote = await db.notes.get(newId);
          setCurrentNote(savedNote);
          setSelectedNoteId(newId);
          await addToSyncQueue(null, 'create', {
            title: note.title,
            content: note.content,
            lastModified: note.lastModified.toISOString(),
          });
          note.id = newId; // so refresh uses the new id
        }

        if (isOnline) {
          await triggerSync();
          await refreshCurrent(note.id || note.serverId);
          await markSyncedIfNoQueue(note.id);
        } else {
          toast.success('Saved locally (offline)');
        }
      } catch (error) {
        console.error('Error saving note:', error);
        toast.error('Failed to save note');
      }
    }, 800); // 800ms debounce
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
      <Suspense fallback={null}>
        <ConnectionIndicator />
      </Suspense>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Suspense fallback={<div className="w-64 bg-gray-100 dark:bg-gray-800 p-4">Loading...</div>}>
          <NoteSidebar
          selectedNoteId={selectedNoteId}
          onSelectNote={(id) => {
            handleSelectNote(id);
            setSidebarOpen(false); // Close sidebar on mobile after selection
          }}
          onNewNote={() => {
            handleNewNote();
            setSidebarOpen(false); // Close sidebar on mobile after new note
          }}
            searchQuery={searchQuery}
          />
        </Suspense>
      </div>
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="border-b border-gray-300 dark:border-gray-700 p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Email - hidden on mobile */}
            <span className="hidden sm:inline text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px] lg:max-w-none">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">Logout</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <button
              onClick={toggleTheme}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:shadow transition-transform duration-150 hover:scale-105 flex items-center justify-center"
            >
              {isDark ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5" strokeWidth="2" />
                  <path strokeWidth="2" strokeLinecap="round" d="M12 2v2m0 16v2m10-10h-2M6 12H4m13.66 6.66l-1.42-1.42M7.76 7.76 6.34 6.34m12.02 0l-1.42 1.42M7.76 16.24l-1.42 1.42" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {currentNote ? (
            <div className="max-w-4xl mx-auto">
              <input
                type="text"
                value={currentNote.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Note title..."
                className="w-full text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 p-2 border-b border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none dark:text-white"
              />
              <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Last modified: {format(new Date(currentNote.lastModified), 'PPpp')}
              </div>
              <Suspense fallback={<div className="border rounded-lg p-4">Loading editor...</div>}>
                <RichTextEditor
                  content={currentNote.content}
                  onChange={handleContentChange}
                  placeholder="Start typing your note..."
                />
              </Suspense>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-10 sm:mt-20">
              <h2 className="text-xl sm:text-2xl mb-2 sm:mb-4">Select a note or create a new one</h2>
              <p className="text-sm sm:text-base">Your notes will be saved automatically</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
