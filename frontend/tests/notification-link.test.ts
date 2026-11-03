import { test } from "node:test";
import assert from "node:assert/strict";
import { candidateNotificationHref } from "../src/features/candidate-workspace/notification-link";
import type {
  Application,
  CandidateNotification,
} from "../src/features/candidate-workspace/types";

const notification: CandidateNotification = {
  id: 1,
  type: "app_status_changed",
  title: "Result",
  content: "Updated",
  read_at: null,
  created_at: "2026-10-20T09:00:00+07:00",
  application_id: 8,
};
const applications: Application[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  job_id: index + 1,
  status: "waiting",
  created_at: notification.created_at,
}));

test("candidate notification opens the actual application page within its status filter", () => {
  assert.equal(
    candidateNotificationHref(notification, applications, []),
    "/account/jobs?status=waiting&page=2#application-8",
  );
  assert.equal(
    candidateNotificationHref(
      notification,
      [{ ...applications[7], status: "accepted" }],
      [],
    ),
    "/account/jobs?status=accepted#application-8",
  );
  assert.equal(
    candidateNotificationHref(notification, [], []),
    "/account/jobs",
  );
});
test("message notification only opens a conversation present in the workspace", () => {
  const message = {
    ...notification,
    type: "new_message" as const,
    conversation_id: 12,
  };
  assert.equal(
    candidateNotificationHref(message, applications, []),
    "/account/messages",
  );
  assert.equal(
    candidateNotificationHref(message, applications, [
      { id: 12, job_id: 8, contact: "Recruiter" },
    ]),
    "/account/messages?conversation=12",
  );
});
