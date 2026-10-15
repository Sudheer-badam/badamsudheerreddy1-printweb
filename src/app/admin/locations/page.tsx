"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

const AdminLiveMap = dynamic(() => import("@/components/AdminLiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[650px] w-full rounded-3xl bg-white border border-gray-200 flex flex-col items-center justify-center gap-3 shadow-sm">
      <Loader2 className="w-8 h-8 animate-spin text-[#2D63FF]" />
      <span className="text-sm font-bold text-[#0B1D3A]">Loading Live Location Services...</span>
      <span className="text-xs text-gray-500">Initializing interactive map and satellite layers</span>
    </div>
  ),
});

function LiveLocationsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get("userId");

  if (!user) return null;

  return <AdminLiveMap adminUid={user.uid} initialSelectedUserId={selectedUserId} />;
}

export default function AdminLocationsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[650px] w-full rounded-3xl bg-white border border-gray-200 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D63FF]" />
        </div>
      }
    >
      <LiveLocationsContent />
    </Suspense>
  );
}
