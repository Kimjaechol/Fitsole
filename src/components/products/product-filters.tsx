'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const CATEGORIES = [
  { label: '전체', value: '' },
  { label: '운동화', value: 'athletic-shoes' },
  { label: '구두', value: 'dress-shoes' },
  { label: '부츠', value: 'boots' },
  { label: '샌들', value: 'sandals' },
] as const;

const STYLES = [
  { label: '전체', value: '' },
  { label: '캐주얼', value: 'casual' },
  { label: '포멀', value: 'formal' },
  { label: '운동용', value: 'athletic' },
  { label: '아웃도어', value: 'outdoor' },
] as const;

const SIZE_OPTIONS = [
  { label: '전체', value: '' },
  { label: '230~250', value: '230-250' },
  { label: '255~270', value: '255-270' },
  { label: '275~290', value: '275-290' },
  { label: '295~300', value: '295-300' },
] as const;

const PRICE_RANGES = [
  { label: '전체', value: '' },
  { label: '5만원 이하', value: '0-50000' },
  { label: '5~10만원', value: '50000-100000' },
  { label: '10~20만원', value: '100000-200000' },
  { label: '20만원 이상', value: '200000-' },
] as const;

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('category') || '';
  const currentStyle = searchParams.get('style') || '';
  const currentSize = searchParams.get('size') || '';
  const currentPrice = searchParams.get('price') || '';

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      {/* Category filter */}
      <div>
        <Label className="mb-2 block text-sm font-medium">카테고리</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={currentCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('category', cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Style filter */}
      <div>
        <Label className="mb-2 block text-sm font-medium">스타일</Label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((style) => (
            <Button
              key={style.value}
              variant={currentStyle === style.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('style', style.value)}
            >
              {style.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Size filter */}
      <div>
        <Label className="mb-2 block text-sm font-medium">사이즈 (mm)</Label>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((size) => (
            <Button
              key={size.value}
              variant={currentSize === size.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('size', size.value)}
            >
              {size.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Price filter */}
      <div>
        <Label className="mb-2 block text-sm font-medium">가격</Label>
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map((range) => (
            <Button
              key={range.value}
              variant={currentPrice === range.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('price', range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
