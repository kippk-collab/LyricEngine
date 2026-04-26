"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { forceCollide } from "d3-force-3d";
import { buildGraphData } from "@/lib/graphUtils";
import { useTheme } from "./ThemeProvider";
import type { SyllableGroup } from "@/lib/wordService";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface Expansion {
  label: string;
  words: string[];
  loading?: boolean;
  sourceWord?: string;
  children?: Record<string, Expansion>;
  groups?: Array<{ lead: string; tails: Array<{ tail: string; weight: number }> }>;
  weights?: Record<string, number>;
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
  rhymeWeights: Record<string, number>;
  expansions: Record<string, Expansion>;
  visibleSyllables: Set<number>;
  graphLayout: GraphLayout;
  onContextMenu: (e: React.MouseEvent, word: string) => void;
  onDismissExpansion?: (clusterLabel: string) => void;
}

// Relation-typed links keep distinct hex colors. rhymes + unknown labels fall through
// to a theme-aware default (built per-render so light/dark themes both have contrast).
const RELATION_COLORS: Record<string, string> = {
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

function makeLinkColor(themeText: string) {
  const fallback = hexToRgba(themeText, 0.42);
  return (label: string): string => RELATION_COLORS[label] ?? fallback;
}

export function WordGraph({ submittedWord, results, rhymeWeights, expansions, visibleSyllables, graphLayout, onContextMenu, onDismissExpansion }: WordGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 720, height: 500 });
  const { theme } = useTheme();
  const colors = theme.colors;
  const getLinkColor = useMemo(() => makeLinkColor(colors.text), [colors.text]);
  const [dismissPopup, setDismissPopup] = useState<{ clusterLabel: string; x: number; y: number } | null>(null);
  const [leafPopup, setLeafPopup] = useState<{ clusterPath: string; x: number; y: number } | null>(null);

  // Walk the expansion tree and collect loading expansions for the busy toast.
  const loadingExpansions = useMemo(() => {
    const out: Array<{ label: string; sourceWord: string }> = [];
    function walk(exps: Record<string, Expansion>) {
      for (const [key, exp] of Object.entries(exps)) {
        if (exp.loading) {
          const pipeIdx = key.indexOf('|');
          const sourceWord = exp.sourceWord ?? (pipeIdx >= 0 ? key.slice(0, pipeIdx) : key);
          out.push({ label: exp.label, sourceWord });
        }
        if (exp.children) walk(exp.children);
      }
    }
    walk(expansions);
    return out;
  }, [expansions]);

  // Promoted leaves per cluster (keyed by clusterPath: "rhyme (1 syl)" or "smile|sim" etc.).
  // Reset when the submitted word changes — promotions are session-scoped to the active search.
  const [promotedLeaves, setPromotedLeaves] = useState<Map<string, Set<string>>>(new Map());
  useEffect(() => {
    setPromotedLeaves(new Map());
    setLeafPopup(null);
  }, [submittedWord]);

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
    () => buildGraphData(submittedWord, results, expansions, visibleSyllables, promotedLeaves, rhymeWeights),
    [submittedWord, results, expansions, visibleSyllables, promotedLeaves, rhymeWeights]
  );

  // Live cluster lookup for the popup (so it always reads the latest weights/leaves).
  const clusterByPath = useMemo(() => {
    const m = new Map<string, { id: string; popupLeaves: string[]; popupWeights: Record<string, number>; promoted: Set<string> }>();
    for (const n of graphData.nodes) {
      if (n.isCluster && n.clusterPath) {
        const promoted = promotedLeaves.get(n.clusterPath) ?? new Set<string>();
        m.set(n.clusterPath, {
          id: n.id,
          popupLeaves: n.popupLeaves ?? [],
          popupWeights: n.popupWeights ?? {},
          promoted,
        });
      }
    }
    return m;
  }, [graphData.nodes, promotedLeaves]);

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
        else font = '13px sans-serif';
        mctx.font = font;
        const w = mctx.measureText(n.id).width;
        n._collideRadius = Math.max(14, w * 0.55 + 6);
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
    (node: any, event: MouseEvent) => {
      if (!node.isCluster || !node.clusterPath) return;
      setDismissPopup(null);
      setLeafPopup({ clusterPath: node.clusterPath, x: event.clientX, y: event.clientY });
    },
    []
  );

  const promoteLeaves = useCallback((clusterPath: string, leaves: string[]) => {
    if (leaves.length === 0) return;
    setPromotedLeaves(prev => {
      const next = new Map(prev);
      const existing = new Set(next.get(clusterPath) ?? []);
      for (const l of leaves) existing.add(l);
      next.set(clusterPath, existing);
      return next;
    });
  }, []);

  const demoteLeaf = useCallback((clusterPath: string, leaf: string) => {
    setPromotedLeaves(prev => {
      const next = new Map(prev);
      const existing = new Set(next.get(clusterPath) ?? []);
      existing.delete(leaf);
      next.set(clusterPath, existing);
      return next;
    });
  }, []);

  const demoteAllLeaves = useCallback((clusterPath: string) => {
    setPromotedLeaves(prev => {
      const next = new Map(prev);
      next.set(clusterPath, new Set());
      return next;
    });
  }, []);

  const handleNodeRightClick = useCallback(
    (node: any, event: MouseEvent) => {
      event.preventDefault();
      setDismissPopup(null);
      setLeafPopup(null);
      // Right-click on an expansion cluster (not a rhyme cluster) → dismiss popup.
      // Rhyme clusters are bound to the syllable filter and always present; you remove a syllable
      // group by toggling the syllable pill in the subtitle bar, not by right-clicking.
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
      else fontSize = 13 / globalScale;

      const x = node.x ?? 0;
      const y = node.y ?? 0;

      if (isCluster) {
        const displayLabel = label;
        ctx.font = `italic ${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(displayLabel).width;
        const padX = 6 / globalScale;
        const padY = 3 / globalScale;
        const radius = 4 / globalScale;

        // Pill background — uniform gold tint (drill-spine clusters are no longer "expanded").
        ctx.fillStyle = hexToRgba(colors.gold, 0.18);
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
        ctx.fillStyle = SUNLIGHT;
        ctx.fillText(displayLabel, x, y);

        // Count badge: "promoted/total" if any leaves promoted, else "+total".
        if (node.childCount) {
          const countStr = node.promotedCount && node.promotedCount > 0
            ? `${node.promotedCount}/${node.childCount}`
            : `+${node.childCount}`;
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
        // Soft halo so promoted leaves pop against the dark canvas without
        // competing with the italic root word.
        ctx.shadowColor = hexToRgba(colors.text, 0.55);
        ctx.shadowBlur = 14 / globalScale;
        ctx.fillStyle = node.isRhyme ? colors.text : hexToRgba(colors.text, 0.98);
        ctx.fillText(label, x, y);
        ctx.shadowBlur = 0;
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
    [colors, getLinkColor]
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
      ctx.lineWidth = 1.2;
      ctx.stroke();
    },
    [graphData.nodes, getLinkColor]
  );

  const paintNodeArea = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isCluster = node.isCluster;
      const fontSize = (node.isRoot ? 16 : isCluster ? 11 : 13) / globalScale;
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
    <div className="w-full relative" style={{ height: 'calc(100vh - 120px)' }}>
      {loadingExpansions.length > 0 && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-[900] flex flex-col items-center gap-1 pointer-events-none"
        >
          {loadingExpansions.map((l, i) => (
            <div
              key={`${l.sourceWord}|${l.label}|${i}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md font-sans text-[10px] uppercase tracking-widest"
              style={{
                color: 'color-mix(in srgb, var(--le-gold) 90%, transparent)',
                background: 'color-mix(in srgb, var(--le-bg) 85%, transparent)',
                border: '1px solid color-mix(in srgb, var(--le-gold) 25%, transparent)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span
                className="le-busy-dot"
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--le-gold)',
                }}
              />
              fetching {l.label.toLowerCase()} for {l.sourceWord}
            </div>
          ))}
          <style>{`
            @keyframes le-busy-pulse {
              0%, 100% { opacity: 0.35; transform: scale(0.9); }
              50%      { opacity: 1.0;  transform: scale(1.15); }
            }
            .le-busy-dot { animation: le-busy-pulse 1.1s ease-in-out infinite; }
          `}</style>
        </div>
      )}
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
          linkWidth={1.2}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
          onNodeDragEnd={(node: any) => {
            // Pin dropped position so the simulation doesn't yank it back
            node.fx = node.x;
            node.fy = node.y;
          }}
          onBackgroundClick={() => { setDismissPopup(null); setLeafPopup(null); }}
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
      {leafPopup && (() => {
        const cluster = clusterByPath.get(leafPopup.clusterPath);
        if (!cluster) return null;
        const remaining = cluster.popupLeaves.filter(l => !cluster.promoted.has(l));
        return (
          <LeafPopup
            x={leafPopup.x}
            y={leafPopup.y}
            label={cluster.id}
            leaves={cluster.popupLeaves}
            promoted={cluster.promoted}
            weights={cluster.popupWeights}
            onAddTopN={(n) => promoteLeaves(leafPopup.clusterPath, remaining.slice(0, n))}
            onAddOne={(leaf) => promoteLeaves(leafPopup.clusterPath, [leaf])}
            onRemoveOne={(leaf) => demoteLeaf(leafPopup.clusterPath, leaf)}
            onRemoveAll={() => demoteAllLeaves(leafPopup.clusterPath)}
            onClose={() => setLeafPopup(null)}
          />
        );
      })()}
    </div>
  );
}

// ── Leaf popup ────────────────────────────────────────────────────────────────

interface LeafPopupProps {
  x: number;
  y: number;
  label: string;
  leaves: string[];                // ALL leaves, sorted by weight desc (promoted + unpromoted)
  promoted: Set<string>;
  weights: Record<string, number>;
  onAddTopN: (n: number) => void;
  onAddOne: (leaf: string) => void;
  onRemoveOne: (leaf: string) => void;
  onRemoveAll: () => void;
  onClose: () => void;
}

function LeafPopup({ x, y, label, leaves, promoted, weights, onAddTopN, onAddOne, onRemoveOne, onRemoveAll, onClose }: LeafPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  // Edge-aware positioning: clamp the popup inside the viewport after measuring its size.
  const [pos, setPos] = useState({ left: x, top: y });
  useEffect(() => {
    const el = popupRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let left = x + 12;
    let top = y + 12;
    if (left + rect.width > window.innerWidth - margin) left = Math.max(margin, x - rect.width - 12);
    if (top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    if (left < margin) left = margin;
    if (top < margin) top = margin;
    setPos({ left, top });
  }, [x, y, leaves.length]);

  const remainingCount = leaves.reduce((n, l) => n + (promoted.has(l) ? 0 : 1), 0);
  const promotedCount = leaves.length - remainingCount;
  // Show fixed presets (5/10/20) only when strictly less than remaining, then a single
  // catch-all for the rest. When remaining ≤ 5 the catch-all is the only button and reads
  // as plain "Add N" instead of the redundant "Add all N".
  const fixedPresets = [5, 10, 20].filter(n => n < remainingCount);
  const presets: Array<{ n: number; lbl: string }> = fixedPresets.map(n => ({ n, lbl: `Add ${n}` }));
  if (remainingCount > 0) {
    presets.push({
      n: remainingCount,
      lbl: fixedPresets.length === 0 ? `Add ${remainingCount}` : `Add all ${remainingCount}`,
    });
  }

  // Auto-pick column count: short single-word leaves (synonyms, adjectives, rhymes)
  // get 2 columns and a wider popup; long phrases (similes, metaphors, idioms) stay 1.
  const maxLen = leaves.reduce((m, l) => Math.max(m, l.length), 0);
  const hasPhrases = leaves.some(l => l.includes(' '));
  const useTwoColumns = !hasPhrases && maxLen <= 18;
  const popupWidth = useTwoColumns ? 360 : 280;

  return (
    <div
      ref={popupRef}
      className="fixed z-[1000] rounded-md shadow-lg flex flex-col"
      style={{
        left: pos.left,
        top: pos.top,
        width: popupWidth,
        maxHeight: 'min(60vh, 480px)',
        background: 'color-mix(in srgb, var(--le-bg) 92%, var(--le-text) 8%)',
        border: '1px solid color-mix(in srgb, var(--le-text-muted) 22%, transparent)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div
        className="flex items-baseline justify-between px-3 pt-2 pb-1.5"
        style={{ borderBottom: '1px solid color-mix(in srgb, var(--le-text-muted) 14%, transparent)' }}
      >
        <span
          className="font-sans italic text-[10px] uppercase tracking-widest truncate"
          style={{ color: 'color-mix(in srgb, var(--le-gold) 75%, transparent)' }}
        >
          {label}
        </span>
        <button
          onClick={onClose}
          className="font-sans text-[11px] leading-none px-1 transition-colors"
          style={{ color: 'color-mix(in srgb, var(--le-rose) 50%, transparent)' }}
          aria-label="Close popup"
        >
          ×
        </button>
      </div>
      {leaves.length === 0 ? (
        <div className="px-3 py-3 font-display italic text-[11px]" style={{ color: 'color-mix(in srgb, var(--le-text-muted) 50%, transparent)' }}>
          no leaves
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 px-3 py-2">
            {presets.map(p => (
              <button
                key={p.lbl}
                onClick={() => onAddTopN(p.n)}
                className="font-sans text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm transition-colors hover:brightness-150"
                style={{
                  color: 'var(--le-accent)',
                  background: 'color-mix(in srgb, var(--le-accent) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--le-accent) 25%, transparent)',
                }}
              >
                {p.lbl}
              </button>
            ))}
            {promotedCount > 0 && (
              <button
                onClick={onRemoveAll}
                className="font-sans text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm transition-colors hover:brightness-150"
                style={{
                  color: 'var(--le-rose)',
                  background: 'color-mix(in srgb, var(--le-rose) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--le-rose) 22%, transparent)',
                }}
              >
                Hide all {promotedCount}
              </button>
            )}
          </div>
          <div
            className={`overflow-y-auto px-2 pb-2 ${useTwoColumns ? 'grid grid-cols-2 gap-x-1 gap-y-0.5' : 'flex flex-col gap-0.5'}`}
            style={{ flex: 1 }}
          >
            {leaves.map(l => {
              const isOn = promoted.has(l);
              return (
                <button
                  key={l}
                  onClick={() => (isOn ? onRemoveOne(l) : onAddOne(l))}
                  title={weights[l] != null ? `weight: ${weights[l]}` : undefined}
                  className="text-left font-display text-[11px] px-2 py-0.5 rounded-sm transition-colors hover:brightness-125 flex items-baseline gap-1.5"
                  style={{
                    color: isOn
                      ? 'var(--le-accent)'
                      : 'color-mix(in srgb, var(--le-text) 80%, transparent)',
                    background: isOn
                      ? 'color-mix(in srgb, var(--le-accent) 10%, transparent)'
                      : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isOn) e.currentTarget.style.background = 'color-mix(in srgb, var(--le-accent) 10%, transparent)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isOn) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '0.7em',
                      fontSize: '0.85em',
                      opacity: isOn ? 0.85 : 0.25,
                      color: isOn ? 'var(--le-accent)' : 'var(--le-text-muted)',
                    }}
                  >
                    {isOn ? '✓' : '+'}
                  </span>
                  <span>{l}</span>
                </button>
              );
            })}
          </div>
        </>
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
