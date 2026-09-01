from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator


def normalize_email(value: Any) -> Any:
    """Normalize string e-mails before EmailStr validates them."""
    return value.strip().lower() if isinstance(value, str) else value


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_request_email(cls, value: Any) -> Any:
        return normalize_email(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def normalize_request_email(cls, value: Any) -> Any:
        return normalize_email(value)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

