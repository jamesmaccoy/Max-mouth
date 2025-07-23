import type { CollectionConfig } from 'payload'

const Packages: CollectionConfig = {
  slug: 'packages',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'post', 'category', 'isEnabled'],
  },
  fields: [
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      admin: { position: 'sidebar' },
    },
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
    { name: 'multiplier', type: 'number', required: true, defaultValue: 1, min: 0.1, max: 3.0, admin: { step: 0.01 } },
    {
      name: 'features',
      type: 'array',
      fields: [{ name: 'feature', type: 'text' }],
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Hosted', value: 'hosted' },
        { label: 'Add-on', value: 'addon' },
        { label: 'Special', value: 'special' },
      ],
      required: true,
      defaultValue: 'standard',
    },
    { name: 'minNights', type: 'number', required: true, defaultValue: 1, min: 1 },
    { name: 'maxNights', type: 'number', required: true, defaultValue: 7, min: 1 },
    { name: 'revenueCatId', type: 'text' },
    { name: 'isEnabled', type: 'checkbox', defaultValue: true },
    { name: 'baseRate', type: 'number', required: false }, // Add this if you want per-package base rates
  ],
}

export default Packages 