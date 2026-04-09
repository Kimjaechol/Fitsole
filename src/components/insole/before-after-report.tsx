'use client';

import type { VerificationReport } from '@/lib/salted/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/** Korean zone name mapping */
const ZONE_NAMES: Record<string, string> = {
  forefoot: '전족부',
  midfoot: '중족부',
  hindfoot: '후족부',
  medial: '내측',
  lateral: '외측',
};

interface BeforeAfterReportProps {
  report: VerificationReport;
}

export function BeforeAfterReport({ report }: BeforeAfterReportProps) {
  const reductionMet = report.peakPressureReduction >= 30;
  const areaMet = report.contactAreaIncrease >= 40;
  const allTargetsMet = reductionMet && areaMet;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">맞춤 인솔 효과 분석 보고서</h2>
        {allTargetsMet ? (
          <Badge className="bg-green-600 text-white">목표 달성</Badge>
        ) : (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            추가 개선 필요
          </Badge>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Peak pressure reduction */}
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">최대 압력 감소</p>
            <p
              className={`text-3xl font-bold tabular-nums ${
                reductionMet ? 'text-green-600' : 'text-amber-600'
              }`}
            >
              {report.peakPressureReduction.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              목표: &ge;30%
            </p>
          </CardContent>
        </Card>

        {/* Contact area increase */}
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">접촉 면적 증가</p>
            <p
              className={`text-3xl font-bold tabular-nums ${
                areaMet ? 'text-green-600' : 'text-amber-600'
              }`}
            >
              {report.contactAreaIncrease.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              목표: &ge;40%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Zone comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">영역별 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">영역</th>
                  <th className="text-right py-2 font-medium">착용 전</th>
                  <th className="text-right py-2 font-medium">착용 후</th>
                  <th className="text-right py-2 font-medium">개선율</th>
                </tr>
              </thead>
              <tbody>
                {report.zoneComparisons.map((zc) => (
                  <tr key={zc.zone} className="border-b last:border-b-0">
                    <td className="py-2">{ZONE_NAMES[zc.zone] ?? zc.zone}</td>
                    <td className="text-right tabular-nums py-2">
                      {zc.before.toFixed(1)}
                    </td>
                    <td className="text-right tabular-nums py-2">
                      {zc.after.toFixed(1)}
                    </td>
                    <td
                      className={`text-right tabular-nums py-2 font-medium ${
                        zc.improvement > 0 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {zc.improvement > 0 ? '+' : ''}
                      {zc.improvement.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pressure heatmap comparison placeholder */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm font-medium mb-2">착용 전 압력 분포</p>
            <div className="h-40 bg-gradient-to-b from-red-200 via-yellow-100 to-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Initial Session</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm font-medium mb-2">착용 후 압력 분포</p>
            <div className="h-40 bg-gradient-to-b from-green-100 via-emerald-50 to-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Verification Session</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
