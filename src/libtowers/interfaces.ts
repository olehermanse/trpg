export interface XY {
  x: number;
  y: number;
}

export interface XYR extends XY {
  r: number;
}

export interface XYWH extends XY {
  w: number;
  h: number;
}

export interface CR {
  c: number;
  r: number;
}

export interface FillStroke {
  fill: string;
  stroke: string;
}

export type Callback = () => void;

export type ClickCallback = (any) => void;
