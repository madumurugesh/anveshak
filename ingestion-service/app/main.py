"""FastAPI application entry-point for the Ingestion Service."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import get_pool, close_pool
from app.routes import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: warm the PG connection pool
    await get_pool()
    yield
    # Shutdown: release connections
    await close_pool()


app = FastAPI(
    title="Anveshak Ingestion Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ingestion"}
