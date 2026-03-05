/**
 * WiFi Detection Utility
 * Attempts to detect WiFi SSID (limited browser support)
 */

/**
 * Get WiFi SSID (if available)
 * Note: Browser security restrictions limit WiFi SSID access
 * This works best in Chrome/Edge on Android or with enterprise policies
 */
export const getWiFiSSID = () => {
  return new Promise((resolve, reject) => {
    // Method 1: Try Chrome Connection API (limited support)
    if (navigator.connection || navigator.mozConnection || navigator.webkitConnection) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      // Network type might give us some info
      const networkType = connection.type || connection.effectiveType;
      
      if (networkType === 'wifi') {
        // Try to get SSID from connection (if available)
        if (connection.wifi && connection.wifi.ssid) {
          resolve(connection.wifi.ssid);
          return;
        }
      }
    }

    // Method 2: Try to detect via network state (very limited)
    // Most browsers don't expose SSID for security reasons
    
    // Fallback: Return null if unavailable
    // The backend will handle this gracefully (WiFi is a soft rule)
    resolve(null);
  });
};

/**
 * Get network information (what's available)
 */
export const getNetworkInfo = () => {
  const info = {
    type: 'unknown',
    effectiveType: 'unknown',
    downlink: null,
    rtt: null,
    saveData: false,
    ssid: null,
  };

  if (navigator.connection || navigator.mozConnection || navigator.webkitConnection) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    info.type = connection.type || 'unknown';
    info.effectiveType = connection.effectiveType || 'unknown';
    info.downlink = connection.downlink || null;
    info.rtt = connection.rtt || null;
    info.saveData = connection.saveData || false;

    // Try to get WiFi SSID (Chrome/Android only)
    if (connection.type === 'wifi' && connection.wifi) {
      info.ssid = connection.wifi.ssid || null;
    }
  }

  return info;
};

/**
 * Check if device is on WiFi
 */
export const isOnWiFi = () => {
  if (navigator.connection || navigator.mozConnection || navigator.webkitConnection) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const type = connection.type || connection.effectiveType;
    return type === 'wifi' || type === 'ethernet';
  }
  return false;
};
