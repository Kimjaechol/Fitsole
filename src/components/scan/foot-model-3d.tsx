'use client';

import { Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import { Skeleton } from '@/components/ui/skeleton';

interface FootModel3DProps {
  modelUrl: string;
  showHeatmap?: boolean;
  heatmapData?: number[][];
  children?: ReactNode;
}

function FootMesh({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl);
  return <primitive object={scene} />;
}

function SceneContent({
  modelUrl,
  children,
}: {
  modelUrl: string;
  children?: ReactNode;
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <Environment preset="studio" />
      <FootMesh modelUrl={modelUrl} />
      <OrbitControls
        enablePan={false}
        minDistance={0.2}
        maxDistance={1.0}
        target={[0, 0, 0]}
      />
      {children}
    </>
  );
}

export function FootModel3D({
  modelUrl,
  children,
}: FootModel3DProps) {
  return (
    <div
      className="h-[360px] w-full rounded-lg bg-slate-50 md:h-[480px]"
      aria-label="3D 발 모델 - 드래그하여 회전, 핀치하여 확대"
    >
      <Suspense
        fallback={
          <Skeleton className="h-[360px] w-full rounded-lg md:h-[480px]" />
        }
      >
        <Canvas
          camera={{ position: [0, 0.3, 0.4], fov: 45 }}
          style={{ width: '100%', height: '100%' }}
        >
          <SceneContent modelUrl={modelUrl}>
            {children}
          </SceneContent>
        </Canvas>
      </Suspense>
    </div>
  );
}
