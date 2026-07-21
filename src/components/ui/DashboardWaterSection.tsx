"use client";

import { useState } from "react";
import { WaterTrackerWidget } from "./WaterTrackerWidget";
import { WaterReminderAlert } from "./WaterReminderAlert";

export function DashboardWaterSection({ userId }: { userId: string }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4">
      <WaterReminderAlert
        userId={userId}
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onWaterMarked={() => setRefreshKey((prev) => prev + 1)}
      />

      <WaterTrackerWidget
        key={refreshKey}
        userId={userId}
        onTriggerReminderAlert={() => setIsAlertOpen(true)}
      />
    </div>
  );
}
