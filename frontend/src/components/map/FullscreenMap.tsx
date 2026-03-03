import { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export default function FullscreenMap({ children, isFullscreen, onToggleFullscreen }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen, mounted]);

  if (!mounted) {
    return (
      <div className="relative w-full h-full" style={{ isolation: 'isolate' }}>
        {children}
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#fff',
          isolation: 'isolate',
        }}
      >
        <div className="relative w-full h-full">
          {children}
          <button
            onClick={onToggleFullscreen}
            style={{ position: 'absolute', top: 12, right: 12, zIndex: 10000 }}
            className="bg-white/95 hover:bg-white text-gray-800 p-2 rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
            title="Exit fullscreen"
          >
            <Minimize2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ isolation: 'isolate' }}>
      {children}
      <button
        onClick={onToggleFullscreen}
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 1000 }}
        className="bg-white/95 hover:bg-white text-gray-800 p-1.5 rounded-md shadow-md transition-all duration-200 hover:scale-105"
        title="View fullscreen"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}