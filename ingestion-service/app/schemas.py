from pydantic import BaseModel, Field


class IVRWebhookRequest(BaseModel):
    phone_hash: str = Field(..., min_length=1, description="SHA-256 hash of the citizen phone number")
    scheme_id: str = Field(..., min_length=1, description="Unique identifier of the government scheme")
    pincode: str = Field(..., pattern=r"^\d{6}$", description="6-digit pincode")
    response_value: int = Field(..., ge=1, le=5, description="IVR keypress response (1-5)")


class IVRWebhookResponse(BaseModel):
    status: str
    message: str
    kinesis_sequence: str | None = None
