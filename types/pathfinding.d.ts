declare module 'pathfinding' {
  export interface Grid {
    clone(): Grid;
  }

  export class Grid {
    constructor(width: number, height: number, matrix?: number[][]);
    setWalkableAt(x: number, y: number, walkable: boolean): void;
    isWalkableAt(x: number, y: number): boolean;
  }

  export enum DiagonalMovement {
    Never = 1,
    OnlyWhenNoObstacles = 2,
    IfAtMostOneObstacle = 3,
    Always = 4
  }

  export interface Finder {
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }

  export class AStarFinder implements Finder {
    constructor(options?: { diagonalMovement?: DiagonalMovement });
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): number[][];
  }
}
