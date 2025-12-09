# Note Taking App - Offline-First MERN Application

A robust, offline-first note-taking application built with the MERN stack (MongoDB, Express.js, React, Node.js). Features full offline functionality with automatic synchronization, rich text editing, and multi-device support.

## 📋 Table of Contents

- [Project Description](#project-description)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Features](#features)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running Locally](#running-locally)
- [Testing Offline Functionality](#testing-offline-functionality)
- [Sync Mechanism](#sync-mechanism)
- [Security Features](#security-features)
- [Performance Optimizations](#performance-optimizations)
- [Code Quality](#code-quality)
- [Error Handling](#error-handling)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Development Tools](#development-tools)

## 🎯 Project Description

This is a full-stack note-taking application designed with an **offline-first** architecture. Users can create, edit, and manage notes seamlessly whether online or offline. The application automatically syncs changes when connectivity is restored, ensuring data consistency across devices.

### Key Capabilities

- ✅ **Offline-First**: Full functionality without internet connection
- ✅ **Auto-Save**: Changes saved automatically as you type (debounced)
- ✅ **Rich Text Editing**: Format notes with headings, lists, links, and more
- ✅ **Multi-Device Sync**: Access notes from any device
- ✅ **Conflict Resolution**: Last-write-wins strategy for handling conflicts
- ✅ **Real-time Status**: Visual indicators for online/offline/syncing states
- ✅ **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   UI Layer   │  │  Sync Layer │  │  Local DB    │      │
│  │  (TipTap)    │  │  (Queue)    │  │ (IndexedDB)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │  Middleware  │  │   Models    │      │
│  │  (REST API)  │  │  (Auth/JWT)  │  │  (Mongoose)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          ↕ MongoDB Driver
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Database                          │
│              (MongoDB Atlas / Local)                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Saved to IndexedDB (local) immediately
2. **Change Detection** → Added to sync queue
3. **Online Check** → If online, sync triggered automatically
4. **Sync Process** → Batch upload to server
5. **Server Response** → Local DB updated with server IDs
6. **Conflict Resolution** → Last-write-wins applied

## 🛠️ Technology Stack

### Frontend

- **Framework**: Next.js 14 (React 18)
- **Rich Text Editor**: TipTap (ProseMirror-based)
- **State Management**: React Hooks (useState, useEffect)
- **Offline Storage**: Dexie.js (IndexedDB wrapper)
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS
- **Notifications**: React Hot Toast
- **Date Formatting**: date-fns

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Validation**: express-validator
- **CORS**: cors middleware
- **Rate Limiting**: Custom middleware
- **Input Sanitization**: Custom middleware
- **Caching**: HTTP cache headers

### Database

- **Primary**: MongoDB (Cloud Atlas or Local)
- **Client-Side**: IndexedDB (via Dexie.js)

### Development Tools

- **Linting**: ESLint
- **Formatting**: Prettier
- **Error Tracking**: React Error Boundaries

## ✨ Features

### Core Features

- 📝 **Rich Text Editing**: Bold, italic, underline, strikethrough, headings, lists, code blocks, quotes, links, text alignment
- 💾 **Auto-Save**: Debounced auto-save (800ms delay)
- 🔄 **Offline Sync**: Queue-based sync system with retry logic
- 🌐 **Connection Status**: Real-time online/offline/syncing indicators
- 🔐 **Authentication**: Secure JWT-based authentication
- 📱 **Responsive**: Mobile-first responsive design
- 🎨 **Dark Mode**: Toggle between light and dark themes
- 🔍 **Search**: Real-time note search functionality

### Offline Features

- Full CRUD operations work offline
- Changes queued for sync when connection restored
- Automatic retry with exponential backoff
- Conflict resolution (last-write-wins)
- Visual sync status indicators

## 📦 Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB instance)
- Git

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd NoteTakingApp
```

### Step 2: Backend Setup

```bash
cd backend
npm install
```

### Step 3: Frontend Setup

```bash
cd ../frontend
npm install
```

### Step 4: Environment Configuration

See [Environment Configuration](#environment-configuration) section below.

### Step 5: Database Setup

See [Database Setup](#database-setup) section below.

## ⚙️ Environment Configuration

### Backend Environment Variables

Create `backend/.env` file:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/notetaking?retryWrites=true&w=majority

# JWT Secret (use a strong random string in production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

**Note**: Copy `backend/.env.example` and update with your values.

### Frontend Environment Variables

Create `frontend/.env.local` file:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

**Note**: Copy `frontend/.env.example` and update with your values.

## 🗄️ Database Setup

### MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account

2. **Create a Cluster**
   - Choose a free tier cluster
   - Select your preferred region

3. **Configure Network Access**
   - Go to Network Access
   - Add IP Address: `0.0.0.0/0` (for development) or your specific IP

4. **Create Database User**
   - Go to Database Access
   - Create a new user with read/write permissions
   - Save the username and password

5. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Add database name: `/notetaking` before `?`
   - Update `MONGODB_URI` in `backend/.env`

**Important**: If your password contains special characters (like `@`, `#`, `%`), URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`

### Local MongoDB Setup (Alternative)

If using local MongoDB:

```env
MONGODB_URI=mongodb://localhost:27017/notetaking
```

## 🚀 Running Locally

### Start Backend Server

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3001`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

### Access the Application

Open your browser and navigate to: `http://localhost:3000`

## 🧪 Testing Offline Functionality

### Method 1: Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Select "Offline" from the throttling dropdown
4. Create or edit a note
5. Observe the orange "Offline" indicator
6. Note is saved locally (check IndexedDB in Application tab)
7. Switch back to "Online"
8. Watch the sync indicator change to "Syncing..." then "Online"
9. Verify note appears on server

### Method 2: Disconnect Network

1. Disconnect your WiFi/Ethernet
2. Create/edit notes
3. Reconnect network
4. Observe automatic sync

### Method 3: Service Worker (if PWA implemented)

1. Install the app as PWA
2. Close browser
3. Disconnect network
4. Open app
5. Verify offline functionality

### Verify Sync Status

- **Green "Online"**: Connected and synced
- **Orange "Offline"**: No internet connection
- **Blue "Syncing..."**: Currently syncing changes

## 🔄 Sync Mechanism

### How It Works

1. **Local Changes**: All changes are saved to IndexedDB immediately
2. **Queue System**: Changes are added to a sync queue with metadata:
   - Action type (create, update, delete)
   - Note data
   - Timestamp
   - Retry count

3. **Sync Trigger**: Sync is triggered when:
   - User comes online
   - Periodic sync (every 30 seconds when online)
   - After saving a note

4. **Batch Processing**: Multiple changes are batched and sent together

5. **Conflict Resolution**: 
   - Last-write-wins strategy
   - Server timestamp compared with local timestamp
   - Newer version wins

6. **Retry Logic**: 
   - Exponential backoff (starts at 1s, max 60s)
   - Failed syncs retried automatically
   - Queue persists across sessions

### Sync Queue Structure

```javascript
{
  id: auto-increment,
  noteId: local-note-id,
  action: 'create' | 'update' | 'delete',
  data: { title, content, lastModified, ... },
  timestamp: Date,
  retries: number
}
```

### Sync Flow Diagram

```
User Action → IndexedDB → Sync Queue
                              ↓
                         Online Check
                              ↓
                         Yes → Sync to Server
                              ↓
                         Update Local with Server ID
                              ↓
                         Clear Queue Item
```

## 📡 API Documentation

### Base URL

```
http://localhost:3001/api
```

### Authentication

All note endpoints require authentication. Include JWT token in header:

```
Authorization: Bearer <token>
```

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "Royal"
}
```

**Response:**
```json
{
  "access_token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "Royal"
  }
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as register

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "Royal "
}
```

### Notes Endpoints

#### Get All Notes (with Pagination)

```http
GET /api/notes?page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "notes": [
    {
      "_id": "note-id",
      "userId": "user-id",
      "title": "Note Title",
      "content": "<p>Note content</p>",
      "lastModified": "2025-12-09T10:00:00.000Z",
      "synced": true,
      "createdAt": "2025-12-09T10:00:00.000Z",
      "updatedAt": "2025-12-09T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3,
    "hasMore": true
  }
}
```

#### Get Single Note

```http
GET /api/notes/:id
Authorization: Bearer <token>
```

#### Create Note

```http
POST /api/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Note",
  "content": "<p>Note content</p>"
}
```

#### Update Note

```http
PATCH /api/notes/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "<p>Updated content</p>"
}
```

#### Delete Note

```http
DELETE /api/notes/:id
Authorization: Bearer <token>
```

#### Sync Notes (Batch)

```http
POST /api/notes/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": [
    {
      "id": "note-id-or-null",
      "title": "Note Title",
      "content": "<p>Content</p>",
      "lastModified": "2025-12-09T10:00:00.000Z"
    }
  ]
}
```

**Response:**
```json
{
  "created": [...],
  "updated": [...],
  "conflicts": [...]
}
```

#### Get Notes After Timestamp

```http
GET /api/notes/sync/after/:timestamp
Authorization: Bearer <token>
```

**Response:** Array of notes updated after the timestamp

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok"
}
```

## 📊 Database Schema

### MongoDB Collections

#### Users Collection

```javascript
{
  _id: ObjectId,
  email: String (unique, lowercase, required),
  password: String (hashed, required),
  name: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `email` (unique)

#### Notes Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, required),
  title: String (required),
  content: String (default: ''),
  lastModified: Date (default: Date.now),
  synced: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ userId: 1, updatedAt: -1 }` (compound index for efficient queries)

### IndexedDB Schema (Frontend)

#### Notes Store

```javascript
{
  id: auto-increment (primary key),
  serverId: String (MongoDB _id, nullable),
  title: String,
  content: String,
  lastModified: Date,
  synced: Boolean,
  userId: String
}
```

**Indexes:**
- `serverId`
- `title`
- `lastModified`
- `synced`
- `userId`

#### Sync Queue Store

```javascript
{
  id: auto-increment (primary key),
  noteId: Number (local note id),
  action: String ('create' | 'update' | 'delete'),
  data: Object,
  timestamp: Date,
  retries: Number
}
```

**Indexes:**
- `timestamp` (for ordering)

#### User Store

```javascript
{
  id: String (primary key),
  email: String,
  name: String,
  token: String
}
```

## 🔒 Security Features

### Authentication & Authorization

- **JWT Token Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with 10 rounds (industry standard)
- **Password Validation**: Strong password requirements enforced
- **Token Expiration**: 7-day token validity

### Input Validation & Sanitization

- **Input Sanitization**: All user inputs sanitized to prevent XSS attacks
- **NoSQL Injection Protection**: MongoDB operators blocked in user input
- **HTML Escaping**: Content properly escaped before storage
- **Validation Rules**: Comprehensive validation using express-validator
  - Email format validation
  - Password strength requirements
  - Title/content length limits
  - Character restrictions

### Rate Limiting

- **Authentication Endpoints**: 5 attempts per 15 minutes (prevents brute force)
- **General API Endpoints**: 100 requests per 15 minutes
- **Automatic Cleanup**: Prevents memory leaks
- **Retry-After Headers**: Informs clients when rate limit exceeded

### CORS Configuration

- **Restricted Origins**: Only frontend URL allowed
- **Specific Methods**: GET, POST, PATCH, DELETE only
- **Credential Support**: Cookies and authentication headers enabled
- **Header Restrictions**: Only necessary headers allowed

### Additional Security Measures

- **Environment Variables**: All secrets stored in `.env` files
- **Error Message Sanitization**: No sensitive data leaked in errors
- **Request Size Limits**: 10MB limit to prevent DoS attacks
- **HTTPS Ready**: Configured for secure connections in production

## ⚡ Performance Optimizations

### Database Optimizations

- **Pagination**: Notes endpoint supports pagination (default 20, max 100 per page)
- **Parallel Queries**: Count and data queries executed in parallel
- **Lean Queries**: Mongoose lean() for faster JSON responses
- **Indexed Queries**: Compound indexes on frequently queried fields
- **Selective Fields**: Only necessary fields returned (excludes `__v`)

### Frontend Optimizations

- **Code Splitting**: Lazy loading for heavy components
  - NoteSidebar
  - RichTextEditor
  - ConnectionIndicator
- **React Suspense**: Loading states for better UX
- **Debounced Auto-Save**: 800ms delay reduces unnecessary writes
- **Optimized Re-renders**: Proper use of React hooks and refs

### Caching Strategies

- **HTTP Cache Headers**: ETag support for cache validation
- **No-Cache for User Data**: Ensures fresh data for authenticated endpoints
- **Browser Caching**: Static assets cached appropriately

### Next.js Optimizations

- **SWC Minification**: Faster builds and smaller bundles
- **Response Compression**: Gzip compression enabled
- **Modern Bundling**: Optimized for production performance

### Performance Metrics

- **Initial Load**: Reduced bundle size with code splitting
- **Database Queries**: Optimized with indexes and pagination
- **API Response Times**: Improved with lean queries and caching
- **Memory Usage**: Efficient with proper cleanup and rate limiting

## 📝 Code Quality

### Linting & Formatting

- **ESLint**: Configured for both frontend and backend
  - Next.js recommended rules for frontend
  - Node.js recommended rules for backend
  - Custom rules for unused variables and console usage
- **Prettier**: Consistent code formatting
  - 100 character line width
  - Single quotes
  - 2-space indentation
  - Semicolons enabled

### Code Organization

- **Modular Structure**: Separated concerns (routes, middleware, models)
- **Reusable Components**: DRY principles followed
- **Consistent Naming**: Clear, descriptive variable and function names
- **File Organization**: Logical directory structure

### Documentation

- **JSDoc Comments**: Complex functions documented
- **Inline Comments**: Algorithm explanations where needed
- **README**: Comprehensive project documentation
- **API Documentation**: Complete endpoint documentation

### NPM Scripts

**Frontend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

**Backend:**
```bash
npm start            # Start production server
npm run dev          # Start development server with watch
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

## 🛡️ Error Handling

### Frontend Error Boundaries

- **React Error Boundary**: Catches JavaScript errors in components
- **Fallback UI**: User-friendly error messages
- **Error Recovery**: Retry and reload options
- **Development Mode**: Detailed error information in dev
- **Production Mode**: Generic messages to prevent information leakage

### Backend Error Handling

- **Global Error Handler**: Catches all unhandled errors
- **HTTP Status Codes**: Appropriate status codes returned
- **Error Logging**: Errors logged for debugging
- **Error Sanitization**: No sensitive data in error responses
- **404 Handler**: Proper handling of unknown routes

### Error Types Handled

- **Network Errors**: Graceful handling of connection issues
- **Validation Errors**: Clear messages for invalid input
- **Authentication Errors**: Proper 401 responses
- **Database Errors**: Handled with appropriate status codes
- **Sync Errors**: Retry logic with exponential backoff

## 🛠️ Development Tools

### Code Quality Tools

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Git Hooks**: (Recommended) Pre-commit hooks for linting/formatting

### Recommended VS Code Extensions

- ESLint
- Prettier
- Error Lens
- GitLens

### Development Workflow

1. **Write Code**: Follow ESLint and Prettier rules
2. **Format Code**: Run `npm run format` before committing
3. **Lint Code**: Run `npm run lint` to check for issues
4. **Test Locally**: Ensure everything works before pushing
5. **Commit**: Use descriptive commit messages

### Best Practices

- ✅ Write clean, readable code
- ✅ Add comments for complex logic
- ✅ Follow consistent naming conventions
- ✅ Keep functions small and focused
- ✅ Handle errors gracefully
- ✅ Optimize database queries
- ✅ Use environment variables for configuration
- ✅ Validate and sanitize all inputs
- ✅ Implement proper error boundaries
- ✅ Write comprehensive tests (recommended)

## 🚧 Future Enhancements

- [ ] PWA support with service workers
- [ ] Real-time collaboration (WebSockets)
- [ ] Note sharing and permissions
- [ ] Tags and categories
- [ ] Rich media support (images, files)
- [ ] Export notes (PDF, Markdown)
- [ ] Advanced search with filters
- [ ] Note templates
- [ ] Version history

## 📝 License

This project is created for educational purposes.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on the repository.

---

**Built with ❤️ using MERN Stack**

