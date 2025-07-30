export interface RevenueCatProduct {
  id: string
  title: string
  description: string
  price: number
  currency: string
  period: 'hour' | 'day' | 'week' | 'month' | 'year'
  periodCount: number
  category: 'standard' | 'hosted' | 'addon' | 'special'
  features: string[]
  isEnabled: boolean
}

export interface RevenueCatCustomer {
  id: string
  entitlements: {
    [key: string]: {
      expiresDate: string | null
      productIdentifier: string
      purchaseDate: string
    }
  }
  activeSubscriptions: string[]
  allPurchasedProductIdentifiers: string[]
}

class RevenueCatService {
  private apiKey: string
  private initialized: boolean = false

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY || ''
  }

  async initialize() {
    if (this.initialized) return
    
    if (!this.apiKey) {
      console.warn('RevenueCat API key not configured, using mock data')
      this.initialized = true
      return
    }

    try {
      // For now, we'll use mock data since RevenueCat SDK setup is complex
      console.warn('RevenueCat SDK not fully configured, using mock data')
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error)
      console.warn('Falling back to mock data')
      this.initialized = true
    }
  }

  async getProducts(): Promise<RevenueCatProduct[]> {
    await this.initialize()
    
    // Return mock data for now
    const mockProducts: RevenueCatProduct[] = [
      {
        id: 'week_x2_customer',
        title: '2 Week Package',
        description: 'Two-week customer package',
        price: 299.99,
        currency: 'USD',
        period: 'week',
        periodCount: 2,
        category: 'standard',
        features: ['Standard accommodation', 'Basic amenities'],
        isEnabled: true,
      },
      {
        id: 'week_x3_customer',
        title: '3 Week Package',
        description: 'Three-week customer package',
        price: 399.99,
        currency: 'USD',
        period: 'week',
        periodCount: 3,
        category: 'standard',
        features: ['Standard accommodation', 'Basic amenities', 'Extended stay discount'],
        isEnabled: true,
      },
      {
        id: 'week_x4_customer',
        title: '4 Week Package',
        description: 'Four-week customer package',
        price: 499.99,
        currency: 'USD',
        period: 'week',
        periodCount: 4,
        category: 'standard',
        features: ['Standard accommodation', 'Basic amenities', 'Monthly discount', 'Priority booking'],
        isEnabled: true,
      },
      {
        id: 'per_hour',
        title: 'Per Hour Service',
        description: 'Hourly service rate',
        price: 25.00,
        currency: 'USD',
        period: 'hour',
        periodCount: 1,
        category: 'standard',
        features: ['Flexible booking', 'Hourly pricing'],
        isEnabled: true,
      },
      {
        id: 'per_hour_luxury',
        title: 'Luxury Per Hour Service',
        description: 'Premium hourly service rate',
        price: 50.00,
        currency: 'USD',
        period: 'hour',
        periodCount: 1,
        category: 'hosted',
        features: ['Premium service', 'Enhanced amenities', 'Dedicated support'],
        isEnabled: true,
      },
    ]

    return mockProducts
  }

  async getCustomerInfo(customerId: string): Promise<RevenueCatCustomer | null> {
    await this.initialize()
    
    // Return mock customer info
    return {
      id: customerId,
      entitlements: {},
      activeSubscriptions: [],
      allPurchasedProductIdentifiers: [],
    }
  }

  async validateSubscription(customerId: string, requiredProduct?: string): Promise<boolean> {
    // For now, return true for testing purposes
    // In production, this would validate against RevenueCat
    return true
  }

  async createPurchaseIntent(productId: string, customerId: string) {
    await this.initialize()
    
    // Mock purchase intent
    return {
      customerInfo: {
        originalAppUserId: customerId,
        entitlements: { active: {} },
        allPurchasedProductIdentifiers: [],
      },
      productIdentifier: productId,
    }
  }

  async restorePurchases(customerId: string) {
    await this.initialize()
    
    // Mock restore purchases
    return {
      customerInfo: {
        originalAppUserId: customerId,
        entitlements: { active: {} },
        allPurchasedProductIdentifiers: [],
      },
    }
  }
}

export const revenueCatService = new RevenueCatService() 