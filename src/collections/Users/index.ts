import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: () => true,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'email', 'role'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      hasMany: true,
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Host',
          value: 'host',
        },
        {
          label: 'Customer',
          value: 'customer',
        },
      ],
      defaultValue: ['customer'],
      access: {
        // Only admins can modify roles
        update: ({ req: { user } }) => {
          return Boolean((user as any)?.role?.includes('admin'))
        },
      },
    },
  ],
  timestamps: true,
}
