import React, { useRef, useState } from 'react';
import { TreeMode } from '../types';

interface UIOverlayProps {
  mode: TreeMode;
  onToggle: () => void;
  onPhotosUpload: (photos: string[]) => void;
  onTextAdd: (text: string) => void;
  onAudioAdd: (audioUrl: string) => void;
  hasPhotos: boolean;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  mode,
  onToggle,
  onPhotosUpload,
  onTextAdd,
  onAudioAdd,
  hasPhotos,
}) => {
  const [showSecretPanel, setShowSecretPanel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const photoUrls: string[] = [];
    const readers: Promise<string>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const promise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      });

      readers.push(promise);
    }

    Promise.all(readers).then((urls) => {
      onPhotosUpload(urls);
    });
  };

  const handleUploadClick = () => {
    setShowSecretPanel(false);
    fileInputRef.current?.click();
  };

  const toggleSecretPanel = () => {
    setShowSecretPanel((prev) => !prev);
  };

  const handleTextClick = () => {
    const value = window.prompt('写下一段只属于你的圣诞心愿：');
    if (value && value.trim()) {
      onTextAdd(value.trim());
    }
    setShowSecretPanel(false);
  };

  const handleAudioClick = async () => {
    if (isRecording) {
      // Stop current recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        onAudioAdd(url);
        setShowSecretPanel(false);
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting audio recording', error);
      alert('无法访问麦克风，请检查浏览器权限设置。');
    }
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-8 z-10">
      {/* Hidden input for photo upload (triggered by secret control) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* Header */}
      <header className="flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F5E6BF] to-[#D4AF37] font-serif drop-shadow-lg tracking-wider text-center">
          Merry Christmas
        </h1>
      </header>

      {/* Control Panel */}
      {/* <div className="flex flex-col items-center mb-8 pointer-events-auto">
        <button
          onClick={onToggle}
          className={`
            group relative px-12 py-4 border-2 border-[#D4AF37] 
            bg-black/50 backdrop-blur-md overflow-hidden transition-all duration-500
            hover:shadow-[0_0_30px_#D4AF37] hover:border-[#fff]
          `}
        >
          <div className={`absolute inset-0 bg-[#D4AF37] transition-transform duration-500 ease-in-out origin-left ${isFormed ? 'scale-x-0' : 'scale-x-100'} opacity-10`}></div>
          
          <span className="relative z-10 font-serif text-xl md:text-2xl text-[#D4AF37] tracking-[0.2em] group-hover:text-white transition-colors">
            {isFormed ? 'UNLEASH CHAOS' : 'RESTORE ORDER'}
          </span>
        </button>
        
        <p className="mt-4 text-[#F5E6BF] font-serif text-xs opacity-50 tracking-widest text-center max-w-md">
          {isFormed 
            ? "A magnificent assembly of the finest ornaments. Truly spectacular." 
            : "Creative potential unleashed. Waiting to be made great again."}
        </p>
      </div> */}

      {/* Decorative Corners */}
      <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-[#D4AF37] opacity-50"></div>
      <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-[#D4AF37] opacity-50"></div>
      <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-[#D4AF37] opacity-50"></div>
      <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-[#D4AF37] opacity-50"></div>

      {/* Secret upload trigger - subtle, near bottom-right corner */}
      <button
        type="button"
        onClick={toggleSecretPanel}
        className="absolute bottom-8 right-8 w-10 h-10 pointer-events-auto bg-transparent hover:bg-[#D4AF37]/5 transition-colors"
        aria-label="Open secret memory upload"
      />

      {/* Secret upload panel */}
      {showSecretPanel && (
        <div className="absolute bottom-20 right-10 pointer-events-auto bg-black/80 border border-[#D4AF37]/40 px-4 py-3 rounded-md shadow-[0_0_20px_rgba(0,0,0,0.6)] space-y-2 backdrop-blur-md">
          <p className="text-[10px] text-[#F5E6BF]/70 font-serif tracking-[0.25em]">
            SECRET MEMORY PORTAL
          </p>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={handleUploadClick}
              className="px-2 py-1 text-[11px] border border-[#D4AF37]/60 text-[#F5E6BF] font-serif tracking-[0.15em] hover:bg-[#D4AF37]/20 transition-colors"
            >
              照片
            </button>
            <button
              type="button"
              onClick={handleTextClick}
              className="px-2 py-1 text-[11px] border border-[#D4AF37]/30 text-[#D4AF37] font-serif tracking-[0.15em] hover:border-[#D4AF37]/60 hover:text-[#F5E6BF] transition-colors"
            >
              文字
            </button>
            <button
              type="button"
              onClick={handleAudioClick}
              className={`px-2 py-1 text-[11px] border font-serif tracking-[0.15em] transition-colors ${
                isRecording
                  ? 'border-red-400 text-red-300 bg-red-900/40'
                  : 'border-[#D4AF37]/20 text-[#A0A08A] hover:border-[#D4AF37]/40 hover:text-[#F5E6BF]'
              }`}
            >
              {isRecording ? '录音中… 点击结束' : '语音'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
