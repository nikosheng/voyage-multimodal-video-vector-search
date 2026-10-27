# Wish in Motion 🎅

A Voyage multimodal-3.5 + MongoDB Atlas Vector Search demo: participants perform
a 3-5 second action in front of a webcam, and the system matches it to a
Christmas candy flavor in real time.

- Cold & shivering -> Ginger Caramel ("warm heart")
- Dancing -> Pop Candy ("party")
- Slumped / tired -> Coffee flavor
- Ambiguous / low confidence -> Mint "surprise" fallback flavor

## Architecture

```
Browser (React + MediaRecorder)
   │ POST /api/wish (3-5s webm clip)
   ▼
FastAPI backend
   1. ffmpeg transcode webm -> mp4 (temp file, deleted immediately after)
   2. voyageai SDK: multimodal_embed(video, input_type="query")
   3. MongoDB Atlas $vectorSearch against action_prototypes
   4. threshold check -> fallback flavor if confidence too low
   5. write result-only log to `wishes` + increment `flavor_stats`
   ▼
Response -> flavor result shown to participant
            + live update pushed to the big-screen dashboard via
              MongoDB Change Streams -> SSE
```

Participant privacy: the raw video and its embedding vector are **never**
written to MongoDB. Only the match result (flavor id, confidence, timestamp)
is persisted. Admin-curated reference demo clips are a separate concept and
are stored long-term in GridFS since they are not participant data.

## Repo layout

```
backend/    FastAPI app, Voyage integration, Atlas Vector Search matching
  app/
    routers/      API endpoints (wish, dashboard, admin_*, auth)
    services/      voyage_client, video_utils (ffmpeg), matching, auth
    db/            mongo connection + pydantic models
  scripts/
    install_ffmpeg_linux.sh   portable static ffmpeg binary (Linux amd64/arm64)
    hash_password.py          generate ADMIN_PASSWORD_HASH
    seed_data.py              seed default flavors + bootstrap text prototypes
    setup_atlas_index.py      create the Atlas Vector Search index
frontend/   React + Vite + Tailwind
  src/
    pages/     Home (participant capture + result), Dashboard (big screen)
    admin/     Login, flavor CRUD, prototype manager, sandbox, settings
    components/WebcamRecorder.tsx   shared webcam capture component
```

## Prerequisites

- Python 3.11+
- Node.js 20+
- A MongoDB Atlas cluster (Flex/Serverless or M10+) with **Atlas Search /
  Vector Search** enabled
- A Voyage AI API key (https://www.voyageai.com/)
- ffmpeg (see below for the portable Linux option)

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: set MONGODB_URI, VOYAGE_API_KEY, JWT_SECRET
# If you're using a MongoDB Atlas-hosted Voyage API key (prefix "al-"), you
# can optionally set VOYAGE_BASE_URL=https://ai.mongodb.com/v1 (the SDK also
# auto-detects this from the "al-" key prefix if left unset)

# generate the admin password hash and paste it into .env as ADMIN_PASSWORD_HASH
python scripts/hash_password.py "your-chosen-admin-password"

# seed the 4 default flavors + bootstrap text prototypes (calls Voyage API)
python scripts/seed_data.py

# create the Atlas Vector Search index on action_prototypes
python scripts/setup_atlas_index.py

uvicorn app.main:app --reload --port 8000
```

### ffmpeg: portable binary for Linux deployment (e.g. Debian 12 GCE VM)

`ffmpeg-python` just shells out to an `ffmpeg` executable. To avoid depending
on whatever apt package (or lack thereof) exists on the target VM, this repo
can use a self-contained static Linux binary instead:

```bash
# Run this on the target Linux machine (Debian 12 VM, etc.)
bash backend/scripts/install_ffmpeg_linux.sh
```

This downloads the official static build (amd64/arm64, zero dependencies,
no root required) into `backend/bin/ffmpeg`. The app automatically prefers
`backend/bin/ffmpeg` if present, and falls back to the system `PATH` ffmpeg
otherwise (e.g. a local `brew install ffmpeg` on macOS during development).
No code changes are needed between environments.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

- Participant capture page: `http://localhost:5173/`
- Big-screen dashboard: `http://localhost:5173/dashboard`
- Admin console: `http://localhost:5173/admin/login`

The Vite dev server proxies `/api` and `/admin` requests to the backend on
`http://localhost:8000` (see `frontend/vite.config.ts`).

## Admin workflow (bootstrapping without video data)

1. Log in at `/admin/login` with the username/password you hashed above.
2. Flavors and bootstrap text prototypes are already seeded by
   `seed_data.py`. You can add more flavors, or add more text/video
   prototypes under each flavor's detail page.
3. Because voyage-multimodal-3.5 embeds text and video into the same vector
   space, a flavor can be matched purely from text prototypes immediately
   (zero-shot style), and later improved by uploading real demo video clips
   recorded by staff — both coexist in the same `action_prototypes`
   collection and vote together during `$vectorSearch`.
4. Use the Sandbox page to test your own actions against the current
   prototype library without affecting live stats, and tune the confidence
   threshold under Settings.

## MongoDB collections

| Collection           | Purpose                                                        |
|-----------------------|-----------------------------------------------------------------|
| `flavors`              | Flavor/item definitions (name, taste, emoji, color, fallback flag) |
| `action_prototypes`    | Vector library: text or video prototypes per flavor, with the Atlas Vector Search index `action_vector_index` |
| `wishes`               | Result-only log per participant interaction (no video/embedding stored) |
| `flavor_stats`         | Running count per flavor for the dashboard                      |
| `app_settings`         | Global config: threshold, top_k, num_candidates, fallback flavor |
| GridFS (`prototype_videos` bucket) | Admin-curated reference demo clips (long-term storage) |
