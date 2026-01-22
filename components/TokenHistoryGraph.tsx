import React, { useMemo, useState } from 'react';
import { TokenTransaction } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTokenCount } from '../utils/tokenEstimator';
import { Icons } from './Icons';

interface Props {
  history: TokenTransaction[];
  onClose: () => void;
}

export const TokenHistoryGraph: React.FC<Props> = ({ history, onClose }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxTokens = useMemo(() => {
    if (history.length === 0) return 100;
    return Math.max(...history.map(t => t.totalTokens)) * 1.1; // Add 10% buffer
  }, [history]);

  const points = useMemo(() => {
    if (history.length === 0) return [];
    
    // Normalize to 0-100 coordinate space
    const width = 100;
    const height = 60; // Chart height
    
    // If only one point, center it or show line from 0
    if (history.length === 1) {
        return [
            { x: 0, y: height }, // Start
            { 
                x: width, 
                y: height - (history[0].totalTokens / maxTokens) * height, 
                data: history[0] 
            }
        ];
    }

    return history.map((t, i) => ({
      x: (i / (history.length - 1)) * width,
      y: height - (t.totalTokens / maxTokens) * height,
      data: t
    }));
  }, [history, maxTokens]);

  const svgPath = useMemo(() => {
    if (points.length < 2) return "";
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return "";
    return `${svgPath} L ${points[points.length-1].x} 100 L 0 100 Z`; // Close path to bottom
  }, [svgPath, points]);

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute top-16 right-4 z-50 w-[400px] bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
            <div className="flex items-center gap-2">
                <Icons.Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-100">Token Analytics</h3>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        {/* Chart Area */}
        <div className="relative h-[180px] w-full bg-zinc-900/50 border-b border-zinc-800 p-4">
            {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                    <Icons.Ghost className="w-8 h-8 opacity-50" />
                    <span className="text-xs font-mono">No Data Recorded</span>
                </div>
            ) : (
                <div className="relative w-full h-full">
                    <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        {/* Grid Lines */}
                        <line x1="0" y1="0" x2="100" y2="0" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2" />
                        <line x1="0" y1="30" x2="100" y2="30" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2" />
                        <line x1="0" y1="60" x2="100" y2="60" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2" />

                        {/* Area Fill */}
                        <defs>
                            <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {points.length > 1 && (
                            <path d={`M ${points[0].x} 60 L ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${points[points.length-1].x} 60 Z`} fill="url(#gradient)" />
                        )}

                        {/* Line */}
                        <motion.path 
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            d={points.length > 1 ? points.map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ') : ''}
                            fill="none"
                            stroke="#818cf8"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Data Points */}
                        {points.map((p, i) => (
                            <circle 
                                key={i}
                                cx={p.x} 
                                cy={p.y} 
                                r={hoveredIndex === i ? 2.5 : 1.5}
                                fill="#fff"
                                stroke="#6366f1"
                                strokeWidth="0.5"
                                className="cursor-pointer transition-all duration-200"
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        ))}
                    </svg>

                    {/* Tooltip Overlay */}
                    <AnimatePresence>
                        {hoveredIndex !== null && points[hoveredIndex] && (
                            <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute bg-zinc-800 border border-zinc-700 text-zinc-100 text-[10px] px-2 py-1.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-10"
                                style={{
                                    left: `${points[hoveredIndex].x}%`,
                                    top: `${points[hoveredIndex].y / 60 * 100}%`,
                                    transform: 'translate(-50%, -130%)'
                                }}
                            >
                                <div className="font-bold">{points[hoveredIndex].data?.action}</div>
                                <div className="font-mono text-indigo-400">{formatTokenCount(points[hoveredIndex].data?.totalTokens || 0)} total</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-px bg-zinc-800 border-b border-zinc-800">
            <div className="bg-zinc-900 p-3">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total Impact</div>
                <div className="text-lg font-mono font-bold text-white">
                    {history.length > 0 ? formatTokenCount(history[history.length-1].totalTokens) : '0'}
                </div>
            </div>
            <div className="bg-zinc-900 p-3">
                 <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Transactions</div>
                <div className="text-lg font-mono font-bold text-white">
                    {history.length}
                </div>
            </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto max-h-[250px] custom-scrollbar bg-zinc-900/30">
            {history.slice().reverse().map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                    <div>
                        <div className="text-xs font-semibold text-zinc-300">{t.action}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            In: {formatTokenCount(t.inputTokens)} • Out: {formatTokenCount(t.outputTokens)}
                        </div>
                    </div>
                    <div className="text-xs font-mono font-bold text-indigo-400">
                        +{formatTokenCount(t.inputTokens + t.outputTokens)}
                    </div>
                </div>
            ))}
            {history.length === 0 && (
                <div className="p-8 text-center text-[10px] text-zinc-600 uppercase tracking-wider">
                    Awaiting Generation Data
                </div>
            )}
        </div>
    </motion.div>
  );
};
