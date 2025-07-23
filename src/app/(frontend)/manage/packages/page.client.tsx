"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ManagePackagesIndexPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Fetch all posts for the current host (adjust filter as needed)
    fetch("/api/posts?limit=100")
      .then(res => res.json())
      .then(data => {
        setPosts(data.docs || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex items-center gap-2 py-10"><Loader2 className="h-5 w-5 animate-spin" />Loading posts...</div>;

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Your Posts</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map(post => (
          <Card key={post.id} onClick={() => router.push(`/manage/packages/${post.id}`)} className="cursor-pointer hover:shadow-lg">
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div>Slug: {post.slug}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}