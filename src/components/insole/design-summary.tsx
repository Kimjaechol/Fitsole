import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DesignParams } from '@/lib/insole/types';

interface DesignSummaryProps {
  designParams: DesignParams;
  lineType: 'general' | 'professional';
  stlUrl?: string | null;
  slicerProfileUrl?: string | null;
}

const LINE_TYPE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' }> = {
  general: { label: '카메라 측정', variant: 'secondary' },
  professional: { label: 'SALTED 정밀 측정', variant: 'default' },
};

export function DesignSummary({
  designParams,
  lineType,
  stlUrl,
  slicerProfileUrl,
}: DesignSummaryProps) {
  const lineInfo = LINE_TYPE_LABELS[lineType] ?? LINE_TYPE_LABELS.general;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">설계 파라미터</CardTitle>
          <Badge variant={lineInfo.variant}>{lineInfo.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">아치 높이</dt>
            <dd className="font-medium">{designParams.archHeight}mm</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">힐컵 깊이</dt>
            <dd className="font-medium">{designParams.heelCupDepth}mm</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">EVA 쿠션</dt>
            <dd className="font-medium">{designParams.evaCushionThickness}mm</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">발 길이</dt>
            <dd className="font-medium">{designParams.footLength}mm</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">발 너비</dt>
            <dd className="font-medium">{designParams.footWidth}mm</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">뒤꿈치 너비</dt>
            <dd className="font-medium">{designParams.heelWidth}mm</dd>
          </div>
        </dl>

        {/* Download links */}
        {(stlUrl || slicerProfileUrl) && (
          <div className="mt-4 space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">다운로드</p>
            <div className="flex gap-2">
              {stlUrl && (
                <a
                  href={stlUrl}
                  download
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  STL 파일
                </a>
              )}
              {slicerProfileUrl && (
                <a
                  href={slicerProfileUrl}
                  download
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  슬라이서 프로파일
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
