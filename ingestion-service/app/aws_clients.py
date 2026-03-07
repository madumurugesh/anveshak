"""Thin wrappers around AWS services (DynamoDB + Kinesis) via aioboto3."""

import json
import aioboto3
from datetime import date
from app.config import get_settings


def _session() -> aioboto3.Session:
    s = get_settings()
    kwargs: dict = {"r"
    "egion_name": s.aws_region}
    if s.aws_access_key_id:
        kwargs["aws_access_key_id"] = s.aws_access_key_id
        kwargs["aws_secret_access_key"] = s.aws_secret_access_key
        if s.aws_session_token:
            kwargs["aws_session_token"] = s.aws_session_token
    return aioboto3.Session(**kwargs)


# ── DynamoDB dedup ──────────────────────────────────────────────
async def check_and_set_dedup(phone_hash: str, scheme_id: str) -> bool:
    """Return True if this is the FIRST response today (i.e. not a duplicate).

    Uses a conditional PutItem so the check-and-set is atomic.
    Partition key : phone_hash#scheme_id#YYYY-MM-DD
    """
    s = get_settings()
    pk = f"{phone_hash}#{scheme_id}#{date.today().isoformat()}"

    session = _session()
    async with session.resource("dynamodb") as ddb:
        table = await ddb.Table(s.dynamodb_table_dedup)
        try:
            await table.put_item(
                Item={"pk": pk, "phone_hash": phone_hash, "scheme_id": scheme_id},
                ConditionExpression="attribute_not_exists(pk)",
            )
            return True  # first time → allowed
        except ddb.meta.client.exceptions.ConditionalCheckFailedException:
            return False  # duplicate


# ── Kinesis producer ────────────────────────────────────────────
async def push_to_kinesis(payload: dict) -> dict:
    """Put a single record onto the Kinesis stream.

    Partition key = pincode so all records for the same region land on the
    same shard, which simplifies downstream aggregation.
    """
    s = get_settings()
    session = _session()
    async with session.client("kinesis") as kinesis:
        response = await kinesis.put_record(
            StreamName=s.kinesis_stream_name,
            Data=json.dumps(payload).encode(),
            PartitionKey=str(payload.get("pincode", "default")),
        )
        return response
