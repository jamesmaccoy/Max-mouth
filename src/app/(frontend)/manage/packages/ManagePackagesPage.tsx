"use client";
import PackageDashboard from "./PackageDashboard";

export default function ManagePackagesPage({ postId }: { postId: string }) {
  return <PackageDashboard postId={postId} />;
} 