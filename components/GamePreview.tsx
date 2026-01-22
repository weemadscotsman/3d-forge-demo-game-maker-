import React, { useRef, useEffect, useState } from 'react';
import { Icons } from './Icons';

interface Props {
  html: string;
  title: string;
}

interface TelemetryData {
    fps: number;
    entities: number;
}

export const GamePreview: React.FC<Props> = ({ html, title }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCrashed, setIsCrashed] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData>({ fps: 0, entities: 0 });
  const [mountKey, setMountKey] = useState(0); // Used to force full iframe recreation

  useEffect(() => {
    // Reset state when new game loads (html changes)
    setIsPlaying(false);
    setIsCrashed(false);
    setTelemetry({ fps: 0, entities: 0 });
    setMountKey(prev => prev + 1);
  }, [html]);

  useEffect(() => {
    // Write to iframe whenever mountKey changes (and we are not crashed)
    if (iframeRef.current && !isCrashed) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [mountKey, isCrashed, html]);

  // Telemetry Listener
  useEffect(() => {
      const handleMessage = (e: MessageEvent) => {
          if (e.data && e.data.type === 'forge-telemetry') {
              setTelemetry({
                  fps: e.data.fps || 0,
                  entities: e.data.entities || 0
              });
          }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleStartGame = () => {
    setIsPlaying(true);
    
    if (iframeRef.current && iframeRef.current.contentDocument) {
        const doc = iframeRef.current.contentDocument;
        
        // Try to trigger the game's internal start mechanism
        const internalStartBtn = doc.getElementById('start-btn');
        const internalOverlay = doc.getElementById('overlay');
        
        if (internalStartBtn) {
            internalStartBtn.click();
        } else if (internalOverlay) {
            internalOverlay.click();
        } else {
            // Fallback: Click body to ensure focus
            doc.body.click();
        }
        
        // Focus iframe for keyboard controls
        iframeRef.current.focus();
    }
  };

  const handleReload = () => {
     setIsPlaying(false);
     setIsCrashed(false);
     setTelemetry({ fps: 0, entities: 0 });
     // Force a complete unmount/remount of the iframe to clear WebGL contexts
     setMountKey(prev => prev + 1);
  };

  const handlePanicStop = () => {
      setIsPlaying(false);
      setIsCrashed(true);
      
      // Attempt aggressive cleanup before unmount
      if (iframeRef.current && iframeRef.current.contentWindow) {
          try {
              iframeRef.current.contentWindow.stop();
          } catch(e) { /* ignore cross-origin issues */ }
          try {
              iframeRef.current.src = "about:blank";
          } catch(e) { /* ignore */ }
      }
  };

  // Crashed State View
  if (isCrashed) {
      return (
        <div className="w-full h-full flex flex-col bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 relative items-center justify-center p-8 text-center">
             <Icons.Warning className="w-12 h-12 text-red-500 mb-4" />
             <h3 className="text-xl font-bold text-red-400 mb-2">EXECUTION HALTED</h3>
             <p className="text-zinc-500 text-sm mb-6 max-w-md">
                 Kill-Switch Triggered. The runtime environment has been forcibly destroyed to stop execution.
             </p>
             <button 
                onClick={handleReload}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-mono text-xs uppercase tracking-wider flex items-center gap-2"
             >
                 <Icons.Zap className="w-3 h-3" />
                 Reboot System
             </button>
        </div>
      );
  }

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 relative">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-950 border-b border-zinc-800 z-10">
        <div className="flex items-center gap-2">
            <Icons.Monitor className="w-4 h-4 text-green-400" />
            <span className="text-xs font-mono text-zinc-400 truncate max-w-[200px]">LIVE PREVIEW: {title}</span>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleReload}
                className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
                title="Hard Reset (Remount)"
            >
                <Icons.Zap className="w-4 h-4" />
            </button>
             <button 
                onClick={handlePanicStop}
                className="p-1.5 hover:bg-red-900/20 rounded-md text-zinc-400 hover:text-red-400 transition-colors"
                title="Panic Stop (Kill Switch)"
            >
                <Icons.Warning className="w-4 h-4" />
            </button>
        </div>
      </div>
      
      <div className="relative flex-1 min-h-[500px] w-full bg-black group">
        <iframe
          key={mountKey}
          ref={iframeRef}
          title="Game Preview"
          className="absolute inset-0 w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
        />

        {/* Telemetry HUD */}
        {isPlaying && (
            <div className="absolute top-4 left-4 pointer-events-none z-30 flex flex-col gap-1">
                <div className="bg-black/50 backdrop-blur-md px-2 py-1 rounded border border-white/10 text-[10px] font-mono text-green-400">
                    FPS: {telemetry.fps}
                </div>
                <div className="bg-black/50 backdrop-blur-md px-2 py-1 rounded border border-white/10 text-[10px] font-mono text-blue-400">
                    OBJ: {telemetry.entities}
                </div>
            </div>
        )}

        {/* Start Game Overlay */}
        {!isPlaying && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 transition-all duration-300">
                <button 
                    onClick={handleStartGame}
                    className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Icons.Gamepad className="w-6 h-6 fill-current" />
                    <span className="tracking-wider uppercase text-sm">Start Game</span>
                </button>
                <p className="mt-4 text-zinc-500 text-xs font-mono uppercase tracking-widest">
                    Click to initialize WebGL Engine
                </p>
            </div>
        )}
      </div>
      
      <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono text-center z-10">
        {isPlaying ? "PRESS ESC TO RELEASE MOUSE CONTROL" : "READY TO INITIALIZE"}
      </div>
    </div>
  );
};