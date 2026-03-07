"""Thin wrappers around AWS services (DynamoDB + Kinesis) via aioboto3."""

import aioboto3
from app.config import get_settings


def _session() -> aioboto3.Session:
    s = get_settings()
    kwargs: dict = {"region_name": s.aws_region}
    if s.aws_access_key_id:
        kwargs["aws_access_key_id"] = s.aws_access_key_id
        kwargs["aws_secret_access_key"] = s.aws_secret_access_key
        if s.aws_session_token:
            kwargs["aws_session_token"] = s.aws_session_token
    return aioboto3.Session(**kwargs)


# ── Kinesis consumer helpers ────────────────────────────────────
async def get_shard_iterators() -> list[str]:
    """Return a LATEST shard iterator for every shard in the stream."""
    s = get_settings()
    session = _session()
    iterators: list[str] = []
    async with session.client("kinesis") as kinesis:
        desc = await kinesis.describe_stream(StreamName=s.kinesis_stream_name)
        shards = desc["StreamDescription"]["Shards"]
        for shard in shards:
            resp = await kinesis.get_shard_iterator(
                StreamName=s.kinesis_stream_name,
                ShardId=shard["ShardId"],
                ShardIteratorType="LATEST",
            )
            iterators.append(resp["ShardIterator"])
    return iterators


async def get_records(shard_iterator: str) -> tuple[list[dict], str | None]:
    """Fetch records from a shard iterator. Returns (records, next_iterator)."""
    session = _session()
    async with session.client("kinesis") as kinesis:
        resp = await kinesis.get_records(ShardIterator=shard_iterator, Limit=100)
        return resp["Records"], resp.get("NextShardIterator")


# ── DynamoDB aggregation helpers ────────────────────────────────
async def increment_counter(pincode: str, scheme_id: str, response_value: int) -> None:
    """Atomically increment the windowed counter in DynamoDB.

    Partition key : pincode#scheme_id#YYYY-MM-DD
    Attributes    : total_count, response_sum  (accumulated via ADD)
    """
    from datetime import date

    s = get_settings()
    pk = f"{pincode}#{scheme_id}#{date.today().isoformat()}"

    session = _session()
    async with session.resource("dynamodb") as ddb:
        table = await ddb.Table(s.dynamodb_table_agg)
        await table.update_item(
            Key={"pk": pk},
            UpdateExpression="ADD total_count :one, response_sum :val",
            ExpressionAttributeValues={":one": 1, ":val": response_value},
        )


async def scan_today_aggregates() -> list[dict]:
    """Scan all of today's aggregate rows from DynamoDB."""
    from datetime import date

    s = get_settings()
    today = date.today().isoformat()
    session = _session()

    items: list[dict] = []
    async with session.resource("dynamodb") as ddb:
        table = await ddb.Table(s.dynamodb_table_agg)
        resp = await table.scan(
            FilterExpression="contains(pk, :d)",
            ExpressionAttributeValues={":d": today},
        )
        items.extend(resp.get("Items", []))
        while "LastEvaluatedKey" in resp:
            resp = await table.scan(
                FilterExpression="contains(pk, :d)",
                ExpressionAttributeValues={":d": today},
                ExclusiveStartKey=resp["LastEvaluatedKey"],
            )
            items.extend(resp.get("Items", []))
    return items
