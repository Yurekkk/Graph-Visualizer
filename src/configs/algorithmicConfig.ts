// ### Metrics ###
// Importance calculations
export const degreeWeight = 0.1;
export const kCoreWeight = 0.1;
export const eigenvectorCentralityWeight = 0.8;

// higher values (>1) produce more, smaller clusters, 
// while lower values (<1) produce fewer, larger clusters
export const louvainResolution = 1.0;

export const eigCentralityMaxIterations = 100;
export const eigCentralityTolerance = 1e-6;



// ### Layouts Settings ###
export const circularSpacing = 2.0;
export const radialRingSpacing = 100;
export const hierarchicalSpacing = 0.2;
export const radialSortByDegreeOnRing = false;
export const forceAtlasIterations = 50;

export const metaLayoutResolutionDecreaseStep = 0.1;
// На каждом шаге рекурсии разрешение Louvain уменьшается (начиная с louvainResolution), 
// чтобы алгоритм не зацикливался на слишком маленьких сообществах

export const spectralSpacing = 1000.0;
export const spectralMaxIterations = 20;    // макс. итераций степенного метода
export const spectralCgMaxIterations = 50;  // макс. итераций CG на одном шаге
export const spectralDenseThreshold = 200;  // размер компоненты, до которого используем плотный метод
export const spectralCgTolerance = 1e-6;



// ### Layout Engine Decision Tree ###
export const metaLayoutRecursionLevelCap = 5; 

export const metaLayoutMinNodes = 50;   // &&
export const metaLayoutMinModularity = 0.1;

export const circularMinDensity = 0.75;   // &&
export const circularMaxNumNodes = 500;

export const radialMinDegreeGini = 0.75;   // ||
export const radialMinHubDominance = 0.75;

export const samplingMinNumNodes = 200;



// ### Node Focus ###
export const edgesHoverHighlightLimit = 50000;
export const maxHighlightedNeighborsNum = 20;
export const maxAccumulatedCost = 5;
export const importanceInfluence = 3;



// ### Misc ###
export const logAlgorithmChoices = false;
export const seed = '42';
export const timestamp_threshold = 500_000_000;
// Если все значения ребер больше этого порога, 
// то, скорее всего, это не веса, а временные метки