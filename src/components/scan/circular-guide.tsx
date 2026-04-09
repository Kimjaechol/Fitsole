'use client';

interface CircularGuideProps {
  progress: number; // 0-100
}

export function CircularGuide({ progress }: CircularGuideProps) {
  const size = 280;
  const center = size / 2;
  const radius = size / 2 - 8; // 8px padding for stroke
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progress / 100) * circumference;

  // Animated dot position along the circle
  const angle = (progress / 100) * 2 * Math.PI - Math.PI / 2;
  const dotX = center + radius * Math.cos(angle);
  const dotY = center + radius * Math.sin(angle);

  // Opacity transitions from 30% to 100% as progress increases
  const arcOpacity = 0.3 + (progress / 100) * 0.7;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-lg"
      >
        {/* Background dashed circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgb(37, 99, 235)"
          strokeOpacity={0.3}
          strokeWidth={3}
          strokeDasharray="8 6"
        />

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgb(37, 99, 235)"
          strokeOpacity={arcOpacity}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-all duration-300 ease-out"
        />

        {/* Animated dot showing camera trajectory */}
        {progress > 0 && (
          <circle
            cx={dotX}
            cy={dotY}
            r={6}
            fill="rgb(37, 99, 235)"
            className="transition-all duration-300 ease-out"
          >
            <animate
              attributeName="r"
              values="5;7;5"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
        )}
      </svg>
    </div>
  );
}
