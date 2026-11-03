import test from "node:test";
import assert from "node:assert/strict";
import { emptyResume } from "../src/features/resumes/schema";
import {
  addStarterContent,
  initializeStarterContent,
} from "../src/features/resumes/starter";

test("adding starter content fills gaps without replacing the candidate's edits, settings or photo", () => {
  const current = emptyResume();
  current.name = "CV cá nhân";
  current.template_key = "minimal";
  current.content.basics.full_name = "Nguyễn Bình";
  current.content.basics.email = "binh@example.test";
  current.content.basics.photo_asset_id = 12;
  current.settings.hidden_sections = ["projects"];
  current.content.skills = [
    {
      id: crypto.randomUUID(),
      name: "Kỹ năng thật",
      detail: "Kinh nghiệm của tôi",
    },
  ];
  const starter = emptyResume();
  starter.content.basics.full_name = "Tên mẫu";
  starter.content.basics.email = "mau@example.test";
  starter.content.basics.summary = "Giới thiệu mẫu";
  starter.content.skills = [
    { id: crypto.randomUUID(), name: "Kỹ năng mẫu", detail: "" },
  ];
  starter.content.education = [
    {
      id: crypto.randomUUID(),
      school: "Trường mẫu",
      qualification: "Cử nhân",
      description: "",
      start_month: null,
      end_month: null,
      current: false,
    },
  ];
  const filled = addStarterContent(current, starter);
  assert.equal(filled.content.basics.summary, "Giới thiệu mẫu");
  assert.equal(filled.content.basics.full_name, "Nguyễn Bình");
  assert.equal(filled.content.basics.email, "binh@example.test");
  assert.equal(filled.content.basics.photo_asset_id, 12);
  assert.deepEqual(filled.content.skills, current.content.skills);
  assert.deepEqual(filled.content.education, starter.content.education);
  assert.equal(filled.name, current.name);
  assert.equal(filled.template_key, "minimal");
  assert.deepEqual(filled.settings.hidden_sections, ["projects"]);
  assert.equal(current.content.education.length, 0);
  filled.content.education[0].school = "Trường thật";
  assert.equal(starter.content.education[0].school, "Trường mẫu");
});

test("initialization fills once, removes only unchanged legacy instructions and preserves subsequent deletions", () => {
  const current = emptyResume();
  current.content.basics.full_name = "Tên của tôi";
  current.content.basics.summary =
    "Nội dung mẫu: Có kinh nghiệm xây dựng ứng dụng web, phân tích yêu cầu và phối hợp cùng đội ngũ sản phẩm. Mong muốn phát triển các giải pháp dễ sử dụng, ổn định và mang lại giá trị cho người dùng.";
  const starter = emptyResume();
  starter.content.basics.summary = "Lập trình viên React và Laravel.";
  starter.content.skills = [
    { id: crypto.randomUUID(), name: "React", detail: "" },
  ];
  const initialized = initializeStarterContent(current, starter);
  assert.equal(
    initialized.content.basics.summary,
    starter.content.basics.summary,
  );
  assert.equal(initialized.content.basics.full_name, "Tên của tôi");
  assert.equal(initialized.settings.starter_version, 1);
  initialized.content.skills = [];
  assert.deepEqual(
    initializeStarterContent(initialized, starter).content.skills,
    [],
  );
  current.content.basics.summary += " Tôi đã sửa phần này.";
  assert.equal(
    initializeStarterContent(current, starter).content.basics.summary,
    current.content.basics.summary,
  );
});

test("initialization preserves entries that only contain dates or a current-position flag", () => {
  const current = emptyResume();
  current.content.experience = [
    {
      id: crypto.randomUUID(),
      company: "",
      position: "",
      description: "",
      start_month: null,
      end_month: null,
      current: true,
    },
  ];
  const starter = emptyResume();
  starter.content.experience = [
    {
      id: crypto.randomUUID(),
      company: "Công ty An Việt",
      position: "Lập trình viên",
      description: "",
      start_month: "2023-03",
      end_month: null,
      current: true,
    },
  ];
  assert.deepEqual(
    initializeStarterContent(current, starter).content.experience,
    current.content.experience,
  );
  current.content.experience[0].current = false;
  current.content.experience[0].start_month = "2020-02";
  assert.deepEqual(
    initializeStarterContent(current, starter).content.experience,
    current.content.experience,
  );
});
