"""FastAPI application entry-point for the Stream Processing Service."""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import get_pool, close_pool
from app.workers import kinesis_consumer, periodic_flush

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

_background_tasks: list[asyncio.Task] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await get_pool()
    _background_tasks.append(asyncio.create_task(kinesis_consumer()))
    _background_tasks.append(asyncio.create_task(periodic_flush()))
    logger.info("Background workers started.")
    yield
    # Shutdown
    for t in _background_tasks:
        t.cancel()
    await close_pool()
    logger.info("Shut down cleanly.")


app = FastAPI(
    title="Anveshak Stream Processing Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "stream-processing"}


@app.post("/admin/flush")
async def manual_flush():
    """Trigger an immediate flush + detection (useful for testing / ops)."""
    from app.workers import flush_to_rds
    from app.detectors import run_detectors
    await flush_to_rds()
    await run_detectors()
    return {"status": "flushed_and_detected"}
