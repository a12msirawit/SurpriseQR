"use client";

import { useEffect, useState } from "react";
import PaymentModal from "@/components/payment/PaymentModal";
import TopupHistoryTable, { type TopupHistoryItem } from "@/components/topup/TopupHistoryTable";
import type { UserTier } from "@/types/database";

interface TopupClientViewProps {
  currentTier?: UserTier;
  currentPackageTier?: string | null;
  packageExpiresAt?: string | null;
  scheduledPackageTier?: string | null;
  scheduledPackageEffectiveAt?: string | null;
  scheduledPackagePaidAmount?: number;
  pendingPackageType?: string | null;
  pendingPackageCreditApplied?: number;
  initialHistory: TopupHistoryItem[];
}

export default function TopupClientView({
  currentTier = "free",
  currentPackageTier = null,
  packageExpiresAt = null,
  scheduledPackageTier = null,
  scheduledPackageEffectiveAt = null,
  scheduledPackagePaidAmount = 0,
  pendingPackageType = null,
  pendingPackageCreditApplied = 0,
  initialHistory = [],
}: TopupClientViewProps) {
  const [history, setHistory] = useState<TopupHistoryItem[]>(initialHistory);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Sync with initialHistory when server re-renders or refreshes
  useEffect(() => {
    setHistory((prev) => {
      // Keep any newly prepended items that might not have landed on server yet
      const serverIds = new Set(initialHistory.map((item) => item.id));
      const optimisticItems = prev.filter((item) => item.isNew && !serverIds.has(item.id));
      return [...optimisticItems, ...initialHistory];
    });
  }, [initialHistory]);

  const handleSubmitted = (newEntry?: TopupHistoryItem) => {
    if (newEntry) {
      const entryWithNewFlag: TopupHistoryItem = { ...newEntry, isNew: true };
      setHistory((prev) => [entryWithNewFlag, ...prev.filter((i) => i.id !== newEntry.id)]);
      setHighlightId(newEntry.id);
    }

    // Auto-scroll smoothly to the newly created item so the user doesn't have to scroll manually
    setTimeout(() => {
      const targetElement = document.getElementById("topup-history");
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 350);
  };

  return (
    <>
      <PaymentModal
        open
        embedded
        currentTier={currentTier}
        currentPackageTier={currentPackageTier}
        packageExpiresAt={packageExpiresAt}
        scheduledPackageTier={scheduledPackageTier}
        scheduledPackageEffectiveAt={scheduledPackageEffectiveAt}
        scheduledPackagePaidAmount={scheduledPackagePaidAmount}
        pendingPackageType={pendingPackageType}
        pendingPackageCreditApplied={pendingPackageCreditApplied}
        onSubmitted={handleSubmitted}
      />
      <TopupHistoryTable items={history} highlightId={highlightId} />
    </>
  );
}

