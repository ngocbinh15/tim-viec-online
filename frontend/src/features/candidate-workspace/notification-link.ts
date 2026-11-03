import type { Application, CandidateNotification, Conversation } from "./types";
import { WORKSPACE_PAGE_SIZE } from "./rules";

// Resolve only records already supplied by the authenticated workspace.
export function candidateNotificationHref(
  notification: CandidateNotification,
  applications: Application[],
  conversations: Conversation[],
) {
  if (notification.type === "new_message") {
    const conversation = conversations.find(
      (item) => item.id === notification.conversation_id,
    );
    return conversation
      ? `/account/messages?conversation=${conversation.id}`
      : "/account/messages";
  }
  const application = applications.find(
    (item) => item.id === notification.application_id,
  );
  if (!application) return "/account/jobs";
  const peers = applications.filter(
    (item) => item.status === application.status,
  );
  const page = Math.floor(peers.indexOf(application) / WORKSPACE_PAGE_SIZE) + 1;
  return `/account/jobs?status=${application.status}${page > 1 ? `&page=${page}` : ""}#application-${application.id}`;
}
