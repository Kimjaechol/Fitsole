import { notFound } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { getPayload } from 'payload';
import config from '@payload-config';
import { auth } from '@/lib/auth';
import { VARIOSHORE_ZONES } from '@/lib/insole/types';
import type { DesignParams, HardnessZone, VarioshoreTpuZone } from '@/lib/insole/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BundlePricing } from '@/components/products/bundle-pricing';
import type { Metadata } from 'next';

const ProductInsolePreview = dynamic(
  () =>
    import('@/components/insole/product-insole-preview').then((m) => ({
      default: m.ProductInsolePreview,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[240px] w-full rounded-lg" />,
  },
);

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'products',
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    },
    limit: 1,
    depth: 2,
  });
  return result.docs[0] ?? null;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: '상품을 찾을 수 없습니다 | FitSole' };

  return {
    title: `${product.name} | FitSole`,
    description:
      typeof product.description === 'string'
        ? product.description
        : `${product.name} - FitSole 맞춤 인솔과 함께 주문하세요.`,
  };
}

const priceFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

/**
 * Recommend shoe size based on foot length measurement.
 * Korean sizing: shoe size number = foot length in mm (rounded to nearest 5).
 */
function recommendSize(footLengthMm: number): number {
  return Math.round(footLengthMm / 5) * 5;
}

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

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  // Check if user has scan data for insole preview / size recommendation
  const session = await auth();
  let hasScanData = false;
  let recommendedSize: number | null = null;
  let designParams: DesignParams | null = null;
  let hardnessMap: Record<HardnessZone, VarioshoreTpuZone> | null = null;

  if (session?.user?.id) {
    try {
      // Attempt to fetch latest scan from our API
      const { db } = await import('@/lib/db');
      const { footScans, footMeasurements } = await import('@/lib/db/schema');
      const { eq, desc } = await import('drizzle-orm');

      const scans = await db
        .select()
        .from(footScans)
        .where(eq(footScans.userId, session.user.id))
        .orderBy(desc(footScans.createdAt))
        .limit(1);

      if (scans.length > 0) {
        hasScanData = true;
        const measurements = await db
          .select()
          .from(footMeasurements)
          .where(eq(footMeasurements.scanId, scans[0].id))
          .limit(1);

        if (measurements.length > 0) {
          if (measurements[0].footLength) {
            recommendedSize = recommendSize(Number(measurements[0].footLength));
          }
          designParams = buildDesignParams({
            footLength: measurements[0].footLength ? Number(measurements[0].footLength) : null,
            ballWidth: measurements[0].ballWidth ? Number(measurements[0].ballWidth) : null,
            archHeight: measurements[0].archHeight ? Number(measurements[0].archHeight) : null,
            heelWidth: measurements[0].heelWidth ? Number(measurements[0].heelWidth) : null,
          });
          hardnessMap = buildDefaultHardnessMap();
        }
      }
    } catch {
      // Scan data unavailable — continue without
    }
  }

  const categoryName =
    typeof product.category === 'object' &&
    product.category !== null &&
    'name' in product.category
      ? (product.category as { name: string }).name
      : null;

  const images = (product.images as { image: { url?: string; alt?: string } }[] | undefined) ?? [];
  const sizes = (product.sizes as { size: number; stock?: number }[] | undefined) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Image gallery */}
        <div className="w-full lg:w-1/2">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100">
            {images[0]?.image?.url ? (
              <Image
                src={images[0].image.url}
                alt={images[0].image.alt || product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <span>이미지 없음</span>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-slate-50"
                >
                  {img.image?.url && (
                    <Image
                      src={img.image.url}
                      alt={img.image.alt || `${product.name} ${i + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="w-full space-y-6 lg:w-1/2">
          {/* Category + Name */}
          <div>
            {categoryName && (
              <Badge variant="secondary" className="mb-2">
                {categoryName}
              </Badge>
            )}
            <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
            {product.brand && (
              <p className="mt-1 text-sm text-muted-foreground">
                {product.brand as string}
              </p>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>
                {typeof product.description === 'string'
                  ? product.description
                  : '상품 설명이 준비 중입니다.'}
              </p>
            </div>
          )}

          {/* Bundle pricing */}
          <BundlePricing
            shoePrice={product.price as number}
            bundleInsolePrice={product.bundleInsolePrice as number | null}
            hasScanData={hasScanData}
          />

          {/* Size selector */}
          {sizes.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium">사이즈 선택</h2>
              {recommendedSize && (
                <p className="mb-2 text-xs text-green-600">
                  측정 데이터 기반 추천 사이즈: {recommendedSize}mm
                </p>
              )}
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                {sizes.map((s) => {
                  const isRecommended = recommendedSize === s.size;
                  const outOfStock = s.stock != null && s.stock <= 0;
                  return (
                    <Button
                      key={s.size}
                      variant={isRecommended ? 'default' : 'outline'}
                      size="sm"
                      disabled={outOfStock}
                      className={
                        outOfStock
                          ? 'opacity-40'
                          : isRecommended
                            ? 'ring-2 ring-primary ring-offset-1'
                            : ''
                      }
                    >
                      {s.size}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Insole 3D preview (scan data required) */}
          {hasScanData && designParams && hardnessMap && (
            <ProductInsolePreview
              designParams={designParams}
              hardnessMap={hardnessMap}
            />
          )}

          {/* Add to cart (disabled — Phase 4) */}
          <Button
            size="lg"
            className="w-full"
            aria-disabled="true"
            tabIndex={-1}
            style={{ pointerEvents: 'none', opacity: 0.5 }}
          >
            장바구니 담기
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            장바구니 기능은 준비 중입니다
          </p>
        </div>
      </div>
    </div>
  );
}
