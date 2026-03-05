"""
CLI helper to print the currently detected WiFi SSID using the backend service.
"""
import logging
import asyncio
from app.services.wifi_service import WiFiService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    ssid = WiFiService.get_connected_ssid()
    if ssid:
        print(f"Connected SSID: {ssid}")
    else:
        print("No WiFi SSID detected or detection not supported on this host.")


if __name__ == '__main__':
    main()
