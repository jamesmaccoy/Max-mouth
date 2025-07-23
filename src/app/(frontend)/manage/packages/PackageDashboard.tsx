"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface Package {
  id: string;
  name: string;
  description?: string;
  minNights: number;
  maxNights: number;
}

interface PostPackageSetting {
  package: string;
  enabled: boolean;
  customName?: string;
}

interface PackageDashboardProps {
  postId: string;
}

export default function PackageDashboard({ postId }: PackageDashboardProps) {
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [packageSettings, setPackageSettings] = useState<PostPackageSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");

  // Fetch all packages and the post's packageSettings
  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    Promise.all([
      fetch('/api/packages').then(res => res.json()),
      fetch(`/api/posts/${postId}`).then(res => res.json())
    ]).then(([pkgData, postData]) => {
      setAllPackages(pkgData.docs || []);
      setPackageSettings(postData.doc?.packageSettings || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [postId]);

  // Merge logic: show all packages, with per-post settings
  const mergedPackages = allPackages.map(pkg => {
    const setting = packageSettings.find(s => s.package === pkg.id);
    return {
      ...pkg,
      enabled: setting?.enabled ?? false,
      customName: setting?.customName ?? pkg.name,
    };
  });

  // Toggle enabled/disabled for a package
  const handleToggle = (id: string) => {
    setPackageSettings(settings => {
      const idx = settings.findIndex(s => s.package === id);
      if (idx !== -1) {
        // Toggle existing
        return settings.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s);
      } else {
        // Add new
        return [...settings, { package: id, enabled: true }];
      }
    });
  };

  // Open the edit sheet for a package
  const openEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  // Save the custom name for a package
  const handleEditSave = () => {
    if (!editingId) return;
    setPackageSettings(settings => {
      const idx = settings.findIndex(s => s.package === editingId);
      if (idx !== -1) {
        return settings.map((s, i) => i === idx ? { ...s, customName: editName } : s);
      } else {
        return [...settings, { package: editingId, enabled: true, customName: editName }];
      }
    });
    setEditingId(null);
    setEditName("");
  };

  // Save all changes to the post
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      console.log("Saving packageSettings:", packageSettings); // <-- Add this
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageSettings }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 py-10"><Loader2 className="h-5 w-5 animate-spin" />Loading packages...</div>;

  const enabledCount = mergedPackages.filter(pkg => pkg.enabled).length;

  return (
    <div className="container py-10 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Onboard Your Packages</h1>
      <p className="mb-4 text-muted-foreground">Select which packages you want to offer for this listing. Customize their names to match your style. You can always change this later.</p>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {enabledCount === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
          <b>No packages enabled yet.</b> Toggle on the packages you want to offer to guests.
        </div>
      )}
      <div className="space-y-6">
        {mergedPackages.map(pkg => (
          <Card key={pkg.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{pkg.customName}</CardTitle>
                <div className="flex items-center gap-2">
                  <Switch checked={pkg.enabled} onCheckedChange={() => handleToggle(pkg.id)} />
                  <Sheet open={editingId === pkg.id} onOpenChange={open => { if (!open) setEditingId(null); }}>
                    <SheetTrigger asChild>
                      <Button variant="outline" onClick={() => openEdit(pkg.id, pkg.customName)}>Edit</Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetTitle>Edit Package Name</SheetTitle>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="mb-4" />
                      <Button onClick={handleEditSave} className="w-full">Save</Button>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-gray-500 text-sm">{pkg.description}</div>
              <div className="text-xs text-gray-400 mt-1">Nights: {pkg.minNights} - {pkg.maxNights}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <CardFooter className="justify-end mt-6">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save All Changes
        </Button>
      </CardFooter>
    </div>
  );
} 