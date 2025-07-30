import { Purchases } from '@revenuecat/purchases-js'

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
      await Purchases.configure({ apiKey: this.apiKey })
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error)
      console.warn('Falling back to mock data')
      this.initialized = true
    }
  }

  async getProducts(): Promise<RevenueCatProduct[]> {
    await this.initialize()
    
    try {
      const offerings = await Purchases.getOfferings()
      const products: RevenueCatProduct[] = []

      // Map RevenueCat products to our format
      const productMap: Record<string, RevenueCatProduct> = {
        'week_x2_customer': {
          id: 'week_x2_customer',
          title: '2 Week Package',
          description: 'Two-week customer package',
          price: 0, // Will be fetched from RevenueCat
          currency: 'USD',
          period: 'week',
          periodCount: 2,
          category: 'standard',
          features: ['Standard accommodation', 'Basic amenities'],
          isEnabled: true,
        },
        'week_x3_customer': {
          id: 'week_x3_customer',
          title: '3 Week Package',
          description: 'Three-week customer package',
          price: 0,
          currency: 'USD',
          period: 'week',
          periodCount: 3,
          category: 'standard',
          features: ['Standard accommodation', 'Basic amenities', 'Extended stay discount'],
          isEnabled: true,
        },
        'week_x4_customer': {
          id: 'week_x4_customer',
          title: '4 Week Package',
          description: 'Four-week customer package',
          price: 0,
          currency: 'USD',
          period: 'week',
          periodCount: 4,
          category: 'standard',
          features: ['Standard accommodation', 'Basic amenities', 'Monthly discount', 'Priority booking'],
          isEnabled: true,
        },
        'per_hour': {
          id: 'per_hour',
          title: 'Per Hour Service',
          description: 'Hourly service rate',
          price: 0,
          currency: 'USD',
          period: 'hour',
          periodCount: 1,
          category: 'standard',
          features: ['Flexible booking', 'Hourly pricing'],
          isEnabled: true,
        },
        'per_hour_luxury': {
          id: 'per_hour_luxury',
          title: 'Luxury Per Hour Service',
          description: 'Premium hourly service rate',
          price: 0,
          currency: 'USD',
          period: 'hour',
          periodCount: 1,
          category: 'hosted',
          features: ['Premium service', 'Enhanced amenities', 'Dedicated support'],
          isEnabled: true,
        },
      }

      // Fetch actual pricing from RevenueCat
      if (offerings.current) {
        for (const package_ of offerings.current.availablePackages) {
          const productId = package_.identifier
          if (productMap[productId]) {
            productMap[productId].price = package_.product.price
            productMap[productId].currency = package_.product.currencyCode
          }
        }
      }

      return Object.values(productMap)
    } catch (error) {
      console.error('Failed to fetch RevenueCat products:', error)
      // Fallback to mock data if RevenueCat fails
      return [
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
    }
  }

  async getCustomerInfo(customerId: string): Promise<RevenueCatCustomer | null> {
    await this.initialize()
    
    try {
      const customerInfo = await Purchases.getCustomerInfo(customerId)
      
      return {
        id: customerInfo.originalAppUserId,
        entitlements: customerInfo.entitlements.active,
        activeSubscriptions: Object.keys(customerInfo.entitlements.active),
        allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
      }
    } catch (error) {
      console.error('Failed to fetch customer info:', error)
      return null
    }
  }

  async validateSubscription(customerId: string, requiredProduct?: string): Promise<boolean> {
    const customerInfo = await this.getCustomerInfo(customerId)
    
    if (!customerInfo) return false
    
    if (requiredProduct) {
      return customerInfo.activeSubscriptions.includes(requiredProduct)
    }
    
    return customerInfo.activeSubscriptions.length > 0
  }

  async createPurchaseIntent(productId: string, customerId: string) {
    await this.initialize()
    
    try {
      const offerings = await Purchases.getOfferings()
      const package_ = offerings.current?.availablePackages.find(p => p.identifier === productId)
      
      if (!package_) {
        throw new Error(`Product ${productId} not found`)
      }
      
      return await Purchases.purchasePackage(package_)
    } catch (error) {
      console.error('Failed to create purchase intent:', error)
      throw error
    }
  }

  async restorePurchases(customerId: string) {
    await this.initialize()
    
    try {
      return await Purchases.restorePurchases()
    } catch (error) {
      console.error('Failed to restore purchases:', error)
      throw error
    }
  }
}

export const revenueCatService = new RevenueCatService() 