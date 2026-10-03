import { useMemo, useState } from 'react';
import {
  getConnectedToolIds,
  workspaceCanonical,
  workspaceTools,
  type WorkspaceTool,
} from '../workspace/registry';

type SystemMapNavigatorProps = {
  selectedTool: WorkspaceTool | null;
  onSelectTool: (tool: WorkspaceTool) => void;
  onClearSelection: () => void;
};

type ToolSector = {
  tool: WorkspaceTool;
  group: WorkspaceTool['group'];
  startAngle: number;
  endAngle: number;
  midAngle: number;
  weight: number;
};

type FamilySector = {
  group: WorkspaceTool['group'];
  label: string;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  tools: ToolSector[];
};

const SIZE = 800;
const CENTER = SIZE / 2;
const CORE_RADIUS = 104;
const FAMILY_INNER = 122;
const FAMILY_OUTER = 192;
const TOOL_INNER = 210;
const TOOL_OUTER = 326;

const FAMILY_ORDER: WorkspaceTool['group'][] = [
  'operations',
  'communication',
  'portal',
  'legacy',
];

const FAMILY_LABELS: Partial<Record<WorkspaceTool['group'], string>> = {
  operations: 'OPERATIONS',
  communication: 'COMMUNICATION',
  portal: 'PORTAL',
  legacy: 'LEGACY',
};

/**
 * Visual hierarchy only. These values are not percentages, scores or KPIs.
 * They control how much angular space each tool receives in the System Map.
 */
const VISUAL_WEIGHT: Record<string, number> = {
  'data-entry': 5,
  analytics: 5,
  fair: 4,
  faktura: 4.5,
  polls: 2.5,
  'flyer-studio': 3,
  strategy: 2,
  qr: 1.5,
  ar360: 1.5,
  'portal-v2': 2.5,
  smartslopes: 1,
  partnerportal: 1.5,
};

function weightFor(tool: WorkspaceTool) {
  return VISUAL_WEIGHT[tool.id] ?? 2;
}

function polar(radius: number, angle: number) {
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function donutPath(
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const outerStart = polar(outerRadius, startAngle);
  const outerEnd = polar(outerRadius, endAngle);
  const innerEnd = polar(innerRadius, endAngle);
  const innerStart = polar(innerRadius, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function buildFamilies(): FamilySector[] {
  const visible = workspaceTools.filter((tool) =>
    FAMILY_ORDER.includes(tool.group),
  );

  const grouped = FAMILY_ORDER.map((group) => ({
    group,
    label: FAMILY_LABELS[group] ?? group.toUpperCase(),
    tools: visible.filter((tool) => tool.group === group),
  })).filter((family) => family.tools.length > 0);

  const totalWeight = grouped.reduce(
    (total, family) =>
      total + family.tools.reduce((sum, tool) => sum + weightFor(tool), 0),
    0,
  );

  const familyGap = 0.028;
  const toolGap = 0.012;
  const available = Math.PI * 2 - familyGap * grouped.length;
  let cursor = -Math.PI / 2;

  return grouped.map((family) => {
    const familyWeight = family.tools.reduce(
      (sum, tool) => sum + weightFor(tool),
      0,
    );
    const familySpan = available * (familyWeight / totalWeight);
    const startAngle = cursor;
    const endAngle = cursor + familySpan;
    const toolWeightTotal = familyWeight;
    const usableToolSpan = familySpan - toolGap * Math.max(family.tools.length - 1, 0);

    let toolCursor = startAngle;
    const tools = family.tools.map((tool) => {
      const weight = weightFor(tool);
      const span = usableToolSpan * (weight / toolWeightTotal);
      const sector: ToolSector = {
        tool,
        group: family.group,
        startAngle: toolCursor,
        endAngle: toolCursor + span,
        midAngle: toolCursor + span / 2,
        weight,
      };
      toolCursor += span + toolGap;
      return sector;
    });

    cursor = endAngle + familyGap;

    return {
      group: family.group,
      label: family.label,
      startAngle,
      endAngle,
      midAngle: startAngle + familySpan / 2,
      tools,
    };
  });
}

function labelTransform(angle: number, radius: number) {
  const point = polar(radius, angle);
  let rotation = (angle * 180) / Math.PI + 90;
  if (rotation > 90 && rotation < 270) rotation += 180;
  return `translate(${point.x} ${point.y}) rotate(${rotation})`;
}

function chordPath(fromAngle: number, toAngle: number) {
  const from = polar(TOOL_INNER + 14, fromAngle);
  const to = polar(TOOL_INNER + 14, toAngle);
  return `M ${from.x} ${from.y} Q ${CENTER} ${CENTER} ${to.x} ${to.y}`;
}

export function SystemMapNavigator({
  selectedTool,
  onSelectTool,
  onClearSelection,
}: SystemMapNavigatorProps) {
  const [hoveredToolId, setHoveredToolId] = useState<string | null>(null);
  const families = useMemo(() => buildFamilies(), []);
  const sectors = useMemo(
    () => families.flatMap((family) => family.tools),
    [families],
  );
  const sectorById = useMemo(
    () => new Map(sectors.map((sector) => [sector.tool.id, sector])),
    [sectors],
  );

  const connectedIds = selectedTool
    ? getConnectedToolIds(selectedTool.id)
    : new Set<string>();

  const selectedSector = selectedTool
    ? sectorById.get(selectedTool.id)
    : undefined;

  return (
    <section className="system-map-stage" aria-label="DNS hierarchical system map">
      <svg
        className="system-map-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="DNS Core, tool families and applications"
      >
        <g className="system-map-connections" aria-hidden="true">
          {selectedSector
            ? [...connectedIds]
                .filter((id) => id !== selectedTool?.id)
                .map((id) => sectorById.get(id))
                .filter((sector): sector is ToolSector => Boolean(sector))
                .map((sector) => (
                  <path
                    key={`link-${sector.tool.id}`}
                    d={chordPath(selectedSector.midAngle, sector.midAngle)}
                    className="system-map-chord"
                  />
                ))
            : null}
        </g>

        <g className="system-map-family-ring">
          {families.map((family) => {
            const familyActive =
              !selectedTool ||
              family.tools.some((sector) => connectedIds.has(sector.tool.id));

            return (
              <g
                key={family.group}
                className={[
                  'system-map-family',
                  `family-${family.group}`,
                  familyActive ? 'is-family-active' : 'is-family-dimmed',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <path
                  d={donutPath(
                    FAMILY_INNER,
                    FAMILY_OUTER,
                    family.startAngle,
                    family.endAngle,
                  )}
                />
                <text
                  transform={labelTransform(
                    family.midAngle,
                    (FAMILY_INNER + FAMILY_OUTER) / 2,
                  )}
                  className="system-map-family-label"
                  textAnchor="middle"
                >
                  {family.label}
                </text>
              </g>
            );
          })}
        </g>

        <g className="system-map-tool-ring">
          {sectors.map((sector) => {
            const selected = selectedTool?.id === sector.tool.id;
            const hovered = hoveredToolId === sector.tool.id;
            const connected = Boolean(selectedTool) && connectedIds.has(sector.tool.id);
            const dimmed = Boolean(selectedTool) && !selected && !connected;
            const extension = selected ? 58 : hovered ? 42 : 0;
            const outerRadius = TOOL_OUTER + extension;
            const labelRadius = (TOOL_INNER + outerRadius) / 2 + (extension ? 5 : 0);
            const labelPoint = polar(labelRadius, sector.midAngle);
            const dotPoint = polar(TOOL_INNER + 18, sector.midAngle);

            return (
              <g
                key={sector.tool.id}
                className={[
                  'system-map-tool',
                  `tool-group-${sector.group}`,
                  selected ? 'is-selected' : '',
                  hovered ? 'is-hovered' : '',
                  connected && !selected ? 'is-connected' : '',
                  dimmed ? 'is-dimmed' : '',
                  sector.tool.lifecycle === 'development' ? 'is-development' : '',
                  sector.tool.lifecycle === 'legacy' ||
                  sector.tool.lifecycle === 'maintenance'
                    ? 'is-maintenance'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setHoveredToolId(sector.tool.id)}
                onMouseLeave={() => setHoveredToolId(null)}
                onClick={() => onSelectTool(sector.tool)}
                onDoubleClick={() => {
                  if (sector.tool.url) {
                    window.open(sector.tool.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={sector.tool.label}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectTool(sector.tool);
                  }
                }}
              >
                <path
                  className="system-map-tool-sector"
                  d={donutPath(
                    TOOL_INNER,
                    outerRadius,
                    sector.startAngle,
                    sector.endAngle,
                  )}
                />

                <circle
                  className="system-map-status-dot"
                  cx={dotPoint.x}
                  cy={dotPoint.y}
                  r="4.5"
                />

                <text
                  x={labelPoint.x}
                  y={labelPoint.y - 3}
                  className="system-map-tool-label"
                  textAnchor="middle"
                >
                  {sector.tool.shortLabel}
                </text>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 12}
                  className="system-map-tool-meta"
                  textAnchor="middle"
                >
                  {sector.tool.lifecycle.toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>

        <g
          className="system-map-core"
          role="button"
          tabIndex={0}
          onClick={onClearSelection}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onClearSelection();
            }
          }}
          aria-label="DNS Core and Foundation"
        >
          <circle cx={CENTER} cy={CENTER} r={CORE_RADIUS + 12} className="system-map-core-halo" />
          <circle cx={CENTER} cy={CENTER} r={CORE_RADIUS} className="system-map-core-disc" />
          <text x={CENTER} y={CENTER - 34} className="system-map-core-kicker" textAnchor="middle">
            DNS PLATFORM
          </text>
          <text x={CENTER} y={CENTER - 7} className="system-map-core-title" textAnchor="middle">
            DNS CORE
          </text>
          <text x={CENTER} y={CENTER + 14} className="system-map-core-shared" textAnchor="middle">
            SHARED DATA · FOUNDATION
          </text>
          <text x={CENTER} y={CENTER + 42} className="system-map-core-meta" textAnchor="middle">
            F {workspaceCanonical.foundation.version} · DS {workspaceCanonical.designSystem.version} · SD {workspaceCanonical.sharedData.version}
          </text>
        </g>
      </svg>

      <div className="system-map-legend" aria-hidden="true">
        <span><i className="legend-dot is-production" /> Production</span>
        <span><i className="legend-dot is-development" /> Development</span>
        <span><i className="legend-dot is-maintenance" /> Legacy / Maintenance</span>
      </div>
    </section>
  );
}
