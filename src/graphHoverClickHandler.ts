import Sigma from 'sigma';
import Graph from 'graphology';
import findCloseImportantNeighbours from './findCloseImportantNeigbors.ts';
import { fitViewportToNodes } from '@sigma/utils';
import * as vis from './configs/visualConfig.ts';
import type graphMetrics from './graphMetricsInterface.ts';



let selectedNodeId: string | null = null;
let hoveredNodeId:  string | null = null;



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
  });

  renderer.refresh();
}



export function unhoverNode(graph: Graph, renderer: Sigma, refresh: boolean = true) {
  if (hoveredNodeId == null) return;

  // Скрываем лейбл и уменьшаем узел
  if (hoveredNodeId !== selectedNodeId) {
    graph.setNodeAttribute(hoveredNodeId, 'label', '');
    graph.setNodeAttribute(hoveredNodeId, 'size', vis.nodeSizeDefault);
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
  });

  hoveredNodeId = null;

  if (refresh) renderer.refresh();
}



export function selectNode(newSelectedNodeId: string, graph: Graph, 
  renderer: Sigma, metrics: graphMetrics) {
  if (selectedNodeId === newSelectedNodeId) return;

  const degreeRange = (metrics.maxDegree - metrics.minDegree) || 1;
  const weightsRange = (metrics.maxEdgeWeight - metrics.minEdgeWeight) || 1;

  if (selectedNodeId != null) {
    graph.setNodeAttribute(selectedNodeId, 'label', '');
    graph.setNodeAttribute(selectedNodeId, 'size', vis.nodeSizeDefault);
    graph.setNodeAttribute(selectedNodeId, 'borderSize', vis.borderSizeDefault);
  }
  selectedNodeId = newSelectedNodeId;

  const hiddenLabel = graph.getNodeAttribute(selectedNodeId, 'hiddenLabel');
  graph.setNodeAttribute(selectedNodeId, 'label', hiddenLabel);
  graph.setNodeAttribute(selectedNodeId, 'size', vis.nodeSizeSelected);
  graph.setNodeAttribute(selectedNodeId, 'borderSize', vis.borderSizeHover);

  const importantIds = findCloseImportantNeighbours(selectedNodeId, graph, metrics);

  // Делаем важные узлы и ребра непрозрачными и возвращаем их zIndex
  // zIndex выбранного узла поднимаем
  // Делаем все остальные узлы и ребра полупрозрачными и опускаем их zIndex
  graph.forEachNode((node, attrs) => {
    if (importantIds.includes(node) || node === selectedNodeId) {
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

  graph.forEachEdge((edge, attrs, source, target) => {
    if ((importantIds.includes(source) || source === selectedNodeId) &&
        (importantIds.includes(target) || target === selectedNodeId)) {
      graph.setEdgeAttribute(edge, 'alpha', vis.edgeDefaultAlpha);
      if (source !== hoveredNodeId && target !== hoveredNodeId)
        graph.setEdgeAttribute(edge, 'zIndex', attrs.weight);
    }
    else {
      graph.setEdgeAttribute(edge, 'alpha', vis.edgeHiddenAlpha);
      graph.setEdgeAttribute(edge, 'zIndex', attrs.weight - weightsRange);
    }
  })

  // Подстраиваем вид под нужные узлы
  fitViewportToNodes(renderer, [...importantIds, selectedNodeId], { animate: true });
  
  renderer.refresh();
}



export function deselectNode(graph: Graph, renderer: Sigma) {
  if (selectedNodeId == null) return;
  graph.setNodeAttribute(selectedNodeId, 'label', '');
  graph.setNodeAttribute(selectedNodeId, 'size', vis.nodeSizeDefault);
  graph.setNodeAttribute(selectedNodeId, 'borderSize', vis.borderSizeDefault);

  // Возвращаем непрозрачность всем узлам и ребрам и возвращаем их zIndex
  graph.forEachNode((node, attrs) => {
    graph.setNodeAttribute(node, 'alpha', vis.nodeDefaultAlpha);
    graph.setNodeAttribute(node, 'zIndex', attrs.degree);
  })

  graph.forEachEdge((edge, attrs, _source, _target) => {
    graph.setEdgeAttribute(edge, 'alpha', vis.edgeDefaultAlpha);
    graph.setEdgeAttribute(edge, 'zIndex', attrs.weight);
  })

  selectedNodeId = null;

  renderer.refresh();
}