from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # PostgreSQL (RDS)
    pg_host: str
    pg_port: int = 5432
    pg_user: str
    pg_password: str
    pg_database: str

    # DynamoDB
    dynamodb_table_agg: str = "responses_dynamo_ref"
    aws_region: str = "ap-south-1"

    # Kinesis
    kinesis_stream_name: str = "ivr-responses-stream"

    # Processing window (seconds) — default 1 hour
    window_seconds: int = 3600

    # AWS credentials (blank = use IAM role / instance profile)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_session_token: str = ""  # Required for AWS Learner Labs

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
