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
    dynamodb_table_dedup: str = "anveshak-response-dedup"

    # Kinesis
    kinesis_stream_name: str = "anveshak-ivr-responses"

    # S3
    s3_bucket: str = "anveshak-data"
    s3_rejected_prefix: str = "rejected-responses/"

    # Lambda
    lambda_post_ingest: str = "anveshak-post-ingest-trigger"

    # AWS credentials (blank = use IAM role / instance profile)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_session_token: str = ""  # Required for AWS Learner Labs

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
