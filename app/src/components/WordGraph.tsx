"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { forceCollide } from "d3-force-3d";
import { buildGraphData, type GraphNode } from "@/lib/graphUtils";
import { useTheme } from "./ThemeProvider";
import type { SyllableGroup } from "@/lib/wordService";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface Expansion {
  label: string;
  words: string[];
  loading?: boolean;
  sourceWord?: string;
  children?: Record<string, Expansion>;
}

type GraphLayout = 'force' | 'radial' | 'edge-bundle';

const DAG_MODE_MAP: Record<GraphLayout, string | undefined> = {
  'force': undefined,
  'radial': 'radialout',
  'edge-bundle': undefined,
};

interface WordGraphProps {
  submittedWord: string;
  results: SyllableGroup[];
  expansions: Record<string, Expansion>;
  visibleSyllables: Set<number>;
  graphLayout: GraphLayout;
  onContextMenu: (e: React.MouseEvent, word: string) => void;
  onDismissExpansion?: (clusterLabel: string) => void;
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
  return RELATION_COLORS[label] ?? "rgba(172, 199, 251, 0.12)";
}

export function WordGraph({ submittedWord, results, expansions, visibleSyllables, graphLayout, onContextMenu, onDismissExpansion }: WordGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 720, height: 500 });
  const { theme } = useTheme();
  const colors = theme.colors;
  const [dismissPopup, setDismissPopup] = useState<{ clusterLabel: string; x: number; y: number } | null>(null);

  // Which cluster nodes are expanded (click to reveal children)
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  // On mount or word change, auto-expand the first visible rhyme cluster
  const initializedWord = useRef<string | null>(null);
  useEffect(() => {
    if (initializedWord.current === submittedWord) return;
    const firstVisible = results.find(g => visibleSyllables.has(g.count));
    if (firstVisible) {
      initializedWord.current = submittedWord;
      setExpandedClusters(new Set([`rhyme (${firstVisible.count} syl)`]));
    }
  }, [submittedWord, results, visibleSyllables]);

  // Auto-expand newly visible syllable clusters
  const prevVisibleSyllables = useRef(visibleSyllables);
  useEffect(() => {
    const prev = prevVisibleSyllables.current;
    prevVisibleSyllables.current = visibleSyllables;
    // Find syllables that were just added
    for (const count of visibleSyllables) {
      if (!prev.has(count)) {
        const clusterLabel = `rhyme (${count} syl)`;
        setExpandedClusters(exp => {
          if (exp.has(clusterLabel)) return exp;
          const next = new Set(exp);
          next.add(clusterLabel);
          return next;
        });
      }
    }
  }, [visibleSyllables]);

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
    () => buildGraphData(submittedWord, results, expansions, visibleSyllables, expandedClusters),
    [submittedWord, results, expansions, visibleSyllables, expandedClusters]
  );

  // Auto-expand newly added cluster nodes (e.g. from context menu explorations)
  const prevClusterIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentClusters = new Set(
      graphData.nodes.filter(n => n.isCluster).map(n => n.id)
    );
    const prev = prevClusterIds.current;
    prevClusterIds.current = currentClusters;
    for (const id of currentClusters) {
      if (!prev.has(id)) {
        setExpandedClusters(exp => {
          if (exp.has(id)) return exp;
          const next = new Set(exp);
          next.add(id);
          return next;
        });
      }
    }
  }, [graphData.nodes]);

  // Offscreen canvas for label width measurement
  const measureCanvas = useRef<HTMLCanvasElement | null>(null);
  if (measureCanvas.current === null && typeof document !== 'undefined') {
    measureCanvas.current = document.createElement('canvas');
  }

  // Configure forces based on layout; measure labels for collide radius
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;

    // Measure each node's label and stash a collide radius; pin the root
    const mctx = measureCanvas.current?.getContext('2d');
    for (const n of graphData.nodes as any[]) {
      if (mctx) {
        let font: string;
        if (n.isRoot) font = 'italic 16px "Playfair Display", serif';
        else if (n.isCluster) font = 'italic 11px sans-serif';
        else font = '11px sans-serif';
        mctx.font = font;
        const w = mctx.measureText(n.id).width;
        n._collideRadius = Math.max(12, w * 0.55 + 4);
      }
      if (n.isRoot) {
        n.fx = 0;
        n.fy = 0;
      }
    }

    if (graphLayout === 'edge-bundle') {
      fg.d3Force('charge')?.strength(-100);
      fg.d3Force('link')?.distance(40);
    } else {
      fg.d3Force('charge')?.strength(-120);
      fg.d3Force('link')?.distance(50);
    }

    fg.d3Force('collide', forceCollide((n: any) => n._collideRadius ?? 14).strength(0.75).iterations(2));

    fg.d3ReheatSimulation();
  }, [graphLayout, graphData.nodes, dimensions]);

  // Zoom to fit whenever graph data or layout changes
  const prevNodeCount = useRef(0);
  const prevLayout = useRef(graphLayout);
  useEffect(() => {
    if (graphData.nodes.length !== prevNodeCount.current || graphLayout !== prevLayout.current) {
      prevNodeCount.current = graphData.nodes.length;
      prevLayout.current = graphLayout;
      const delay = graphLayout === 'edge-bundle' ? 800 : 500;
      const timer = setTimeout(() => {
        graphRef.current?.zoomToFit(400, 40);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [graphData, graphLayout]);

  const handleNodeClick = useCallback(
    (node: any) => {
      if (!node.isCluster) return;
      setExpandedClusters(prev => {
        const next = new Set(prev);
        next.has(node.id) ? next.delete(node.id) : next.add(node.id);
        return next;
      });
    },
    []
  );

  const handleNodeRightClick = useCallback(
    (node: any, event: MouseEvent) => {
      event.preventDefault();
      setDismissPopup(null);
      // Right-click expansion cluster -> show dismiss popup
      if (node.isCluster && !node.id.startsWith('rhyme (')) {
        setDismissPopup({ clusterLabel: node.id, x: event.clientX, y: event.clientY });
        return;
      }
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

  const handleDismissConfirm = useCallback(() => {
    if (!dismissPopup || !onDismissExpansion) return;
    onDismissExpansion(dismissPopup.clusterLabel);
    setExpandedClusters(prev => {
      const next = new Set(prev);
      next.delete(dismissPopup.clusterLabel);
      return next;
    });
    setDismissPopup(null);
  }, [dismissPopup, onDismissExpansion]);

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.id as string;
      const isRoot = node.isRoot;
      const isCluster = node.isCluster;
      const relationLabel = node.relationLabel as string | undefined;

      let fontSize: number;
      if (isRoot) fontSize = 16 / globalScale;
      else if (isCluster) fontSize = 11 / globalScale;
      else fontSize = 11 / globalScale;

      const x = node.x ?? 0;
      const y = node.y ?? 0;

      if (isCluster) {
        const displayLabel = label;
        ctx.font = `italic ${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(displayLabel).width;
        const padX = 6 / globalScale;
        const padY = 3 / globalScale;
        const radius = 4 / globalScale;

        // Pill background - use gold with opacity
        ctx.fillStyle = node.isExpanded
          ? hexToRgba(colors.gold, 0.22)
          : hexToRgba(colors.gold, 0.15);
        const pillX = x - textWidth / 2 - padX;
        const pillY = y - fontSize / 2 - padY;
        const pillW = textWidth + padX * 2;
        const pillH = fontSize + padY * 2;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, radius);
        ctx.fill();

        // Label text - sunlight yellow on dark bg, darker amber on light bg
        const isLightBg = hexLuminance(colors.bg) > 0.6;
        const SUNLIGHT = isLightBg ? "#9a6a0a" : "#f0b428";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = node.isExpanded ? SUNLIGHT : hexToRgba(SUNLIGHT, 0.85);
        ctx.fillText(displayLabel, x, y);

        // Count badge when collapsed
        if (!node.isExpanded && node.childCount) {
          const countStr = `${node.childCount}`;
          const countSize = 8 / globalScale;
          ctx.font = `${countSize}px sans-serif`;
          ctx.fillStyle = hexToRgba(colors.gold, 0.4);
          ctx.fillText(countStr, x + textWidth / 2 + padX + 4 / globalScale, y);
        }
      } else if (isRoot) {
        ctx.font = `italic ${fontSize}px Playfair Display`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = colors.accent;
        ctx.fillText(label, x, y);
      } else {
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = node.isRhyme
          ? hexToRgba(colors.text, 0.95)
          : hexToRgba(colors.text, 0.75);
        ctx.fillText(label, x, y);
      }

      // Relation type label underneath (for non-root, non-cluster, non-rhyme nodes)
      if (relationLabel && !isRoot && !isCluster) {
        const subFontSize = 7 / globalScale;
        ctx.font = `italic ${subFontSize}px sans-serif`;
        ctx.fillStyle = getLinkColor(relationLabel);
        ctx.globalAlpha = 0.7;
        ctx.fillText(relationLabel, x, y + fontSize * 0.9);
        ctx.globalAlpha = 1;
      }
    },
    [colors]
  );

  // Edge-bundle: draw links as quadratic Bezier curves through the root node (graph origin)
  const paintEdgeBundleLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D) => {
      const source = link.source;
      const target = link.target;
      if (!source?.x || !target?.x) return;

      // Find root node position (graph center of mass, ~0,0)
      const root = graphData.nodes.find(n => n.isRoot) as any;
      const cx = root?.x ?? 0;
      const cy = root?.y ?? 0;
      const beta = 0.75; // bundle strength: 0=straight, 1=all through center
      const mx = (source.x + target.x) / 2;
      const my = (source.y + target.y) / 2;
      const cpx = mx * (1 - beta) + cx * beta;
      const cpy = my * (1 - beta) + cy * beta;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.quadraticCurveTo(cpx, cpy, target.x, target.y);
      ctx.strokeStyle = getLinkColor(link.label);
      ctx.lineWidth = 0.5;
      ctx.stroke();
    },
    [graphData.nodes]
  );

  const paintNodeArea = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isCluster = node.isCluster;
      const fontSize = (node.isRoot ? 16 : isCluster ? 11 : 11) / globalScale;
      ctx.font = `${isCluster ? 'italic ' : ''}${fontSize}px sans-serif`;
      const textWidth = ctx.measureText(node.id).width;
      const padX = (isCluster ? 6 : 8) / globalScale;
      const padY = (isCluster ? 3 : 8) / globalScale;
      ctx.fillStyle = color;
      ctx.fillRect(
        (node.x ?? 0) - textWidth / 2 - padX,
        (node.y ?? 0) - fontSize / 2 - padY,
        textWidth + padX * 2,
        fontSize + padY * 2
      );
    },
    []
  );


  return (
    <div className="w-full" style={{ height: 'calc(100vh - 120px)' }}>
      <div ref={containerRef} className="w-full h-full">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="transparent"
          dagMode={DAG_MODE_MAP[graphLayout] as any}
          dagLevelDistance={graphLayout === 'radial' ? 50 : undefined}
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => "replace"}
          nodePointerAreaPaint={paintNodeArea}
          nodeLabel=""
          linkCanvasObject={graphLayout === 'edge-bundle' ? paintEdgeBundleLink : undefined}
          linkCanvasObjectMode={graphLayout === 'edge-bundle' ? (() => 'replace') as any : undefined}
          linkColor={(link: any) => getLinkColor(link.label)}
          linkWidth={0.5}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
          onNodeDragEnd={(node: any) => {
            // Pin dropped position so the simulation doesn't yank it back
            node.fx = node.x;
            node.fy = node.y;
          }}
          onBackgroundClick={() => setDismissPopup(null)}
          enableNodeDrag={true}
          cooldownTicks={100}
          d3VelocityDecay={0.3}
          onEngineStop={() => graphRef.current?.zoomToFit(400, 60)}
        />
      </div>
      {dismissPopup && (
        <div
          className="fixed z-[1000]"
          style={{ left: dismissPopup.x, top: dismissPopup.y }}
        >
          <div
            className="rounded-md shadow-lg py-1 px-1"
            style={{
              background: 'color-mix(in srgb, var(--le-bg) 90%, var(--le-text) 10%)',
              border: '1px solid color-mix(in srgb, var(--le-text-muted) 20%, transparent)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <button
              onClick={handleDismissConfirm}
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-sans rounded-sm transition-colors duration-150 w-full hover:brightness-150"
              style={{ color: colors.error ?? '#e06c75' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Convert a hex color to rgba string for canvas use */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
