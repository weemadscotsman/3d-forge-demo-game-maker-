import React from 'react';
import { ArchitectureNode } from '../types';
import { Icons } from './Icons';
import { motion } from 'framer-motion';

interface Props {
  nodes: ArchitectureNode[];
  styleName: string;
}

export const ArchitectureDiagram: React.FC<Props> = ({ nodes, styleName }) => {
  return (
    <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
      <div className="flex items-center gap-2 mb-6">
        <Icons.Layers className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-zinc-100">{styleName} Structure</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {nodes.map((node, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-zinc-800/80 p-4 rounded-lg border border-zinc-700/50 hover:border-indigo-500/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <span className={`text-xs font-mono px-2 py-1 rounded ${
                node.type === 'system' ? 'bg-rose-500/10 text-rose-400' :
                node.type === 'component' ? 'bg-emerald-500/10 text-emerald-400' :
                'bg-blue-500/10 text-blue-400'
              }`}>
                {node.type.toUpperCase()}
              </span>
            </div>
            <h4 className="font-medium text-zinc-200 mb-1">{node.name}</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">{node.description}</p>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-6 flex justify-center">
        <div className="text-xs text-zinc-500 font-mono flex items-center gap-2">
          <Icons.Info className="w-3 h-3" />
          <span>Nodes interact to form the game loop</span>
        </div>
      </div>
    </div>
  );
};
