export interface Node {
  id: string;
  group: number;
  label?: string;
}

export interface Link {
  source: string;
  target: string;
  value?: number;
}

export interface Data {
  nodes: Node[];
  links: Link[];
}
