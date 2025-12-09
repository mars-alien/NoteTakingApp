'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { format } from 'date-fns';

export default function NoteSidebar({ selectedNoteId, onSelectNote, onNewNote, searchQuery }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
    
    // Refresh notes periodically
    const interval = setInterval(loadNotes, 2000);
    return () => clearInterval(interval);
  }, [searchQuery]);

  const loadNotes = async () => {
    try {
      let allNotes = await db.notes.orderBy('lastModified').reverse().toArray();
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        allNotes = allNotes.filter(
          (note) =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query)
        );
      }

      setNotes(allNotes);
      setLoading(false);
    } catch (error) {
      console.error('Error loading notes:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (noteId, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await db.notes.delete(noteId);
        await loadNotes();
        if (selectedNoteId === noteId) {
          onSelectNote(null);
        }
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="w-64 bg-gray-100 dark:bg-gray-800 p-4">
        <div className="animate-pulse">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="w-64 sm:w-72 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 flex flex-col h-screen">
      <div className="p-3 sm:p-4 border-b border-gray-300 dark:border-gray-700">
        <button
          onClick={onNewNote}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-colors"
        >
          + New Note
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="p-4 text-gray-500 dark:text-gray-400 text-center">
            {searchQuery ? 'No notes found' : 'No notes yet'}
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={`p-3 sm:p-4 border-b border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                selectedNoteId === note.id
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <h3 className="font-semibold text-sm truncate flex-1">
                  {note.title || 'Untitled'}
                </h3>
                <button
                  onClick={(e) => handleDelete(note.id, e)}
                  className="ml-2 h-7 w-7 flex-shrink-0 inline-flex items-center justify-center rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                {note.content?.replace(/<[^>]*>/g, '').substring(0, 50) || 'No content'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {format(new Date(note.lastModified), 'MMM d, yyyy')}
                </span>
                {!note.synced && (
                  <span className="text-xs text-orange-500">●</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

