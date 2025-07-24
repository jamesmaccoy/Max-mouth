'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { useUserContext } from '@/context/UserContext'
import { AdminLink } from '@/components/AdminLink'
import { EditPostsLink } from '@/components/EditPostsLink'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []

  const { currentUser } = useUserContext()

  // Check if user is a customer or admin
  const isCustomerOrAdmin = currentUser?.role?.includes('customer') || currentUser?.role?.includes('admin')

  return (
    <nav className="flex gap-3 items-center">
      {navItems.map(({ link }, i) => {
        if (link.url === '/admin') {
          return (
            <AdminLink key={i} className={buttonVariants({ variant: "link" })}>
              {link.label}
            </AdminLink>
          )
        }
        return <CMSLink key={i} {...link} appearance="link" />
      })}
      
      {/* Add Plek Management link for customers and admins */}
      {isCustomerOrAdmin && (
        <Link 
          href="/manage/packages" 
          className={buttonVariants({ variant: "link" })}
        >
          Manage Max
        </Link>
      )}

      {/* Edit Posts link with proper subscription checking */}
      <EditPostsLink className={buttonVariants({ variant: "link" })}>
        Edit Posts
      </EditPostsLink>
      
      <Link href="/search">
        <span className="sr-only">Search</span>
        <SearchIcon className="w-5 text-primary" />
      </Link>
      {!currentUser ? (
        <Link className={buttonVariants({})} href={'/login'}>
          Login
        </Link>
      ) : (
        <Link 
          href="/account" 
          className="font-medium text-sm text-primary hover:underline"
        >
          Hello, {currentUser.name}
        </Link>
      )}
    </nav>
  )
}
