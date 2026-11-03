// Test-only HTTP contract fixture. This is not a Laravel backend or an auth mode.
import { createServer } from "node:http";

const revokedTokens = new Set();
const usedVerificationLinks = new Set();
const pendingPasswordChanges = new Map();
let loginRequests = 0;
const requestCounts = {};
let heldPaths = new Set();
const waiting = new Map();
const identities = {
  "candidate@example.test": {
    id: 1,
    name: "Nguyễn Minh Anh",
    role: "candidate",
    email_verified_at: null,
  },
  "employer@example.test": { id: 2, name: "Trần Hoàng Nam", role: "employer" },
  "admin@example.test": { id: 3, name: "Quản trị viên", role: "admin" },
  "unsupported@example.test": {
    id: 4,
    name: "Unknown role",
    role: "superuser",
  },
};

// Minimal contract records keep auth tests independent of production/mock seeds.
const company = {
  id: 1,
  name: "Auth contract company",
  city: "Hà Nội",
  address: "",
  description: "",
  company_size: "",
  website: null,
  active_jobs_count: 1,
};
const job = {
  id: 1,
  company_id: 1,
  category_id: 1,
  title: "Auth contract job",
  job_level: "Junior",
  quantity: 1,
  description: "Contract job description",
  requirements: "Contract requirements",
  benefits: "Contract benefits",
  salary_min: null,
  salary_max: null,
  is_negotiable: true,
  job_type: "full_time",
  city: "Hà Nội",
  address: "",
  deadline: "2099-12-31",
  status: "active",
  is_reported: false,
  created_at: "2026-10-26",
  updated_at: "2026-10-26",
  skills: [],
  company,
  applications_count: 0,
};
const aiFixture = process.env.AI_CONTRACT_FIXTURE === "1";
const aiResult = {
  match_score: 84,
  summary: "Ứng viên đáp ứng kỹ năng và kinh nghiệm chính của vị trí.",
  matched_skills: ["PHP", "MySQL"],
  missing_skills: [],
  strengths: [
    "Có kinh nghiệm phát triển API",
    "Sử dụng cơ sở dữ liệu thành thạo",
  ],
  recommendations: [],
  criteria_scores: {
    skills: 90,
    experience: 80,
    education: 85,
    orientation: 75,
  },
  provider: "gemini",
  model: "fixture-model",
  created_at: "2026-10-27T00:00:00Z",
};
const aiStates = new Map([
  [1, "completed"],
  [2, "failed"],
  [3, "deferred"],
  [4, "pending"],
]);
const aiStalled = new Set([4]);
const aiPolls = new Map();
const aiState = (id) => ({
  status: aiStates.get(id),
  analysis: aiStates.get(id) === "completed" ? aiResult : null,
  error: aiStates.get(id) === "failed" ? "private provider credentials" : null,
  retryable:
    aiStalled.has(id) || ["failed", "deferred"].includes(aiStates.get(id)),
});
function aiApplications() {
  return [1, 2, 3, 4].map((id) => ({
    id,
    job_id: 1,
    candidate_id: id,
    status: "applied",
    reviewed_at: null,
    created_at: `2026-10-${25 + id}T00:00:00Z`,
    cover_letter: "Tôi mong muốn trao đổi về vị trí này.",
    cv_url: id === 3 ? null : "/protected/cv",
    candidate: {
      user_id: 100 + id,
      name: `Ứng viên AI ${id}`,
      email: `ai${id}@example.test`,
      phone: null,
      title: "Lập trình viên PHP",
      city: "Hà Nội",
      experience_years: 3,
      skills: [{ name: "PHP" }],
    },
    ai_analysis_status: aiStates.get(id),
    ai_analysis_error: aiState(id).error,
    ai_analysis: aiState(id).analysis,
  }));
}

function sendList(response, data = []) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(
    JSON.stringify({
      success: true,
      data,
      meta: {
        current_page: 1,
        page: 1,
        per_page: 100,
        total: data.length,
        last_page: 1,
      },
    }),
  );
}

function sendVoid(response) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify({ success: true, message: "OK" }));
}

function send(response, status, data = null, code, errors) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(
    JSON.stringify({
      success: status < 400,
      message: status < 400 ? "OK" : "Request rejected",
      data,
      ...(code ? { code } : {}),
      ...(errors ? { errors } : {}),
    }),
  );
}

async function readBody(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 16_384) throw new Error("body_too_large");
  }
  return JSON.parse(raw || "{}");
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url || "/", "http://127.0.0.1").pathname.replace(
    /^\/api\/auth\//,
    "/api/",
  );
  const token = request.headers.authorization?.replace(/^Bearer /, "");
  if (path === "/health") return send(response, 200);
  if (path === "/__test__/stats")
    return send(response, 200, {
      loginRequests,
      requests: requestCounts,
      waiting: [...waiting.keys()],
    });
  if (path === "/__test__/hold" && request.method === "POST") {
    const body = await readBody(request);
    heldPaths = new Set(body.paths ?? []);
    for (const [key, callbacks] of waiting) {
      if (!heldPaths.has(key)) {
        waiting.delete(key);
        callbacks.forEach((release) => release());
      }
    }
    return sendVoid(response);
  }
  requestCounts[path] = (requestCounts[path] ?? 0) + 1;
  if (
    aiFixture &&
    /^\/api\/applications\/\d+\/ai-(?:analysis|analyze)$/.test(path)
  ) {
    if (token !== "test-employer-token" && token !== "test-admin-token")
      return send(response, 403);
    const id = Number(path.split("/")[3]);
    if (!aiStates.has(id)) return send(response, 404);
    if (request.method === "POST" && path.endsWith("ai-analyze")) {
      if (id === 3) return send(response, 400);
      if (aiStates.get(id) !== "completed") {
        aiStalled.delete(id);
        aiStates.set(id, "pending");
        aiPolls.set(id, 0);
      }
      return send(
        response,
        aiStates.get(id) === "completed" ? 200 : 202,
        aiState(id),
      );
    }
    if (request.method === "GET" && path.endsWith("ai-analysis")) {
      if (
        !aiStalled.has(id) &&
        ["pending", "processing"].includes(aiStates.get(id))
      ) {
        const polls = (aiPolls.get(id) ?? 0) + 1;
        aiPolls.set(id, polls);
        aiStates.set(id, polls >= 2 ? "completed" : "processing");
      }
      return send(response, 200, aiState(id));
    }
    return send(response, 405);
  }
  if (heldPaths.has(path)) {
    await new Promise((resolve) => {
      waiting.set(path, [...(waiting.get(path) ?? []), resolve]);
    });
  }
  if (request.method === "GET" && path === "/api/user") {
    const entry = Object.entries(identities).find(
      ([, user]) => token === `test-${user.role}-token`,
    );
    if (!entry || revokedTokens.has(token))
      return send(response, 401, null, "unauthenticated");
    return send(response, 200, {
      ...entry[1],
      email: entry[0],
      status: "active",
    });
  }
  if (request.method === "GET") {
    if (path === "/api/jobs") return sendList(response, [job]);
    if (path === "/api/jobs/1") return send(response, 200, job);
    if (path === "/api/categories")
      return sendList(response, [
        { id: 1, name: "Contract category", jobs_count: 1 },
      ]);
    if (path === "/api/skills") return sendList(response);
    if (path === "/api/companies") return sendList(response, [company]);
    if (path === "/api/companies/1")
      return send(response, 200, { ...company, jobs: [job] });
    if (path === "/api/locations/cities")
      return send(response, 200, ["Hà Nội"]);
    const entry = Object.entries(identities).find(
      ([, user]) => token === `test-${user.role}-token`,
    );
    if (!entry || revokedTokens.has(token))
      return send(response, 401, null, "unauthenticated");
    if (
      (path.startsWith("/api/admin/") && entry[1].role !== "admin") ||
      (path.startsWith("/api/employer/") && entry[1].role !== "employer") ||
      (path.startsWith("/api/candidate/") && entry[1].role !== "candidate")
    )
      return send(response, 403, null, "forbidden");
    if (aiFixture && path === "/api/admin/jobs/1/applications")
      return sendList(response, aiApplications());
    if (aiFixture && /^\/api\/admin\/applications\/[1-3]$/.test(path)) {
      const app = aiApplications().find(
        (item) => item.id === Number(path.split("/").at(-1)),
      );
      return send(response, 200, { ...app, job });
    }
    if (path === "/api/workspace/bootstrap") {
      const role = entry[1].role;
      const stats = {
        users_count: 3,
        total_candidates: 1,
        total_employers: 1,
        total_jobs: 1,
        active_jobs: 1,
        total_applications: 0,
        reported_jobs: 0,
        trends: [],
      };
      const user = {
        ...entry[1],
        email: entry[0],
        status: "active",
        phone: "",
        dob: "2000-05-20",
      };
      if (role === "admin") {
        const summary = Object.fromEntries(
          Object.entries(job).filter(
            ([key]) =>
              !["description", "requirements", "benefits", "company"].includes(
                key,
              ),
          ),
        );
        return send(response, 200, {
          role,
          stats,
          users: [
            {
              ...identities["employer@example.test"],
              email: "employer@example.test",
              status: "active",
              company: { ...company, user_id: 2 },
            },
            user,
          ],
          jobs: [summary],
          categories: [{ id: 1, name: "Contract category" }],
          skills: [],
        });
      }
      if (role === "employer")
        return send(response, 200, {
          role,
          company: { ...company, user_id: 2 },
          jobs: [job],
          applications: aiFixture ? aiApplications() : [],
          conversations: [],
          notifications: [],
          categories: [{ id: 1, name: "Contract category" }],
          skills: [],
        });
      return send(response, 200, {
        role,
        profile: {
          user,
          profile: {
            title: "",
            city: "",
            address: "",
            bio: "",
            experience_years: 0,
            skills: [],
            cv_url: null,
            avatar_url: null,
            social_links: {},
          },
        },
        skills: [],
        saved_jobs: [],
        applications: [],
        conversations: [],
        notifications: [],
        conversation_jobs: [],
      });
    }
    if (path === "/api/candidate/profile")
      return send(response, 200, {
        user: {
          ...entry[1],
          email: entry[0],
          status: "active",
          dob: "2000-05-20",
          phone: "",
        },
        profile: {
          title: "",
          city: "",
          address: "",
          bio: "",
          experience_years: 0,
          skills: [],
          cv_url: null,
          avatar_url: null,
          social_links: {},
        },
      });
    if (path === "/api/employer/company")
      return send(response, 200, { ...company, user_id: 2 });
    if (path === "/api/admin/stats")
      return send(response, 200, {
        users_count: 0,
        total_candidates: 0,
        total_employers: 0,
        total_jobs: 0,
        active_jobs: 0,
        total_applications: 0,
        reported_jobs: 0,
        trends: [],
      });
    if (path === "/api/admin/jobs/1") return send(response, 200, job);
    if (
      [
        "/api/candidate/saved-jobs",
        "/api/candidate/applications",
        "/api/conversations",
        "/api/notifications",
        "/api/employer/my-jobs",
        "/api/employer/applications",
        "/api/admin/users",
        "/api/admin/jobs",
        "/api/admin/categories",
        "/api/admin/skills",
      ].includes(path)
    )
      return sendList(response);
    return send(response, 404);
  }
  if (
    request.method !== "POST" &&
    !(request.method === "PUT" && path === "/api/user/change-password")
  )
    return send(response, 404);
  try {
    const body = await readBody(request);
    if (path === "/api/login") {
      loginRequests += 1;
      if (body.email === "locked@example.test")
        return send(response, 403, null, "account_locked");
      const user = identities[body.email];
      if (!user || typeof body.password !== "string" || !body.password.length)
        return send(response, 401, null, "invalid_credentials");
      const loginToken = `test-${user.role}-token`;
      revokedTokens.delete(loginToken);
      return send(response, 200, {
        token: loginToken,
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      });
    }
    if (path === "/api/register") {
      if (body.email === "duplicate@example.test")
        return send(response, 422, null, "email_taken", {
          email: ["Email đã được sử dụng"],
        });
      return send(response, 201);
    }
    if (path === "/api/email/verify") {
      if (body.token === "n".repeat(64)) return send(response, 503);
      const key = `${body.email}:${body.token}`;
      if (body.token !== "v".repeat(64) || usedVerificationLinks.has(key))
        return send(response, 400, null, "invalid_verification_token");
      usedVerificationLinks.add(key);
      if (identities[body.email])
        identities[body.email].email_verified_at = new Date().toISOString();
      return send(response, 200, { email: body.email, verified: true });
    }
    if (path === "/api/email/resend") {
      if (body.email === "throttled@example.test") return send(response, 429);
      return send(response, 200, { accepted: true });
    }
    if (path === "/api/forgot-password") return sendVoid(response);
    if (path === "/api/verify-reset-token") {
      if (body.token === "unavailable-reset-token") return send(response, 503);
      return body.token === "valid-reset-token"
        ? send(response, 200, { email: body.email })
        : send(response, 400, null, "invalid_reset_token");
    }
    if (path === "/api/reset-password") {
      return body.token === "valid-reset-token"
        ? send(response, 200)
        : send(response, 400, null, "invalid_reset_token");
    }
    if (path === "/api/logout") {
      if (token) revokedTokens.add(token);
      return sendVoid(response);
    }
    if (path === "/api/user/change-password") {
      if (!token || revokedTokens.has(token))
        return send(response, 401, null, "unauthenticated");
      if (body.current_password === "WrongPass1!")
        return send(response, 400, null, "invalid_current_password");
      if (body.current_password === "MailFail1!")
        return send(response, 503, null, "mail_delivery_failed");
      if (body.current_password === body.password)
        return send(response, 400, null, "password_unchanged");
      const entry = Object.entries(identities).find(
        ([, user]) => token === `test-${user.role}-token`,
      );
      if (!entry) return send(response, 401, null, "unauthenticated");
      pendingPasswordChanges.set(entry[0], "p".repeat(64));
      return send(response, 202, {
        confirmation_required: true,
        email: entry[0],
      });
    }
    if (path === "/api/password/change/confirm") {
      if (body.token === "n".repeat(64)) return send(response, 503);
      if (
        pendingPasswordChanges.get(body.email) !== body.token ||
        body.token !== "p".repeat(64)
      )
        return send(response, 400, null, "invalid_password_change_token");
      pendingPasswordChanges.delete(body.email);
      const account = identities[body.email];
      if (account) revokedTokens.add(`test-${account.role}-token`);
      return send(response, 200, { confirmed: true, email: body.email });
    }
    return send(response, 404);
  } catch {
    return send(response, 400, null, "invalid_request");
  }
});

server.listen(Number(process.env.FIXTURE_PORT || 4119), "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
