## 技术栈

React/NextJS + PixiJS

渲染：

- PixiJS：2D 渲染引擎（Pixi 依赖 window，画布页必须在客户端渲染）
    - https://pixijs.com/showcase
- @pixi/react v8：以 React 声明式方式编写 Pixi 场景
- pixi-viewport：视野/相机（拖拽、滚轮缩放、双指缩放、跟随目标、边界约束等）
- pathfinding.js：2D 网格寻路库
    - https://qiao.github.io/PathFinding.js/visual/

状态与流程：

- Zustand：轻量全局状态（GameState / UIState），Hooks API 配合选择器避免重渲染

## 要点

- 主界面全在 PixiJS canvas 里
