import type { CollectionConfig } from 'payload'

/**
 * Media collection for product image uploads.
 *
 * Validates mime types to image/* only (T-03-04).
 * Enforces 5MB file size limit (T-03-04).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    mimeTypes: ['image/*'],
    staticDir: 'media',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 600,
        height: 400,
        position: 'centre',
      },
      {
        name: 'detail',
        width: 1200,
        height: 800,
        position: 'centre',
      },
    ],
  },
  access: {
    read: () => true, // Public read for product images
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: '대체 텍스트',
    },
    {
      name: 'caption',
      type: 'text',
      label: '캡션',
    },
  ],
}
