"use client";

import { useState } from "react";
import { SprintList } from "./SprintList";
import { SprintForm } from "./SprintForm";
import { VelocityChart } from "./VelocityChart";
import { SprintStatus } from "@/types";

interface SprintStats {
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  completedPoints: number;
  progress: number;
}

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  startDate: Date | string;
  endDate: Date | string;
  status: SprintStatus;
  projectId: string;
  stats: SprintStats;
}

interface SprintListPageProps {
  sprints: Sprint[];
  projectId: string;
  projectKey?: string;
  aiEnabled?: boolean;
}

export function SprintListPage({ sprints, projectId, projectKey, aiEnabled }: SprintListPageProps) {
  const [showForm, setShowForm] = useState(false);

  // Prepare data for velocity chart
  const velocityData = sprints.map((sprint) => ({
    id: sprint.id,
    name: sprint.name,
    status: sprint.status,
    completedPoints: sprint.stats.completedPoints,
    totalPoints: sprint.stats.totalPoints,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
  }));

  // Check if there are completed sprints for the chart
  const hasCompletedSprints = sprints.some((s) => s.status === "COMPLETED");

  return (
    <div className="space-y-6">
      {/* Velocity Chart */}
      {hasCompletedSprints && (
        <VelocityChart sprints={velocityData} />
      )}

      {/* Sprint List */}
      <SprintList
        sprints={sprints}
        projectKey={projectKey}
        aiEnabled={aiEnabled}
        onCreateSprint={() => setShowForm(true)}
      />

      <SprintForm
        projectId={projectId}
        open={showForm}
        onOpenChange={setShowForm}
      />
    </div>
  );
}
