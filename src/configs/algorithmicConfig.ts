// ### Metrics ###
// Importance calculations
export const degreeWeight = 0.5;
export const kCoreWeight = 0.5;

// higher values (>1) produce more, smaller clusters, 
// while lower values (<1) produce fewer, larger clusters
export const louvainResolution = 1.0;



// ### Layouts Settings ###
export const circularSpacing = 2.0;
export const radialRingSpacing = 100;
export const radialSortByDegreeOnRing = false;
export const forceAtlasIterations = 50;



// ### Layout Engine Decision Tree ###
export const metaLayoutRecursionLevelCap = 5; 
export const metaLayoutResolutionDecreaseStep = 0.2;
// На каждом шаге рекурсии разрешение Louvain уменьшается (начиная с louvainResolution), 
// чтобы алгоритм не зацикливался на слишком маленьких сообществах

export const metaLayoutMinNodes = 1000; 
// export const metaLayoutMinEdges = 1000;
// export const metaLayoutMinModularity = 0.75;

export const circularMinDensity = 0.25;   // &&
export const circularMaxNumNodes = 50;

export const radialMinDegreeGini = 0.5;   // ||
export const radialMinHubDominance = 0.5;

export const samplingMinNumNodes = 200;



// ### Node Focus ###
export const maxHighlightedNeighborsNum = 20;
export const maxAccumulatedCost = 4;
export const minWeightCost = 3;   // Стоимость прохода по ребру с минимальным весом, > 0
export const maxWeightCost = 0.1; // Стоимость прохода по ребру с максимальным весом, > 0
// В случае, если maxWeight = minWeight, цена за вес ребра всегда = minWeightCost / 3
export const nodeImportanceInfluence = 0.5; // Влияние важности степени на функцию цены
// Больше значение => поиск больше тяготеет к хабам и подобному



// ### Misc ###
export const logAlgorithmChoices = true;
export const seed = '42';
export const timestamp_threshold = 500_000_000;
// Если все значения ребер больше этого порога, 
// то, скорее всего, это не веса, а временные метки