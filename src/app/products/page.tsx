import { Suspense } from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { ProductGrid } from '@/components/products/product-grid';
import { ProductFilters } from '@/components/products/product-filters';
import { Skeleton } from '@/components/ui/skeleton';
import type { Metadata } from 'next';
import type { Where } from 'payload';

export const metadata: Metadata = {
  title: '상품 카탈로그 | FitSole',
  description: '카테고리별 신발 상품을 둘러보고, 맞춤 인솔과 함께 주문하세요.',
};

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    style?: string;
    size?: string;
    price?: string;
  }>;
}

async function ProductsContent({
  searchParams,
}: {
  searchParams: ProductsPageProps['searchParams'];
}) {
  const params = await searchParams;
  const payload = await getPayload({ config });

  const where: Where = {
    status: { equals: 'published' },
  };

  // Category filter: match by category slug
  if (params.category) {
    // First find category by slug
    const categories = await payload.find({
      collection: 'categories',
      where: { slug: { equals: params.category } },
      limit: 1,
    });
    if (categories.docs.length > 0) {
      where.category = { equals: categories.docs[0].id };
    }
  }

  // Style filter
  if (params.style) {
    where.style = { equals: params.style };
  }

  // Price range filter
  if (params.price) {
    const [minStr, maxStr] = params.price.split('-');
    const min = minStr ? Number(minStr) : undefined;
    const max = maxStr ? Number(maxStr) : undefined;
    if (min !== undefined && max !== undefined) {
      where.price = { greater_than_equal: min, less_than_equal: max };
    } else if (min !== undefined) {
      where.price = { greater_than_equal: min };
    } else if (max !== undefined) {
      where.price = { less_than_equal: max };
    }
  }

  const result = await payload.find({
    collection: 'products',
    where,
    limit: 40,
    sort: '-createdAt',
    depth: 2, // Populate category + images.image
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = result.docs.map((doc: any) => ({
    id: doc.id as string,
    name: doc.name as string,
    slug: doc.slug as string,
    price: doc.price as number,
    bundleInsolePrice: doc.bundleInsolePrice as number | null | undefined,
    images: doc.images as
      | { image: { url?: string; alt?: string } }[]
      | undefined,
    category: doc.category as { name: string } | string | undefined,
  }));

  // Client-side size filter (since sizes are an array field)
  let filtered = products;
  if (params.size) {
    const [minSize, maxSize] = params.size.split('-').map(Number);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered = products.filter((p: any) => {
      const doc = result.docs.find((d: any) => d.id === p.id);
      if (!doc || !Array.isArray((doc as any).sizes)) return true;
      return (doc as any).sizes.some(
        (s: { size: number }) =>
          s.size >= minSize && (!maxSize || s.size <= maxSize),
      );
    });
  }

  return <ProductGrid products={filtered} />;
}

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">상품 카탈로그</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Filters sidebar */}
        <aside className="w-full shrink-0 lg:w-72">
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
            <ProductFilters />
          </Suspense>
        </aside>

        {/* Product grid */}
        <main className="flex-1">
          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            }
          >
            <ProductsContent searchParams={searchParams} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
