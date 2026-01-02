import { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export default function FullscreenMap({ children, isFullscreen, onToggleFullscreen }: Props) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div
        className="relative w-full h-full"
        style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
      >
        {children}
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-background"
        style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
      >
        <div
          className="relative w-full h-full"
          style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
        >
          {children}
          <button
            onClick={onToggleFullscreen}
            className="absolute top-4 right-4 z-[10000] bg-white/90 backdrop-blur-sm hover:bg-white text-gray-800 p-2 rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
            title="Exit fullscreen"
          >
            <Minimize2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full"
      style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
    >
      {children}
      <button
        onClick={onToggleFullscreen}
        className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm hover:bg-white text-gray-800 p-1.5 rounded-md shadow-md transition-all duration-200 hover:scale-105"
        title="View fullscreen"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}
