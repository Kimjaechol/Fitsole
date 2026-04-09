import { ProductCard } from './product-card';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  bundleInsolePrice?: number | null;
  images?: { image: { url?: string; alt?: string } }[];
  category?: { name: string } | string;
}

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          등록된 상품이 없습니다
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          다른 조건으로 검색해 보세요
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
