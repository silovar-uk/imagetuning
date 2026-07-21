import type { ToolId } from '../document/types';

type StatusBarProps = {
  tool: ToolId;
  zoom: number;
  imageCount: number;
  commentCount: number;
  canvasSize: { width: number; height: number };
};

export function StatusBar(props: StatusBarProps) {
  return (
    <footer className="statusbar">
      <span>ツール：{props.tool === 'select' ? '選択' : '移動'}</span>
      <span>ズーム：{Math.round(props.zoom * 100)}%</span>
      <span>画像：{props.imageCount}</span>
      <span>コメント：{props.commentCount}</span>
      <span className="statusbar-spacer" />
      <span>{props.canvasSize.width} × {props.canvasSize.height}px</span>
    </footer>
  );
}
