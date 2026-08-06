export type TaskState = "DRAFT" | "ASSIGNED" | "IN_PROGRESS" | "BLOCKED" | "WAITING" | "SUBMITTED" | "UNDER_REVIEW" | "CHANGES_REQUIRED" | "APPROVED" | "REJECTED" | "COMPLETED" | "OVERDUE" | "CANCELLED";

export const taskTransitions: Record<TaskState, TaskState[]> = {
  DRAFT: ["ASSIGNED", "CANCELLED"], ASSIGNED: ["IN_PROGRESS", "CANCELLED", "OVERDUE"],
  IN_PROGRESS: ["BLOCKED", "WAITING", "SUBMITTED", "OVERDUE", "CANCELLED"], BLOCKED: ["IN_PROGRESS", "CANCELLED"],
  WAITING: ["IN_PROGRESS", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW"], UNDER_REVIEW: ["CHANGES_REQUIRED", "APPROVED", "REJECTED"],
  CHANGES_REQUIRED: ["IN_PROGRESS"], APPROVED: ["COMPLETED"], REJECTED: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: [], OVERDUE: ["IN_PROGRESS", "SUBMITTED", "CANCELLED"], CANCELLED: [],
};

export function assertTaskTransition(from: TaskState, to: TaskState) {
  if (!taskTransitions[from].includes(to)) throw new Error(`${from} → ${to} шилжилт зөвшөөрөгдөөгүй`);
}

export function canSubmitEvidence(required: string[], uploaded: string[]) {
  return required.every((requirement) => uploaded.includes(requirement));
}

/** Number of distinct APPROVED reviews a submission needs before a task can complete, by risk level. */
export function requiredApprovalSteps(riskLevel: string) {
  if (riskLevel === "CRITICAL") return 3;
  if (riskLevel === "HIGH") return 2;
  return 1;
}
