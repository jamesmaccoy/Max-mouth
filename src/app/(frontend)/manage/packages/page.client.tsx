"use client"

import { useState, useEffect } from "react"
import { User } from "@/payload-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Settings, 
  Eye, 
  Edit3, 
  Plus, 
  Trash2, 
  DollarSign,
  Package,
  Users,
  Calendar,
  Star,
  Loader2
} from 'lucide-react'
import { useRevenueCat } from "@/providers/RevenueCat"
import { Purchases, type Package as RevenueCatPackage } from "@revenuecat/purchases-js"
import { 
  BASE_PACKAGE_TEMPLATES,
  getPackagesByCategory,
  createHostPackageConfig,
  getDisplayTitle,
  getDisplayDescription,
  getEffectiveMultiplier,
  getEffectiveFeatures,
  type HostPackageConfig,
  type BasePackageConfig,
  type PackageCategory
} from "@/lib/package-types"

interface Props {
  user: User
}

interface PackagePreview {
  duration: number
  baseRate: number
  effectiveRate: number
  savings: number
  total: number
}

export default function PackageDashboard({ user }: Props) {
  const { isInitialized } = useRevenueCat()
  const [hostPackages, setHostPackages] = useState<HostPackageConfig[]>([])
  const [revenueCatOfferings, setRevenueCatOfferings] = useState<RevenueCatPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<PackageCategory>('standard')
  const [editingPackage, setEditingPackage] = useState<HostPackageConfig | null>(null)
  const [previewData, setPreviewData] = useState<PackagePreview | null>(null)
  const [previewBaseRate, setPreviewBaseRate] = useState<number>(1000)

  // Load host packages and RevenueCat offerings
  useEffect(() => {
    loadHostPackages()
    if (isInitialized) {
      loadRevenueCatOfferings()
    }
  }, [isInitialized])

  const loadHostPackages = async () => {
    try {
      // For now, initialize with default packages
      // In a real app, this would fetch from your backend
      const defaultPackages = BASE_PACKAGE_TEMPLATES.map(template => 
        createHostPackageConfig(template)
      )
      setHostPackages(defaultPackages)
    } catch (err) {
      setError('Failed to load packages')
    } finally {
      setLoading(false)
    }
  }

  const loadRevenueCatOfferings = async () => {
    try {
      const offerings = await Purchases.getSharedInstance().getOfferings()
      const allPackages: RevenueCatPackage[] = []
      
      Object.values(offerings.all).forEach(offering => {
        if (offering?.availablePackages) {
          allPackages.push(...offering.availablePackages)
        }
      })
      
      setRevenueCatOfferings(allPackages)
    } catch (err) {
      console.error('Failed to load RevenueCat offerings:', err)
    }
  }

  const handlePackageUpdate = async (packageId: string, updates: Partial<HostPackageConfig>) => {
    setSaving(true)
    try {
      setHostPackages(prev => 
        prev.map(pkg => 
          pkg.id === packageId 
            ? { ...pkg, ...updates }
            : pkg
        )
      )
      // In a real app, save to backend here
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
    } catch (err) {
      setError('Failed to update package')
    } finally {
      setSaving(false)
    }
  }

  const generatePreview = (packageConfig: HostPackageConfig, duration: number) => {
    const baseRate = previewBaseRate
    const multiplier = getEffectiveMultiplier(packageConfig)
    const effectiveRate = baseRate * multiplier
    const savings = baseRate - effectiveRate
    const total = effectiveRate * duration

    setPreviewData({
      duration,
      baseRate,
      effectiveRate,
      savings,
      total
    })
  }

  const packagesByCategory = hostPackages.filter(pkg => pkg.category === selectedCategory)
  const addonPackages = hostPackages.filter(pkg => pkg.category === 'addon')

  if (loading) {
    return (
      <div className="container py-10">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading package dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Package Management</h1>
          <p className="text-muted-foreground">
            Configure your accommodation packages and add-on services
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          {hostPackages.filter(pkg => pkg.isEnabled).length} Active Packages
        </Badge>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as PackageCategory)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="standard">Standard Packages</TabsTrigger>
          <TabsTrigger value="hosted">Hosted Experiences</TabsTrigger>
          <TabsTrigger value="addon">Add-on Services</TabsTrigger>
          <TabsTrigger value="special">Special Offers</TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-6">
          <PackageCategorySection
            title="Standard Packages"
            description="Core accommodation packages for subscription members"
            packages={packagesByCategory}
            onUpdate={handlePackageUpdate}
            onEdit={setEditingPackage}
            onPreview={generatePreview}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="hosted" className="space-y-6">
          <PackageCategorySection
            title="Hosted Experiences" 
            description="Premium packages with dedicated host support"
            packages={packagesByCategory}
            onUpdate={handlePackageUpdate}
            onEdit={setEditingPackage}
            onPreview={generatePreview}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="addon" className="space-y-6">
          <PackageCategorySection
            title="Add-on Services"
            description="Additional services to enhance guest experience"
            packages={packagesByCategory}
            onUpdate={handlePackageUpdate}
            onEdit={setEditingPackage}
            onPreview={generatePreview}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="special" className="space-y-6">
          <PackageCategorySection
            title="Special Offers"
            description="Limited-time or seasonal package offerings"
            packages={packagesByCategory}
            onUpdate={handlePackageUpdate}
            onEdit={setEditingPackage}
            onPreview={generatePreview}
            saving={saving}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Package Control Panel */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Package Controls
          </CardTitle>
          <CardDescription>
            Bulk operations and quick toggles for your packages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                hostPackages.forEach(pkg => {
                  if (pkg.canBeDisabled) {
                    handlePackageUpdate(pkg.id, { isEnabled: true })
                  }
                })
              }}
            >
              Enable All
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                hostPackages.forEach(pkg => {
                  if (pkg.canBeDisabled) {
                    handlePackageUpdate(pkg.id, { isEnabled: false })
                  }
                })
              }}
            >
              Disable Optional
            </Button>
            <Button variant="outline" size="sm">
              Reset to Defaults
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <Label htmlFor="preview-rate">Preview Base Rate (R)</Label>
            <Input
              id="preview-rate"
              type="number"
              value={previewBaseRate}
              onChange={(e) => setPreviewBaseRate(Number(e.target.value))}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Package Preview Panel */}
      {previewData && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Package Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Duration</Label>
                <p className="text-2xl font-bold">{previewData.duration} nights</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Base Rate</Label>
                <p className="text-lg">R{previewData.baseRate.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Your Rate</Label>
                <p className="text-lg font-semibold">R{previewData.effectiveRate.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Savings</Label>
                <p className={`text-lg ${previewData.savings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {previewData.savings > 0 ? '-' : '+'}R{Math.abs(previewData.savings).toFixed(2)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Total</Label>
                <p className="text-2xl font-bold text-primary">R{previewData.total.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Package Edit Dialog */}
      {editingPackage && (
        <PackageEditDialog
          package={editingPackage}
          onSave={(updates) => {
            handlePackageUpdate(editingPackage.id, updates)
            setEditingPackage(null)
          }}
          onCancel={() => setEditingPackage(null)}
        />
      )}
    </div>
  )
}

interface PackageCategorySectionProps {
  title: string
  description: string
  packages: HostPackageConfig[]
  onUpdate: (packageId: string, updates: Partial<HostPackageConfig>) => void
  onEdit: (pkg: HostPackageConfig) => void
  onPreview: (pkg: HostPackageConfig, duration: number) => void
  saving: boolean
}

function PackageCategorySection({ 
  title, 
  description, 
  packages, 
  onUpdate, 
  onEdit, 
  onPreview,
  saving 
}: PackageCategorySectionProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            package={pkg}
            onUpdate={onUpdate}
            onEdit={onEdit}
            onPreview={onPreview}
            saving={saving}
          />
        ))}
      </div>
    </div>
  )
}

interface PackageCardProps {
  package: HostPackageConfig
  onUpdate: (packageId: string, updates: Partial<HostPackageConfig>) => void
  onEdit: (pkg: HostPackageConfig) => void
  onPreview: (pkg: HostPackageConfig, duration: number) => void
  saving: boolean
}

function PackageCard({ package: pkg, onUpdate, onEdit, onPreview, saving }: PackageCardProps) {
  const multiplier = getEffectiveMultiplier(pkg)
  const features = getEffectiveFeatures(pkg)
  
  return (
    <Card className={`${!pkg.isEnabled ? 'opacity-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{getDisplayTitle(pkg)}</CardTitle>
            <CardDescription className="text-sm">
              {getDisplayDescription(pkg)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={pkg.isEnabled ? "default" : "secondary"}>
              {pkg.isEnabled ? "Active" : "Disabled"}
            </Badge>
            {pkg.canBeDisabled && (
              <Switch
                checked={pkg.isEnabled}
                onCheckedChange={(enabled) => onUpdate(pkg.id, { isEnabled: enabled })}
                disabled={saving}
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Duration</span>
          <span className="font-medium">
            {pkg.minNights === pkg.maxNights 
              ? `${pkg.minNights} night${pkg.minNights > 1 ? 's' : ''}`
              : `${pkg.minNights}-${pkg.maxNights} nights`
            }
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Rate Multiplier</span>
          <Badge variant={multiplier > 1 ? "destructive" : multiplier < 1 ? "default" : "secondary"}>
            {multiplier > 1 ? `+${((multiplier - 1) * 100).toFixed(0)}%` : 
             multiplier < 1 ? `-${((1 - multiplier) * 100).toFixed(0)}%` : 
             'Base Rate'}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Customer Tier</span>
          <Badge variant="outline">
            {pkg.customerTierRequired === 'pro' ? 'Pro' : 
             pkg.customerTierRequired === 'standard' ? 'Standard' : 
             'All Guests'}
          </Badge>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Features</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {features.slice(0, 3).map((feature) => (
              <Badge key={feature.id} variant="outline" className="text-xs">
                {feature.label}
              </Badge>
            ))}
            {features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{features.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPreview(pkg, pkg.minNights)}
          className="flex items-center gap-1"
        >
          <Eye className="h-3 w-3" />
          Preview
        </Button>
        
        {pkg.canBeRenamed && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(pkg)}
            className="flex items-center gap-1"
          >
            <Edit3 className="h-3 w-3" />
            Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

interface PackageEditDialogProps {
  package: HostPackageConfig
  onSave: (updates: Partial<HostPackageConfig>) => void
  onCancel: () => void
}

function PackageEditDialog({ package: pkg, onSave, onCancel }: PackageEditDialogProps) {
  const [customTitle, setCustomTitle] = useState(pkg.hostCustomTitle || '')
  const [customDescription, setCustomDescription] = useState(pkg.hostCustomDescription || '')
  const [multiplierOverride, setMultiplierOverride] = useState(pkg.hostMultiplierOverride || pkg.baseMultiplier)

  const handleSave = () => {
    onSave({
      hostCustomTitle: customTitle.trim() || undefined,
      hostCustomDescription: customDescription.trim() || undefined,
      hostMultiplierOverride: multiplierOverride !== pkg.baseMultiplier ? multiplierOverride : undefined
    })
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Package</DialogTitle>
          <DialogDescription>
            Customize the display name, description, and pricing for this package
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Custom Title</Label>
            <Input
              id="title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={getDisplayTitle(pkg)}
            />
          </div>

          <div>
            <Label htmlFor="description">Custom Description</Label>
            <Textarea
              id="description"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder={getDisplayDescription(pkg)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="multiplier">Rate Multiplier</Label>
            <Input
              id="multiplier"
              type="number"
              step="0.1"
              min="0.1"
              max="3.0"
              value={multiplierOverride}
              onChange={(e) => setMultiplierOverride(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default: {pkg.baseMultiplier} (1.0 = base rate, 0.8 = 20% discount, 1.5 = 50% premium)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 