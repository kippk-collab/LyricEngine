import type { SyllableGroup } from './datamuse'

interface Expansion {
  label: string
  words: string[]
  loading?: boolean
  sourceWord?: string
  children?: Record<string, Expansion>
  groups?: Array<{ lead: string; tails: Array<{ tail: string; weight: number }> }>
  weights?: Record<string, number>
}

export interface GraphNode {
  id: string
  isRoot?: boolean
  isCluster?: boolean   // collapsible group node (rhyme clusters + expansion clusters)
  isRhyme?: boolean
  relationLabel?: string
  childCount?: number   // total leaves available for this cluster (popup pool size)
  promotedCount?: number // leaves currently shown on the graph
  isExpanded?: boolean  // (rhyme clusters only) whether children are inlined
  group?: string        // cluster group for cluster layout
  // Sorted-by-weight-desc list of all leaves available in the popup. Promoted leaves are
  // already on the graph as their own nodes; the popup filters them out at render time.
  popupLeaves?: string[]
  popupWeights?: Record<string, number>
  clusterPath?: string  // for non-rhyme clusters: the expansion path (e.g. "smile|sim") for promotion lookup
  x?: number
  y?: number
}

export interface GraphLink {
  source: string
  target: string
  label: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

/**
 * Build the graph from the current expansion tree.
 *
 * Drill-spine model (WS11): only the root word + drilled-into leaves + leaves the user
 * has explicitly promoted via the popup appear as nodes. The full leaf list lives on the
 * cluster node as `popupLeaves` so the popup can render it on demand.
 *
 * `promotedLeaves` is keyed by the cluster's expansion-tree path (e.g. "smile|sim",
 * "smile|sim>motor like" — see the path encoding in WordGraph). Each set holds the
 * concrete leaf strings the user has promoted from that cluster.
 */
export function buildGraphData(
  submittedWord: string,
  results: SyllableGroup[],
  expansions: Record<string, Expansion>,
  visibleSyllables?: Set<number>,
  promotedLeaves?: Map<string, Set<string>>,
  rhymeWeights?: Record<string, number>,
): GraphData {
  const nodes = new Map<string, GraphNode>()
  const linkSet = new Set<string>()
  const links: GraphLink[] = []
  const promoted = promotedLeaves ?? new Map<string, Set<string>>()
  const rhymeWeightMap = rhymeWeights ?? {}

  function addNode(id: string, props?: Partial<GraphNode>) {
    const existing = nodes.get(id)
    if (existing) {
      if (props?.isRoot) existing.isRoot = true
      if (props?.isCluster) existing.isCluster = true
      if (props?.childCount !== undefined) existing.childCount = props.childCount
      if (props?.promotedCount !== undefined) existing.promotedCount = props.promotedCount
      if (props?.isExpanded !== undefined) existing.isExpanded = props.isExpanded
      if (props?.popupLeaves) existing.popupLeaves = props.popupLeaves
      if (props?.popupWeights) existing.popupWeights = props.popupWeights
      if (props?.clusterPath) existing.clusterPath = props.clusterPath
      if (props?.relationLabel) existing.relationLabel = props.relationLabel
    } else {
      nodes.set(id, { id, ...props })
    }
  }

  function addLink(source: string, target: string, label: string) {
    const key = `${source}|${target}|${label}`
    if (linkSet.has(key)) return
    linkSet.add(key)
    links.push({ source, target, label })
  }

  // Root node
  addNode(submittedWord, { isRoot: true, group: 'root' })

  // Rhyme clusters — drill-spine model (same as expansion clusters). Click pill → popup,
  // user explicitly promotes which rhymes appear on the graph.
  for (const group of results) {
    if (visibleSyllables && !visibleSyllables.has(group.count)) continue
    const clusterLabel = `rhyme (${group.count} syl)`
    const groupId = `rhyme-${group.count}`
    const clusterPath = clusterLabel  // rhyme clusters: clusterPath = label, no parent path

    const sortedRhymes = [...group.words].sort(
      (a, b) => (rhymeWeightMap[b] ?? 0) - (rhymeWeightMap[a] ?? 0),
    )
    const popupPromoted = promoted.get(clusterPath) ?? new Set<string>()

    addNode(clusterLabel, {
      isCluster: true,
      childCount: group.words.length,
      promotedCount: popupPromoted.size,
      group: groupId,
      popupLeaves: sortedRhymes,
      popupWeights: rhymeWeightMap,
      clusterPath,
    })
    addLink(submittedWord, clusterLabel, 'rhymes')

    for (const word of popupPromoted) {
      addNode(word, { isRhyme: true, group: groupId })
      addLink(clusterLabel, word, 'rhymes')
    }
  }

  // Expansion clusters — drill-spine model. Cluster pill is always collapsed; leaves only
  // surface on the graph if drilled into or popup-promoted.
  function traverseExpansions(exps: Record<string, Expansion>, parentClusterPath: string) {
    for (const [key, expansion] of Object.entries(exps)) {
      if (expansion.loading) continue

      const pipeIdx = key.indexOf('|')
      const sourceWord = expansion.sourceWord ?? (pipeIdx >= 0 ? key.slice(0, pipeIdx) : key)

      addNode(sourceWord)

      const clusterLabel = `${expansion.label} (${sourceWord})`
      const groupId = `${expansion.label}-${sourceWord}`
      const clusterPath = parentClusterPath ? `${parentClusterPath}>${key}` : key

      // Sort leaves by weight desc (LLM rows sorted in service; Datamuse rows sorted by raw score).
      const weights = expansion.weights ?? {}
      const sortedLeaves = [...expansion.words].sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0))

      // Drilled-into leaves come from expansion.children — each child's key is "leaf|relType",
      // so the leaf is the prefix before the pipe. Auto-promoted.
      const drilledLeaves = new Set<string>()
      if (expansion.children) {
        for (const childKey of Object.keys(expansion.children)) {
          const idx = childKey.indexOf('|')
          if (idx > 0) drilledLeaves.add(childKey.slice(0, idx))
        }
      }
      const popupPromoted = promoted.get(clusterPath) ?? new Set<string>()
      const promotedSet = new Set<string>([...drilledLeaves, ...popupPromoted])

      addNode(clusterLabel, {
        isCluster: true,
        childCount: expansion.words.length,
        promotedCount: promotedSet.size,
        group: groupId,
        popupLeaves: sortedLeaves,
        popupWeights: weights,
        clusterPath,
      })
      addLink(sourceWord, clusterLabel, expansion.label)

      // Render promoted leaves as their own nodes hanging off the cluster.
      for (const leaf of promotedSet) {
        addNode(leaf, { relationLabel: expansion.label, group: groupId })
        addLink(clusterLabel, leaf, expansion.label)
      }

      if (expansion.children) {
        traverseExpansions(expansion.children, clusterPath)
      }
    }
  }

  traverseExpansions(expansions, '')

  return { nodes: Array.from(nodes.values()), links }
}
