import Sigma from 'sigma';
import Graph from 'graphology';
import findCloseImportantNeighbours from './findCloseImportantNeigbors.ts';
import { fitViewportToNodes } from '@sigma/utils';
import * as vis from './configs/visualConfig.ts';
import type graphMetrics from './graphMetricsInterface.ts';
import { edgeColor, edgeColorInterpolate } from './visualUtils.ts';



let selectedNodeId: string | null = null;
let hoveredNodeId:  string | null = null;
let importantNodes: Map<string, number>;
let importantEdges: Map<string, number>;



// TODO: Лучше сделать просто 4 уровня важности:
// Hovered, selected (для узла), usual, hidden



export function clearHoveredSelected() {
  selectedNodeId = null;
  hoveredNodeId = null;
}



export function hoverNode(newHoveredNodeId: string, graph: Graph, 
  renderer: Sigma, metrics: graphMetrics) {
  if (hoveredNodeId === newHoveredNodeId) return;

  if (hoveredNodeId != null)
    unhoverNode(graph, renderer, false);

  hoveredNodeId = newHoveredNodeId;

  // Показываем лейбл и увеличиваем узел
  
  if (hoveredNodeId !== selectedNodeId) {
    const hiddenLabel = graph.getNodeAttribute(hoveredNodeId, 'hiddenLabel');
    graph.setNodeAttribute(hoveredNodeId, 'label', hiddenLabel);
    graph.setNodeAttribute(hoveredNodeId, 'size', vis.nodeSizeHover);
  }
  graph.setNodeAttribute(hoveredNodeId, 'borderSize', vis.borderSizeHover);

  // Подсвечиваем соседей
  // graph.forEachNeighbor(hoveredNodeId, (neighbor) => {
  //   graph.setNodeAttribute(neighbor, 'borderSize', vis.borderSizeNeighbor);
  // });

  // Подсвечиваем ребра этого узла
  const weightsRange = (metrics.maxEdgeWeight - metrics.minEdgeWeight) || 1;
  graph.forEachEdge(hoveredNodeId, (edge, attrs, _source, _target) => {
    graph.setEdgeAttribute(edge, 'color', vis.edgeHoverColor);
    graph.setEdgeAttribute(edge, 'zIndex', attrs.weight + weightsRange);
    graph.setEdgeAttribute(edge, 'alpha', vis.edgeHoverAlpha);
  });

  renderer.refresh();
}



export function unhoverNode(graph: Graph, renderer: Sigma, refresh: boolean = true) {
  if (hoveredNodeId == null) return;

  // Скрываем лейбл и уменьшаем узел
  if (hoveredNodeId !== selectedNodeId) {
    graph.setNodeAttribute(hoveredNodeId, 'label', '');
    const hiddenSize = graph.getNodeAttribute(hoveredNodeId, 'hiddenSize');
    graph.setNodeAttribute(hoveredNodeId, 'size', hiddenSize);
  }
  graph.setNodeAttribute(hoveredNodeId, 'borderSize', vis.borderSizeDefault);

  // Убираем подсветку у соседей
  // graph.forEachNeighbor(hoveredNodeId, (neighbor) => {
  //   graph.setNodeAttribute(neighbor, 'borderSize', vis.borderSizeDefault);
  // });

  // Убираем подсветку у ребер этого узла
  graph.forEachEdge(hoveredNodeId, (edge, attrs, _source, _target) => {
    graph.setEdgeAttribute(edge, 'color', attrs.hiddenColor);
    graph.setEdgeAttribute(edge, 'zIndex', attrs.weight);
    if (hoveredNodeId === selectedNodeId)
      graph.setEdgeAttribute(edge, 'alpha', vis.edgeClickAlpha);
    else graph.setEdgeAttribute(edge, 'alpha', vis.edgeDefaultAlpha);
  });

  hoveredNodeId = null;

  if (refresh) renderer.refresh();
}



export function selectNode(newSelectedNodeId: string, graph: Graph, 
  renderer: Sigma, metrics: graphMetrics) {
  if (selectedNodeId === newSelectedNodeId) return;

  const degreeRange = (metrics.maxDegree - metrics.minDegree) || 1;
  const weightsRange = (metrics.maxEdgeWeight - metrics.minEdgeWeight) || 1;

  // Чистим предыдущий клик
  if (selectedNodeId != null) {
    graph.setNodeAttribute(selectedNodeId, 'label', '');
    const hiddenSize = graph.getNodeAttribute(selectedNodeId, 'hiddenSize');
    graph.setNodeAttribute(selectedNodeId, 'size', hiddenSize);
    graph.setNodeAttribute(selectedNodeId, 'borderSize', vis.borderSizeDefault);
  }
  selectedNodeId = newSelectedNodeId;

  const hiddenLabel = graph.getNodeAttribute(selectedNodeId, 'hiddenLabel');
  graph.setNodeAttribute(selectedNodeId, 'label', hiddenLabel);
  graph.setNodeAttribute(selectedNodeId, 'size', vis.nodeSizeSelected);
  graph.setNodeAttribute(selectedNodeId, 'borderSize', vis.borderSizeHover);

  // Ищем важные узлы
  const { importantNodes: importantNodes, importantEdges: importantEdges } = 
    findCloseImportantNeighbours(selectedNodeId, graph, metrics);

  // Делаем важные узлы и ребра непрозрачными и возвращаем их zIndex
  // zIndex выбранного узла поднимаем
  // Делаем все остальные узлы и ребра полупрозрачными и опускаем их zIndex
  graph.forEachNode((node, attrs) => {
    if (importantNodes.has(node) || node === selectedNodeId) {
      graph.setNodeAttribute(node, 'alpha', vis.nodeDefaultAlpha);
      if (node === selectedNodeId)
        graph.setNodeAttribute(node, 'zIndex', attrs.degree + degreeRange);
      else
        graph.setNodeAttribute(node, 'zIndex', attrs.degree);
    }
    else {
      graph.setNodeAttribute(node, 'alpha', vis.nodeHiddenAlpha);
      graph.setNodeAttribute(node, 'zIndex', attrs.degree - degreeRange);
    }
  })

  const maxEdgeImportance = Math.max(...importantEdges.values());
  const minEdgeImportance = Math.min(...importantEdges.values());

  graph.forEachEdge((edge, attrs, source, target) => {
    if (importantEdges.has(edge)) {
      graph.setEdgeAttribute(edge, 'alpha', vis.edgeClickAlpha);
      const color = edgeColorInterpolate(importantEdges.get(edge)!, maxEdgeImportance, minEdgeImportance);
      graph.setEdgeAttribute(edge, 'hiddenColor', color);
      if (source !== hoveredNodeId && target !== hoveredNodeId)
        graph.setEdgeAttribute(edge, 'zIndex', attrs.weight);
    }
    else if (source !== hoveredNodeId && target !== hoveredNodeId) {
      graph.setEdgeAttribute(edge, 'alpha', vis.edgeHiddenAlpha);
      const color = edgeColor(attrs.weight, attrs.importance, metrics);
      graph.setEdgeAttribute(edge, 'hiddenColor', color);
      graph.setEdgeAttribute(edge, 'zIndex', attrs.weight - weightsRange);
    }
  })

  // Подстраиваем вид под нужные узлы
  fitViewportToNodes(renderer, [...importantNodes.keys(), selectedNodeId], { animate: true });
  
  renderer.refresh();
}



export function deselectNode(graph: Graph, renderer: Sigma, metrics: graphMetrics) {
  if (selectedNodeId == null) return;
  graph.setNodeAttribute(selectedNodeId, 'label', '');
  const hiddenSize = graph.getNodeAttribute(selectedNodeId, 'hiddenSize');
  graph.setNodeAttribute(selectedNodeId, 'size', hiddenSize);
  graph.setNodeAttribute(selectedNodeId, 'borderSize', vis.borderSizeDefault);

  // Возвращаем непрозрачность всем узлам и ребрам и возвращаем их zIndex
  graph.forEachNode((node, attrs) => {
    graph.setNodeAttribute(node, 'alpha', vis.nodeDefaultAlpha);
    graph.setNodeAttribute(node, 'zIndex', attrs.degree);
  })

  graph.forEachEdge((edge, attrs, _source, _target) => {
    graph.setEdgeAttribute(edge, 'alpha', vis.edgeDefaultAlpha);
    const color = edgeColor(attrs.weight, attrs.importance, metrics);
    graph.setEdgeAttribute(edge, 'color', color);
    graph.setEdgeAttribute(edge, 'zIndex', attrs.weight);
  })

  selectedNodeId = null;

  renderer.refresh();
}