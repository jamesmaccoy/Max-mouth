'use client'

import { useState, useEffect, useCallback } from 'react'
import { Estimate, User } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRevenueCat } from '@/providers/RevenueCat'
import { Purchases, type Package, ErrorCode, type Product } from '@revenuecat/purchases-js'
import { useRouter } from 'next/navigation'
import { FileText, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import InviteUrlDialog from './_components/invite-url-dialog'
import { Media } from '@/components/Media'
import { formatDateTime } from '@/utilities/formatDateTime'
import { UserIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { DateRange } from 'react-day-picker'
import Link from 'next/link'
import { format } from 'date-fns'

// Import package suggestion system
import {
  getSuggestedPackages,
  getPrimaryPackageRecommendation,
  getCustomerEntitlement,
  type SuggestedPackage,
  type CustomerEntitlement,
} from '@/utils/packageSuggestions'
import { useSubscription } from '@/hooks/useSubscription'

interface RevenueCatError extends Error {
  code?: ErrorCode
}

interface RevenueCatProduct extends Product {
  price?: number
  priceString?: string
  currencyCode?: string
}

type Props = {
  data: Estimate
  user: User
}

export default function EstimateDetailsClientPage({ data, user }: Props) {
  const router = useRouter()
  const { isInitialized } = useRevenueCat()

  // Calculate duration and use a fallback for total
  const _bookingDuration =
    data?.fromDate && data?.toDate
      ? Math.max(
          1,
          Math.round(
            (new Date(data.toDate).getTime() - new Date(data.fromDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 1
  const _bookingTotal = data?.total ?? 0
  const _postId = typeof data?.post === 'object' && data?.post?.id ? data.post.id : ''

  const [guests, setGuests] = useState<User[]>(
    Array.isArray(data.guests) ? (data.guests.filter((g) => typeof g !== 'string') as User[]) : [],
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Payment states
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [offerings, setOfferings] = useState<Package[]>([])
  const [loadingOfferings, setLoadingOfferings] = useState(true)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Package suggestion states
  const [suggestedPackages, setSuggestedPackages] = useState<SuggestedPackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<SuggestedPackage | null>(null)
  const [customerEntitlement, setCustomerEntitlement] = useState<CustomerEntitlement>('none')
  const [isWineSelected, setIsWineSelected] = useState(false)
  const [packagePrice, setPackagePrice] = useState<number | null>(null)

  const subscriptionStatus = useSubscription()
  const [areDatesAvailable, setAreDatesAvailable] = useState(true)

  // Update customer entitlement when subscription status changes
  useEffect(() => {
    const entitlement = getCustomerEntitlement(subscriptionStatus)
    setCustomerEntitlement(entitlement)
  }, [subscriptionStatus])

  // Update suggested packages when duration, entitlement, or wine selection changes
  useEffect(() => {
    if (_bookingDuration > 0) {
      const suggestions = getSuggestedPackages(_bookingDuration, customerEntitlement, true)
      setSuggestedPackages(suggestions)

      // Auto-select the primary recommendation, considering wine selection
      let primaryRecommendation = getPrimaryPackageRecommendation(_bookingDuration, customerEntitlement)
      
      // If wine is selected and we have a hosted option, prefer that
      if (isWineSelected) {
        const hostedOption = suggestions.find(pkg => 
          pkg.entitlementRequired === 'pro' && 
          pkg.id.includes('hosted')
        )
        if (hostedOption) {
          primaryRecommendation = hostedOption
        }
      }
      
      setSelectedPackage(primaryRecommendation)
    }
  }, [_bookingDuration, customerEntitlement, isWineSelected])

  // Load RevenueCat offerings when initialized
  useEffect(() => {
    if (isInitialized) {
      loadOfferings()
    }
  }, [isInitialized])

  const loadOfferings = async () => {
    setLoadingOfferings(true)
    try {
      const fetchedOfferings = await Purchases.getSharedInstance().getOfferings()
      console.log('Offerings:', fetchedOfferings)
      const perNightOffering = fetchedOfferings.all['per_night']
      if (perNightOffering && perNightOffering.availablePackages.length > 0) {
        setOfferings(perNightOffering.availablePackages)
      } else {
        setOfferings([])
      }
    } catch (err) {
      setPaymentError('Failed to load booking options')
    } finally {
      setLoadingOfferings(false)
    }
  }

  // Update package price when package or duration changes
  useEffect(() => {
    if (!selectedPackage || !offerings.length) return

    const packageToUse = offerings.find(
      (pkg) => pkg.webBillingProduct?.identifier === selectedPackage.revenueCatId,
    )

    if (packageToUse?.webBillingProduct) {
      const product = packageToUse.webBillingProduct as RevenueCatProduct
      if (product.price) {
        const basePrice = Number(product.price)
        const multiplier = selectedPackage.multiplier
        const calculatedPrice = basePrice * multiplier
        setPackagePrice(calculatedPrice)
      } else {
        const basePrice = Number(_bookingTotal)
        const multiplier = selectedPackage.multiplier
        const calculatedPrice = basePrice * multiplier
        setPackagePrice(calculatedPrice)
      }
    } else {
      const basePrice = Number(_bookingTotal)
      const multiplier = selectedPackage.multiplier
      const calculatedPrice = basePrice * multiplier
      setPackagePrice(calculatedPrice)
    }
  }, [selectedPackage, offerings, _bookingTotal])

  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A'
    return `R${price.toFixed(2)}`
  }

  const handleEstimate = async () => {
    if (!areDatesAvailable || !selectedPackage) return

    setPaymentLoading(true)
    setPaymentError(null)

    try {
      const estimatePackage = offerings.find((pkg) => {
        const identifier = pkg.webBillingProduct?.identifier
        return identifier === selectedPackage.revenueCatId
      })
      if (!estimatePackage) {
        throw new Error(
          `Estimate package not found for ${selectedPackage.revenueCatId}. Please contact support.`,
        )
      }

      // RevenueCat Payment Flow
      try {
        const purchaseResult = await Purchases.getSharedInstance().purchase({
          rcPackage: estimatePackage,
        })

        // After successful purchase, confirm the estimate in backend
        const fromDate = new Date(data.fromDate)
        const toDate = new Date(data.toDate)
        const estimateData = {
          postId: _postId,
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
          guests: [],
          baseRate: packagePrice,
          duration: _bookingDuration,
          customer: user.id,
          packageType: selectedPackage.id,
        }
        const response = await fetch(`/api/estimates/${data.id}/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(estimateData),
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to confirm estimate')
        }
        const result = await response.json()
        setPaymentSuccess(true)
        setTimeout(() => {
          router.push(`/booking-confirmation?total=${packagePrice}&duration=${_bookingDuration}`)
        }, 1500)
      } catch (purchaseError) {
        const rcError = purchaseError as RevenueCatError
        console.error('RevenueCat Purchase Error:', rcError)
        if (rcError.code === ErrorCode.UserCancelledError) {
          console.log('User cancelled the purchase flow.')
          return
        }
        throw new Error('Failed to complete purchase. Please try again.')
      }
    } catch (err) {
      console.error('Purchase Error:', err)
      setPaymentError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setPaymentLoading(false)
    }
  }

  // Filter packages to show
  const packagesToShow = suggestedPackages.filter((pkg) => {
    // Always show wine addon
    if (pkg.id === 'wine') return true
    
    // Show packages that match customer entitlement or show upgrade options
    return pkg.entitlementRequired === customerEntitlement || 
           pkg.entitlementRequired === 'none' ||
           (customerEntitlement === 'none') // Show all options to non-subscribers
  })

  const winePackage = suggestedPackages.find(pkg => pkg.id === 'wine')
  const mainPackages = packagesToShow.filter(pkg => pkg.id !== 'wine')

  if (!data) {
    return <div className="container py-16">Estimate not found</div>
  }

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center space-x-4 mb-8">
          <Link
            href="/estimates"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to Estimates
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Estimate Details */}
            {data ? (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold">Estimate Details</h1>
                  <p className="text-muted-foreground mt-2">
                    Review and complete your booking estimate
                  </p>
                </div>

                <div className="w-full rounded-md overflow-hidden bg-muted p-2 flex items-center gap-3">
                  {!!(typeof data?.post === 'object' && data?.post?.meta?.image) && (
                    <div className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden border border-border bg-white">
                      <Media
                        resource={typeof data?.post === 'object' && data?.post?.meta?.image ? data.post.meta.image : undefined}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col text-white">
                    <span className="font-medium">
                      Date Estimated: {formatDateTime(data?.createdAt)}
                    </span>
                    <span className="font-medium">
                      Guests: {Array.isArray(data?.guests) ? data.guests.length : 0}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-8">Error loading estimate details</div>
            )}

            {/* Package Selection */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Suggested Packages</h2>
              <div className="grid grid-cols-1 gap-4">
                {/* Main Packages */}
                {mainPackages.map((pkg) => (
                  <Card 
                    key={pkg.id}
                    className={cn(
                      'cursor-pointer transition-all',
                      selectedPackage?.id === pkg.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50',
                      // Show different styling for packages the user can't access
                      pkg.entitlementRequired !== 'none' && 
                      pkg.entitlementRequired !== customerEntitlement && 
                      customerEntitlement !== 'pro'
                        ? 'opacity-75'
                        : ''
                    )}
                    onClick={() => {
                      // Only allow selection if user has access
                      if (pkg.entitlementRequired === 'none' || 
                          pkg.entitlementRequired === customerEntitlement || 
                          customerEntitlement === 'pro') {
                        setSelectedPackage(pkg)
                      }
                    }}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{pkg.title}</CardTitle>
                          <CardDescription>{pkg.description}</CardDescription>
                          
                          {/* Show access requirements */}
                          {pkg.entitlementRequired !== 'none' && pkg.entitlementRequired !== customerEntitlement && (
                            <p className="text-sm text-orange-600 mt-2">
                              {pkg.entitlementRequired === 'standard' 
                                ? 'Requires standard membership' 
                                : 'Requires pro membership'}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold">
                            {pkg.multiplier === 1 
                              ? 'Base rate' 
                              : pkg.multiplier > 1 
                                ? `+${((pkg.multiplier - 1) * 100).toFixed(0)}%`
                                : `-${((1 - pkg.multiplier) * 100).toFixed(0)}%`
                            }
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {pkg.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <Check className="mr-2 h-4 w-4 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    {selectedPackage?.id === pkg.id && (
                      <CardFooter>
                        <span className="text-2xl font-bold text-primary">
                          {formatPrice(packagePrice)}
                        </span>
                      </CardFooter>
                    )}
                  </Card>
                ))}

                {/* Wine Package Add-on */}
                {winePackage && (
                  <Card
                    className={cn(
                      'border-2 border-border shadow-lg transition-all cursor-pointer',
                      isWineSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
                    )}
                    onClick={() => setIsWineSelected(!isWineSelected)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{winePackage.title}</CardTitle>
                          <CardDescription>{winePackage.description}</CardDescription>
                        </div>
                        <Switch
                          id="wine-package"
                          checked={isWineSelected}
                          onCheckedChange={(checked) => {
                            setIsWineSelected(checked)
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {winePackage.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <Check className="mr-2 h-4 w-4 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Estimate Summary */}
            <div className="bg-muted p-6 rounded-lg border border-border">
              <h2 className="text-2xl font-semibold mb-4">Estimate Summary</h2>
              {selectedPackage && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-muted-foreground">Package:</span>
                    <span className="font-medium">{selectedPackage.title}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-muted-foreground">Rate per night:</span>
                    <span className="font-medium">{formatPrice(packagePrice)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{_bookingDuration} nights</span>
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="text-2xl font-bold">{formatPrice(_bookingTotal)}</span>
                  </div>
                </>
              )}
              
              {/* Complete Estimate Button */}
              <Button
                onClick={handleEstimate}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={
                  paymentLoading || paymentSuccess || !_postId || !selectedPackage || !areDatesAvailable
                }
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : paymentSuccess ? (
                  'Estimate Confirmed!'
                ) : !_postId ? (
                  'Missing Property Information'
                ) : !selectedPackage ? (
                  'Please Select a Package'
                ) : !areDatesAvailable ? (
                  'Dates Not Available'
                ) : (
                  `Complete Estimate - ${formatPrice(_bookingTotal)}`
                )}
              </Button>
              
              {paymentError && (
                <div className="mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {paymentError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
