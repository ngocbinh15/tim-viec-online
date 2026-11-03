import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { emptyResume, TEMPLATE_KEYS } from "../src/features/resumes/schema";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
execFileSync(process.execPath, ["scripts/build-cv-renderer.mjs"], {
  cwd: root,
});

test("new templates have distinct printable layouts rather than falling back to classic", async () => {
  const sample = JSON.parse(
    await readFile(
      path.join(root, "../tests/fixtures/resumes/showcase.json"),
      "utf8",
    ),
  );
  const positions = new Map<
    string,
    { name: number; experience: number; skills: number; entry: number }
  >();
  await mkdir(path.join(root, "test-results/resume-renderer"), {
    recursive: true,
  });
  for (const template of ["executive", "elegant", "technical"]) {
    const file = path.join(
      root,
      `test-results/resume-renderer/layout-${template}-${crypto.randomUUID()}.pdf`,
    );
    execFileSync(
      process.execPath,
      [path.join(root, "dist/cv-renderer/render-cv.mjs"), file],
      {
        input: JSON.stringify({
          document: { ...sample, template_key: template },
        }),
      },
    );
    const loading = getDocument({
      data: new Uint8Array(await readFile(file)),
      standardFontDataUrl:
        path
          .join(root, "node_modules/pdfjs-dist/standard_fonts")
          .replaceAll("\\", "/") + "/",
    });
    try {
      const pdf = await loading.promise;
      assert.equal(
        pdf.numPages,
        1,
        `${template}: showcase should fit on one page`,
      );
      const items = (await (await pdf.getPage(1)).getTextContent()).items;
      const x = (text: string) => {
        const item = items.find(
          (item) =>
            "str" in item &&
            item.str.normalize("NFC").replace(/\s/g, "") ===
              text.replace(/\s/g, ""),
        );
        assert.ok(item && "transform" in item, `${template}: missing ${text}`);
        return item.transform[4];
      };
      positions.set(template, {
        name: x("Nguyễn Minh An"),
        experience: x("KINH NGHIỆM LÀM VIỆC"),
        skills: x("KỸ NĂNG"),
        entry: x("Product Designer"),
      });
    } finally {
      await loading.destroy();
    }
  }
  assert.ok(
    positions.get("executive")!.name >= 54,
    "executive identity should be inset inside its dark header",
  );
  assert.ok(
    positions.get("elegant")!.entry >= 50,
    "elegant entries should be inset beside the vertical rule",
  );
  assert.ok(
    positions.get("technical")!.skills >
      positions.get("technical")!.experience + 250,
    "technical skills should appear in the right column",
  );
});
test("all templates create paged Vietnamese text PDFs using local fonts", async () => {
  const output = path.join(root, "test-results/resume-renderer");
  await mkdir(output, { recursive: true });
  for (const template of TEMPLATE_KEYS) {
    const doc = emptyResume();
    doc.template_key = template;
    doc.content.basics = {
      ...doc.content.basics,
      full_name: "Nguyễn Minh An",
      headline: "Kỹ sư phần mềm",
      email: "an@example.test",
      summary:
        "Phát triển ứng dụng phục vụ cộng đồng, tối ưu hiệu suất hệ thống.",
    };
    doc.content.skills.push({
      id: crypto.randomUUID(),
      name: "TypeScript",
      detail: "Laravel, cơ sở dữ liệu MySQL",
    });
    doc.content.experience = Array.from({ length: 10 }, (_, i) => ({
      id: crypto.randomUUID(),
      company: `Doanh nghiệp tổng hợp ${i + 1}`,
      position: "Lập trình viên",
      start_month: "2023-01",
      end_month: "2025-12",
      current: false,
      description:
        "Phân tích yêu cầu và xây dựng hệ thống quản lý tuyển dụng. Kiểm thử, triển khai và bảo trì ứng dụng cho người dùng Việt Nam. ".repeat(
          5,
        ) + `Kết quả công việc ${i + 1}.`,
    }));
    const file = path.join(
      output,
      template + "-" + crypto.randomUUID() + ".pdf",
    );
    execFileSync(
      process.execPath,
      [path.join(root, "dist/cv-renderer/render-cv.mjs"), file],
      { input: JSON.stringify({ document: doc }) },
    );
    const result = await readFile(file);
    assert.ok(result.subarray(0, 5).toString() === "%PDF-");
    assert.ok(result.length < 5 * 1024 * 1024);
    const php =
      process.env.PHP_BINARY ||
      (process.platform === "win32" ? "F:/ACode/xampp/php/php.exe" : "php");
    const parsed = JSON.parse(
      execFileSync(
        php,
        [path.join(root, "../backend/scripts/inspect-resume-pdf.php"), file],
        { encoding: "utf8" },
      ),
    );
    assert.ok(
      parsed.pages >= 2 && parsed.pages <= 5,
      `${template}: ${parsed.pages} pages`,
    );
    assert.match(parsed.text, /Nguyễn Minh An/u);
    assert.match(parsed.text, /TypeScript/);
    assert.match(parsed.text, /Doanh nghiệp tổng hợp 10/u);
    for (let page = 1; page <= parsed.pages; page++) {
      assert.ok(
        parsed.text.includes(`${page} / ${parsed.pages}`),
        `${template}: missing page ${page} footer`,
      );
    }
    const loading = getDocument({
      data: new Uint8Array(result),
      standardFontDataUrl:
        path
          .join(root, "node_modules/pdfjs-dist/standard_fonts")
          .replaceAll("\\", "/") + "/",
    });
    try {
      const pdf = await loading.promise;
      let visibleText = "";
      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index);
        const content = await page.getTextContent();
        const visible = content.items.filter(
          (item) =>
            "str" in item &&
            item.transform[5] >= 0 &&
            item.transform[5] <= page.view[3],
        );
        visibleText += visible
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        assert.ok(
          visible
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .includes(`${index} / ${pdf.numPages}`),
          `${template}: page ${index} footer is outside the printable page`,
        );
      }
      const complete = visibleText.normalize("NFC").replace(/\s/g, "");
      for (let index = 1; index <= 10; index++)
        assert.ok(
          complete.includes(`Kếtquảcôngviệc${index}.`),
          `${template}: description ${index} is missing from visible pages`,
        );
    } finally {
      await loading.destroy();
    }
  }
});

test("new layouts preserve photos, section visibility and reordered content", async () => {
  const sample = JSON.parse(
    await readFile(
      path.join(root, "../tests/fixtures/resumes/showcase.json"),
      "utf8",
    ),
  );
  const photo = `data:image/png;base64,${(await readFile(path.join(root, "public/brand/logo.png"))).toString("base64")}`;
  for (const template_key of ["executive", "elegant", "technical"]) {
    const doc = structuredClone(sample);
    doc.template_key = template_key;
    doc.settings.accent = "teal";
    doc.settings.font_size = "large";
    doc.settings.line_spacing = "compact";
    doc.settings.hidden_sections = ["projects"];
    doc.settings.section_order = [
      "education",
      "experience",
      "skills",
      "languages",
      "projects",
      "certifications",
      "activities",
    ];
    doc.content.basics.photo_asset_id = 1;
    const file = path.join(
      root,
      `test-results/resume-renderer/photo-${template_key}-${crypto.randomUUID()}.pdf`,
    );
    execFileSync(
      process.execPath,
      [path.join(root, "dist/cv-renderer/render-cv.mjs"), file],
      { input: JSON.stringify({ document: doc, photo }) },
    );
    const loading = getDocument({
      data: new Uint8Array(await readFile(file)),
      standardFontDataUrl:
        path
          .join(root, "node_modules/pdfjs-dist/standard_fonts")
          .replaceAll("\\", "/") + "/",
    });
    try {
      const pdf = await loading.promise;
      let text = "";
      let images = 0;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        text += (await page.getTextContent()).items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        images += (await page.getOperatorList()).fnArray.filter(
          (op) => op === OPS.paintImageXObject,
        ).length;
      }
      text = text.normalize("NFC").replace(/\s/g, "");
      assert.ok(images > 0, `${template_key}: missing photo`);
      assert.ok(
        !text.includes("NềntảnghọctậpCùngTiến"),
        `${template_key}: hidden project remains visible`,
      );
      assert.ok(
        text.indexOf("CửnhânThiếtkếđồhọa") < text.indexOf("ProductDesigner"),
        `${template_key}: section order ignored`,
      );
      assert.ok(text.includes("IELTS7.0"), `${template_key}: missing language`);
    } finally {
      await loading.destroy();
    }
  }
});

for (const template of ["modern", "technical"] as const)
  test(`sparse ${template} CVs use the page width and keep ordinary emails intact`, async () => {
    const doc = emptyResume();
    doc.template_key = template;
    doc.content.basics.full_name = "Nguyễn Minh An";
    doc.content.basics.headline = "Project Manager";
    doc.content.basics.email = "nguyen.minh.an1901@gmail.com";
    doc.content.basics.phone = "0901234567";
    doc.content.basics.city = "Khánh Hòa";
    doc.content.skills = [
      {
        id: crypto.randomUUID(),
        name: "Quản lý dự án",
        detail:
          "Lập kế hoạch, quản lý nguồn lực và phối hợp với các nhóm để hoàn thành mục tiêu đúng tiến độ.",
      },
    ];
    doc.content.projects = [
      {
        id: crypto.randomUUID(),
        name: "Ứng dụng tuyển dụng",
        role: "",
        url: "",
        description: "",
      },
    ];
    const file = path.join(
      root,
      "test-results/resume-renderer",
      `sparse-${template}-${crypto.randomUUID()}.pdf`,
    );
    await mkdir(path.dirname(file), { recursive: true });
    execFileSync(
      process.execPath,
      [path.join(root, "dist/cv-renderer/render-cv.mjs"), file],
      {
        input: JSON.stringify({ document: doc }),
      },
    );
    const loading = getDocument({
      data: new Uint8Array(await readFile(file)),
      standardFontDataUrl:
        path
          .join(root, "node_modules/pdfjs-dist/standard_fonts")
          .replaceAll("\\", "/") + "/",
    });
    try {
      const pdf = await loading.promise;
      assert.equal(pdf.numPages, 1);
      const items = (
        await (await pdf.getPage(1)).getTextContent()
      ).items.filter((item) => "str" in item);
      assert.ok(
        items.some((item) => item.str === doc.content.basics.email),
        "ordinary email should fit on one line",
      );
      assert.ok(
        items.some(
          (item) => item.str.includes("Lập kế hoạch") && item.width > 250,
        ),
        "skills should fill the available width when there is no main-column content",
      );
    } finally {
      await loading.destroy();
    }
  });

test("renderer rejects invalid input and never accepts user supplied font or image URLs", async () => {
  const draft = emptyResume();
  assert.throws(() =>
    execFileSync(
      process.execPath,
      [
        path.join(root, "dist/cv-renderer/render-cv.mjs"),
        path.join(root, "test-results/invalid.pdf"),
      ],
      {
        input: JSON.stringify({ document: draft }),
        stdio: ["pipe", "pipe", "pipe"],
      },
    ),
  );
  draft.content.basics.full_name = "Nguyễn Minh An";
  draft.content.basics.headline = "Developer";
  draft.content.basics.email = "an@example.test";
  draft.content.skills.push({
    id: crypto.randomUUID(),
    name: "Laravel",
    detail: "API",
  });
  assert.throws(() =>
    execFileSync(
      process.execPath,
      [
        path.join(root, "dist/cv-renderer/render-cv.mjs"),
        path.join(root, "test-results/invalid-photo.pdf"),
      ],
      {
        input: JSON.stringify({
          document: draft,
          photo: "http://127.0.0.1/private",
        }),
        stdio: ["pipe", "pipe", "pipe"],
      },
    ),
  );
});

test("section headings stay with their first entry in complete Vietnamese CVs", async () => {
  const fixture = JSON.parse(
    await readFile(
      path.join(root, "../tests/fixtures/resumes/showcase.json"),
      "utf8",
    ),
  );
  for (const template of TEMPLATE_KEYS) {
    fixture.template_key = template;
    const file = path.join(
      root,
      "test-results/resume-renderer",
      `showcase-${template}-${crypto.randomUUID()}.pdf`,
    );
    execFileSync(
      process.execPath,
      [path.join(root, "dist/cv-renderer/render-cv.mjs"), file],
      { input: JSON.stringify({ document: fixture }) },
    );
    const loading = getDocument({
      data: new Uint8Array(await readFile(file)),
      standardFontDataUrl:
        path
          .join(root, "node_modules/pdfjs-dist/standard_fonts")
          .replaceAll("\\", "/") + "/",
    });
    try {
      const pdf = await loading.promise;
      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index);
        const items = (await page.getTextContent()).items;
        assert.ok(
          items.some(
            (item) =>
              "str" in item && item.str.trim() && item.transform[5] > 42,
          ),
          `${template}: empty trailing page ${index}`,
        );
        const text = items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .normalize("NFC")
          .replace(/\s/g, "");
        if (text.includes("CHỨNGCHỈ"))
          assert.ok(
            text.includes("GoogleUXDesign"),
            `${template}: orphaned certification heading on page ${index}`,
          );
        if (text.includes("DỰÁN"))
          assert.ok(
            text.includes("NềntảnghọctậpCùngTiến"),
            `${template}: orphaned project heading on page ${index}`,
          );
      }
    } finally {
      await loading.destroy();
    }
  }
});

test("valid multiline skill details and long contact text remain visible", async () => {
  for (const template of TEMPLATE_KEYS) {
    const doc = emptyResume();
    doc.template_key = template;
    doc.content.basics.full_name = "W".repeat(120);
    doc.content.basics.headline = "Kỹ sư phần mềm";
    doc.content.basics.email =
      "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + ".test";
    doc.content.skills = [
      {
        id: crypto.randomUUID(),
        name: "Kỹ năng",
        detail: Array.from({ length: 65 }, (_, i) => `S${i + 1}`).join("\n"),
      },
    ];
    doc.content.experience = [
      {
        id: crypto.randomUUID(),
        position: "X\n".repeat(60) + "LAST",
        company: "Công ty",
        start_month: null,
        end_month: null,
        current: false,
        description: "Hoàn thành công việc.",
      },
    ];
    const file = path.join(
      root,
      "test-results/resume-renderer",
      `multiline-${template}-${crypto.randomUUID()}.pdf`,
    );
    execFileSync(
      process.execPath,
      [path.join(root, "dist/cv-renderer/render-cv.mjs"), file],
      {
        input: JSON.stringify({ document: doc }),
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const loading = getDocument({
      data: new Uint8Array(await readFile(file)),
      standardFontDataUrl:
        path
          .join(root, "node_modules/pdfjs-dist/standard_fonts")
          .replaceAll("\\", "/") + "/",
    });
    try {
      const pdf = await loading.promise;
      let visible = "";
      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index);
        const items = (await page.getTextContent()).items;
        visible += items
          .filter(
            (item) =>
              "str" in item &&
              item.transform[5] >= 0 &&
              item.transform[5] <= page.view[3],
          )
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        for (const item of items)
          if ("str" in item && item.str.trim()) {
            assert.ok(
              item.transform[4] + item.width <= page.view[2] - 30,
              `${template}: text exceeds the page right margin`,
            );
          }
      }
      assert.match(visible, /S65/, `${template}: missing final skill line`);
      assert.match(visible, /LAST/, `${template}: missing end of job title`);
    } finally {
      await loading.destroy();
    }
  }
});

test("all ten maximum-length contact links survive pagination in every template", async () => {
  for (const template of TEMPLATE_KEYS) {
    const doc = emptyResume();
    doc.template_key = template;
    doc.content.basics.full_name = "Nguyễn Minh An";
    doc.content.basics.headline = "Kỹ sư phần mềm";
    doc.content.basics.email = "an@example.test";
    doc.content.basics.links = Array.from({ length: 10 }, (_, index) => ({
      id: crypto.randomUUID(),
      label: "",
      url: `https://example.test/${"x".repeat(950)}ENDCONTACT${index}`,
    }));
    doc.content.skills = [
      { id: crypto.randomUUID(), name: "Laravel", detail: "API" },
    ];
    const file = path.join(
      root,
      "test-results/resume-renderer",
      `contacts-${template}.pdf`,
    );
    execFileSync(
      process.execPath,
      [path.join(root, "dist/cv-renderer/render-cv.mjs"), file],
      {
        input: JSON.stringify({ document: doc }),
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const loading = getDocument({ data: new Uint8Array(await readFile(file)) });
    try {
      const pdf = await loading.promise;
      let visible = "";
      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index);
        const items = (await page.getTextContent()).items;
        visible += items
          .filter(
            (item) =>
              "str" in item &&
              item.transform[5] >= 42 &&
              item.transform[5] <= page.view[3] - 30,
          )
          .map((item) => ("str" in item ? item.str : ""))
          .join("");
      }
      visible = visible.replace(/\s/g, "");
      for (const link of doc.content.basics.links)
        assert.ok(
          visible.includes(link.url),
          `${template}: contact link was truncated`,
        );
    } finally {
      await loading.destroy();
    }
  }
});
