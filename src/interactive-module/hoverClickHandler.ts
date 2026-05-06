import type Graph from 'graphology';
import * as vis from '../configs/visualConfig';
// import * as alg from '../configs/algorithmicConfig.ts';
import type graphMetrics from '../metrics-module/graphMetricsInterface';
import { blendWithBackground, edgeColor, edgeColorInterpolate, edgeSize, edgeSizeInterpolate, nodeColor, nodeSize } from '../misc/utilsVisual';
import type Sigma from 'sigma';
import findCloseImportantNeighbours from '../interactive-module/findCloseImportantNeigbors';
import { fitViewportToNodes } from '@sigma/utils';
import { ThemeManager } from '../misc/themeManager';



type NodeLevel = "hovered" | "selected" | "usual" | "transparent";

type EdgeLevel = "highlightedAndImportant" | "highlighted" | "important" | "usual" | "transparent";
//                  При ховере важного     |   При ховере  |  Важные при |  Дефолт |  Неважные при 
//                                                             селекте                  селекте



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



function getNodeLevel(node: string): NodeLevel {
  if (node === hoveredNodeId) return 'hovered';
  else if (node === selectedNodeId) return 'selected';
  else if (selectedNodeId == null || importantNodesCache.has(node)) return 'usual';
  else return 'transparent';
}

export function nodeReducer(node: string, data: any, metrics: any) {
  const level = getNodeLevel(node);
  const theme = ThemeManager.getTheme();
  const bgColor = getBackgroundColor();
  let color, borderColor, alpha;

  switch (level) {
    case 'selected':
      color = nodeColor(data.community, metrics);
      borderColor = theme === 'dark' ? vis.borderColorDarkTheme : vis.borderColorLightTheme;
      alpha = vis.nodeDefaultAlpha;
      return {
        ...data,
        size: vis.nodeSizeSelected ?? nodeSize(data.degree, metrics),
        borderSize: vis.borderSizeSelect,
        borderColor: blendWithBackground(borderColor, bgColor, alpha),
        zIndex: data.degree + 2 * vis.zLayerMargin,
        color: blendWithBackground(color, bgColor, alpha),
        hidden: false,
      };
      
    case 'hovered':
      color = nodeColor(data.community, metrics);
      borderColor = "#ffffff"; // Потому что bgColor лейбла в sigma.js всегда белый, меняется это 
                                 // через кастомную отрисовку лейблов, фу
      alpha = vis.nodeDefaultAlpha;
      return {
        ...data,
        size: vis.nodeSizeHover ?? nodeSize(data.degree, metrics),
        borderSize: vis.borderSizeHover,
        borderColor: blendWithBackground(borderColor, bgColor, alpha),
        zIndex: data.degree + vis.zLayerMargin,
        color: blendWithBackground(color, bgColor, alpha),
        hidden: false,
      };
      
    case 'usual':
      color = nodeColor(data.community, metrics);
      borderColor = theme === 'dark' ? vis.borderColorDarkTheme : vis.borderColorLightTheme;
      alpha = vis.nodeDefaultAlpha;
      return {
        ...data,
        size: nodeSize(data.degree, metrics),
        borderSize: vis.borderSizeDefault,
        borderColor: blendWithBackground(borderColor, bgColor, alpha),
        zIndex: data.degree,
        color: blendWithBackground(color, bgColor, alpha),
        hidden: false,
      };
      
    case 'transparent':
      color = nodeColor(data.community, metrics);
      borderColor = theme === 'dark' ? vis.borderColorDarkTheme : vis.borderColorLightTheme;
      alpha = vis.nodeTransparentAlpha;
      return {
        ...data,
        size: nodeSize(data.degree, metrics),
        borderSize: 0,
        borderColor: blendWithBackground(borderColor, bgColor, alpha),
        zIndex: data.degree - vis.zLayerMargin,
        color: blendWithBackground(color, bgColor, alpha),
        hidden: false,
      };
  }
}



function getEdgeLevel(edge: string, graph: Graph): EdgeLevel {
  const source = graph.extremities(edge)[0];
  const target = graph.extremities(edge)[1];
  
  if ((source === hoveredNodeId || target === hoveredNodeId) && importantEdgesCache.has(edge)) 
    return 'highlightedAndImportant'; // При ховере важного
  else if (source === hoveredNodeId || target === hoveredNodeId) return 'highlighted'; // При ховере
  else if (importantEdgesCache.has(edge)) return 'important'; // Важные при селекте
  else if (selectedNodeId == null) return 'usual';
  else return 'transparent';
}

export function edgeReducer(edge: string, data: any, graph: Graph, metrics: graphMetrics) {
  const level = getEdgeLevel(edge, graph);
  const allWeightsEqual = metrics.maxEdgeWeight == metrics.minEdgeWeight;
  const theme = ThemeManager.getTheme();
  const bgColor = getBackgroundColor();
  let color, alpha;
  
  switch (level) {
    case 'highlightedAndImportant':
      color = theme === 'dark' ? vis.edgeHoverColorDarkTheme : vis.edgeHoverColorLightTheme;
      alpha = vis.edgeHoverAlpha;
      return {
        ...data,
        size: edgeSizeInterpolate(importantEdgesCache.get(edge)!, maxEdgeImportance!, minEdgeImportance!),
        color: blendWithBackground(color, bgColor, alpha),
        zIndex: (allWeightsEqual ? data.importance : data.weight) + 2 * vis.zLayerMargin,
        hidden: false,
      };

    case 'highlighted':
      color = theme === 'dark' ? vis.edgeHoverColorDarkTheme : vis.edgeHoverColorLightTheme;
      alpha = vis.edgeHoverAlpha;
      return {
        ...data,
        size: edgeSize(data.weight, data.importance, metrics),
        color: blendWithBackground(color, bgColor, alpha),
        zIndex: (allWeightsEqual ? data.importance : data.weight) + 2 * vis.zLayerMargin,
        hidden: false,
      };
      
    case 'important':
      const importance = importantEdgesCache.get(edge);
      color = edgeColorInterpolate(importance!, maxEdgeImportance!, minEdgeImportance!);
      alpha = vis.edgeClickAlpha;
      return {
        ...data,
        size: edgeSizeInterpolate(importance!, maxEdgeImportance!, minEdgeImportance!),
        color: blendWithBackground(color, bgColor, alpha),
        zIndex: (allWeightsEqual ? data.importance : data.weight) + vis.zLayerMargin,
        hidden: false,
      };
      
    case 'usual':
      color = edgeColor(data.weight, data.importance, metrics);
      alpha = vis.edgeDefaultAlpha;
      return {
        ...data,
        size: edgeSize(data.weight, data.importance, metrics),
        color: blendWithBackground(color, bgColor, alpha),
        zIndex: (allWeightsEqual ? data.importance : data.weight),
        hidden: metrics.numEdges > vis.edgesMaxDrawnLimit,
      };
      
    case 'transparent':
      color = edgeColor(data.weight, data.importance, metrics);
      alpha = vis.edgeTransparentAlpha;
      return {
        ...data,
        size: edgeSize(data.weight, data.importance, metrics),
        color: blendWithBackground(color, bgColor, alpha),
        zIndex: (allWeightsEqual ? data.importance : data.weight) - vis.zLayerMargin,
        hidden: metrics.numEdges > vis.edgesMaxDrawnLimit,
      };
  }
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

  console.log(`- Выбран узел ${nodeId}`);
  const nodeMetrics = ["degree", "degreeCentrality", "community", 
    "core", "eigenvectorCentrality", "importance"];
  nodeMetrics.forEach((value) => 
    console.log(`--- ${value}: ${graph.getNodeAttribute(nodeId, value)}`)
  );
  
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



function getBackgroundColor(): string {
  return getComputedStyle(document.documentElement)
  .getPropertyValue('--bg-color')
  .trim();;
}
