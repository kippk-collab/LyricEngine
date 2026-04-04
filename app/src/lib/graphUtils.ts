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
  isCluster?: boolean   // syllable group label node
  isRhyme?: boolean
  relationLabel?: string
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
  visibleSyllables?: Set<number>
): GraphData {
  const nodes = new Map<string, GraphNode>()
  const linkSet = new Set<string>()
  const links: GraphLink[] = []

  function addNode(id: string, props?: Partial<GraphNode>) {
    const existing = nodes.get(id)
    if (existing) {
      if (props?.isRoot) existing.isRoot = true
      if (props?.isCluster) existing.isCluster = true
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

  // Rhyme results grouped through syllable cluster nodes (filtered by visible set)
  for (const group of results) {
    if (visibleSyllables && !visibleSyllables.has(group.count)) continue
    const clusterLabel = `${group.count} syl`
    addNode(clusterLabel, { isCluster: true })
    addLink(submittedWord, clusterLabel, 'rhymes')

    for (const word of group.words) {
      addNode(word, { isRhyme: true })
      addLink(clusterLabel, word, `${group.count} syl`)
    }
  }

  // Expansions from context menu exploration
  function traverseExpansions(exps: Record<string, Expansion>) {
    for (const [key, expansion] of Object.entries(exps)) {
      if (expansion.loading) continue

      const pipeIdx = key.indexOf('|')
      const sourceWord = expansion.sourceWord ?? (pipeIdx >= 0 ? key.slice(0, pipeIdx) : key)

      addNode(sourceWord)

      for (const word of expansion.words) {
        addNode(word, { relationLabel: expansion.label })
        addLink(sourceWord, word, expansion.label)
      }

      if (expansion.children) {
        traverseExpansions(expansion.children)
      }
    }
  }

  traverseExpansions(expansions)

  return { nodes: Array.from(nodes.values()), links }
}
