"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Package {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  customName?: string;
  minNights: number;
  maxNights: number;
  revenueCatId?: string;
  baseRate?: number;
  category?: string;
}

interface PackageDashboardProps {
  postId: string;
}

export default function PackageDashboard({ postId }: PackageDashboardProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPackages = async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    
    try {
      // Load both packages and post data
      const [packagesRes, postRes] = await Promise.all([
        fetch(`/api/packages?where[post][equals]=${postId}`),
        fetch(`/api/posts/${postId}`)
      ]);

      if (!packagesRes.ok) throw new Error('Failed to load packages');
      if (!postRes.ok) throw new Error('Failed to load post data');

      const [packagesData, postData] = await Promise.all([
        packagesRes.json(),
        postRes.json()
      ]);

      const packages = packagesData.docs || [];
      const packageSettings = postData.doc?.packageSettings || [];
      
      // Create a map of package settings by package ID
      const settingsMap = new Map();
      packageSettings.forEach((setting: any) => {
        const pkgId = typeof setting.package === 'object' ? setting.package.id : setting.package;
        settingsMap.set(pkgId, setting);
      });
      
      setPackages(
        packages.map((pkg: any) => {
          const settings = settingsMap.get(pkg.id);
          return {
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            isEnabled: settings?.enabled ?? pkg.isEnabled ?? true,
            customName: settings?.customName || pkg.name,
            minNights: pkg.minNights,
            maxNights: pkg.maxNights,
            revenueCatId: pkg.revenueCatId,
            baseRate: pkg.baseRate,
            category: pkg.category,
          };
        })
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, [postId]);

  const handleToggle = (id: string) => {
    setPackages(pkgs =>
      pkgs.map(pkg =>
        pkg.id === id ? { ...pkg, isEnabled: !pkg.isEnabled } : pkg
      )
    );
  };

  const handleNameChange = (id: string, name: string) => {
    setPackages(pkgs =>
      pkgs.map(pkg =>
        pkg.id === id ? { ...pkg, customName: name } : pkg
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageSettings: packages.map(pkg => ({
            package: pkg.id,
            enabled: pkg.isEnabled,
            customName: pkg.customName,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSuccess("Package settings saved successfully!");
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncRevenueCat = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/packages/sync-revenuecat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      
      if (!res.ok) throw new Error('Failed to sync RevenueCat packages');
      
      const result = await res.json();
      setSuccess(`Successfully imported ${result.importedPackages?.length || 0} packages from RevenueCat`);
      
      // Reload packages after sync
      await loadPackages();
    } catch (e: any) {
      setError(e.message || 'Failed to sync RevenueCat packages');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center gap-2 py-10">
      <Loader2 className="h-5 w-5 animate-spin" />
      Loading packages...
    </div>
  );

  return (
    <div className="container py-10 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Packages</h1>
        <Button 
          onClick={handleSyncRevenueCat} 
          disabled={syncing}
          variant="outline"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Sync RevenueCat
        </Button>
      </div>
      
      {error && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-4">
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packages.map(pkg => (
          <Card key={pkg.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {pkg.name}
                    {pkg.revenueCatId && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        RevenueCat
                      </span>
                    )}
                  </CardTitle>
                  {pkg.category && (
                    <span className="text-xs text-gray-500 capitalize">{pkg.category}</span>
                  )}
                </div>
                <Switch checked={pkg.isEnabled} onCheckedChange={() => handleToggle(pkg.id)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-gray-500 text-sm">{pkg.description}</div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium">Custom Name</label>
                <Input
                  value={pkg.customName || ""}
                  onChange={e => handleNameChange(pkg.id, e.target.value)}
                  disabled={!pkg.isEnabled}
                />
                <div className="text-xs text-gray-400 mt-1">
                  Nights: {pkg.minNights} - {pkg.maxNights}
                  {pkg.baseRate && ` • Base Rate: $${pkg.baseRate}`}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {packages.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          <p>No packages found for this post.</p>
          <p className="text-sm mt-2">Click "Sync RevenueCat" to import packages from RevenueCat.</p>
        </div>
      )}
      
      <CardFooter className="justify-end mt-6">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Changes
        </Button>
      </CardFooter>
    </div>
  );
} 