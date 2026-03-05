import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check } from 'lucide-react';

/**
 * FaceCapture Component
 * Captures face image from camera and converts to base64
 */
export default function FaceCapture({ onCapture, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    // Prevent multiple simultaneous camera starts
    if (startingCamera) return;

    try {
      setStartingCamera(true);
      setError(null);
      setLoading(true);

      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user', // Front-facing camera
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Handle play promise to avoid unhandled promise rejection
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn('Video play interrupted:', err);
            // This is usually not a critical error
          });
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Camera access error:', err);
      const errorMessage =
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please enable camera permissions.'
          : err.name === 'NotFoundError'
            ? 'No camera found. Please connect a camera.'
            : 'Failed to access camera. Please try again.';

      setError(errorMessage);
      setLoading(false);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setStartingCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      // Pause the video before clearing srcObject
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Use fixed resolution for consistency with model training data
    const TARGET_W = 640;
    const TARGET_H = 480;
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;

    // The video preview is CSS-mirrored (scaleX(-1)) for a natural selfie look.
    // canvas.drawImage() reads the RAW (non-mirrored) pixels from the video stream,
    // so we must mirror the canvas draw to match what the user actually sees.
    // This ensures the registered face and the verification-time face are identical.
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    // Higher quality for better face feature extraction
    const imageData = canvas.toDataURL('image/jpeg', 0.95);

    setCapturedImage(imageData);
    setCaptured(true);

    // Stop camera after capture
    stopCamera();

    // Callback with base64 image
    if (onCapture) {
      onCapture(imageData);
    }
  };

  const retakePhoto = () => {
    setCaptured(false);
    setCapturedImage(null);
    // Only start camera if not already starting
    if (!startingCamera) {
      startCamera();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <Camera className="w-12 h-12 mx-auto mb-4 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Face Verification
          </h3>
          <p className="text-sm text-gray-600">
            {captured
              ? 'Photo captured. Verify or retake.'
              : 'Position your face in the frame and click capture.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={startCamera}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
          {loading && !captured && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {captured && capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured face"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}

          {!captured && !loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-4 border-white border-dashed rounded-full w-48 h-64 opacity-50"></div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {captured ? (
            <>
              <button
                onClick={retakePhoto}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Retake
              </button>
              <button
                onClick={() => {
                  if (onCapture && capturedImage) {
                    onCapture(capturedImage);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Check className="w-5 h-5" />
                Use This Photo
              </button>
            </>
          ) : (
            <button
              onClick={capturePhoto}
              disabled={loading || error || !stream}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Camera className="w-5 h-5" />
              {loading ? 'Starting Camera...' : 'Capture Photo'}
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Your face data is encrypted and only used for verification
        </p>
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
