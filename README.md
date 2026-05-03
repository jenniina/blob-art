# blob-art

blob-art is a full-stack web app for creating abstract blob-based artwork in the browser. The frontend is a React single-page app and the backend is an Express API with MongoDB persistence for user accounts and saved artwork.

The app is built around a single editor view where users can create, move, recolor, resize, layer, save, and export blob compositions.

## What the app does

### Blob editor

- Create blob artwork on a resizable canvas.
- Drag blobs freely around the canvas.
- Change blob colors from side color controls.
- Adjust blob size with controls and mouse wheel.
- Clone blobs and delete blobs.
- Generate random blobs and random color combinations.
- Move blobs between layers and reorder them within the stack.
- Hide individual layers while editing.
- Toggle the keyboard focus marker.
- Pause blob movement when needed.
- Change the canvas background colors.
- Resize the canvas with drag handles.
- Undo and redo editing actions.
- Export the current artwork as an image.

### Keyboard and accessibility features

- Keyboard controls are built into the editor for blob manipulation.
- Layer changes can be triggered from the keyboard.
- Undo/redo keyboard shortcuts are supported.
- Focus handling and marker toggling are included for keyboard-based editing.
- The UI includes instructional content, tips, and sample artwork previews.

### Local persistence

Even without signing in, the app keeps some editor state in browser storage, including:

- canvas size
- canvas horizontal offset
- layer count
- background colors
- current draggable blob state
- some UI preferences such as menu style and theme-related state

### Accounts and saved artwork

Signed-in users can:

- register an account
- log in and log out
- request a password reset
- verify email-related flows handled by the backend
- revoke sessions on other devices
- save named artwork versions to MongoDB
- load previously saved artwork versions
- rename saved versions
- delete saved versions

Saved blob documents include the blob layout, background colors, and a version name. Blob save/load routes are protected so users can only access their own saved artwork.

### Contact and email flows

The backend also supports mail-based flows used by the app, including:

- contact form email sending
- verification link sending
- password reset related mail flows

## Tech stack

### Frontend

- React 18
- TypeScript
- Vite
- Redux Toolkit
- React Router
- react-icons
- react-helmet-async
- dom-to-image-more

### Backend

- Express
- TypeScript
- MongoDB with Mongoose
- JWT-based authentication
- Nodemailer
- express-validator
- custom rate limiting and Mongo sanitization middleware

## Project structure

```text
blob-art/
  frontend/        React + Vite client
  src/             Express API and backend logic
  dist/            Production build output
  Dockerfile       Container build definition
```

### Important frontend areas

- frontend/src/pages/BlobPage.tsx: the main page content and editor help panels
- frontend/src/components/Blob/: editor logic, draggable blobs, layering, save/load, export
- frontend/src/components/Nav/: language, theme, login/register, account controls
- frontend/src/i18n/translations.ts: UI text and language strings

### Important backend areas

- src/app.ts: Express app, static serving, Mongo connection, API mounting
- src/routes/index.ts: route registration
- src/controllers/blobs/: save/load/edit/delete artwork versions
- src/controllers/users/: auth, registration, password reset, session flows
- src/controllers/email/: email sending helpers and form handlers

## Routes and runtime behavior

The frontend is currently a single-route SPA.

The backend serves:

- /api/\* -> JSON API
- /health -> health check
- static frontend assets from the built frontend output
- index.html as a catch-all for SPA navigation

## Environment variables

The codebase expects these environment variables for normal production behavior:

### Core server

- PORT: backend port, defaults to 4000
- CORS_ORIGIN: allowed frontend origin for API requests
- NODE_ENV: production/development behavior

### MongoDB

- MONGO_USER
- MONGO_PASSWORD
- MONGO_CLUSTER
- MONGO_DB

These are combined into the MongoDB Atlas connection string in the backend.

### Authentication and links

- JWT_SECRET: JWT signing secret
- BASE_URI: backend/base URL used in verification and reset links
- SITE_URL: frontend/public URL used in account-related email links

### Email

- NODEMAILER_HOST
- NODEMAILER_PORT
- NODEMAILER_USER
- NODEMAILER_PASSWORD

## API overview

The API includes routes for:

- login and auth ping
- registration
- logout
- forgot/reset password
- email verification
- profile updates
- session revocation
- user lookups
- blob save/load/update/delete by version name
- sending contact-related emails

Blob-related routes are mounted under /api/blobs and require authentication.

## Notes about persistence

- Anonymous users can still use the editor locally.
- Saved versions in MongoDB require authentication.
- Local browser storage is used for editor convenience state even when the user is not logged in.
- The backend applies rate limiting and strips suspicious Mongo-style keys from incoming payloads before route handlers run.

## Deployment shape

The production build is intended to work as one deployed service:

- the backend serves the API
- the backend also serves the built frontend assets

The repo includes a Dockerfile for containerized deployment.

## License

Proprietary.
