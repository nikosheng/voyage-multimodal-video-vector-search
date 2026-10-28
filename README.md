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
  Dockerfile  app image with ffmpeg baked in (see Docker deployment below)
  scripts/
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
- ffmpeg (only needed if running the backend without Docker — see below)

## Quick start with Make

A `Makefile` wraps the common lifecycle commands below. Run `make help` to
list everything available. Typical first-time setup:

```bash
make install           # create backend venv + install deps, npm install frontend
make env                # copy backend/.env.example -> backend/.env (edit it before continuing)
make hash-password PASSWORD="your-chosen-admin-password"  # paste the output into .env as ADMIN_PASSWORD_HASH
make seed               # seed default flavors + bootstrap text prototypes
make setup-atlas-index  # create the Atlas Vector Search index
make dev                # run backend (:8000) + frontend (:5173) together
```

Or for a Docker-based backend: `make docker-up` / `make docker-logs` / `make docker-down`.

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

### ffmpeg: local dev without Docker

`ffmpeg-python` just shells out to an `ffmpeg`/`ffprobe` executable on
`PATH`. For local development without Docker, install it directly
(e.g. `brew install ffmpeg` on macOS). No further configuration is needed —
the app resolves `ffmpeg`/`ffprobe` from `PATH` by default (see
`FFMPEG_BINARY_PATH`/`FFPROBE_BINARY_PATH` in `.env.example` for explicit
overrides).

## Docker deployment (recommended for production, e.g. a GCE VM)

`backend/Dockerfile` is a multi-stage build that copies current,
actively-maintained static `ffmpeg`/`ffprobe` binaries from the
[`mwader/static-ffmpeg`](https://hub.docker.com/r/mwader/static-ffmpeg)
image (pinned to `9.0.2-1`) into a `python:3.12-slim` image — this avoids
relying on the target OS's apt-packaged ffmpeg, which is typically a Debian
release behind upstream (e.g. Debian 12 ships ffmpeg 5.1.x while current
upstream is 9.x).

```bash
# build + run via docker compose (reads backend/.env)
cp backend/.env.example backend/.env   # fill in MONGODB_URI, VOYAGE_API_KEY, etc.
docker compose up --build
```

Or with plain Docker:

```bash
cd backend
docker build -t wish-in-motion-backend .
docker run --rm -p 8000:8000 --env-file .env wish-in-motion-backend
```

No host-level ffmpeg setup is needed — it's baked into the image. One-time
setup scripts (`scripts/hash_password.py`, `scripts/seed_data.py`,
`scripts/setup_atlas_index.py`) can still be run locally with a Python venv
against the same Atlas cluster before/independently of running the
containerized backend.

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
