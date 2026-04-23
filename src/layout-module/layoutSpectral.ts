import Graph from 'graphology';
import { connectedComponents } from 'graphology-components';
import * as alg from '../configs/algorithmicConfig.ts';
import circularLayout from './layoutCircular.ts';
import subgraph from 'graphology-operators/subgraph';
import { denseSpectral, findEigenvector } from '../misc/utilsAlgorithmic.ts';



export default function layoutSpectral(graph: Graph): void {
  const components = connectedComponents(graph);
  let offsetX = 0;

  for (const comp of components) {
    const n = comp.length;
    if (n === 0) continue;

    // обработка n < 3 - простое размещение по кругу
    if (n < 3) {
      const sub = subgraph(graph, comp);
      circularLayout(sub);
      sub.forEachNode((node, attrs) => {
        graph.setNodeAttribute(node, 'x', attrs.x);
        graph.setNodeAttribute(node, 'y', attrs.y);
      })
      continue;
    }

    const idToIdx = new Map<string, number>();
    comp.forEach((id, i) => idToIdx.set(id, i));

    let xCoords: number[] = [];
    let yCoords: number[] = [];

    if (n <= alg.spectralDenseThreshold) {
      // маленькая компонента - плотный метод
      const result = denseSpectral(graph, comp, idToIdx, offsetX);
      xCoords = result.xCoords;
      yCoords = result.yCoords;
    } else {
      // итеративный метод для больших компонент
      // константный вектор (для λ=0)
      const ones = new Float64Array(n).fill(1.0 / Math.sqrt(n));
      // сдвиг - небольшое отрицательное число
      const sigma = -0.5;

      // находим второй собственный вектор (Фидлеров)
      const v2 = findEigenvector(
        graph, idToIdx, comp,
        sigma, [ones]
      );

      // третий вектор (для y) - ортогонален и к ones, и к v2
      const v3 = findEigenvector(
        graph, idToIdx, comp,
        sigma, [ones, v2]
      );

      // масштабирование координат
      const minX = Math.min(...v2), maxX = Math.max(...v2);
      const minY = Math.min(...v3), maxY = Math.max(...v3);
      const rangeX = maxX - minX || 1;
      const rangeY = maxY - minY || 1;

      xCoords = Array.from(v2, (val) => ((val - minX) / rangeX - 0.5) * alg.spectralSpacing + offsetX);
      yCoords = Array.from(v3, (val) => ((val - minY) / rangeY - 0.5) * alg.spectralSpacing);
    }

    // запись координат в граф
    for (let i = 0; i < n; i++) {
      const nodeId = comp[i];
      graph.setNodeAttribute(nodeId, 'x', xCoords[i]);
      graph.setNodeAttribute(nodeId, 'y', yCoords[i]);
    }

    offsetX += alg.spectralSpacing * 1.5; // сдвиг для следующей компоненты
  }
}
