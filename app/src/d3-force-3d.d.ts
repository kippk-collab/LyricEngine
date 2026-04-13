declare module 'd3-force-3d' {
  export function forceCollide<T>(radius?: number | ((node: T) => number)): {
    strength(s: number): ReturnType<typeof forceCollide>
    iterations(n: number): ReturnType<typeof forceCollide>
    radius(r: number | ((node: T) => number)): ReturnType<typeof forceCollide>
  }
}
