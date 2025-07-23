"use client";

import { useParams } from "next/navigation";
import ManagePackagesPage from "../ManagePackagesPage";

export default function ManagePackagesForPost() {
  const params = useParams();
  const postId = params.postId as string;
  return <ManagePackagesPage postId={postId} />;
} 