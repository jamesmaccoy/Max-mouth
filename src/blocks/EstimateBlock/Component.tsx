'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/utilities/cn'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import type { EstimateBlockType } from './types'
import { useUserContext } from '@/context/UserContext'
import { useSubscription } from '@/hooks/useSubscription'

import { calculateTotal } from '@/lib/calculateTotal'
import { hasUnavailableDateBetween } from '@/utilities/hasUnavailableDateBetween'

// Import new package suggestion system
import {
  getSuggestedPackages,
  getPrimaryPackageRecommendation,
  getCustomerEntitlement,
  type SuggestedPackage,
  type CustomerEntitlement,
} from '@/utils/packageSuggestions'

export type EstimateBlockProps = EstimateBlockType & {
  className?: string
  /** The unique post ID (not the slug) */
  postId: string
  baseRate: number
  baseRateOverride?: number
}

// Helper to get a valid base rate
function getValidBaseRate(baseRate: unknown, baseRateOverride: unknown): number {
  const override = Number(baseRateOverride)
  const base = Number(baseRate)
  if (!isNaN(override) && override > 0) return override
  if (!isNaN(base) && base > 0) return base
  return 150 // fallback default
}

function fetchUnavailableDates(postId: string): Promise<string[]> {
  return fetch(`/api/bookings/unavailable-dates?postId=${postId}`)
    .then((res) => res.json())
    .then((data) => data.unavailableDates || [])
}

export const EstimateBlock: React.FC<EstimateBlockProps> = ({
  className,
  baseRate = 150,
  baseRateOverride,
  blockType,
  postId,
}) => {
  const effectiveBaseRate = getValidBaseRate(baseRate, baseRateOverride)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(1)
  const [unavailableDates, setUnavailableDates] = useState<string[]>([])

  // Package suggestion states
  const [suggestedPackages, setSuggestedPackages] = useState<SuggestedPackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<SuggestedPackage | null>(null)
  const [customerEntitlement, setCustomerEntitlement] = useState<CustomerEntitlement>('none')

  const { currentUser } = useUserContext()
  const subscriptionStatus = useSubscription()
  const isCustomer = !!currentUser
  const canSeeDiscount = isCustomer && subscriptionStatus.isSubscribed

  // Calculate pricing
  const packageTotal = selectedPackage
    ? calculateTotal(effectiveBaseRate, selectedDuration, selectedPackage.multiplier)
    : calculateTotal(effectiveBaseRate, selectedDuration, 1)
  const baseTotal = calculateTotal(effectiveBaseRate, selectedDuration, 1)

  // Update customer entitlement when subscription status changes
  useEffect(() => {
    const entitlement = getCustomerEntitlement(subscriptionStatus)
    setCustomerEntitlement(entitlement)
  }, [subscriptionStatus])

  // Update suggested packages when duration or entitlement changes
  useEffect(() => {
    if (selectedDuration > 0) {
      const suggestions = getSuggestedPackages(selectedDuration, customerEntitlement, true)
      setSuggestedPackages(suggestions)

      // Auto-select the primary recommendation
      const primaryRecommendation = getPrimaryPackageRecommendation(selectedDuration, customerEntitlement)
      setSelectedPackage(primaryRecommendation)
    }
  }, [selectedDuration, customerEntitlement])

  // Calculate duration when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays < 1 || startDate >= endDate) {
        setEndDate(null)
        return
      }

      setSelectedDuration(diffDays)
    }
  }, [startDate, endDate])

  // Fetch unavailable dates
  useEffect(() => {
    fetchUnavailableDates(postId).then((dates) => setUnavailableDates(dates))
  }, [postId])

  if (blockType !== 'stayDuration') {
    return null
  }

  // Filter packages to show only the most relevant suggestions
  const packagesToShow = suggestedPackages.filter((pkg) => {
    // Always show wine addon
    if (pkg.id === 'wine') return true
    
    // Show packages that match customer entitlement or are available to all
    return pkg.entitlementRequired === customerEntitlement || pkg.entitlementRequired === 'none'
  })

  return (
    <div
      data-stay-duration
      className={cn(
        'flex flex-col space-y-4 p-6 bg-card rounded-lg border border-border',
        className,
      )}
    >
      <h3 className="text-lg font-semibold">Estimate</h3>

      {/* Date Selection */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">Duration</label>
        <div className="flex space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : <span>When</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate || undefined}
                onSelect={(date) => setStartDate(date || null)}
                disabled={(date) =>
                  date < new Date() || unavailableDates.includes(date.toISOString())
                }
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : <span>Until</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate || undefined}
                onSelect={(date) => setEndDate(date || null)}
                disabled={(date) =>
                  !startDate ||
                  date <= startDate ||
                  unavailableDates.includes(date.toISOString()) ||
                  hasUnavailableDateBetween(unavailableDates, startDate, date)
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Suggested Packages */}
      {packagesToShow.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">Suggested for you</label>
          <div className="space-y-2">
            {packagesToShow.map((pkg) => (
              <div
                key={pkg.id}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all',
                  selectedPackage?.id === pkg.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50',
                  // Show different styling for packages the user can't access
                  pkg.entitlementRequired !== 'none' && 
                  pkg.entitlementRequired !== customerEntitlement && 
                  customerEntitlement !== 'pro'
                    ? 'opacity-60'
                    : ''
                )}
                onClick={() => {
                  // Only allow selection if user has access or it's a preview
                  if (pkg.entitlementRequired === 'none' || 
                      pkg.entitlementRequired === customerEntitlement || 
                      customerEntitlement === 'pro') {
                    setSelectedPackage(pkg)
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{pkg.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
                    
                    {/* Show access requirements */}
                    {pkg.entitlementRequired !== 'none' && pkg.entitlementRequired !== customerEntitlement && (
                      <p className="text-xs text-orange-600 mt-1">
                        {pkg.entitlementRequired === 'standard' ? 'Requires standard membership' : 'Requires pro membership'}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">
                      {pkg.multiplier === 1 
                        ? 'Base rate' 
                        : pkg.multiplier > 1 
                          ? `+${((pkg.multiplier - 1) * 100).toFixed(0)}%`
                          : `-${((1 - pkg.multiplier) * 100).toFixed(0)}%`
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Package Information */}
      {selectedPackage && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Selected Package:</span>
            <span className="font-medium">{selectedPackage.title}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Base Rate:</span>
            <span className="font-medium">R{effectiveBaseRate}/night</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Duration:</span>
            <span className="font-medium">
              {selectedDuration} night{selectedDuration !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Show discount/premium info */}
          {selectedPackage.multiplier !== 1 && (
            <div className="flex justify-between items-center text-green-600">
              <span className="text-sm">
                {selectedPackage.multiplier > 1 ? 'Premium:' : 'Discount:'}
              </span>
              <span className="font-medium">
                {selectedPackage.multiplier > 1 
                  ? `+${((selectedPackage.multiplier - 1) * 100).toFixed(0)}%`
                  : `${((1 - selectedPackage.multiplier) * 100).toFixed(0)}% off`
                }
              </span>
            </div>
          )}
          {/* Show locked pricing for non-subscribers */}
          {selectedPackage.multiplier !== 1 && !canSeeDiscount && (
            <div className="flex justify-between items-center text-gray-500">
              <span className="text-sm">With membership:</span>
              <span className="font-medium">
                R{packageTotal.toFixed(2)}{' '}
                <span className="ml-2 text-xs">(Login & subscribe to unlock)</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Total Price */}
      <div className="pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium">Total:</span>
          <span className="text-2xl font-bold">
            {canSeeDiscount ? `R${packageTotal.toFixed(2)}` : `R${baseTotal.toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Book Now Button */}
      <Button
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={!startDate || !endDate || !selectedPackage}
        onClick={async () => {
          if (!startDate || !endDate || !selectedPackage) return
          if (!currentUser?.id) {
            alert('You must be logged in to create an estimate.')
            return
          }
          const res = await fetch('/api/estimates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              postId,
              fromDate: startDate.toISOString(),
              toDate: endDate.toISOString(),
              guests: [], // or your guests data
              total: canSeeDiscount ? packageTotal : baseTotal,
              customer: currentUser.id,
              packageType: selectedPackage.id,
            }),
          })
          if (res.ok) {
            const estimate = await res.json()
            window.location.href = `/estimate/${estimate.id}`
          } else {
            const errorText = await res.text()
            alert('Failed to create estimate: ' + errorText)
          }
        }}
      >
        {!startDate || !endDate 
          ? 'Select dates to book' 
          : !selectedPackage 
            ? 'Select a package'
            : 'Request Availability'
        }
      </Button>
    </div>
  )
}
