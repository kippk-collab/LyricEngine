import type { SyllableGroup } from './datamuse'

interface Expansion {
  label: string
  words: string[]
  loading?: boolean
  sourceWord?: string
  children?: Record<string, Expansion>
}

export interface GraphNode {
  id: string
  isRoot?: boolean
  isCluster?: boolean   // collapsible group node (rhyme clusters + expansion clusters)
  isRhyme?: boolean
  relationLabel?: string
  childCount?: number   // how many children this cluster has (shown when collapsed)
  isExpanded?: boolean  // whether this cluster is currently expanded
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

export function buildGraphData(
  submittedWord: string,
  results: SyllableGroup[],
  expansions: Record<string, Expansion>,
  visibleSyllables?: Set<number>,
  expandedClusters?: Set<string>
): GraphData {
  const nodes = new Map<string, GraphNode>()
  const linkSet = new Set<string>()
  const links: GraphLink[] = []
  const expanded = expandedClusters ?? new Set<string>()

  function addNode(id: string, props?: Partial<GraphNode>) {
    const existing = nodes.get(id)
    if (existing) {
      if (props?.isRoot) existing.isRoot = true
      if (props?.isCluster) existing.isCluster = true
      if (props?.childCount !== undefined) existing.childCount = props.childCount
      if (props?.isExpanded !== undefined) existing.isExpanded = props.isExpanded
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
  addNode(submittedWord, { isRoot: true })

  // Rhyme results grouped through collapsible cluster nodes
  for (const group of results) {
    if (visibleSyllables && !visibleSyllables.has(group.count)) continue
    const clusterLabel = `rhyme (${group.count} syl)`
    const isExp = expanded.has(clusterLabel)
    addNode(clusterLabel, { isCluster: true, childCount: group.words.length, isExpanded: isExp })
    addLink(submittedWord, clusterLabel, 'rhymes')

    if (isExp) {
      for (const word of group.words) {
        addNode(word, { isRhyme: true })
        addLink(clusterLabel, word, 'rhymes')
      }
    }
  }

  // Expansions from context menu exploration — each gets a collapsible cluster node
  function traverseExpansions(exps: Record<string, Expansion>) {
    for (const [key, expansion] of Object.entries(exps)) {
      if (expansion.loading) continue

      const pipeIdx = key.indexOf('|')
      const sourceWord = expansion.sourceWord ?? (pipeIdx >= 0 ? key.slice(0, pipeIdx) : key)

      addNode(sourceWord)

      const clusterLabel = `${expansion.label} (${sourceWord})`
      const isExp = expanded.has(clusterLabel)
      addNode(clusterLabel, { isCluster: true, childCount: expansion.words.length, isExpanded: isExp })
      addLink(sourceWord, clusterLabel, expansion.label)

      if (isExp) {
        for (const word of expansion.words) {
          addNode(word, { relationLabel: expansion.label })
          addLink(clusterLabel, word, expansion.label)
        }
      }

      if (expansion.children) {
        traverseExpansions(expansion.children)
      }
    }
  }

  traverseExpansions(expansions)

  return { nodes: Array.from(nodes.values()), links }
}
