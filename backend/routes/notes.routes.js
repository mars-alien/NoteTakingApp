import express from 'express';
import { validationResult } from 'express-validator';
import Note from '../models/Note.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { noCache } from '../middleware/cache.js';
import { validationRules, handleValidationErrors } from '../middleware/sanitize.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Apply no-cache to all note endpoints (user-specific data should not be cached)
router.use(noCache);

/**
 * Get all notes with pagination
 * GET /api/notes?page=1&limit=20
 * 
 * Returns paginated list of user's notes
 * Optimized query with pagination to handle large datasets
 */
router.get('/', async (req, res) => {
  try {
    // Pagination parameters with defaults
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20)); // Max 100 per page
    const skip = (page - 1) * limit;

    // Build query - only fetch notes for current user
    const query = Note.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v') // Exclude version key
      .lean(); // Return plain objects for better performance

    // Execute query and count in parallel for better performance
    const [notes, total] = await Promise.all([
      query.exec(),
      Note.countDocuments({ userId: req.user.id }),
    ]);

    res.json({
      notes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + notes.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Failed to fetch notes', error: error.message });
  }
});

// Get single note
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    if (note.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this note' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch note', error: error.message });
  }
});

/**
 * Create new note
 * POST /api/notes
 * 
 * Creates a new note for the authenticated user
 * Validates title is not empty
 */
router.post(
  '/',
  [
    validationRules.title,
    validationRules.content,
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content } = req.body;
      const note = new Note({
        userId: req.user.id,
        title,
        content: content || '',
        synced: true,
      });
      await note.save();
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create note', error: error.message });
    }
  }
);

// Update note
router.patch('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    if (note.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this note' });
    }

    if (req.body.title !== undefined) note.title = req.body.title;
    if (req.body.content !== undefined) note.content = req.body.content;
    note.lastModified = new Date();
    note.synced = true;

    await note.save();
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update note', error: error.message });
  }
});

// Delete note
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    if (note.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this note' });
    }

    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete note', error: error.message });
  }
});

// Sync notes
router.post('/sync', async (req, res) => {
  try {
    const { notes } = req.body;
    if (!Array.isArray(notes)) {
      return res.status(400).json({ message: 'Notes must be an array' });
    }

    const results = {
      created: [],
      updated: [],
      conflicts: [],
    };

    for (const syncNote of notes) {
      try {
        if (syncNote.id) {
          // Update existing note
          const existingNote = await Note.findById(syncNote.id);
          if (existingNote) {
            if (existingNote.userId.toString() !== req.user.id) {
              results.conflicts.push({
                id: syncNote.id,
                reason: 'Unauthorized',
              });
              continue;
            }

            // Conflict resolution: last-write-wins
            const syncDate = syncNote.lastModified
              ? new Date(syncNote.lastModified)
              : new Date();
            if (syncDate >= existingNote.lastModified) {
              existingNote.title = syncNote.title;
              existingNote.content = syncNote.content || '';
              existingNote.lastModified = syncDate;
              existingNote.synced = true;
              await existingNote.save();
              results.updated.push(existingNote);
            } else {
              results.conflicts.push({
                id: syncNote.id,
                reason: 'Server version is newer',
                serverNote: existingNote,
              });
            }
          } else {
            // Note was deleted on server, create new one
            const newNote = new Note({
              title: syncNote.title,
              content: syncNote.content || '',
              userId: req.user.id,
              lastModified: syncNote.lastModified ? new Date(syncNote.lastModified) : new Date(),
              synced: true,
            });
            await newNote.save();
            results.created.push(newNote);
          }
        } else {
          // Create new note
          const newNote = new Note({
            title: syncNote.title,
            content: syncNote.content || '',
            userId: req.user.id,
            lastModified: syncNote.lastModified ? new Date(syncNote.lastModified) : new Date(),
            synced: true,
          });
          await newNote.save();
          results.created.push(newNote);
        }
      } catch (error) {
        results.conflicts.push({
          id: syncNote.id,
          reason: error.message,
        });
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Sync failed', error: error.message });
  }
});

// Get notes after timestamp
router.get('/sync/after/:timestamp', async (req, res) => {
  try {
    const timestamp = new Date(req.params.timestamp);
    const notes = await Note.find({
      userId: req.user.id,
      updatedAt: { $gte: timestamp },
    })
      .sort({ updatedAt: -1 })
      .exec();
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notes', error: error.message });
  }
});

export default router;

