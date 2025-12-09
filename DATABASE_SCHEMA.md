# Database Schema Documentation

This document describes the database schemas used in the Note Taking App.

## MongoDB Schema (Backend)

### Users Collection

**Collection Name:** `users`

**Schema:**
```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated ID
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true                   // Stored as bcrypt hash
  },
  name: {
    type: String                    // Optional user name
  },
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}
```

**Indexes:**
- `email` (unique index)

**Pre-save Hook:**
- Password is automatically hashed using bcrypt before saving

**Methods:**
- `comparePassword(password)`: Compares plain password with hashed password

**Example Document:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "password": "$2b$10$hashedpassword...",
  "name": "John Doe",
  "createdAt": "2025-12-09T10:00:00.000Z",
  "updatedAt": "2025-12-09T10:00:00.000Z"
}
```

### Notes Collection

**Collection Name:** `notes`

**Schema:**
```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated ID
  userId: {
    type: ObjectId,
    ref: 'User',
    required: true                  // References Users collection
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''                     // HTML content from TipTap editor
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  synced: {
    type: Boolean,
    default: true                   // Sync status flag
  },
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}
```

**Indexes:**
- Compound index: `{ userId: 1, updatedAt: -1 }` (for efficient user-specific queries sorted by update time)

**Example Document:**
```json
{
  "_id": "507f191e810c19729de860ea",
  "userId": "507f1f77bcf86cd799439011",
  "title": "My First Note",
  "content": "<h1>Welcome</h1><p>This is my first note.</p>",
  "lastModified": "2025-12-09T10:00:00.000Z",
  "synced": true,
  "createdAt": "2025-12-09T10:00:00.000Z",
  "updatedAt": "2025-12-09T10:00:00.000Z"
}
```

## IndexedDB Schema (Frontend)

**Database Name:** `NoteTakingApp`

**Version:** 1

### Notes Store

**Store Name:** `notes`

**Key Path:** `++id` (auto-incrementing primary key)

**Indexes:**
- `serverId` (String) - MongoDB document ID
- `title` (String)
- `content` (String)
- `lastModified` (Date)
- `synced` (Boolean)
- `userId` (String)

**Schema:**
```javascript
{
  id: Number,                       // Auto-increment primary key
  serverId: String | null,          // MongoDB _id (null if not synced)
  title: String,
  content: String,                  // HTML content
  lastModified: Date,
  synced: Boolean,                  // Sync status
  userId: String                    // User ID
}
```

**Example Record:**
```javascript
{
  id: 1,
  serverId: "507f191e810c19729de860ea",
  title: "My First Note",
  content: "<h1>Welcome</h1><p>This is my first note.</p>",
  lastModified: new Date("2025-12-09T10:00:00.000Z"),
  synced: true,
  userId: "507f1f77bcf86cd799439011"
}
```

### Sync Queue Store

**Store Name:** `syncQueue`

**Key Path:** `++id` (auto-incrementing primary key)

**Indexes:**
- `noteId` (Number) - Local note ID
- `action` (String) - 'create', 'update', or 'delete'
- `timestamp` (Date) - For ordering sync operations

**Schema:**
```javascript
{
  id: Number,                       // Auto-increment primary key
  noteId: Number | null,            // Local note ID (null for creates)
  action: String,                   // 'create' | 'update' | 'delete'
  data: Object,                     // Note data payload
  timestamp: Date,                  // When the change was made
  retries: Number                   // Number of sync retry attempts
}
```

**Example Record:**
```javascript
{
  id: 1,
  noteId: 1,
  action: "update",
  data: {
    id: "507f191e810c19729de860ea",
    title: "Updated Title",
    content: "<p>Updated content</p>",
    lastModified: "2025-12-09T10:30:00.000Z"
  },
  timestamp: new Date("2025-12-09T10:30:00.000Z"),
  retries: 0
}
```

### User Store

**Store Name:** `user`

**Key Path:** `id` (String)

**Indexes:**
- `id` (String) - User ID
- `email` (String)
- `name` (String)
- `token` (String)

**Schema:**
```javascript
{
  id: String,                       // User ID (primary key)
  email: String,
  name: String,
  token: String                     // JWT access token
}
```

**Example Record:**
```javascript
{
  id: "507f1f77bcf86cd799439011",
  email: "user@example.com",
  name: "John Doe",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Data Relationships

### User → Notes (One-to-Many)

- One user can have many notes
- Notes reference user via `userId` field
- When user is deleted, notes should be deleted (cascade delete - implement in application logic)

### Local Notes ↔ Server Notes (Sync Mapping)

- Local notes have `serverId` field that maps to MongoDB `_id`
- When synced, `serverId` is populated
- Unsynced notes have `serverId: null`

## Migration Notes

### Current Version: 1

No migrations required for initial setup. Database schemas are created automatically:

- **MongoDB**: Collections created on first document insertion
- **IndexedDB**: Schema defined in `frontend/src/lib/db.js` using Dexie

### Future Migrations

If schema changes are needed:

1. **MongoDB**: Use Mongoose schema versioning or migration scripts
2. **IndexedDB**: Increment version in Dexie schema and define migration logic

## Query Patterns

### Common MongoDB Queries

**Get all notes for a user (sorted by update time):**
```javascript
Note.find({ userId: userId })
  .sort({ updatedAt: -1 })
  .exec()
```

**Get notes updated after timestamp:**
```javascript
Note.find({
  userId: userId,
  updatedAt: { $gte: timestamp }
})
  .sort({ updatedAt: -1 })
  .exec()
```

### Common IndexedDB Queries

**Get all notes (sorted by lastModified):**
```javascript
db.notes.orderBy('lastModified').reverse().toArray()
```

**Get unsynced notes:**
```javascript
db.notes.where('synced').equals(false).toArray()
```

**Get sync queue (ordered by timestamp):**
```javascript
db.syncQueue.orderBy('timestamp').toArray()
```

**Find note by serverId:**
```javascript
db.notes.where('serverId').equals(serverId).first()
```

## Performance Considerations

1. **MongoDB Indexes**: Compound index on `userId` and `updatedAt` optimizes user-specific queries
2. **IndexedDB**: Indexes on frequently queried fields improve performance
3. **Sync Queue**: Ordered by timestamp ensures chronological sync processing
4. **Batch Operations**: Sync endpoint accepts multiple notes to reduce HTTP requests

