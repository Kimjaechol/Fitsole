import type { CollectionConfig } from 'payload'

/**
 * Categories collection for shoe product taxonomy.
 *
 * Seed data (Korean category names per D-13):
 * - 운동화 (Athletic shoes)
 * - 구두 (Dress shoes)
 * - 부츠 (Boots)
 * - 샌들 (Sandals)
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true, // Public read for product browsing
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: '카테고리명',
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
      type: 'textarea',
      label: '설명',
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: '정렬 순서 (낮은 숫자가 먼저 표시)',
      },
    },
  ],
}
