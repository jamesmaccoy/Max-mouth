import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    const { searchParams } = new URL(request.url)
    
    // Build where clause from query parameters
    const where: any = {}
    
    // Handle post filter
    const postId = searchParams.get('where[post][equals]')
    if (postId) {
      where.post = { equals: postId }
    }
    
    // Handle isEnabled filter
    const isEnabled = searchParams.get('where[isEnabled][equals]')
    if (isEnabled !== null) {
      where.isEnabled = { equals: isEnabled === 'true' }
    }
    
    const packages = await payload.find({
      collection: 'packages',
      where: Object.keys(where).length > 0 ? where : undefined,
      depth: 1,
    })
    
    return NextResponse.json(packages)
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    const packageDoc = await payload.create({
      collection: 'packages',
      data: body,
      user,
    })
    
    return NextResponse.json(packageDoc)
  } catch (error) {
    console.error('Error creating package:', error)
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    )
  }
} 