"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { buildGraphData, type GraphNode } from "@/lib/graphUtils";
import type { SyllableGroup } from "@/lib/wordService";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface Expansion {
  label: string;
  words: string[];
  loading?: boolean;
  sourceWord?: string;
  children?: Record<string, Expansion>;
}

interface WordGraphProps {
  submittedWord: string;
  results: SyllableGroup[];
  expansions: Record<string, Expansion>;
  onContextMenu: (e: React.MouseEvent, word: string) => void;
}

const RELATION_COLORS: Record<string, string> = {
  rhymes: "rgba(172, 199, 251, 0.18)",
  synonyms: "#6ec177",
  antonyms: "#e06c75",
  triggers: "#d19a66",
  "frequent followers": "#c678dd",
  "frequent predecessors": "#c678dd",
  "nouns for adjective": "#56b6c2",
  "adjectives for noun": "#56b6c2",
  "broader terms": "#e5c07b",
  "narrower terms": "#e5c07b",
  comprises: "#98c379",
  "part of": "#98c379",
  homophones: "#61afef",
  "consonant match": "#61afef",
};

function getLinkColor(label: string): string {
  // Syllable cluster links use the rhymes color
  if (label.endsWith(' syl')) return RELATION_COLORS.rhymes;
  return RELATION_COLORS[label] ?? "rgba(172, 199, 251, 0.12)";
}

function getNodeColor(node: GraphNode): string {
  if (node.isRoot) return "#acc7fb";
  if (node.isCluster) return "#bd9952";
  if (node.isRhyme) return "rgba(231, 229, 229, 0.55)";
  return "rgba(231, 229, 229, 0.4)";
}

export function WordGraph({ submittedWord, results, expansions, onContextMenu }: WordGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 720, height: 500 });

  // Which syllable groups are visible in the graph (default: 1 and 2)
  const allSyllableCounts = useMemo(
    () => results.map(g => g.count).sort((a, b) => a - b),
    [results]
  );
  const [visibleSyllables, setVisibleSyllables] = useState<Set<number>>(new Set([1, 2]));

  // Reset visible syllables when the word changes
  useEffect(() => {
    setVisibleSyllables(new Set([1, 2]));
  }, [submittedWord]);

  const toggleSyllable = useCallback((count: number) => {
    setVisibleSyllables(prev => {
      const next = new Set(prev);
      next.has(count) ? next.delete(count) : next.add(count);
      return next;
    });
  }, []);

  // Resize to fill container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height: Math.max(height, 400) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(
    () => buildGraphData(submittedWord, results, expansions, visibleSyllables),
    [submittedWord, results, expansions, visibleSyllables]
  );

  // Zoom to fit whenever graph data changes
  const prevNodeCount = useRef(0);
  useEffect(() => {
    if (graphData.nodes.length !== prevNodeCount.current) {
      prevNodeCount.current = graphData.nodes.length;
      const timer = setTimeout(() => {
        graphRef.current?.zoomToFit(400, 60);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [graphData]);

  const handleNodeRightClick = useCallback(
    (node: any, event: MouseEvent) => {
      event.preventDefault();
      if (node.isCluster) return;
      const syntheticEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: event.clientX,
        clientY: event.clientY,
      } as React.MouseEvent;
      onContextMenu(syntheticEvent, node.id);
    },
    [onContextMenu]
  );

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.id as string;
      const isRoot = node.isRoot;
      const isCluster = node.isCluster;
      const relationLabel = node.relationLabel as string | undefined;

      let fontSize: number;
      if (isRoot) fontSize = 16 / globalScale;
      else if (isCluster) fontSize = 10 / globalScale;
      else fontSize = 11 / globalScale;

      if (isCluster) {
        ctx.font = `italic ${fontSize}px sans-serif`;
      } else if (isRoot) {
        ctx.font = `italic ${fontSize}px Playfair Display`;
      } else {
        ctx.font = `${fontSize}px sans-serif`;
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = getNodeColor(node);
      ctx.fillText(label, node.x ?? 0, node.y ?? 0);

      // Relation type label underneath (for non-root, non-cluster, non-rhyme nodes)
      if (relationLabel && !isRoot && !isCluster) {
        const subFontSize = 7 / globalScale;
        ctx.font = `italic ${subFontSize}px sans-serif`;
        ctx.fillStyle = getLinkColor(relationLabel);
        ctx.globalAlpha = 0.7;
        ctx.fillText(relationLabel, node.x ?? 0, (node.y ?? 0) + fontSize * 0.9);
        ctx.globalAlpha = 1;
      }
    },
    []
  );

  const paintNodeArea = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const fontSize = (node.isRoot ? 16 : node.isCluster ? 10 : 11) / globalScale;
      ctx.font = `${fontSize}px sans-serif`;
      const textWidth = ctx.measureText(node.id).width;
      const pad = 4 / globalScale;
      ctx.fillStyle = color;
      ctx.fillRect(
        (node.x ?? 0) - textWidth / 2 - pad,
        (node.y ?? 0) - fontSize / 2 - pad,
        textWidth + pad * 2,
        fontSize + pad * 2
      );
    },
    []
  );


  return (
    <div className="w-full" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Syllable filter pills */}
      {allSyllableCounts.length > 0 && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <span className="font-sans text-[10px] uppercase tracking-wider text-[#acabaa]/35">
            syllables
          </span>
          {allSyllableCounts.map(count => (
            <button
              key={count}
              onClick={() => toggleSyllable(count)}
              className={`font-sans text-[10px] px-2 py-0.5 rounded-sm transition-colors duration-200 ${
                visibleSyllables.has(count)
                  ? 'text-[#acc7fb] bg-[#acc7fb]/10'
                  : 'text-[#acabaa]/30 hover:text-[#acabaa]/50'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      )}

      <div ref={containerRef} className="w-full flex-1" style={{ height: 'calc(100% - 30px)' }}>
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="transparent"
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => "replace"}
          nodePointerAreaPaint={paintNodeArea}
          nodeLabel=""
          linkColor={(link: any) => getLinkColor(link.label)}
          linkWidth={0.5}
          onNodeRightClick={handleNodeRightClick}
          onBackgroundClick={() => {}}
          enableNodeDrag={true}
          cooldownTicks={100}
          d3VelocityDecay={0.3}
        />
      </div>
    </div>
  );
}
