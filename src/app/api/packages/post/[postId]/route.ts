import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { revenueCatService } from '@/lib/revenueCatService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const payload = await getPayload({ config: configPromise })
    const { postId } = await params
    
    // Get packages from database
    const dbPackages = await payload.find({
      collection: 'packages',
      where: {
        post: { equals: postId },
        isEnabled: { equals: true }
      },
      depth: 1,
    })

    // Get RevenueCat products
    const revenueCatProducts = await revenueCatService.getProducts()
    
    // Combine database packages with RevenueCat products
    const allPackages = [
      ...dbPackages.docs.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        multiplier: pkg.multiplier,
        category: pkg.category,
        minNights: pkg.minNights,
        maxNights: pkg.maxNights,
        revenueCatId: pkg.revenueCatId,
        baseRate: pkg.baseRate,
        isEnabled: pkg.isEnabled,
        features: pkg.features?.map((f: any) => f.feature) || [],
        source: 'database'
      })),
      ...revenueCatProducts.map(product => ({
        id: product.id,
        name: product.title,
        description: product.description,
        multiplier: 1, // Default multiplier for RevenueCat products
        category: product.category,
        minNights: product.period === 'hour' ? 1 : product.periodCount,
        maxNights: product.period === 'hour' ? 1 : product.periodCount,
        revenueCatId: product.id,
        baseRate: product.price,
        isEnabled: product.isEnabled,
        features: product.features,
        source: 'revenuecat'
      }))
    ]

    return NextResponse.json({
      packages: allPackages,
      total: allPackages.length
    })
  } catch (error) {
    console.error('Error fetching packages for post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 