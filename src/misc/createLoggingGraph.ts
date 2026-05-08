import Graph from "graphology";

export default function createLoggingGraph(graph: Graph) {
  const callLog: string[] = [];

  const proxy = new Proxy(graph, {
    get(target, propKey, receiver) {
      const origMethod = (target as any)[propKey];

      // Перехватываем только функции
      if (typeof origMethod === "function") {
        return function (...args: any[]) {
          callLog.push(propKey as string);
          return origMethod.apply(target, args);
        };
      }

      // Свойства (например, order, size) возвращаем как есть
      return Reflect.get(target, propKey, receiver);
    },
  });

  return {
    proxy,
    getCallLog: () => [...callLog],               // копия лога
    getUniqueCalls: () => [...new Set(callLog)],   // уникальные методы
    clearLog: () => { callLog.length = 0; },       // очистка
  };
}
