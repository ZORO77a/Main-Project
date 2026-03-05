"""
Role-Based Access Control (RBAC) Service
Manages roles, permissions, and file access control
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from enum import Enum
from bson import ObjectId


class UserRole(str, Enum):
    """User role definitions"""
    ADMIN = "admin"
    MANAGER = "manager"
    SENIOR_DEV = "senior_dev"
    JUNIOR_DEV = "junior_dev"
    HR = "hr"
    FINANCE = "finance"
    EMPLOYEE = "employee"


class FileCategory(str, Enum):
    """File category definitions"""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    CODE = "code"
    FINANCE = "finance"
    HR = "hr"
    EXECUTIVE = "executive"


class Permission(str, Enum):
    """Permission definitions"""
    VIEW = "view"
    EDIT = "edit"
    DELETE = "delete"
    SHARE = "share"
    UPLOAD = "upload"
    DOWNLOAD = "download"


# ============================================================
# PERMISSION MATRIX: Role × Permission
# ============================================================

ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        Permission.VIEW,
        Permission.EDIT,
        Permission.DELETE,
        Permission.SHARE,
        Permission.UPLOAD,
        Permission.DOWNLOAD,
    ],
    UserRole.MANAGER: [
        Permission.VIEW,
        Permission.EDIT,
        Permission.SHARE,
        Permission.UPLOAD,
        Permission.DOWNLOAD,
    ],
    UserRole.SENIOR_DEV: [
        Permission.VIEW,
        Permission.EDIT,
        Permission.UPLOAD,
        Permission.DOWNLOAD,
    ],
    UserRole.JUNIOR_DEV: [
        Permission.VIEW,
        Permission.DOWNLOAD,
    ],
    UserRole.HR: [
        Permission.VIEW,
        Permission.EDIT,
        Permission.SHARE,
        Permission.UPLOAD,
        Permission.DOWNLOAD,
    ],
    UserRole.FINANCE: [
        Permission.VIEW,
        Permission.EDIT,
        Permission.SHARE,
        Permission.UPLOAD,
        Permission.DOWNLOAD,
    ],
    UserRole.EMPLOYEE: [
        Permission.VIEW,
        Permission.DOWNLOAD,
    ],
}


# ============================================================
# CATEGORY ACCESS MATRIX: Role × Category
# ============================================================

ROLE_CATEGORY_ACCESS = {
    UserRole.ADMIN: [
        FileCategory.PUBLIC,
        FileCategory.INTERNAL,
        FileCategory.CONFIDENTIAL,
        FileCategory.CODE,
        FileCategory.FINANCE,
        FileCategory.HR,
        FileCategory.EXECUTIVE,
    ],
    UserRole.MANAGER: [
        FileCategory.PUBLIC,
        FileCategory.INTERNAL,
        FileCategory.CONFIDENTIAL,
        # Finance & HR only for own department
    ],
    UserRole.SENIOR_DEV: [
        FileCategory.PUBLIC,
        FileCategory.INTERNAL,
        FileCategory.CODE,
    ],
    UserRole.JUNIOR_DEV: [
        FileCategory.PUBLIC,
        FileCategory.CODE,
    ],
    UserRole.HR: [
        FileCategory.PUBLIC,
        FileCategory.HR,
    ],
    UserRole.FINANCE: [
        FileCategory.PUBLIC,
        FileCategory.FINANCE,
    ],
    UserRole.EMPLOYEE: [
        FileCategory.PUBLIC,
    ],
}


# ============================================================
# RBAC SERVICE CLASS
# ============================================================

class RBACService:
    """
    Role-Based Access Control Service
    Handles permission and category checks
    """

    @staticmethod
    def has_permission(user_role: str, permission: str) -> bool:
        """
        Check if a role has a specific permission
        
        Args:
            user_role: User role (admin, manager, etc.)
            permission: Permission to check (view, edit, delete, etc.)
        
        Returns:
            bool: True if role has permission, False otherwise
        """
        try:
            role = UserRole(user_role)
            perm = Permission(permission)
            return perm in ROLE_PERMISSIONS.get(role, [])
        except ValueError:
            return False

    @staticmethod
    def can_access_category(user_role: str, category: str, department: Optional[str] = None) -> bool:
        """
        Check if a role can access a specific file category
        
        Args:
            user_role: User role
            category: File category
            department: User's department (for department-specific access)
        
        Returns:
            bool: True if role can access category
        """
        try:
            role = UserRole(user_role)
            cat = FileCategory(category)
            
            base_access = cat in ROLE_CATEGORY_ACCESS.get(role, [])
            
            # Department-specific access for Finance and HR
            if not base_access:
                if role == UserRole.MANAGER and department:
                    if (cat == FileCategory.FINANCE and department.lower() == "finance") or \
                       (cat == FileCategory.HR and department.lower() == "hr"):
                        return True
            
            return base_access
        except ValueError:
            return False

    @staticmethod
    def get_role_permissions(user_role: str) -> List[str]:
        """
        Get all permissions for a role
        
        Args:
            user_role: User role
        
        Returns:
            List of permission strings
        """
        try:
            role = UserRole(user_role)
            return [perm.value for perm in ROLE_PERMISSIONS.get(role, [])]
        except ValueError:
            return []

    @staticmethod
    def get_role_categories(user_role: str) -> List[str]:
        """
        Get all accessible categories for a role
        
        Args:
            user_role: User role
        
        Returns:
            List of category strings
        """
        try:
            role = UserRole(user_role)
            return [cat.value for cat in ROLE_CATEGORY_ACCESS.get(role, [])]
        except ValueError:
            return []

    @staticmethod
    def can_perform_action(
        user_role: str,
        file_category: str,
        permission: str,
        department: Optional[str] = None
    ) -> bool:
        """
        Check if user can perform an action on a file
        Combines role permission and category access checks
        
        Args:
            user_role: User role
            file_category: File category
            permission: Permission needed
            department: User's department
        
        Returns:
            bool: True if user can perform action
        """
        # First check if role has the permission
        if not RBACService.has_permission(user_role, permission):
            return False
        
        # Then check if role can access the category
        if not RBACService.can_access_category(user_role, file_category, department):
            return False
        
        return True

    @staticmethod
    def is_file_owner(user_id: str, file_owner_id: str) -> bool:
        """
        Check if user is the file owner
        
        Args:
            user_id: Current user ID
            file_owner_id: File owner ID
        
        Returns:
            bool: True if user owns the file
        """
        return str(user_id) == str(file_owner_id)

    @staticmethod
    def can_access_own_files_only(user_role: str) -> bool:
        """
        Check if user role can only access their own files
        
        Args:
            user_role: User role
        
        Returns:
            bool: True if user can only access own files
        """
        try:
            role = UserRole(user_role)
            return role in [UserRole.EMPLOYEE]
        except ValueError:
            return False

    @staticmethod
    def validate_role(role: str) -> bool:
        """
        Validate if a role exists
        
        Args:
            role: Role string
        
        Returns:
            bool: True if role is valid
        """
        try:
            UserRole(role)
            return True
        except ValueError:
            return False

    @staticmethod
    def validate_category(category: str) -> bool:
        """
        Validate if a category exists
        
        Args:
            category: Category string
        
        Returns:
            bool: True if category is valid
        """
        try:
            FileCategory(category)
            return True
        except ValueError:
            return False

    @staticmethod
    def validate_permission(permission: str) -> bool:
        """
        Validate if a permission exists
        
        Args:
            permission: Permission string
        
        Returns:
            bool: True if permission is valid
        """
        try:
            Permission(permission)
            return True
        except ValueError:
            return False

    @staticmethod
    def get_all_roles() -> List[Dict]:
        """
        Get all available roles with their permissions
        
        Returns:
            List of role dictionaries
        """
        return [
            {
                "name": role.value,
                "display_name": role.value.replace("_", " ").title(),
                "permissions": [p.value for p in perms]
            }
            for role, perms in ROLE_PERMISSIONS.items()
        ]

    @staticmethod
    def get_all_categories() -> List[Dict]:
        """
        Get all available categories
        
        Returns:
            List of category dictionaries
        """
        return [
            {
                "name": cat.value,
                "display_name": cat.value.replace("_", " ").title(),
            }
            for cat in FileCategory
        ]

    @staticmethod
    def get_all_permissions() -> List[Dict]:
        """
        Get all available permissions
        
        Returns:
            List of permission dictionaries
        """
        return [
            {
                "name": perm.value,
                "display_name": perm.value.replace("_", " ").title(),
            }
            for perm in Permission
        ]


# ============================================================
# FILE SHARING HELPER
# ============================================================

class FileSharingService:
    """
    Handles file sharing logic
    """

    @staticmethod
    def can_share_file(user_role: str, target_user_role: str) -> bool:
        """
        Check if user can share file with target user
        General rule: Admin can share with anyone, Manager with manager/below, etc.
        
        Args:
            user_role: Sharing user's role
            target_user_role: Target user's role
        
        Returns:
            bool: True if user can share
        """
        role_hierarchy = {
            UserRole.ADMIN: 7,
            UserRole.MANAGER: 6,
            UserRole.SENIOR_DEV: 5,
            UserRole.JUNIOR_DEV: 4,
            UserRole.HR: 4,
            UserRole.FINANCE: 4,
            UserRole.EMPLOYEE: 1,
        }
        
        try:
            user_level = role_hierarchy.get(UserRole(user_role), 0)
            target_level = role_hierarchy.get(UserRole(target_user_role), 0)
            return user_level >= target_level
        except ValueError:
            return False

    @staticmethod
    def can_extend_permissions(user_role: str, permission: str) -> bool:
        """
        Check if user can grant a permission to another user via sharing
        User can only share permissions they themselves have
        
        Args:
            user_role: User role
            permission: Permission to share
        
        Returns:
            bool: True if user can share this permission
        """
        return RBACService.has_permission(user_role, permission) and permission != Permission.DELETE.value

    @staticmethod
    def validate_share_request(
        user_role: str,
        file_category: str,
        target_user_role: str,
        permissions: List[str],
        user_department: Optional[str] = None
    ) -> tuple[bool, str]:
        """
        Validate a file sharing request
        
        Args:
            user_role: Sharing user's role
            file_category: File category
            target_user_role: Target user's role
            permissions: Permissions to grant
            user_department: User's department
        
        Returns:
            tuple: (is_valid, error_message)
        """
        # Check if user can share
        if not RBACService.has_permission(user_role, Permission.SHARE.value):
            return False, "User does not have share permission"
        
        # Check if user has permission to grant
        for perm in permissions:
            if not FileSharingService.can_extend_permissions(user_role, perm):
                return False, f"User cannot grant {perm} permission"
        
        # Check if user can share with target role
        if not FileSharingService.can_share_file(user_role, target_user_role):
            return False, "User cannot share with target user's role"
        
        # Check if user can access the category
        if not RBACService.can_access_category(user_role, file_category, user_department):
            return False, "User cannot access this file category"
        
        return True, ""


# ============================================================
# DEFAULT ROLES INITIALIZATION
# ============================================================

DEFAULT_ROLES = [
    {
        "name": "admin",
        "display_name": "Administrator",
        "permissions": [p.value for p in ROLE_PERMISSIONS[UserRole.ADMIN]],
    },
    {
        "name": "manager",
        "display_name": "Manager",
        "permissions": [p.value for p in ROLE_PERMISSIONS[UserRole.MANAGER]],
    },
    {
        "name": "senior_dev",
        "display_name": "Senior Developer",
        "permissions": [p.value for p in ROLE_PERMISSIONS[UserRole.SENIOR_DEV]],
    },
    {
        "name": "junior_dev",
        "display_name": "Junior Developer",
        "permissions": [p.value for p in ROLE_PERMISSIONS[UserRole.JUNIOR_DEV]],
    },
    {
        "name": "hr",
        "display_name": "HR Manager",
        "permissions": [p.value for p in ROLE_PERMISSIONS[UserRole.HR]],
    },
    {
        "name": "finance",
        "display_name": "Finance Manager",
        "permissions": [p.value for p in ROLE_PERMISSIONS[UserRole.FINANCE]],
    },
    {
        "name": "employee",
        "display_name": "Employee",
        "permissions": [p.value for p in ROLE_PERMISSIONS[UserRole.EMPLOYEE]],
    },
]
