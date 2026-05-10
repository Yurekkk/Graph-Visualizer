export default interface graphMetrics {
    numNodes: number,
    numEdges: number,
    density: number,
    avgDegree: number,
    maxDegree: number,
    minDegree: number,
    maxEdgeWeight: number,
    minEdgeWeight: number,
    numCommunities?: number,
    modularity?: number,
    hubDominance: number,
    degreeGini: number,
    minEdgeImportance?: number, 
    maxEdgeImportance?: number,
    avgEdgeImportance?: number
}