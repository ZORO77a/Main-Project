from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List, Union, Any
from datetime import datetime, date
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    SENIOR_DEV = "senior_dev"
    JUNIOR_DEV = "junior_dev"
    HR = "hr"
    FINANCE = "finance"
    EMPLOYEE = "employee"


# ------------------ DOMAIN MODELS ------------------

class User(BaseModel):
    id: Optional[str] = None
    email: EmailStr
    password_hash: str
    role: UserRole

    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None  # NEW: Engineering, HR, Finance, etc.
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # RBAC Fields - NEW
    permissions: List[str] = Field(default_factory=list)  # NEW: view, edit, delete, share, upload, download

    allocated_location: Optional[Dict[str, float]] = None
    allocated_wifi_ssid: Optional[str] = None
    allocated_time_start: Optional[str] = None
    allocated_time_end: Optional[str] = None

    work_from_home_allowed: bool = False


class AccessLog(BaseModel):
    id: Optional[str] = None
    user_id: str
    file_id: Optional[str] = None
    action: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    location: Optional[Dict[str, float]] = None
    wifi_ssid: Optional[str] = None
    ip_address: Optional[str] = None

    success: bool
    reason: Optional[str] = None


class File(BaseModel):
    id: Optional[str] = None
    filename: str
    encrypted_content: bytes
    encryption_key: str
    owner_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_encrypted: bool = True
    
    # RBAC Fields - NEW
    category: str = "public"  # NEW: public, internal, confidential, code, finance, hr, executive
    allowed_roles: List[str] = Field(default_factory=list)  # NEW: roles allowed to access
    allowed_users: List[str] = Field(default_factory=list)  # NEW: specific users allowed (sharing)


class WorkFromHomeRequest(BaseModel):
    id: Optional[str] = None
    employee_id: str
    reason: str
    start_date: date
    end_date: date
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    approved: bool = False
    approved_at: Optional[datetime] = None
    admin_id: Optional[str] = None


# ------------------ AUTH REQUEST MODELS ------------------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class ResendOTPRequest(BaseModel):
    email: EmailStr


# ------------------ EMPLOYEE REQUEST MODELS ------------------

class AddEmployeeRequest(BaseModel):
    email: EmailStr
    name: str
    phone: str
    password: str
    allocated_location: Dict[str, float]
    allocated_wifi_ssid: str
    allocated_time_start: str
    allocated_time_end: str


class EditEmployeeRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    allocated_location: Optional[Dict[str, float]] = None
    allocated_wifi_ssid: Optional[str] = None
    allocated_time_start: Optional[str] = None
    allocated_time_end: Optional[str] = None


# ------------------ OTHER REQUESTS ------------------

class WorkFromHomeRequestCreate(BaseModel):
    reason: str
    start_date: date
    end_date: date


class FileAccessRequest(BaseModel):
    file_id: str
    current_location: Any
    current_wifi_ssid: Optional[str] = None
    device_fingerprint: Optional[str] = None




# ------------------ DEVICE FINGERPRINT MODELS ------------------

class DeviceFingerprintRequest(BaseModel):
    user_agent: str
    screen_width: Optional[int] = None
    screen_height: Optional[int] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None
    cpu_cores: Optional[int] = None
    hardware_concurrency: Optional[int] = None
    webgl_vendor: Optional[str] = None
    webgl_renderer: Optional[str] = None