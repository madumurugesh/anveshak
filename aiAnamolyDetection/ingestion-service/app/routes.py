"""Webhook router for IVR ingestion."""

from fastapi import APIRouter, HTTPException
from app.schemas import IVRWebhookRequest, IVRWebhookResponse
from app.service import process_ivr_payload

router = APIRouter(prefix="/api/ivr", tags=["IVR Ingestion"])


@router.post("/webhook", response_model=IVRWebhookResponse)
async def ivr_webhook(payload: IVRWebhookRequest):
    """Receive an IVR callback, validate, deduplicate, and stream to Kinesis."""
    result = await process_ivr_payload(payload)

    if result["status"] == "rejected":
        raise HTTPException(status_code=403, detail=result["message"])

    if result["status"] == "duplicate":
        raise HTTPException(status_code=409, detail=result["message"])

    return IVRWebhookResponse(**result)
