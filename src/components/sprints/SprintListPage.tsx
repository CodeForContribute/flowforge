"use client";

import { useState } from "react";
import { SprintList } from "./SprintList";
import { SprintForm } from "./SprintForm";
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
}

export function SprintListPage({ sprints, projectId }: SprintListPageProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <SprintList
        sprints={sprints}
        onCreateSprint={() => setShowForm(true)}
      />
      <SprintForm
        projectId={projectId}
        open={showForm}
        onOpenChange={setShowForm}
      />
    </>
  );
}
