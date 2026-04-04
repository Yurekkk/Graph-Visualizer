import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import noverlap from 'graphology-layout-noverlap';
import { subgraph } from 'graphology-operators';
import interpolatePositions from './interpolatePositions';
import stratifiedSampling from './stratifiedSampling';


export default async function smartLayout(
  graph: Graph, 
  metrics: any, // TODO: сделать нормальный интерфейс
  sampleSize = 500,
  iterations = 50
): Promise<void> {
  // Должно вызываться после вычисления метрик

  const {
    numNodes,
    numEdges,
    density,
    avgDegree,
    maxDegree,
    minDegree,
    maxEdgeWeight,
    minEdgeWeight,
    numCommunities,
    modularity
  } = metrics;

  if (numNodes <= sampleSize) {
    // Прямая раскладка
    const sensibleSettings = forceAtlas2.inferSettings(graph);
    await forceAtlas2.assign(graph, {
      iterations: iterations,
      settings: sensibleSettings
    });
  } 

  else {
    // Сэмплируем, раскладываем подграф, интерполируем остальное
    const sampledNodes = stratifiedSampling(graph, {
      sampleSize: sampleSize, 
      method: "proportional", 
      prioritizeHighDegree: true
    });

    const sub = subgraph(graph, (node) => sampledNodes.includes(node));

    const sensibleSettings = forceAtlas2.inferSettings(sub);
    await forceAtlas2.assign(sub, {
      iterations: iterations,
      settings: sensibleSettings
    });

    interpolatePositions(graph, sub);
  }

  // Убираем наложения узлов
  // noverlap.assign(graph);
}