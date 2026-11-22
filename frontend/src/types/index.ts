export const STATUSES = ["Applied", "Screening", "Interview", "Offer", "Reject"] as const;
export type Status = (typeof STATUSES)[number];
export type Proficiency = "Beginner" | "Intermediate" | "Advanced";
export const PROFICIENCIES: Proficiency[] = ["Beginner", "Intermediate", "Advanced"];

export interface User { id: string; email: string; full_name: string | null; created_at: string }
export interface Skill { id: string; skill_name: string; proficiency: Proficiency; years_experience: number }
export interface Job {
  id: string; company: string; role_title: string; jd_text: string | null;
  application_link: string | null; location: string | null; salary_offered: string | null; created_at: string;
}
export type JobInput = Partial<Omit<Job, "id" | "created_at">> & { company: string; role_title: string };
export interface Application {
  id: string; job_id: string; resume_version_id: string | null; status: Status;
  applied_date: string; notes: string | null; job: { id: string; company: string; role_title: string };
}
export interface Resume { id: string; version_name: string; content_md: string | null; created_at: string }
export interface Reminder {
  id: string; application_id: string; reminder_type: string; due_date: string;
  is_sent: boolean; company: string; role_title: string; is_due: boolean;
}
export interface AppNotification { id: string; message: string; is_read: boolean; created_at: string }
export interface Summary {
  total_applied: number; response_rate: number; status_counts: Record<Status, number>;
  jobs_tracked: number; pending_reminders: number;
}
export interface FunnelStage { status: Status; count: number }
export interface RoadmapItem { week: number; skill: string; focus: string }
export interface JdAnalysis {
  job_id: string; required_skills: string[]; seniority: string | null; match_score: number;
  skill_gaps: string[]; parsed_at: string; keywords?: string[]; matched_skills?: string[];
  roadmap?: RoadmapItem[]; used_fallback?: boolean;
}
export interface TailorResult {
  suggested_bullets: string[]; missing_keywords: string[]; summary: string; used_fallback: boolean;
}
