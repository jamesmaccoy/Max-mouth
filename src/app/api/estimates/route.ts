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

    // Fetch the package config for this post and packageType
    console.log('Looking for package:', { postId, packageType });
    const packageResult = await payload.find({
      collection: 'packages',
      where: {
        post: { equals: postId },
        name: { equals: packageType },
        isEnabled: { equals: true }
      },
      limit: 1,
    })
    console.log('Package query result:', packageResult.docs);
    if (!packageResult.docs.length) {
      return NextResponse.json({ error: 'Package not found' }, { status: 400 })
    }
    const pkg = packageResult.docs[0]
    const multiplier = typeof pkg.multiplier === 'number' ? pkg.multiplier : 1
    const baseRate = typeof pkg.baseRate === 'number' ? pkg.baseRate : 150
    const duration = fromDate && toDate
      ? Math.max(1, Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 1
    const calculatedTotal = total !== undefined ? Number(total) : baseRate * duration * multiplier

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