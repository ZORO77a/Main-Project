import subprocess
import platform
import logging
import os
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


class WiFiService:
    """
    Detect the currently connected WiFi SSID across different platforms.
    Supports Linux, macOS, and Windows.
    """

    @staticmethod
    def get_connected_ssid() -> Optional[str]:
        """
        Detect and return the currently connected WiFi SSID.
        Returns empty string if not connected or detection fails.
        """
        system = platform.system()
        start_time = datetime.now()

        try:
            ssid = ""
            if system == "Linux":
                ssid = WiFiService._get_ssid_linux()
            elif system == "Darwin":  # macOS
                ssid = WiFiService._get_ssid_macos()
            elif system == "Windows":
                ssid = WiFiService._get_ssid_windows()
            else:
                logger.warning(f"WiFi detection not supported on {system}")
                return ""
            
            duration = (datetime.now() - start_time).total_seconds() * 1000
            if ssid:
                logger.info(f"WiFi SSID detected: '{ssid}' ({duration:.2f}ms)")
            else:
                logger.debug(f"No WiFi SSID detected ({duration:.2f}ms)")
            
            return ssid

        except Exception as e:
            logger.error(f"Error detecting WiFi SSID: {e}")
            return ""

    @staticmethod
    def _get_ssid_linux() -> str:
        """
        Detect WiFi SSID on Linux using nmcli or iwconfig.
        nmcli is preferred if available.
        """
        # Try nmcli first (NetworkManager)
        try:
            result = subprocess.run(
                ["nmcli", "-t", "-f", "active,ssid", "dev", "wifi"],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0 and result.stdout:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    parts = line.split(':', 1)
                    if len(parts) == 2 and parts[0].strip() == "yes":
                        ssid = parts[1].strip()
                        if ssid:
                            return ssid
        except (FileNotFoundError, subprocess.TimeoutExpired, Exception) as e:
            logger.debug(f"nmcli detection failed: {e}")

        # Fallback to iwconfig if nmcli fails
        try:
            result = subprocess.run(
                ["iwconfig"],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0 and result.stdout:
                for line in result.stdout.split('\n'):
                    if 'ESSID' in line:
                        parts = line.split('ESSID:')
                        if len(parts) > 1:
                            ssid = parts[1].strip().strip('"')
                            if ssid and ssid != "off/any":
                                return ssid
        except (FileNotFoundError, subprocess.TimeoutExpired, Exception) as e:
            logger.debug(f"iwconfig detection failed: {e}")

        return ""

    @staticmethod
    def _get_ssid_macos() -> str:
        """
        Detect WiFi SSID on macOS using airport utility.
        """
        airport_path = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport"
        try:
            # Check if airport utility exists
            if not os.path.exists(airport_path):
                # Fallback to networksetup
                return WiFiService._get_ssid_macos_fallback()

            result = subprocess.run(
                [airport_path, "-I"],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0 and result.stdout:
                for line in result.stdout.split('\n'):
                    if ' SSID:' in line:  # Space before SSID to avoid matching BSSID if that format existed
                        parts = line.split(' SSID:')
                        if len(parts) > 1:
                            ssid = parts[1].strip()
                            if ssid:
                                return ssid
            return ""
        except (subprocess.TimeoutExpired, Exception) as e:
            logger.warning(f"macOS WiFi detection failed: {e}")
            return ""

    @staticmethod
    def _get_ssid_macos_fallback() -> str:
        """
        Fallback for macOS using networksetup.
        """
        try:
            result = subprocess.run(
                ["networksetup", "-getairportnetwork", "en0"],
                capture_output=True,
                text=True,
                timeout=5
            )
            # Output format: "Current Wi-Fi Network: MyNetwork"
            if result.returncode == 0 and result.stdout:
                output = result.stdout.strip()
                prefix = "Current Wi-Fi Network: "
                if output.startswith(prefix):
                    return output[len(prefix):].strip()
            return ""
        except Exception:
            return ""

    @staticmethod
    def _get_ssid_windows() -> str:
        """
        Detect WiFi SSID on Windows using netsh command.
        Fixes issue where 'BSSID' lines were incorrectly matched.
        """
        try:
            # Use cp65001 for UTF-8 output to handle special chars in SSIDs
            result = subprocess.run(
                ["netsh", "wlan", "show", "interfaces"],
                capture_output=True,
                text=True,
                timeout=5,
                encoding='utf-8', 
                errors='replace'
            )

            if result.returncode == 0 and result.stdout:
                for line in result.stdout.split('\n'):
                    line = line.strip()
                    # Look for "SSID" key but exclude "BSSID"
                    # Output format is usually: "    SSID                   : MyNetwork"
                    # But can also be "    BSSID                  : 00:00:00:00:00:00"
                    
                    if "SSID" in line and ":" in line:
                        key, value = line.split(':', 1)
                        key = key.strip()
                        value = value.strip()
                        
                        # Strict check to ensure it's SSID and not BSSID
                        if key == "SSID":
                            if value and value.lower() != "none":
                                return value
                            
            return ""
        except FileNotFoundError:
            logger.warning("netsh command not found on Windows system")
            return ""
        except subprocess.TimeoutExpired:
            logger.warning("Windows WiFi detection command timed out")
            return ""
        except Exception as e:
            logger.error(f"Windows WiFi detection unexpected error: {e}")
            return ""
