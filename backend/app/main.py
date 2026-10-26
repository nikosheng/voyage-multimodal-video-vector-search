from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import admin_flavors, admin_prototypes, admin_settings, auth, dashboard, wish

settings = get_settings()

app = FastAPI(title="Wish in Motion API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wish.router)
app.include_router(dashboard.router)
app.include_router(auth.router)
app.include_router(admin_flavors.router)
app.include_router(admin_prototypes.router)
app.include_router(admin_settings.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
