import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { revenueCatService } from '@/lib/revenueCatService'
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

    // First try to find the package by ID in the database
    console.log('Looking for package:', { postId, packageType });
    let pkg = null
    let multiplier = 1
    let baseRate = 150

    try {
      // Try to find by ID first
      const packageResult = await payload.findByID({
        collection: 'packages',
        id: packageType,
      })
      
      if (packageResult && packageResult.post === postId) {
        pkg = packageResult
        if (pkg) {
          multiplier = typeof pkg.multiplier === 'number' ? pkg.multiplier : 1
          baseRate = typeof pkg.baseRate === 'number' ? pkg.baseRate : 150
          console.log('Found package by ID:', pkg.name)
        }
      }
    } catch (error) {
      console.log('Package not found by ID, trying RevenueCat products')
    }

    // If not found by ID, try to find by name in database
    if (!pkg) {
      const packageResult = await payload.find({
        collection: 'packages',
        where: {
          post: { equals: postId },
          name: { equals: packageType },
          isEnabled: { equals: true }
        },
        limit: 1,
      })
      
      if (packageResult.docs.length > 0) {
        pkg = packageResult.docs[0]
        multiplier = typeof pkg.multiplier === 'number' ? pkg.multiplier : 1
        baseRate = typeof pkg.baseRate === 'number' ? pkg.baseRate : 150
        console.log('Found package by name:', pkg.name)
      }
    }

    // If still not found, check RevenueCat products
    if (!pkg) {
      try {
        const revenueCatProducts = await revenueCatService.getProducts()
        const revenueCatProduct = revenueCatProducts.find(product => product.id === packageType)
        
        if (revenueCatProduct) {
          pkg = {
            id: revenueCatProduct.id,
            name: revenueCatProduct.title,
            description: revenueCatProduct.description,
            multiplier: 1, // Default multiplier for RevenueCat products
            baseRate: revenueCatProduct.price,
            category: revenueCatProduct.category,
            minNights: revenueCatProduct.period === 'hour' ? 1 : revenueCatProduct.periodCount,
            maxNights: revenueCatProduct.period === 'hour' ? 1 : revenueCatProduct.periodCount,
            revenueCatId: revenueCatProduct.id,
            isEnabled: revenueCatProduct.isEnabled,
            features: revenueCatProduct.features,
            source: 'revenuecat'
          }
          multiplier = pkg.multiplier
          baseRate = pkg.baseRate
          console.log('Found RevenueCat product:', pkg.name)
        }
      } catch (error) {
        console.error('Error fetching RevenueCat products:', error)
      }
    }

    if (!pkg) {
      return NextResponse.json({ 
        error: 'Package not found', 
        details: `Package ${packageType} not found in database or RevenueCat products` 
      }, { status: 400 })
    }

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
    if (existing.docs.length && existing.docs[0]) {
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
          packageType: pkg.name || pkg.id, // Use name if available, otherwise ID
          selectedPackage: {
            package: pkg.id,
            customName: pkg.name,
            enabled: true
          }
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
        packageType: pkg.name || pkg.id, // Use name if available, otherwise ID
        selectedPackage: {
          package: pkg.id,
          customName: pkg.name,
          enabled: true
        }
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