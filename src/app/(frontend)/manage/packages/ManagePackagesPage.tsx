"use client";
import { useParams } from "next/navigation";
import PackageDashboard from "./PackageDashboard";

export default function ManagePackagesPage() {
  const params = useParams();
  const postId = params.postId as string;
  return <PackageDashboard postId={postId} />;
} 