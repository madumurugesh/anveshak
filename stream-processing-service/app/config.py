from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # PostgreSQL (AWS RDS)
    pg_host: str
    pg_port: int = 5432
    pg_user: str
    pg_password: str
    pg_database: str

    # AWS Region
    aws_region: str = "us-east-1"

    # DynamoDB
    dynamodb_table_agg: str = "anveshak-responses-agg"

    # Kinesis
    kinesis_stream_name: str = "anveshak-ivr-responses"

    # S3
    s3_bucket: str = "anveshak-data"
    s3_processed_prefix: str = "processed-responses/"

    # Lambda
    lambda_detector: str = "anveshak-anomaly-detector"

    # Processing window (seconds) - default 1 hour
    window_seconds: int = 3600

    # Anomaly Engine (triggers AI classification after detection)
    anomaly_engine_url: str = ""   # e.g. http://localhost:3002
    engine_secret: str = ""

    # AWS credentials (blank = use IAM role / instance profile)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_session_token: str = ""  # Required for AWS Learner Labs

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
