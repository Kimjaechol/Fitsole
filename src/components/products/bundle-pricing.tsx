import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BundlePricingProps {
  shoePrice: number;
  bundleInsolePrice: number | null | undefined;
  hasScanData: boolean;
}

const priceFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export function BundlePricing({
  shoePrice,
  bundleInsolePrice,
  hasScanData,
}: BundlePricingProps) {
  const hasBundle = bundleInsolePrice != null && bundleInsolePrice > 0;
  const totalBundlePrice = hasBundle ? shoePrice + bundleInsolePrice : null;
  const savings = hasBundle ? Math.round(bundleInsolePrice * 0.1) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">가격</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Shoe-only price */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">신발 단품</span>
          <span className="text-lg font-bold">
            {priceFormatter.format(shoePrice)}
          </span>
        </div>

        {/* Bundle price */}
        {hasBundle && totalBundlePrice && (
          <>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">신발 + 맞춤 인솔 세트</span>
                <span className="text-lg font-bold text-primary">
                  {priceFormatter.format(totalBundlePrice)}
                </span>
              </div>
              {savings > 0 && (
                <p className="mt-1 text-xs text-green-600">
                  세트 할인 {priceFormatter.format(savings)} 적용
                </p>
              )}
            </div>

            {/* Scan data status */}
            <div className="border-t pt-3">
              {hasScanData ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  맞춤 인솔 추가 가능
                </Badge>
              ) : (
                <div className="space-y-2">
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    발 측정 후 맞춤 인솔 추가 가능
                  </Badge>
                  <Link
                    href="/scan"
                    className="block text-xs text-primary underline-offset-2 hover:underline"
                  >
                    발 측정하러 가기 &rarr;
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
