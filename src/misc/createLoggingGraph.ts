import Graph from "graphology";

export default function createLoggingGraph(graph: Graph) {
  const callLog: string[] = [];

  const handler: ProxyHandler<Graph> = {
    get(target, propKey, receiver) {
      const origValue = Reflect.get(target, propKey, receiver);

      // Логируем доступ к свойству (кроме Symbol-ключей)
      if (typeof propKey !== "symbol") {
        callLog.push(`get ${String(propKey)}`);
      }

      // Если это метод — оборачиваем, чтобы логировать вызов
      if (typeof origValue === "function") {
        return new Proxy(origValue, {
          apply(fnTarget, thisArg, args) {
            // Логируем только имя метода, без аргументов
            callLog.push(`call ${String(propKey)}`);
            return Reflect.apply(fnTarget, thisArg, args);
          },
        });
      }

      return origValue;
    },

    set(target, propKey, value, receiver) {
      if (typeof propKey !== "symbol") {
        callLog.push(`set ${String(propKey)} = ${JSON.stringify(value)}`);
      }
      return Reflect.set(target, propKey, value, receiver);
    },
  };

  const proxy = new Proxy(graph, handler);

  return {
    proxy,
    getCallLog: () => [...callLog],
    getUniqueCalls: () => [...new Set(callLog)],
    clearLog: () => {
      callLog.length = 0;
    },
  };
}
