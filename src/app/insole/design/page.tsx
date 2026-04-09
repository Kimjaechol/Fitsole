import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { footScans, footMeasurements } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { VARIOSHORE_ZONES } from '@/lib/insole/types';
import type { DesignParams, HardnessZone, VarioshoreTpuZone } from '@/lib/insole/types';
import type { Metadata } from 'next';
import { InsoleDesignClient } from './client';

export const metadata: Metadata = {
  title: '인솔 디자인 | FitSole',
  description: '발 측정 데이터를 기반으로 맞춤 설계된 인솔을 3D로 확인하세요.',
};

/**
 * Build default hardness map from VARIOSHORE_ZONES constant.
 * Each zone gets default flowPct of 100%.
 */
function buildDefaultHardnessMap(): Record<HardnessZone, VarioshoreTpuZone> {
  const map = {} as Record<HardnessZone, VarioshoreTpuZone>;
  for (const [key, zone] of Object.entries(VARIOSHORE_ZONES)) {
    map[key as HardnessZone] = {
      tempC: zone.tempC,
      shoreA: zone.shoreA,
      flowPct: 100,
      color: zone.color,
    };
  }
  return map;
}

/**
 * Build design params from scan measurements.
 * Uses rule-based defaults where measurements are unavailable.
 */
function buildDesignParams(measurements: {
  footLength: number | null;
  ballWidth: number | null;
  archHeight: number | null;
  heelWidth: number | null;
}): DesignParams {
  const footLength = Number(measurements.footLength) || 260;
  const footWidth = Number(measurements.ballWidth) || 98;
  const archHeight = Number(measurements.archHeight) || 35;
  const heelWidth = Number(measurements.heelWidth) || 65;

  return {
    archHeight,
    heelCupDepth: Math.round(archHeight * 0.6),
    evaCushionThickness: 3,
    footLength,
    footWidth,
    heelWidth,
    forefootFlex: 0.5,
    medialPostH: 4,
    lateralPostH: 2,
  };
}

export default async function InsoleDesignPage() {
  // T-03-15: Require auth for design page
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/login?callbackUrl=/insole/design');
  }

  // Fetch latest scan data
  let scanData: {
    footLength: number | null;
    ballWidth: number | null;
    archHeight: number | null;
    heelWidth: number | null;
  } | null = null;

  try {
    const scans = await db
      .select()
      .from(footScans)
      .where(eq(footScans.userId, session.user.id))
      .orderBy(desc(footScans.createdAt))
      .limit(1);

    if (scans.length === 0) {
      redirect('/scan?message=발 측정을 먼저 진행해주세요');
    }

    const measurements = await db
      .select()
      .from(footMeasurements)
      .where(eq(footMeasurements.scanId, scans[0].id))
      .limit(1);

    if (measurements.length > 0) {
      scanData = {
        footLength: measurements[0].footLength ? Number(measurements[0].footLength) : null,
        ballWidth: measurements[0].ballWidth ? Number(measurements[0].ballWidth) : null,
        archHeight: measurements[0].archHeight ? Number(measurements[0].archHeight) : null,
        heelWidth: measurements[0].heelWidth ? Number(measurements[0].heelWidth) : null,
      };
    }
  } catch {
    // DB unavailable — use defaults
  }

  if (!scanData) {
    redirect('/scan?message=발 측정을 먼저 진행해주세요');
  }

  const designParams = buildDesignParams(scanData);
  const hardnessMap = buildDefaultHardnessMap();

  return (
    <InsoleDesignClient
      designParams={designParams}
      hardnessMap={hardnessMap}
      lineType="general"
    />
  );
}
