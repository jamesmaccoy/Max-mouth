"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Package {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  customName?: string;
  minNights: number;
  maxNights: number;
}

interface PackageDashboardProps {
  postId: string;
}

export default function PackageDashboard({ postId }: PackageDashboardProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    fetch(`/api/packages?where[post][equals]=${postId}`)
      .then(res => res.json())
      .then(data => {
        setPackages(
          (data.docs || []).map((pkg: any) => ({
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            isEnabled: pkg.isEnabled ?? true,
            customName: pkg.customName || pkg.name,
            minNights: pkg.minNights,
            maxNights: pkg.maxNights,
          }))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
    try {
      // PATCH the post with updated package settings
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
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 py-10"><Loader2 className="h-5 w-5 animate-spin" />Loading packages...</div>;

  return (
    <div className="container py-10 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Manage Packages</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="space-y-6">
        {packages.map(pkg => (
          <Card key={pkg.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{pkg.name}</CardTitle>
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
                <div className="text-xs text-gray-400 mt-1">Nights: {pkg.minNights} - {pkg.maxNights}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <CardFooter className="justify-end mt-6">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </CardFooter>
    </div>
  );
} 