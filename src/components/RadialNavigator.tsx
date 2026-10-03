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
  onClearSelection: () => void;
};

type RingId = 'single' | 'inner' | 'outer';

type PositionedTool = {
  tool: WorkspaceTool;
  x: number;
  y: number;
  ring: RingId;
};

type RingDefinition = {
  id: RingId;
  tools: WorkspaceTool[];
  radiusX: number;
  radiusY: number;
  offset: number;
};

const CENTER_X = 50;
const CENTER_Y = 50;

function distributeRing(definition: RingDefinition): PositionedTool[] {
  const { tools, radiusX, radiusY, offset, id } = definition;

  return tools.map((tool, index) => {
    const angle = offset + (Math.PI * 2 * index) / Math.max(tools.length, 1);

    return {
      tool,
      ring: id,
      x: CENTER_X + Math.cos(angle) * radiusX,
      y: CENTER_Y + Math.sin(angle) * radiusY,
    };
  });
}

function buildLayout(tools: readonly WorkspaceTool[]): PositionedTool[] {
  if (tools.length <= 12) {
    return distributeRing({
      id: 'single',
      tools: [...tools],
      radiusX: 39,
      radiusY: 37,
      offset: -Math.PI / 2,
    });
  }

  const ordered = [...tools];
  const outerCount = Math.ceil(ordered.length * 0.62);
  const outer = ordered.slice(0, outerCount);
  const inner = ordered.slice(outerCount);

  return [
    ...distributeRing({
      id: 'outer',
      tools: outer,
      radiusX: 42,
      radiusY: 40,
      offset: -Math.PI / 2,
    }),
    ...distributeRing({
      id: 'inner',
      tools: inner,
      radiusX: 27,
      radiusY: 25,
      offset: -Math.PI / 2 + Math.PI / Math.max(inner.length, 1),
    }),
  ];
}

function groupLabel(tool: WorkspaceTool) {
  if (tool.group === 'operations') return 'OPERATIONS';
  if (tool.group === 'communication') return 'COMMUNICATION';
  if (tool.group === 'portal') return 'PORTAL';
  if (tool.group === 'legacy') return 'LEGACY';
  return tool.group.toUpperCase();
}

export function RadialNavigator({
  selectedTool,
  onSelectTool,
  onClearSelection,
}: RadialNavigatorProps) {
  const positioned = useMemo(() => buildLayout(workspaceTools), []);

  const positions = useMemo(
    () => new Map(positioned.map((entry) => [entry.tool.id, entry])),
    [positioned],
  );

  const connectedIds = selectedTool
    ? getConnectedToolIds(selectedTool.id)
    : new Set<string>();

  const selectedPosition = selectedTool ? positions.get(selectedTool.id) : undefined;
  const hasTwoRings = positioned.some((entry) => entry.ring !== 'single');

  return (
    <section className="radial-stage" aria-label="DNS radial application navigator">
      <svg
        className="radial-map"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {hasTwoRings ? (
          <>
            <ellipse className="orbit-guide orbit-guide-outer" cx="50" cy="50" rx="42" ry="40" />
            <ellipse className="orbit-guide orbit-guide-inner" cx="50" cy="50" rx="27" ry="25" />
          </>
        ) : (
          <ellipse className="orbit-guide" cx="50" cy="50" rx="39" ry="37" />
        )}

        {selectedTool && selectedPosition ? (
          <>
            <line
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={selectedPosition.x}
              y2={selectedPosition.y}
              className="selected-core-line"
            />
            {[...connectedIds]
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
              ))}
          </>
        ) : null}
      </svg>

      <button
        type="button"
        className={['core-center', selectedTool ? 'has-selection' : ''].filter(Boolean).join(' ')}
        aria-label="DNS Core and Foundation"
        onClick={onClearSelection}
      >
        <span className="core-kicker">DNS PLATFORM</span>
        <strong>DNS CORE</strong>
        <span className="core-shared">SHARED DATA</span>
        <span className="core-version-row">
          <small>F {workspaceCanonical.foundation.version}</small>
          <small>DS {workspaceCanonical.designSystem.version}</small>
          <small>SD {workspaceCanonical.sharedData.version}</small>
        </span>
      </button>

      {positioned.map(({ tool, x, y, ring }) => {
        const selected = selectedTool?.id === tool.id;
        const connected = selectedTool ? connectedIds.has(tool.id) : false;
        const dimmed = Boolean(selectedTool) && !selected && !connected;

        const style = {
          left: `${x}%`,
          top: `${y}%`,
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
            <span className="radial-tool-status" aria-hidden="true" />
            <span className="radial-tool-copy">
              <span className="radial-tool-name">{tool.shortLabel}</span>
              <span className="radial-tool-meta">{groupLabel(tool)}</span>
            </span>
          </button>
        );
      })}
    </section>
  );
}
