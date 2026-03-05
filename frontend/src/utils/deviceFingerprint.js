/**
 * Device Fingerprinting Utility
 * Generates unique device fingerprint from browser/device characteristics
 */

/**
 * Get canvas fingerprint
 */
const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 50;
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('GeoCrypt Device Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('GeoCrypt Device Fingerprint', 4, 17);
    
    return canvas.toDataURL();
  } catch (error) {
    console.warn('Canvas fingerprint failed:', error);
    return '';
  }
};

/**
 * Get WebGL fingerprint
 */
const getWebGLFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { vendor: null, renderer: null };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
      };
    }

    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
    };
  } catch (error) {
    console.warn('WebGL fingerprint failed:', error);
    return { vendor: null, renderer: null };
  }
};

/**
 * Generate device fingerprint
 */
export const generateDeviceFingerprint = async () => {
  const fingerprint = {
    // Browser info
    user_agent: navigator.userAgent,
    
    // Screen info
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    screen_color_depth: window.screen.colorDepth,
    
    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezone_offset: new Date().getTimezoneOffset(),
    
    // Language
    language: navigator.language,
    languages: navigator.languages?.join(',') || navigator.language,
    
    // Platform
    platform: navigator.platform,
    
    // Hardware
    cpu_cores: navigator.hardwareConcurrency || null,
    hardware_concurrency: navigator.hardwareConcurrency || null,
    
    // Memory (if available)
    device_memory: navigator.deviceMemory || null,
    
    // WebGL info
    ...getWebGLFingerprint(),
    
    // Canvas fingerprint hash
    canvas_fingerprint: getCanvasFingerprint().substring(0, 100), // First 100 chars
    
    // Additional browser features
    cookie_enabled: navigator.cookieEnabled,
    do_not_track: navigator.doNotTrack || null,
    
    // Touch support
    touch_points: navigator.maxTouchPoints || 0,
    
    // Vendor info
    vendor: navigator.vendor,
  };

  return fingerprint;
};

/**
 * Generate a hash from fingerprint (for display/storage)
 */
/**
 * Generate device fingerprint hash (matches backend algorithm)
 * Backend uses: json.dumps(fingerprint_data, sort_keys=True) then SHA256
 */
export const hashFingerprint = async (fingerprint) => {
  // Normalize fingerprint to match backend format (sorted keys)
  const normalizedFingerprint = {
    ua: fingerprint.user_agent || '',
    screen: `${fingerprint.screen_width || 0}x${fingerprint.screen_height || 0}`,
    tz: fingerprint.timezone || '',
    lang: fingerprint.language || '',
    platform: fingerprint.platform || '',
    cores: String(fingerprint.cpu_cores || ''),
    hw: String(fingerprint.hardware_concurrency || ''),
    webgl_v: fingerprint.webgl_vendor || '',
    webgl_r: fingerprint.webgl_renderer || '',
  };

  // Create deterministic string with sorted keys (matches backend)
  const fingerprintStr = JSON.stringify(normalizedFingerprint, Object.keys(normalizedFingerprint).sort());

  // Use Web Crypto API if available (matches backend SHA256)
  if (window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(fingerprintStr);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      console.warn('Crypto hash failed, using simple hash:', error);
    }
  }
  
  // Fallback: simple string hash
  let hash = 0;
  for (let i = 0; i < fingerprintStr.length; i++) {
    const char = fingerprintStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
};
