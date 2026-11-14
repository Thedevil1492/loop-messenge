# Loop Messenger — Fast, Private Real-Time Messaging

Loop is an installable, mobile-first progressive web application (PWA) equivalent in features and UX to modern messaging platforms like WhatsApp, engineered with an independent brand identity, an ultra-fast local backend, and zero proprietary external dependencies.

---

## Features (Phase 2 MVP)

- **Authentication & User Profiles**:
  - Email & password signup and login with secure JWT tokens.
  - Avatar, display name, and bio status editing.
  - Pluggable structure ready for phone number OTP.
- **1:1 and Group Chat**:
  - Instant, low-latency messaging over persistent native WebSockets.
  - Multi-user group chats with admin designation and participant rosters.
- **Message Delivery Status Ticks**:
  - **Sent**: Single grey checkmark (acknowledged by server).
  - **Delivered**: Double grey checkmarks (received by peer's active client).
  - **Read**: Double cyan checkmarks (peer opened and viewed the chat).
- **Ephemeral Presence & Typing Indicators**:
  - Real-time online status and "last seen [timestamp]".
  - Real-time "typing..." indicator with automatic 3-second debouncing.
- **Rich Media & File Sharing**:
  - **Photos**: Upload and preview inline with full-screen lightbox on click.
  - **Videos**: Inline HTML5 video playback with native controls.
  - **Documents**: File attachment cards displaying filename, file size, and download button.
- **Conversations & Search**:
  - Real-time conversation list ordered chronologically by last message.
  - Unread message badge counters.
  - Contact and chat search.
- **Design & Theme System**:
  - High-contrast **Dark & Light Mode** with persistent theme toggle.
  - Mobile-first adaptive layout: single-column on mobile, split dual-pane on desktop.
  - Installable PWA with app manifest and service worker support.

---

## Architecture & Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | Tailwind CSS v4, Lucide Icons, Zustand state management |
| **Backend** | Node.js + Express (TypeScript) | Native `ws` WebSocket engine for low-latency delivery |
| **Database** | SQLite (WAL Mode) via `node:sqlite` | Zero external setup; instant local execution without Docker |
| **Media Storage** | Local Disk Storage (`/uploads`) | Multer pipeline, ready to swap to S3/Cloudflare R2 |
| **Target** | Mobile-First Responsive PWA | Compatible with Capacitor (Android APK) and Tauri/Electron (EXE) |

---

## Quick Start (Run Locally)

### 1. Requirements
- Node.js `>=22.5` or `26.x`
- npm `>=10.x`

### 2. Start the Server
From the `app/server` folder, run:

```bash
cd D:\REA\app\server
npm run start
```

Or run directly in development mode (with live TypeScript reloading):
```bash
npm run dev
```

The server will start on port `5000`:
- **Local URL**: `http://localhost:5000`
- **Network / WiFi URL**: `http://0.0.0.0:5000`
- **WebSocket Endpoint**: `ws://localhost:5000/ws`

*Note: The frontend is pre-built into `app/server/public`, so starting the server automatically serves the entire full-stack app from one single port!*

---

## Testing on Your Phone Over Wi-Fi

1. **Connect your phone** to the same Wi-Fi network as your computer.
2. Ensure the server is running on your computer.
3. Open Chrome or Safari on your phone and navigate to:
   ```
   http://10.74.14.95:5000
   ```
   *(If your computer's IP address changes, run `ipconfig` in PowerShell to find your current Wi-Fi IPv4 address).*
4. **Install as a PWA**:
   - **Android Chrome**: Tap the three dots menu `⋮` $\rightarrow$ **Install App** or **Add to Home screen**.
   - **iOS Safari**: Tap the Share button $\rightarrow$ **Add to Home Screen**.
   - Loop will open as a full-screen, standalone app without browser URL bars!

---

## Testing Real-Time Messaging (2 Browser Sessions)

The database automatically comes seeded with two pre-configured demo accounts:

| User | Email | Password |
| :--- | :--- | :--- |
| **Alice Chen** | `alice@loop.app` | `password123` |
| **Bob Miller** | `bob@loop.app` | `password123` |

### Step-by-Step Test:
1. Open a regular browser tab at `http://localhost:5000` and click the **Alice Chen** one-click demo button.
2. Open an Incognito / Private window (or your phone on Wi-Fi) at `http://localhost:5000` and click the **Bob Miller** demo button.
3. Observe real-time features:
   - When Bob logs in, Alice's screen immediately shows Bob as **Online** with a green dot.
   - When Bob types in the input box, Alice immediately sees the animated **typing...** indicator.
   - When Alice sends a message to Bob:
     - Alice sees **1 grey tick** (sent).
     - Because Bob is online, Alice's tick immediately updates to **2 grey ticks** (delivered).
     - When Bob views the message in his active chat, Alice's tick turns into **2 cyan ticks** (read).
   - Click the attachment paperclip icon to upload images, videos, or documents and test inline media viewing.

---

## Development Mode

If you wish to edit the frontend with instant Hot Module Replacement (HMR):

1. Start the backend:
   ```bash
   cd D:\REA\app\server
   npm run dev
   ```
2. In a separate terminal, start the Vite client:
   ```bash
   cd D:\REA\app\client
   npm run dev
   ```
3. Open `http://localhost:3000`. Any API requests and WebSockets are automatically proxied to the backend on port `5000`.
4. When finished editing, build the production client assets:
   ```bash
   cd D:\REA\app\client
   npm run build
   ```

---

## Production Deployment

### Option A: Node.js VPS / Linux Server (Ubuntu, Debian)
1. Copy the `app/` directory to your server.
2. Install dependencies:
   ```bash
   npm --prefix server install --production
   npm --prefix client install && npm --prefix client run build
   ```
3. Use `pm2` or `systemd` to keep the server running:
   ```bash
   pm2 start server/dist/index.js --name "loop-messenger"
   ```
4. Point an Nginx reverse proxy with SSL (`certbot`) to `localhost:5000` with WebSocket upgrade headers (`Upgrade $http_upgrade`, `Connection "upgrade"`).

### Option B: Container / Docker
Create a single multi-stage `Dockerfile`:
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY app/package*.json ./
COPY app/client/package*.json ./client/
COPY app/server/package*.json ./server/
RUN npm --prefix client install && npm --prefix server install
COPY app/client ./client
COPY app/server ./server
RUN npm --prefix client run build && npm --prefix server run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/public ./server/public
COPY --from=build /app/server/package*.json ./server/
RUN cd server && npm install --production
EXPOSE 5000
CMD ["node", "server/dist/index.js"]
```

---

## Future Phases (On Demand)

- **Phase 3**:
  - Voice notes (push-to-talk recording and audio scrubbing).
  - Status / Stories (24h ephemeral posts).
  - Message quotes/replies, forwarding, and soft-delete ("Delete for Everyone").
  - Emoji reactions and starred messages.
  - WebRTC audio and video calling.
  - End-to-End Encryption (E2EE) using Web Crypto API.
