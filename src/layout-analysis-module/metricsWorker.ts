import Graph from 'graphology';
import countEdgeCrossings from './countEdgeCrossings';
import calculateStress from './calculateStress';
import computeEdgeLengthCV from './computeEdgeLengthCV';

self.onmessage = (e) => {
  const { graphData } = e.data;
  const graph = Graph.from(graphData);
  const crossings = countEdgeCrossings(graph);
  const stress = calculateStress(graph);
  const edgeLengthCV = computeEdgeLengthCV(graph);
  self.postMessage({ crossings, stress, edgeLengthCV });
};