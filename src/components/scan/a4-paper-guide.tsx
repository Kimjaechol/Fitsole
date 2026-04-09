'use client';

import { cn } from '@/lib/utils';

interface A4PaperGuideProps {
  detected: boolean;
}

/**
 * SVG rectangle overlay matching A4 proportions (297:210 = 1.414 aspect ratio).
 * Green border when A4 paper is detected, red border when not detected.
 */
export function A4PaperGuide({ detected }: A4PaperGuideProps) {
  // A4 aspect ratio: 297mm / 210mm = 1.414
  const width = 210;
  const height = 297;
  const viewBoxWidth = width + 20;
  const viewBoxHeight = height + 20;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg
        width="60%"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="max-h-[70vh]"
      >
        <rect
          x={10}
          y={10}
          width={width}
          height={height}
          rx={4}
          fill="none"
          stroke={detected ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)'}
          strokeWidth={3}
          strokeDasharray={detected ? 'none' : '12 6'}
          className={cn(
            'transition-colors duration-300',
          )}
        />

        {/* Corner markers for visual guidance */}
        {[
          { x1: 10, y1: 30, x2: 10, y2: 10, x3: 30, y3: 10 },
          { x1: width - 10, y1: 10, x2: width + 10, y2: 10, x3: width + 10, y3: 30 },
          { x1: 10, y1: height - 10, x2: 10, y2: height + 10, x3: 30, y3: height + 10 },
          { x1: width - 10, y1: height + 10, x2: width + 10, y2: height + 10, x3: width + 10, y3: height - 10 },
        ].map((corner, i) => (
          <polyline
            key={i}
            points={`${corner.x1},${corner.y1} ${corner.x2},${corner.y2} ${corner.x3},${corner.y3}`}
            fill="none"
            stroke={detected ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)'}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}
