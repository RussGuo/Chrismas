
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { TreeMode } from '../types';

interface GestureControllerProps {
  onModeChange: (mode: TreeMode) => void;
  currentMode: TreeMode;
  onHandPosition?: (x: number, y: number, detected: boolean) => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ onModeChange, currentMode, onHandPosition }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [gestureStatus, setGestureStatus] = useState<string>("Initializing...");
  const [handPos, setHandPos] = useState<{ x: number; y: number } | null>(null);
  const lastModeRef = useRef<TreeMode>(currentMode);
  
  // Debounce logic refs
  const openFrames = useRef(0);
  const closedFrames = useRef(0);
  const CONFIDENCE_THRESHOLD = 5; // Number of consecutive frames to confirm gesture
  const noHandFrames = useRef(0);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    const setupMediaPipe = async () => {
      try {
        // Use jsDelivr CDN (accessible in China)
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        // Use local model file to avoid loading from Google Storage (blocked in China)
        // Model file should be downloaded using: npm run download-model or download-model.bat/.sh
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `/models/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        startWebcam();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
        console.warn("Gesture control is unavailable. The app will still work without it.");
        setGestureStatus("Gesture control unavailable");
        // Don't block the app if gesture control fails
      }
    };

    const startWebcam = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: "user" }
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", predictWebcam);
            setIsLoaded(true);
            setGestureStatus("Waiting for hand...");
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
          setGestureStatus("Permission Denied");
        }
      }
    };

    const drawHandSkeleton = (landmarks: any[]) => {
      if (!canvasRef.current || !videoRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to match video
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Hand connections (MediaPipe hand model)
      const connections = [
        // Thumb
        [0, 1], [1, 2], [2, 3], [3, 4],
        // Index finger
        [0, 5], [5, 6], [6, 7], [7, 8],
        // Middle finger
        [0, 9], [9, 10], [10, 11], [11, 12],
        // Ring finger
        [0, 13], [13, 14], [14, 15], [15, 16],
        // Pinky
        [0, 17], [17, 18], [18, 19], [19, 20],
        // Palm
        [5, 9], [9, 13], [13, 17]
      ];

      // Draw connections (lines)
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#D4AF37'; // Gold color
      connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      });

      // Draw landmarks (points)
      landmarks.forEach((landmark, index) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        
        // Use green for all points
        ctx.fillStyle = '#228B22'; // Forest green color
        ctx.fill();
        
        // Add outline
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
    };

    const predictWebcam = () => {
      if (!handLandmarker || !videoRef.current) return;

      const startTimeMs = performance.now();
      if (videoRef.current.videoWidth > 0) { // Ensure video is ready
        const result = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

        if (result.landmarks && result.landmarks.length > 0) {
          noHandFrames.current = 0;
          const landmarks = result.landmarks[0];
          drawHandSkeleton(landmarks);
          detectGesture(landmarks);
        } else {
            setGestureStatus("No hand detected");
            setHandPos(null); // Clear hand position when no hand detected
            if (onHandPosition) {
              onHandPosition(0.5, 0.5, false); // No hand detected
            }
            // Clear canvas when no hand detected
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }
            // Reset counters if hand is lost? 
            // Better to keep them to prevent flickering if hand blips out for 1 frame
            openFrames.current = Math.max(0, openFrames.current - 1);
            closedFrames.current = Math.max(0, closedFrames.current - 1);

            // If hand has been missing for a while while in CHAOS, gently restore tree
            noHandFrames.current += 1;
            const NO_HAND_THRESHOLD = 60; // ~1s at 60fps
            if (
              noHandFrames.current > NO_HAND_THRESHOLD &&
              lastModeRef.current === TreeMode.CHAOS
            ) {
              lastModeRef.current = TreeMode.FORMED;
              onModeChange(TreeMode.FORMED);
            }
        }
      }

      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    const detectGesture = (landmarks: any[]) => {
      // Only track thumb + index finger for gesture + position
      // Thumb: base 2, tip 4
      // Index: base 5, tip 8

      const thumbBase = landmarks[2];
      const thumbTip = landmarks[4];
      const indexBase = landmarks[5];
      const indexTip = landmarks[8];

      // Use midpoint between thumb tip and index tip as control point
      const centerX = (thumbTip.x + indexTip.x) / 2;
      const centerY = (thumbTip.y + indexTip.y) / 2;

      setHandPos({ x: centerX, y: centerY });
      if (onHandPosition) {
        onHandPosition(centerX, centerY, true);
      }

      // Gesture: distance between thumb tip and index tip vs their base distance
      const distTips = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
      const distBases = Math.hypot(thumbBase.x - indexBase.x, thumbBase.y - indexBase.y) || 1e-5;
      const ratio = distTips / distBases;

      // Tunable thresholds
      const OPEN_RATIO = 1.5;   // thumb & index clearly apart
      const CLOSED_RATIO = 1.1; // thumb & index close together

      if (ratio >= OPEN_RATIO) {
        // Thumb + index spread apart -> UNLEASH (CHAOS)
        openFrames.current++;
        closedFrames.current = 0;
        
        setGestureStatus("Detected: OPEN (Thumb + Index)");

        if (openFrames.current > CONFIDENCE_THRESHOLD) {
            if (lastModeRef.current !== TreeMode.CHAOS) {
                lastModeRef.current = TreeMode.CHAOS;
                onModeChange(TreeMode.CHAOS);
            }
        }

      } else if (ratio <= CLOSED_RATIO) {
        // Thumb + index pinched together -> RESTORE (FORMED)
        closedFrames.current++;
        openFrames.current = 0;
        
        setGestureStatus("Detected: CLOSED (Pinch)");

        if (closedFrames.current > CONFIDENCE_THRESHOLD) {
            if (lastModeRef.current !== TreeMode.FORMED) {
                lastModeRef.current = TreeMode.FORMED;
                onModeChange(TreeMode.FORMED);
            }
        }
      } else {
        // Ambiguous
        setGestureStatus("Detected: ...");
        openFrames.current = 0;
        closedFrames.current = 0;
      }
    };

    setupMediaPipe();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
    };
  }, [onModeChange]);

  // Sync ref with prop updates to prevent overriding in closure
  useEffect(() => {
    lastModeRef.current = currentMode;
  }, [currentMode]);

  return (
    // Keep video + canvas in DOM for gesture detection,
    // but make the preview fully transparent so it’s invisible.
    <div className="absolute top-6 right-[8%] z-50 flex flex-col items-end opacity-0 pointer-events-none">
      <div className="relative w-[18.75vw] h-[14.0625vw] bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
        />
      </div>
    </div>
  );
};
