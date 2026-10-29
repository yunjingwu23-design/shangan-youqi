import { jobs, type Job } from "./data";
export type Application = {
  id: string;
  jobId?: string;
  company: string;
  role: string;
  category: string;
  city: string;
  channel: string;
  appliedAt: string;
  status: string;
  nextAt: string;
  deadline: string;
  resume: string;
  notes: string;
  jdUrl: string;
  email: string;
};
export type Status = { id: string; label: string; color: string };
export type WorkspaceData = {
  name: string;
  theme: string;
  cover: string;
  statuses: Status[];
  records: Application[];
};
export const defaultStatuses: Status[] = [
  "想投递",
  "已投递",
  "笔试/测评",
  "一面",
  "二面",
  "HR 面",
  "终面",
  "Offer",
  "已拒绝",
  "已结束",
].map((label, i) => ({
  id: `s${i}`,
  label,
  color: [
    "#7c817d",
    "#49739d",
    "#a17c39",
    "#7463a0",
    "#92719c",
    "#508e88",
    "#75655d",
    "#498264",
    "#a85e5e",
    "#777777",
  ][i],
}));
export function newApplication(job?: Job): Application {
  return {
    id:
      typeof crypto !== "undefined"
        ? crypto.randomUUID()
        : Math.random().toString(36),
    jobId: job?.id,
    company: job?.company || "",
    role: job?.title || "",
    category: job?.category || "日常实习",
    city: job?.city || "",
    channel: job ? "上岸有期" : "手动录入",
    appliedAt: "",
    status: "s0",
    nextAt: "",
    deadline: job?.deadline || "",
    resume: "",
    notes: "",
    jdUrl: job ? `/jobs/${job.id}` : "",
    email: job?.email || "",
  };
}
export const initialWorkspace: WorkspaceData = {
  name: "我的上岸计划",
  theme: "#506950",
  cover: "sage",
  statuses: defaultStatuses,
  records: jobs.slice(0, 3).map((j, i) => ({
    ...newApplication(j),
    id: `demo-${i}`,
    status: ["s3", "s1", "s7"][i],
    appliedAt: "2026-10-27",
    nextAt: ["2026-11-02", "2026-11-05", "2026-11-08"][i],
  })),
};
export function removeStatus(data: WorkspaceData, id: string): WorkspaceData {
  if (data.statuses.length <= 1) return data;
  const remaining = data.statuses.filter((s) => s.id !== id);
  return {
    ...data,
    statuses: remaining,
    records: data.records.map((r) =>
      r.status === id ? { ...r, status: remaining[0].id } : r,
    ),
  };
}
