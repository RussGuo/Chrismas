import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TreeMode } from '../types';

interface GalleryOverlayProps {
  mode: TreeMode;
  handPosition: { x: number; y: number; detected: boolean };
  photos: string[];
  texts: string[];
  audios: string[];
  onAudioPlay: (url: string) => void;
}

type GalleryItem =
  | { key: string; type: 'photo'; src: string }
  | { key: string; type: 'text'; text: string }
  | { key: string; type: 'audio'; url: string };

export const GalleryOverlay: React.FC<GalleryOverlayProps> = ({
  mode,
  handPosition,
  photos,
  texts,
  audios,
  onAudioPlay,
}) => {
  // Only active in CHAOS mode and when there's something to show
  const items: GalleryItem[] = useMemo(() => {
    const list: GalleryItem[] = [];
    photos.forEach((src, i) => list.push({ key: `p-${i}`, type: 'photo', src }));
    texts.forEach((text, i) => list.push({ key: `t-${i}`, type: 'text', text }));
    audios.forEach((url, i) => list.push({ key: `a-${i}`, type: 'audio', url }));
    return list;
  }, [photos, texts, audios]);

  const hasItems = items.length > 0;

  // Smooth hand X to reduce jitter for gallery movement
  const [smoothX, setSmoothX] = useState(0.5);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== TreeMode.CHAOS || !hasItems) {
      // Reset when leaving CHAOS
      setSmoothX(0.5);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let lastX = smoothX;

    const update = () => {
      const target = handPosition.detected ? handPosition.x : 0.5;
      // Low-pass filter
      lastX = lastX + (target - lastX) * 0.18;
      setSmoothX(lastX);
      rafRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hasItems, handPosition.detected, handPosition.x]);

  const [viewportWidth, setViewportWidth] = useState(1920);

  useEffect(() => {
    const update = () => {
      if (typeof window !== 'undefined') {
        setViewportWidth(window.innerWidth || 1920);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (mode !== TreeMode.CHAOS || !hasItems) {
    return null;
  }

  const CARD_WIDTH = 260;
  const GAP = 32;
  const trackWidth = items.length * (CARD_WIDTH + GAP);
  const maxScroll = Math.max(0, trackWidth - viewportWidth * 0.7);

  // smoothX in [0,1] -> scroll range [-maxScroll, 0]
  const scroll = maxScroll === 0 ? 0 : -maxScroll * smoothX;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
      <div className="w-[80vw] max-w-5xl h-[260px] bg-black/65 border border-[#D4AF37]/40 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-md overflow-hidden pointer-events-none">
        <div
          className="h-full flex items-center"
          style={{
            transform: `translateX(${scroll}px)`,
            transition: 'transform 40ms linear',
          }}
        >
          {items.map((item, index) => {
            const baseClass =
              'flex-shrink-0 mx-4 rounded-xl overflow-hidden border border-[#D4AF37]/30 bg-black/60 pointer-events-auto';
            if (item.type === 'photo') {
              return (
                <div
                  key={item.key}
                  className={`${baseClass} w-[260px] h-[200px] flex flex-col`}
                >
                  <div className="flex-1 bg-black/50 flex items-center justify-center">
                    <img
                      src={item.src}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="h-[40px] flex items-center justify-center text-xs text-[#F5E6BF]/80 font-serif tracking-[0.15em]">
                    PHOTO {index + 1}
                  </div>
                </div>
              );
            }

            if (item.type === 'text') {
              return (
                <div
                  key={item.key}
                  className={`${baseClass} w-[260px] h-[200px] flex flex-col`}
                >
                  <div className="flex-1 px-4 py-4 flex items-center justify-center">
                    <p className="text-sm text-[#F5E6BF] font-serif leading-relaxed text-center break-words">
                      {item.text}
                    </p>
                  </div>
                  <div className="h-[40px] flex items-center justify-center text-xs text-[#A0A08A]/90 font-serif tracking-[0.15em]">
                    NOTE
                  </div>
                </div>
              );
            }

            // audio
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onAudioPlay(item.url)}
                className={`${baseClass} w-[260px] h-[200px] flex flex-col hover:border-[#D4AF37]/70 hover:bg-black/80 transition-colors`}
              >
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="w-24 h-24 rounded-full border border-[#D4AF37]/70 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/80 flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[14px] border-l-black" />
                    </div>
                  </div>
                  <p className="text-xs text-[#F5E6BF]/80 font-serif tracking-[0.2em]">
                    VOICE MEMORY
                  </p>
                </div>
                <div className="h-[40px] flex items-center justify-center text-[11px] text-[#A0A08A]/90 font-serif tracking-[0.15em]">
                  TAP TO PLAY
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

