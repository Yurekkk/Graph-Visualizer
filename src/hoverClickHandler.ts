import type Graph from 'graphology';
import * as vis from './configs/visualConfig';
import type graphMetrics from './graphMetricsInterface';
import { blendWithBackground, edgeColor, edgeColorInterpolate, edgeSize, edgeSizeInterpolate, nodeColor, nodeSize } from './utilsVisual';
import type Sigma from 'sigma';
import findCloseImportantNeighbours from './findCloseImportantNeigbors';
import { fitViewportToNodes } from '@sigma/utils';



let selectedNodeId: string | null = null;
let hoveredNodeId: string | null = null;
let importantNodesCache = new Map<string, number>();
let importantEdgesCache = new Map<string, number>();
let maxEdgeImportance: number | null = null;
let minEdgeImportance: number | null = null;

function setImportantCache(nodes: Map<string, number>, edges: Map<string, number>) {
  const values = Array.from(edges.values());
  maxEdgeImportance = Math.max(...values);
  minEdgeImportance = Math.min(...values);
  importantNodesCache = nodes;
  importantEdgesCache = edges;
}

export function clearHighlightState() {
  selectedNodeId = null;
  hoveredNodeId = null;
  importantNodesCache.clear();
  importantEdgesCache.clear();
  maxEdgeImportance = null;
  minEdgeImportance = null;
}



function getNodeLevel(node: string) {
  if (node === selectedNodeId) return 'selected';
  else if (node === hoveredNodeId) return 'hovered';
  else if (selectedNodeId == null || importantNodesCache.has(node)) return 'usual';
  else return 'transparent';
}

function computeNodeVisuals(node: string, data: any, metrics: any) {
  const level = getNodeLevel(node);
  
  switch (level) {
    case 'selected':
      return {
        ...data,
        label: data.hiddenLabel,
        size: vis.nodeSizeSelected ?? nodeSize(data.degree, metrics),
        borderSize: vis.borderSizeSelect,
        alpha: vis.nodeDefaultAlpha,
        zIndex: data.degree + 2 * vis.zLayerMargin,
        color: nodeColor(data.community, metrics),
        hidden: false,
      };
      
    case 'hovered':
      return {
        ...data,
        label: data.hiddenLabel,
        size: vis.nodeSizeHover ?? nodeSize(data.degree, metrics),
        borderSize: vis.borderSizeHover,
        alpha: vis.nodeDefaultAlpha,
        zIndex: data.degree + vis.zLayerMargin,
        color: nodeColor(data.community, metrics),
        hidden: false,
      };
      
    case 'usual':
      return {
        ...data,
        label: '',
        size: nodeSize(data.degree, metrics),
        borderSize: vis.borderSizeDefault,
        alpha: vis.nodeDefaultAlpha,
        zIndex: data.degree,
        color: nodeColor(data.community, metrics),
        hidden: false,
      };
      
    case 'transparent':
      return {
        ...data,
        label: '',
        size: nodeSize(data.degree, metrics),
        borderSize: 0,
        alpha: vis.nodeTransparentAlpha,
        zIndex: data.degree - vis.zLayerMargin,
        color: nodeColor(data.community, metrics),
        hidden: false,
      };
  }
}

export function nodeReducer(node: string, data: any, metrics: any) {
  data = computeNodeVisuals(node, data, metrics);

  const alpha = data.alpha ?? 1;
  const bgColor = getBackgroundColor();
  const blended = blendWithBackground(data.color, bgColor, alpha);
  const borderColorBlended = blendWithBackground(data.borderColor, bgColor, alpha);
  return { ...data, color: blended, borderColor: borderColorBlended };
}



function getEdgeLevel(edge: string, graph: Graph) {
  const source = graph.extremities(edge)[0];
  const target = graph.extremities(edge)[1];
  if ((source === hoveredNodeId || target === hoveredNodeId) && importantEdgesCache.has(edge))
    return 'highlightedAndImportant'; // При ховере важного
  else if (source === hoveredNodeId || target === hoveredNodeId) return 'highlighted'; // При ховере
  else if (importantEdgesCache.has(edge)) return 'important'; // Важные при селекте
  else if (selectedNodeId == null) return 'usual';
  else return 'transparent';
}

function computeEdgeVisuals(edge: string, data: any, graph: Graph, metrics: graphMetrics) {
  const level = getEdgeLevel(edge, graph);
  const allWeightsEqual = metrics.maxEdgeWeight == metrics.minEdgeWeight;
  
  switch (level) {
    case 'highlightedAndImportant':
      return {
        ...data,
        size: edgeSizeInterpolate(importantEdgesCache.get(edge)!, maxEdgeImportance!, minEdgeImportance!),
        color: vis.edgeHoverColor,
        alpha: vis.edgeHoverAlpha,
        zIndex: (allWeightsEqual ? data.importance : data.weight) + 2 * vis.zLayerMargin,
        hidden: false,
      };

    case 'highlighted':
      return {
        ...data,
        size: edgeSize(data.weight, data.importance, metrics),
        color: vis.edgeHoverColor,
        alpha: vis.edgeHoverAlpha,
        zIndex: (allWeightsEqual ? data.importance : data.weight) + 2 * vis.zLayerMargin,
        hidden: false,
      };
      
    case 'important':
      const importance = importantEdgesCache.get(edge);
      return {
        ...data,
        size: edgeSizeInterpolate(importance!, maxEdgeImportance!, minEdgeImportance!),
        color: edgeColorInterpolate(importance!, maxEdgeImportance!, minEdgeImportance!),
        alpha: vis.edgeClickAlpha,
        zIndex: (allWeightsEqual ? data.importance : data.weight) + vis.zLayerMargin,
        hidden: false,
      };
      
    case 'usual':
      return {
        ...data,
        size: edgeSize(data.weight, data.importance, metrics),
        color: edgeColor(data.weight, data.importance, metrics),
        alpha: vis.edgeDefaultAlpha,
        zIndex: (allWeightsEqual ? data.importance : data.weight),
        hidden: metrics.numEdges > vis.edgesMaxDrawnLimit,
      };
      
    case 'transparent':
      return {
        ...data,
        size: edgeSize(data.weight, data.importance, metrics),
        color: edgeColor(data.weight, data.importance, metrics),
        alpha: vis.edgeTransparentAlpha,
        zIndex: (allWeightsEqual ? data.importance : data.weight) - vis.zLayerMargin,
        hidden: metrics.numEdges > vis.edgesMaxDrawnLimit,
      };
  }
}

export function edgeReducer(edge: string, data: any, graph: Graph, metrics: graphMetrics) {
  data = computeEdgeVisuals(edge, data, graph, metrics);

  const alpha = data.alpha ?? 1;
  const bgColor = getBackgroundColor();
  const colorBlended = blendWithBackground(data.color, bgColor, alpha);
  return { ...data, color: colorBlended };
}



export function hoverNode(nodeId: string, _graph: Graph, renderer: Sigma) {
  if (hoveredNodeId === nodeId) return;
  hoveredNodeId = nodeId;
  renderer.refresh({skipIndexation: true});
}

export function unhoverNode(_graph: Graph, renderer: Sigma) {
  hoveredNodeId = null;
  renderer.refresh({skipIndexation: true});
}

export function selectNode(nodeId: string, graph: Graph, renderer: Sigma, metrics: graphMetrics) {
  if (selectedNodeId === nodeId) {
    deselectNode(graph, renderer);
    hoverNode(nodeId, graph, renderer);
    return;
  }
  selectedNodeId = nodeId;
  
  const { importantNodes, importantEdges } = findCloseImportantNeighbours(nodeId, graph, metrics);
  setImportantCache(importantNodes, importantEdges);
  
  fitViewportToNodes(renderer, [...importantNodes.keys(), nodeId], { animate: true });
  renderer.refresh({skipIndexation: true});
}

export function deselectNode(_graph: Graph, renderer: Sigma) {
  selectedNodeId = null;
  clearHighlightState();
  renderer.refresh({skipIndexation: true});
}



// Кэшируем цвет фона, чтобы не парсить его на каждый кадр
let cachedBgColor: string | null = null;
function getBackgroundColor(): string {
  if (!cachedBgColor) {
    cachedBgColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-color')
    .trim();
  }
  return cachedBgColor;
}
