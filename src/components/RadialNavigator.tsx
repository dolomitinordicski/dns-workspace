import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  getConnectedToolIds,
  workspaceCanonical,
  workspaceTools,
  type WorkspaceTool,
} from '../workspace/registry';

type RadialNavigatorProps = {
  selectedTool: WorkspaceTool | null;
  onSelectTool: (tool: WorkspaceTool) => void;
};

type PositionedTool = {
  tool: WorkspaceTool;
  x: number;
  y: number;
  ring: 'inner' | 'outer';
};

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 700;
const CENTER_X = VIEWBOX_WIDTH / 2;
const CENTER_Y = VIEWBOX_HEIGHT / 2;

function distribute(
  tools: readonly WorkspaceTool[],
  radiusX: number,
  radiusY: number,
  offset: number,
  ring: PositionedTool['ring'],
): PositionedTool[] {
  return tools.map((tool, index) => {
    const angle = offset + (Math.PI * 2 * index) / Math.max(tools.length, 1);
    return {
      tool,
      ring,
      x: CENTER_X + Math.cos(angle) * radiusX,
      y: CENTER_Y + Math.sin(angle) * radiusY,
    };
  });
}

export function RadialNavigator({
  selectedTool,
  onSelectTool,
}: RadialNavigatorProps) {
  const positioned = useMemo(() => {
    const inner = workspaceTools.filter((tool) => tool.group === 'operations');
    const outer = workspaceTools.filter((tool) => tool.group !== 'operations');

    return [
      ...distribute(inner, 255, 185, -Math.PI / 2, 'inner'),
      ...distribute(outer, 425, 285, -Math.PI / 2 + 0.24, 'outer'),
    ];
  }, []);

  const positions = useMemo(
    () => new Map(positioned.map((entry) => [entry.tool.id, entry])),
    [positioned],
  );

  const connectedIds = selectedTool
    ? getConnectedToolIds(selectedTool.id)
    : new Set<string>();

  const selectedPosition = selectedTool ? positions.get(selectedTool.id) : undefined;

  return (
    <section className="radial-stage" aria-label="DNS radial application navigator">
      <svg
        className="radial-lines"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {positioned.map(({ tool, x, y }) => (
          <line
            key={`spoke-${tool.id}`}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={x}
            y2={y}
            className={
              selectedTool && connectedIds.has(tool.id)
                ? 'radial-spoke is-related'
                : 'radial-spoke'
            }
          />
        ))}

        {selectedTool && selectedPosition
          ? [...connectedIds]
              .filter((id) => id !== selectedTool.id)
              .map((id) => positions.get(id))
              .filter((entry): entry is PositionedTool => Boolean(entry))
              .map((entry) => (
                <line
                  key={`relation-${entry.tool.id}`}
                  x1={selectedPosition.x}
                  y1={selectedPosition.y}
                  x2={entry.x}
                  y2={entry.y}
                  className="tool-relation-line"
                />
              ))
          : null}
      </svg>

      <div className="core-center" aria-label="DNS Core and Foundation">
        <div className="foundation-ring">
          <span>FOUNDATION</span>
          <small>
            F {workspaceCanonical.foundation.version} · DS {workspaceCanonical.designSystem.version}
          </small>
        </div>
        <div className="core-disc">
          <strong>DNS CORE</strong>
          <span>SHARED DATA</span>
          <small>SD {workspaceCanonical.sharedData.version}</small>
        </div>
      </div>

      {positioned.map(({ tool, x, y, ring }) => {
        const selected = selectedTool?.id === tool.id;
        const connected = selectedTool ? connectedIds.has(tool.id) : false;
        const dimmed = Boolean(selectedTool) && !selected && !connected;

        const style = {
          left: `${(x / VIEWBOX_WIDTH) * 100}%`,
          top: `${(y / VIEWBOX_HEIGHT) * 100}%`,
        } satisfies CSSProperties;

        return (
          <button
            key={tool.id}
            type="button"
            className={[
              'radial-tool',
              `ring-${ring}`,
              selected ? 'is-selected' : '',
              connected && !selected ? 'is-connected' : '',
              dimmed ? 'is-dimmed' : '',
              tool.lifecycle === 'development' ? 'is-development' : '',
              tool.lifecycle === 'legacy' || tool.lifecycle === 'maintenance'
                ? 'is-maintenance'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={style}
            onClick={() => onSelectTool(tool)}
            onDoubleClick={() => {
              if (tool.url) window.open(tool.url, '_blank', 'noopener,noreferrer');
            }}
            title={`${tool.label} · ${tool.lifecycle}`}
          >
            <span className="radial-tool-name">{tool.shortLabel}</span>
            <span className="radial-tool-meta">{tool.lifecycle}</span>
            <span className="radial-tool-status" aria-hidden="true" />
          </button>
        );
      })}
    </section>
  );
}
