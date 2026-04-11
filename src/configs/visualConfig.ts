// TODO: Сделать, чтобы nodeSizeHover и nodeSizeSelected
// умножали оригинальные значения, а не заменяли их

export const nodeMinSize = 6;   // При минимальной степени
export const nodeMaxSize = 20;  // При максимальной степени
export const nodeSizeDefault = 13;
export const nodeSizeHover = 25;
export const nodeSizeSelected = 30;
export const nodeHiddenAlpha = 0.05;
export const nodeDefaultAlpha = 1.0;

export const edgeMinSize = 2;  // При минимальном весе ребра
export const edgeMaxSize = 6;  // При максимальном весе ребра
export const edgeDefaultSize = 3;
export const edgeMinTurboT = 0.025; // Минимальный параметр для interpolateTurbo
// Темно-фиолетовый цвет в начале палитры выглядит уродливо, поэтому так ^
export const edgeHiddenAlpha = 0.10;
export const edgeDefaultAlpha = 1.0;
export const edgeHoverColor = '#ffffff';

// export const edgeMinHue = 30;   // При максимальном весе ребра
// export const edgeMaxHue = 300; // При минимальном весе ребра
// export const edgeDefaultHue = 240;
// export const edgeChroma = 0.2;
// export const edgeLightness = 0.5;

export const borderColor = '#ffffff';
export const borderSizeDefault = 0.125; // Дробь от размера всего узла, [0, 1]
export const borderSizeNeighbor = 0.35; // [0, 1]
export const borderSizeHover = 0.2;     // [0, 1]
export const borderSizeSelect = 0.15;

export const labelColor = '#000000';
export const labelSize = 20;

export const cameraFitPadding = 50; // в пикселях