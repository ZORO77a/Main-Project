"""
Device Fingerprinting Service
Handles device identification and validation
"""
import hashlib
import json
from typing import Dict, Optional, Tuple

def generate_device_fingerprint(device_info: Dict) -> str:
    """
    Generate a unique device fingerprint from device information
    
    Args:
        device_info: Dictionary containing device characteristics:
            - user_agent: Browser user agent
            - screen_width: Screen width
            - screen_height: Screen height
            - timezone: Timezone offset
            - language: Browser language
            - platform: Operating system
            - cpu_cores: Number of CPU cores
            - hardware_concurrency: Hardware concurrency
            - webgl_vendor: WebGL vendor
            - webgl_renderer: WebGL renderer
    
    Returns:
        SHA256 hash of device fingerprint
    """
    # Create a normalized fingerprint string
    fingerprint_data = {
        "ua": device_info.get("user_agent", ""),
        "screen": f"{device_info.get('screen_width', 0)}x{device_info.get('screen_height', 0)}",
        "tz": device_info.get("timezone", ""),
        "lang": device_info.get("language", ""),
        "platform": device_info.get("platform", ""),
        "cores": device_info.get("cpu_cores", ""),
        "hw": device_info.get("hardware_concurrency", ""),
        "webgl_v": device_info.get("webgl_vendor", ""),
        "webgl_r": device_info.get("webgl_renderer", ""),
    }
    
    # Create deterministic string
    fingerprint_str = json.dumps(fingerprint_data, sort_keys=True)
    
    # Generate SHA256 hash
    fingerprint_hash = hashlib.sha256(fingerprint_str.encode('utf-8')).hexdigest()
    
    return fingerprint_hash


def compare_device_fingerprints(
    stored_fingerprint: str,
    current_fingerprint: str,
    tolerance: float = 0.9
) -> Tuple[bool, float]:
    """
    Compare two device fingerprints
    
    Args:
        stored_fingerprint: Previously stored device fingerprint
        current_fingerprint: Current device fingerprint
        tolerance: Match tolerance (0.0 to 1.0)
    
    Returns:
        Tuple of (match: bool, similarity: float)
    """
    if not stored_fingerprint or not current_fingerprint:
        return False, 0.0
    
    # Exact match
    if stored_fingerprint == current_fingerprint:
        return True, 1.0
    
    # For now, exact match only. In future, can implement fuzzy matching
    # based on partial fingerprint components
    return False, 0.0


def validate_device_info(device_info: Dict) -> Tuple[bool, str]:
    """
    Validate device information structure
    
    Returns:
        Tuple of (is_valid: bool, error_message: str)
    """
    required_fields = ["user_agent"]
    
    for field in required_fields:
        if field not in device_info or not device_info[field]:
            return False, f"Missing required field: {field}"
    
    return True, "Valid"
