import type { CollectionConfig } from 'payload'

/**
 * Products collection for the shoe catalog.
 *
 * Fields per D-13 (categories), D-14 (bundle pricing, images),
 * D-15 (sizes with last dimensions), D-16 (style filter).
 */
export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'price', 'status'],
  },
  access: {
    read: () => true, // Public read for product browsing
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: '상품명',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'richText',
      label: '상품 설명',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: '카테고리',
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      label: '가격 (KRW)',
      admin: {
        description: '신발 기본 가격 (원)',
      },
    },
    {
      name: 'bundleInsolePrice',
      type: 'number',
      min: 0,
      label: '세트 추가 가격',
      admin: {
        description: '신발+인솔 세트 추가 가격 (원)',
      },
    },
    {
      name: 'images',
      type: 'array',
      label: '상품 이미지',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'sizes',
      type: 'array',
      label: '사이즈',
      admin: {
        description: '사이즈별 라스트 치수 및 재고',
      },
      fields: [
        {
          name: 'size',
          type: 'number',
          required: true,
          label: '사이즈 (mm)',
        },
        {
          name: 'lastLength',
          type: 'number',
          label: '라스트 길이 (mm)',
          admin: {
            description: '신발골 내부 길이',
          },
        },
        {
          name: 'lastWidth',
          type: 'number',
          label: '라스트 너비 (mm)',
          admin: {
            description: '신발골 내부 너비',
          },
        },
        {
          name: 'stock',
          type: 'number',
          defaultValue: 0,
          label: '재고',
        },
      ],
    },
    {
      name: 'style',
      type: 'select',
      label: '스타일',
      options: [
        { label: '캐주얼', value: 'casual' },
        { label: '포멀', value: 'formal' },
        { label: '운동용', value: 'athletic' },
        { label: '아웃도어', value: 'outdoor' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: '임시저장', value: 'draft' },
        { label: '게시됨', value: 'published' },
        { label: '보관됨', value: 'archived' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'brand',
      type: 'text',
      label: '브랜드',
    },
  ],
}
