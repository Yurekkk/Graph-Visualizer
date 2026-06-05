export default interface graphMetrics {
    numNodes: number,
    numEdges: number,
    density: number,
    maxDegree: number,
    minDegree: number,
    maxEdgeWeight: number,
    minEdgeWeight: number,
    hubDominance: number,
    numCommunities?: number,
    modularity?: number,
    degreeGini?: number,

    minNodeImportance?: number, 
    maxNodeImportance?: number, 
    avgNodeImportance?: number,
    minEdgeImportance?: number, 
    maxEdgeImportance?: number,
    avgEdgeImportance?: number
}