import logging
from app.services.wifi_service import WiFiService

logging.basicConfig(level=logging.INFO)

def test_wifi():
    print("Testing WiFi Detection...")
    try:
        ssid = WiFiService.get_connected_ssid()
        print(f"Result: '{ssid}'")
        if ssid:
            print("✅ SUCCESS: WiFi SSID detected")
        else:
            print("⚠️ WARNING: No WiFi SSID detected (could be Ethernet or not connected)")
    except Exception as e:
        print(f"❌ ERROR: Exception occurred: {e}")

if __name__ == "__main__":
    test_wifi()
