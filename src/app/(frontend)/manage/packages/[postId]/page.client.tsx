"use client";

import PackageDashboard from "../PackageDashboard";

interface Props {
  postId: string;
}

export default function ManagePackagesForPost({ postId }: Props) {
  return <PackageDashboard postId={postId} />;
} 