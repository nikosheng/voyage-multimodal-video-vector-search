.DEFAULT_GOAL := help

BACKEND_DIR := backend
FRONTEND_DIR := frontend
VENV := $(BACKEND_DIR)/.venv
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------

.PHONY: help
help: ## Show this help
	@echo "Wish in Motion -- app lifecycle commands"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# ---------------------------------------------------------------------------
# Install
# ---------------------------------------------------------------------------

.PHONY: install
install: backend-install frontend-install ## Install backend (venv) and frontend (npm) dependencies

.PHONY: backend-install
backend-install: ## Create backend venv and install Python dependencies
	test -d $(VENV) || python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r $(BACKEND_DIR)/requirements.txt

.PHONY: frontend-install
frontend-install: ## Install frontend npm dependencies
	cd $(FRONTEND_DIR) && npm install

.PHONY: env
env: ## Copy backend/.env.example to backend/.env if it doesn't already exist
	test -f $(BACKEND_DIR)/.env || cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env
	@echo "Edit $(BACKEND_DIR)/.env with your MONGODB_URI, VOYAGE_API_KEY, JWT_SECRET, etc."

# ---------------------------------------------------------------------------
# Local dev (bare processes, no Docker)
# ---------------------------------------------------------------------------

.PHONY: dev-backend
dev-backend: ## Run the backend with auto-reload (uvicorn) on :8000
	cd $(BACKEND_DIR) && .venv/bin/uvicorn app.main:app --reload --port 8000

.PHONY: dev-frontend
dev-frontend: ## Run the frontend dev server (vite) on :5173
	cd $(FRONTEND_DIR) && npm run dev

.PHONY: dev
dev: ## Run backend + frontend dev servers together (Ctrl+C stops both)
	@trap 'kill 0' EXIT; \
	$(MAKE) dev-backend & \
	$(MAKE) dev-frontend & \
	wait

# ---------------------------------------------------------------------------
# One-time / admin setup scripts
# ---------------------------------------------------------------------------

.PHONY: hash-password
hash-password: ## Generate a bcrypt hash for ADMIN_PASSWORD_HASH (usage: make hash-password PASSWORD=secret)
	cd $(BACKEND_DIR) && .venv/bin/python scripts/hash_password.py "$(PASSWORD)"

.PHONY: seed
seed: ## Seed the 4 default flavors + bootstrap text prototypes (calls Voyage API)
	cd $(BACKEND_DIR) && .venv/bin/python scripts/seed_data.py

.PHONY: setup-atlas-index
setup-atlas-index: ## Create the Atlas Vector Search index on action_prototypes
	cd $(BACKEND_DIR) && .venv/bin/python scripts/setup_atlas_index.py

.PHONY: setup
setup: env backend-install seed setup-atlas-index ## Full first-time setup: env file, install deps, seed data, create index

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

.PHONY: build-frontend
build-frontend: ## Type-check and build the frontend for production
	cd $(FRONTEND_DIR) && npm run build

.PHONY: lint-frontend
lint-frontend: ## Lint the frontend
	cd $(FRONTEND_DIR) && npm run lint

# ---------------------------------------------------------------------------
# Docker lifecycle (backend only; see docker-compose.yml)
# ---------------------------------------------------------------------------

.PHONY: docker-build
docker-build: ## Build the backend Docker image
	docker compose build

.PHONY: docker-up
docker-up: ## Start the backend container in the background
	docker compose up -d --build

.PHONY: docker-down
docker-down: ## Stop and remove the backend container
	docker compose down

.PHONY: docker-restart
docker-restart: docker-down docker-up ## Restart the backend container

.PHONY: docker-logs
docker-logs: ## Tail backend container logs
	docker compose logs -f backend

.PHONY: docker-ps
docker-ps: ## Show status of the backend container
	docker compose ps

.PHONY: docker-shell
docker-shell: ## Open a shell inside the running backend container
	docker compose exec backend /bin/bash

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

.PHONY: health
health: ## Curl the backend /health endpoint (defaults to localhost:8000)
	curl -sf http://localhost:8000/health && echo

# ---------------------------------------------------------------------------
# Clean
# ---------------------------------------------------------------------------

.PHONY: clean
clean: ## Remove backend venv, frontend node_modules/dist, and __pycache__
	rm -rf $(VENV)
	rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/dist
	find $(BACKEND_DIR) -type d -name "__pycache__" -exec rm -rf {} +

.PHONY: docker-clean
docker-clean: ## Stop containers and remove the built backend image
	docker compose down --rmi local --volumes
