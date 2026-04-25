"use client";

import { getBezierPath, EdgeProps } from "reactflow";

interface FunnelEdgeData {
  dashed?: boolean;
  label?: string;
}

export function FunnelEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<FunnelEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const isDashed = data?.dashed ?? false;
  const label    = data?.label ?? "";

  return (
    <>
      {/* Wider invisible hit area */}
      <path
        id={`${id}-hit`}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />
      {/* Visible path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="#9CA3AF"
        strokeWidth={1.5}
        strokeDasharray={isDashed ? "5 4" : undefined}
        markerEnd={markerEnd}
        className="react-flow__edge-path"
      />
      {/* Pill label (e.g. "si") */}
      {label && (
        <foreignObject
          x={labelX - 14}
          y={labelY - 10}
          width={28}
          height={20}
          style={{ overflow: "visible" }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#D1FAE5",
              color: "#065F46",
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 7px",
              borderRadius: 999,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-sans)",
            }}
          >
            {label}
          </span>
        </foreignObject>
      )}
    </>
  );
}
