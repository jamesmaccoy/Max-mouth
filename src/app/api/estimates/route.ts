import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
// import { createEstimate, updateEstimate } from '@/server/payload/estimates' // If you have these utilities
import type { Estimate } from '@/payload-types'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { postId, fromDate, toDate, guests, title, packageType, total } = body

    // Try to find the package by slug (preferred), fallback to name for backward compatibility
    let packageResult = await payload.find({
      collection: 'packages',
      where: {
        post: { equals: postId },
        slug: { equals: packageType },
        isEnabled: { equals: true }
      },
      limit: 1,
    });

    // Fallback: try by name if not found by slug
    if (!packageResult.docs.length) {
      packageResult = await payload.find({
        collection: 'packages',
        where: {
          post: { equals: postId },
          name: { equals: packageType },
          isEnabled: { equals: true }
        },
        limit: 1,
      });
    }

    // Fallback: get first enabled package for the post
    if (!packageResult.docs.length) {
      packageResult = await payload.find({
        collection: 'packages',
        where: {
          post: { equals: postId },
          isEnabled: { equals: true }
        },
        limit: 1,
      });
    }

    if (!packageResult.docs.length) {
      return NextResponse.json({ error: 'Package not found' }, { status: 400 });
    }
    const pkg = packageResult.docs[0];
    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 400 });
    }
    const multiplier = typeof pkg.multiplier === 'number' ? pkg.multiplier : 1
    const baseRate = typeof pkg.baseRate === 'number' ? pkg.baseRate : 150
    const duration = fromDate && toDate
      ? Math.max(1, Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 1
    const calculatedTotal = total !== undefined ? Number(total) : baseRate * duration * multiplier

    // Fetch the post and its packageSettings
    const postResult = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 2,
    });
    const post = postResult;
    let customName = pkg.name; // fallback to package name

    if (post?.packageSettings && Array.isArray(post.packageSettings)) {
      const setting = post.packageSettings.find(
        (s: any) =>
          (typeof s.package === 'object' ? s.package.id : s.package) === pkg.id
      );
      if (setting && setting.customName) {
        customName = setting.customName;
      }
    }

    // Check for existing estimate
    const existing = await payload.find({
      collection: 'estimates',
      where: {
        post: { equals: postId },
        customer: { equals: user.id },
        fromDate: { equals: fromDate },
        toDate: { equals: toDate }
      },
      limit: 1,
    })

    let estimate: Estimate
    if (existing.docs.length) {
      // Update
      estimate = await payload.update({
        collection: 'estimates',
        id: existing.docs[0].id,
        data: {
          total: calculatedTotal,
          guests,
          fromDate,
          toDate,
          customer: user.id,
          packageType,
          selectedPackage: {
            package: pkg.id,
            customName,
            enabled: pkg.isEnabled,
          },
        },
        user: user.id
      })
    } else {
      // Create
      estimate = await payload.create({
      collection: 'estimates',
      data: {
          title: title || `Estimate for ${postId}`,
          post: postId,
        fromDate,
        toDate,
        guests,
          total: calculatedTotal,
          customer: user.id,
        packageType,
        selectedPackage: {
          package: pkg.id,
          customName,
          enabled: pkg.isEnabled,
        },
      },
        user: user.id
      })
    }

    return NextResponse.json(estimate, { status: existing.docs.length ? 200 : 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: (err instanceof Error ? err.message : 'Unknown error') }, { status: 500 })
  }
}