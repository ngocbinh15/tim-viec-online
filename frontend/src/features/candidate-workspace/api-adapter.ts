import type { CandidateProfile } from "@/features/candidate-profile/types";
import type {
  Application,
  CandidateNotification,
  PreviewMessage,
} from "./types";

export type ApiRecord = Record<string, unknown>;
export const record = (value: unknown): ApiRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : {};
export const rows = (value: unknown): ApiRecord[] =>
  Array.isArray(value) ? value.map(record) : [];
const text = (value: unknown) => (typeof value === "string" ? value : "");

export function candidateProfileFromApi(data: unknown): CandidateProfile {
  const { user: rawUser, profile: rawProfile } = record(data);
  const user = record(rawUser),
    profile = record(rawProfile),
    links = record(profile.social_links);
  return {
    name: text(user.name),
    email: text(user.email),
    phone: text(user.phone),
    dob: text(user.dob).slice(0, 10),
    title: text(profile.title),
    experience_years: Number(profile.experience_years ?? 0),
    bio: text(profile.bio),
    city: text(profile.city),
    address: text(profile.address),
    linkedin: text(links.linkedin),
    github: text(links.github),
    portfolio: text(links.portfolio),
    skill_ids: rows(profile.skills).map((skill) => Number(skill.id)),
  };
}

// Explicit allowlist: AI assessment fields must never enter candidate state.
export function candidateApplicationFromApi(value: unknown): Application {
  const item = record(value);
  const status = [
    "applied",
    "waiting",
    "accepted",
    "rejected",
    "withdrawn",
  ].includes(String(item.status))
    ? (item.status as Application["status"])
    : "applied";
  return {
    id: Number(item.id),
    job_id: Number(item.job_id),
    status,
    created_at: text(item.created_at),
    cover_letter: text(item.cover_letter),
    cv_name: "CV đã nộp.pdf",
    cv_url: item.cv_url
      ? `/api/backend/applications/${Number(item.id)}/cv`
      : undefined,
    can_withdraw: item.can_withdraw === true,
  };
}

export function candidateNotificationFromApi(
  value: unknown,
): CandidateNotification {
  const item = record(value),
    data = record(item.data);
  return {
    id: Number(item.id),
    title: text(item.title),
    content: text(item.content),
    type: item.type === "new_message" ? "new_message" : "app_status_changed",
    read_at: item.read_at ? text(item.read_at) : null,
    created_at: text(item.created_at),
    conversation_id: data.conversation_id
      ? Number(data.conversation_id)
      : undefined,
    application_id: data.application_id
      ? Number(data.application_id)
      : undefined,
  };
}

export function candidateMessageFromApi(
  value: unknown,
  userId: number,
  conversationId: number,
): PreviewMessage {
  const item = record(value);
  return {
    id: String(item.id),
    conversation_id: conversationId,
    message: text(item.message),
    outgoing: Number(item.sender_id) === userId,
    created_at: text(item.created_at),
    image_url: item.image_url
      ? `/api/backend/conversations/${conversationId}/messages/${Number(item.id)}/image`
      : undefined,
    read_at: item.read_at ? text(item.read_at) : null,
  };
}

export function candidateProfilePayload(profile: CandidateProfile) {
  return {
    name: profile.name,
    phone: profile.phone ? profile.phone.trim().replace(/^\+84/, "0") : null,
    ...(profile.dob ? { dob: profile.dob } : {}),
    title: profile.title,
    experience_years: profile.experience_years,
    bio: profile.bio,
    city: profile.city,
    address: profile.address,
    skills: profile.skill_ids,
    social_links: Object.fromEntries(
      Object.entries({
        linkedin: profile.linkedin,
        github: profile.github,
        portfolio: profile.portfolio,
      }).filter(([, value]) => value),
    ),
  };
}

export function candidateMessageBody(
  message: string,
  image?: File | null,
): string | FormData {
  if (!image) return JSON.stringify({ message: message.trim() });
  const body = new FormData();
  body.set("message", message.trim());
  body.set("image", image);
  return body;
}
