import Graph from 'graphology';
import countEdgeCrossings from './countEdgeCrossings';
import calculateStress from './calculateStress';
import computeEdgeLengthCV from './computeEdgeLengthCV';

self.onmessage = (e) => {
  const { graphData, executionTimes } = e.data;
  const graph = Graph.from(graphData);
  const metrics: Record<string, number> = { ...executionTimes };

  self.postMessage({ metrics: { ...metrics } });

  const edgeLengthCV = computeEdgeLengthCV(graph);
  metrics.edgeLengthCV = edgeLengthCV;
  self.postMessage({ metrics: { ...metrics } });

  const crossings = countEdgeCrossings(graph);
  metrics.crossings = crossings;
  self.postMessage({ metrics: { ...metrics } });

  const stress = calculateStress(graph);
  metrics.stress = stress;
  self.postMessage({ metrics: { ...metrics } });
};
