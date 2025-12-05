
import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Experience } from './components/Experience';
import { UIOverlay } from './components/UIOverlay';
import { GestureController } from './components/GestureController';
import { TreeMode } from './types';

// Simple Error Boundary to catch 3D resource loading errors (like textures)
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error loading 3D scene:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can customize this fallback UI
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-[#D4AF37] font-serif p-8 text-center">
          <div>
            <h2 className="text-2xl mb-2">Something went wrong</h2>
            <p className="opacity-70">A resource failed to load (likely a missing image). Check the console for details.</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [mode, setMode] = useState<TreeMode>(TreeMode.FORMED);
  const [handPosition, setHandPosition] = useState<{ x: number; y: number; detected: boolean }>({ x: 0.5, y: 0.5, detected: false });
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadedTexts, setUploadedTexts] = useState<string[]>(['FOR CINCIN']);
  const [uploadedAudios, setUploadedAudios] = useState<string[]>([]);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const toggleMode = () => {
    setMode((prev) => (prev === TreeMode.FORMED ? TreeMode.CHAOS : TreeMode.FORMED));
  };

  const handleHandPosition = (x: number, y: number, detected: boolean) => {
    setHandPosition({ x, y, detected });
  };

  const handlePhotosUpload = (photos: string[]) => {
    setUploadedPhotos((prev) => [...prev, ...photos]);
  };

  const handleTextAdd = (text: string) => {
    if (!text.trim()) return;
    setUploadedTexts((prev) => [...prev, text.trim()]);
  };

  const handleAudioAdd = (audioUrl: string) => {
    setUploadedAudios((prev) => [...prev, audioUrl]);
  };

  // Load any photos found under public/photos via manifest.json
  React.useEffect(() => {
    fetch('/photos/manifest.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.photos)) {
          setUploadedPhotos((prev) => (prev.length > 0 ? prev : data.photos));
        }
      })
      .catch(() => {
        // Ignore if manifest is missing or malformed
      });
  }, []);

  React.useEffect(() => {
    const handleFocus = (event: Event) => {
      const custom = event as CustomEvent<{ url: string }>;
      if (custom.detail?.url) {
        setCurrentAudioUrl(custom.detail.url);
      }
    };

    const handleBlur = () => {
      setCurrentAudioUrl(null);
    };

    window.addEventListener('memory-audio-focus', handleFocus as EventListener);
    window.addEventListener('memory-audio-blur', handleBlur as EventListener);

    return () => {
      window.removeEventListener('memory-audio-focus', handleFocus as EventListener);
      window.removeEventListener('memory-audio-blur', handleBlur as EventListener);
    };
  }, []);

  React.useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (currentAudioUrl) {
      audioEl.src = currentAudioUrl;
      audioEl.play().catch(() => {
        // Autoplay might be blocked; ignore error.
      });
    } else {
      audioEl.pause();
    }
  }, [currentAudioUrl]);

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-black via-[#001a0d] to-[#0a2f1e]">
      <ErrorBoundary>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 4, 20], fov: 45 }}
          gl={{ antialias: false, stencil: false, alpha: false }}
          shadows
        >
          <Suspense fallback={null}>
            <Experience
              mode={mode}
              handPosition={handPosition}
              uploadedPhotos={uploadedPhotos}
              uploadedTexts={uploadedTexts}
              uploadedAudios={uploadedAudios}
            />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
      
      <Loader 
        containerStyles={{ background: '#000' }} 
        innerStyles={{ width: '300px', height: '10px', background: '#333' }}
        barStyles={{ background: '#D4AF37', height: '10px' }}
        dataStyles={{ color: '#D4AF37', fontFamily: 'Cinzel' }}
      />

      <UIOverlay
        mode={mode}
        onToggle={toggleMode}
        onPhotosUpload={handlePhotosUpload}
        onTextAdd={handleTextAdd}
        onAudioAdd={handleAudioAdd}
        hasPhotos={uploadedPhotos.length > 0}
      />
      
      {/* Gesture Control Module */}
      <GestureController currentMode={mode} onModeChange={setMode} onHandPosition={handleHandPosition} />

      {/* Hidden audio player for voice memories */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
