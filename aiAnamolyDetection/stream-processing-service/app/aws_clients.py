"""Thin wrappers around AWS services (DynamoDB + Kinesis) via aioboto3."""

import aioboto3
from datetime import date
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
async def increment_counter(
    pincode: str,
    scheme_id: str,
    response: str,
    district: str | None = None,
    block: str | None = None,
    state: str | None = None,
) -> None:
    """Atomically increment yes_count/no_count + total in DynamoDB.

    Key  : pincode#scheme_id#YYYY-MM-DD
    Attrs: yes_count | no_count, total, district, block, state
    """
    s = get_settings()
    pk = f"{pincode}#{scheme_id}#{date.today().isoformat()}"

    # ADD clause: increment the right counter + total
    if response == "YES":
        add_clause = "ADD yes_count :one, total :one"
    else:
        add_clause = "ADD no_count :one, total :one"

    # SET clause: persist geo data (only set if not already present)
    set_parts: list[str] = []
    attr_values: dict = {":one": 1}
    attr_names: dict = {}

    if district:
        set_parts.append("#d = if_not_exists(#d, :district)")
        attr_values[":district"] = district
        attr_names["#d"] = "district"
    if block:
        set_parts.append("#b = if_not_exists(#b, :blk)")
        attr_values[":blk"] = block
        attr_names["#b"] = "block"
    if state:
        set_parts.append("#s = if_not_exists(#s, :st)")
        attr_values[":st"] = state
        attr_names["#s"] = "state"

    # DynamoDB allows SET + ADD in a single UpdateExpression
    expr = add_clause
    if set_parts:
        expr = "SET " + ", ".join(set_parts) + " " + add_clause

    session = _session()
    async with session.resource("dynamodb") as ddb:
        table = await ddb.Table(s.dynamodb_table_agg)
        kwargs: dict = {
            "Key": {"pk": pk},
            "UpdateExpression": expr,
            "ExpressionAttributeValues": attr_values,
        }
        if attr_names:
            kwargs["ExpressionAttributeNames"] = attr_names
        await table.update_item(**kwargs)


async def scan_today_aggregates() -> list[dict]:
    """Scan all of today's aggregate rows from DynamoDB."""
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
