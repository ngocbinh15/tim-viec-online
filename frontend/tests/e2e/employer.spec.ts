import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginMock, logoutMock, mockAccounts } from "./helpers/mock-auth";
import { waitForSettledWorkspace } from "./helpers/workspace-ready";

const backendTitle = "Lập trình viên Backend Laravel (Middle)";
const employerNavigation = (page: Page) =>
  page.locator(".ep-sidebar").getByRole("navigation", {
    name: "Điều hướng nhà tuyển dụng",
    exact: true,
  });
async function navigate(page: Page, name: string) {
  const navigation = employerNavigation(page);
  if (await navigation.isVisible())
    await navigation.getByRole("link", { name, exact: true }).click();
  else {
    await page
      .getByRole("button", {
        name: "Mở điều hướng nhà tuyển dụng",
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("navigation", {
        name: "Điều hướng nhà tuyển dụng",
        exact: true,
      })
      .getByRole("link", { name, exact: true })
      .click();
  }
}
async function select(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(page.getByRole("listbox")).toBeHidden();
}

test("employer leaf routes reject anonymous access without exposing workspace data", async ({
  page,
}) => {
  test.setTimeout(60_000);
  for (const path of [
    "/employer",
    "/employer/company",
    "/employer/jobs",
    "/employer/jobs/new",
    "/employer/jobs/1/edit",
    "/employer/candidates/1",
    "/employer/messages?conversation=1",
    "/employer/notifications",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?/);
    expect(new URL(page.url()).searchParams.get("role")).toBe("employer");
    await expect(
      page.getByRole("button", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".ep-job-table,.ec-candidate,.em-chat-message,.em-not-item"),
    ).toHaveCount(0);
  }
});

test("role guards reject candidates while employer login returns to an allowed deep link", async ({
  page,
}) => {
  await loginMock(page, "candidate");
  await page.goto("/employer/jobs/new");
  await expect(page).toHaveURL(/\/jobs$/);
  await logoutMock(page);
  await page.goto("/employer/messages?conversation=3");
  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
    "/employer/messages?conversation=3",
  );
  await page
    .getByLabel("Email", { exact: true })
    .fill(mockAccounts.employer.email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(mockAccounts.employer.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/employer\/messages\?conversation=3$/);
  await expect(page.locator("#em-chat-title")).toHaveText("Đỗ Thùy Dương");
  await logoutMock(page);
  await page.goto("/employer/company");
  await expect(page).toHaveURL(/\/login\?/);
});

test("sidebar and header persist with a stable width across employer navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loginMock(page, "employer");
  const sidebar = page.locator(".ep-sidebar");
  await expect(sidebar).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await sidebar.evaluate((node) =>
    node.setAttribute("data-persistence-check", "sidebar"),
  );
  await page
    .locator(".ep-header")
    .evaluate((node) => node.setAttribute("data-persistence-check", "header"));
  const width = (await sidebar.boundingBox())!.width;
  for (const name of [
    "Tin tuyển dụng",
    "Hồ sơ ứng viên",
    "Tin nhắn",
    "Thông báo",
    "Hồ sơ công ty",
    "Tổng quan",
  ]) {
    await navigate(page, name);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(sidebar).toHaveAttribute("data-persistence-check", "sidebar");
    await expect(page.locator(".ep-header")).toHaveAttribute(
      "data-persistence-check",
      "header",
    );
    await expect(
      employerNavigation(page).getByRole("link", { name, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    expect((await sidebar.boundingBox())!.width).toBe(width);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.locator(".ep-header")).toHaveCount(1);
  }
});

test("company form validates unsafe websites and shares saved identity throughout the shell", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/company");
  await page.getByLabel("Website", { exact: true }).fill("javascript:alert(1)");
  await page
    .getByRole("button", { name: "Lưu thông tin công ty", exact: true })
    .click();
  await expect(
    page.getByText("Nhập website http hoặc https hợp lệ.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Tên công ty", { exact: true })
    .fill("Công ty Sản phẩm Việt");
  await page
    .getByLabel("Website", { exact: true })
    .fill("https://sanphamviet.example");
  await page
    .getByRole("button", { name: "Lưu thông tin công ty", exact: true })
    .click();
  await expect(page.locator(".ep-header-account")).toContainText(
    "Công ty Sản phẩm Việt",
  );
  await expect(page.locator(".ep-company-preview")).toContainText(
    "Công ty Sản phẩm Việt",
  );
  await navigate(page, "Tin tuyển dụng");
  await navigate(page, "Hồ sơ công ty");
  await expect(page.getByLabel("Tên công ty", { exact: true })).toHaveValue(
    "Công ty Sản phẩm Việt",
  );
  await expect(page.getByLabel("Email đăng nhập", { exact: true })).toHaveValue(
    mockAccounts.employer.email,
  );
});

test("job creation uses custom date selection and validates salary modes before editing the new record", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await loginMock(page, "employer", "/employer/jobs/new");
  const form = page.getByRole("form", {
    name: "Soạn tin tuyển dụng",
    exact: true,
  });
  await form
    .getByRole("button", { name: "Đăng tin tuyển dụng", exact: true })
    .click();
  await expect(
    page.getByText("Tiêu đề từ 10 đến 200 ký tự.", { exact: true }),
  ).toBeVisible();
  await expect(form.locator('[data-slot="deadline-help"]')).toHaveAttribute(
    "role",
    "alert",
  );
  await form
    .getByLabel("Tiêu đề việc làm", { exact: true })
    .fill("Kỹ sư sản phẩm kiểm thử E2E");
  await page.getByRole("combobox", { name: "Ngành nghề", exact: true }).click();
  await page.getByRole("option").nth(1).click();
  await select(page, "Cấp bậc", "Middle");
  await page
    .getByRole("combobox", { name: "Tỉnh / Thành phố", exact: true })
    .click();
  await page.getByLabel("Tìm tỉnh / thành phố", { exact: true }).fill("ha noi");
  await page.getByRole("option", { name: "Hà Nội", exact: true }).click();
  await form
    .getByLabel("Địa chỉ làm việc chi tiết", { exact: true })
    .fill("Khu Công nghệ cao Hòa Lạc, Hà Nội");
  await page
    .getByRole("combobox", { name: "Hạn chót nộp hồ sơ", exact: true })
    .click();
  const calendar = page.getByRole("dialog", {
    name: "Lịch chọn hạn nộp hồ sơ",
    exact: true,
  });
  await expect(calendar).toBeVisible();
  const today = calendar.locator('[data-today="true"] button');
  if (await today.count()) await expect(today).toBeDisabled();
  await calendar.locator("button[data-day]:not(:disabled)").last().click();
  await expect(calendar).not.toBeVisible();
  await expect(page.locator('input[type="date"]')).toHaveCount(0);
  await form.getByLabel("Lương tối thiểu", { exact: true }).fill("30000000");
  await form.getByLabel("Lương tối đa", { exact: true }).fill("20000000");
  await form
    .getByLabel("Mô tả công việc", { exact: true })
    .fill("Phát triển sản phẩm và phối hợp cùng nhóm kỹ thuật.");
  await form
    .getByLabel("Yêu cầu chuyên môn", { exact: true })
    .fill("Có kinh nghiệm TypeScript và phát triển sản phẩm web.");
  await form
    .getByLabel("Quyền lợi & đãi ngộ", { exact: true })
    .fill("Lương tháng 13 và bảo hiểm theo quy định.");
  await form
    .getByRole("button", { name: "Đăng tin tuyển dụng", exact: true })
    .click();
  await expect(
    page.getByText("Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.", {
      exact: true,
    }),
  ).toBeVisible();
  await select(page, "Hình thức hiển thị lương", "Thỏa thuận");
  await expect(
    form.getByLabel("Lương tối thiểu", { exact: true }),
  ).toBeDisabled();
  await expect(form.getByLabel("Lương tối đa", { exact: true })).toBeDisabled();
  await form
    .getByRole("button", { name: "Đăng tin tuyển dụng", exact: true })
    .click();
  await expect(page).toHaveURL(/\/employer\/jobs$/);
  const row = page
    .locator(".ep-job-table tbody tr")
    .filter({ hasText: "Kỹ sư sản phẩm kiểm thử E2E" });
  await expect(row).toContainText("Thỏa thuận");
  await row
    .getByRole("link", {
      name: "Sửa tin Kỹ sư sản phẩm kiểm thử E2E",
      exact: true,
    })
    .click();
  await select(page, "Hình thức hiển thị lương", "Lương khởi điểm");
  await expect(form.getByLabel("Lương tối đa", { exact: true })).toBeDisabled();
  await form.getByLabel("Lương tối thiểu", { exact: true }).fill("25000000");
  await expect(form.getByLabel("Lương tối thiểu", { exact: true })).toHaveValue(
    "25000000",
  );
  await form.getByLabel("Lương tối thiểu", { exact: true }).blur();
  await expect(form.getByLabel("Lương tối thiểu", { exact: true })).toHaveValue(
    "25000000",
  );
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page).toHaveURL(/\/employer\/jobs$/);
  await expect(row).toContainText("Từ 25 triệu VNĐ");
});

test("closing a job preserves its applications and permits reopening through confirmation", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/jobs");
  const row = page
    .locator(".ep-job-table tbody tr")
    .filter({ hasText: backendTitle });
  const applicationCount = await row
    .locator(".ep-application-count")
    .innerText();
  await row.getByRole("button", { name: "Đóng tin", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText(
    "Hồ sơ đã nhận và hội thoại vẫn được bảo lưu",
  );
  await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(row.locator(".ep-status")).toHaveText("Đã đóng");
  await expect(row.locator(".ep-application-count")).toHaveText(
    applicationCount,
  );
  await row
    .getByRole("link", { name: `Xem hồ sơ cho ${backendTitle}`, exact: true })
    .click();
  await expect(page.locator(".ec-candidate")).toHaveCount(
    Number(applicationCount),
  );
  await expect(page.getByRole("link", { name: /Nguyễn Văn An/ })).toBeVisible();
  await navigate(page, "Tin tuyển dụng");
  await row.getByRole("button", { name: "Mở lại tin", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(row.locator(".ep-status")).toHaveText("Đang tuyển");
});

test("opening the real demo PDF transitions an applied CV to waiting and restores keyboard focus", async ({
  page,
  request,
}) => {
  await loginMock(page, "employer", "/employer/candidates/1");
  const profile = page.locator(".ea-detail:visible");
  await expect(profile.locator(".ec-status")).toHaveText("Đã ứng tuyển");
  const open = profile.getByRole("button", {
    name: "Xem CV ứng tuyển",
    exact: true,
  });
  await open.click();
  const dialog = page.getByRole("dialog", {
    name: "CV ứng tuyển — Nguyễn Văn An",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveAttribute(
    "src",
    "/demo/employer-cv.pdf",
  );
  const pdf = await request.get("/demo/employer-cv.pdf");
  expect(pdf.ok()).toBeTruthy();
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await expect(
    dialog.getByRole("link", { name: "Tải CV minh họa", exact: true }),
  ).toHaveAttribute("download", "CV_minh_hoa.pdf");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  await expect(profile.locator(".ec-status")).toHaveText("Đang xem xét");
  await select(page, "Trạng thái xét duyệt", "Trúng tuyển");
  await profile
    .getByRole("button", { name: "Cập nhật trạng thái", exact: true })
    .click();
  await expect(profile.locator(".ec-status")).toHaveText("Trúng tuyển");
});

test("withdrawn applications block review and new conversations while missing CVs retain applied status", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/candidates/5");
  const profile = page.locator(".ea-detail:visible");
  await expect(
    profile.getByRole("heading", { name: "Phạm Quang Huy", exact: true }),
  ).toBeVisible();
  await expect(profile.locator(".ec-status")).toHaveText("Đã rút đơn");
  await expect(
    profile.getByRole("button", { name: "Xem CV ứng tuyển", exact: true }),
  ).toHaveCount(0);
  await expect(
    profile.getByRole("combobox", {
      name: "Trạng thái xét duyệt",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    profile.getByRole("button", { name: "Nhắn tin cho ứng viên", exact: true }),
  ).toBeDisabled();
  await expect(page).toHaveURL(/candidates\/5$/);
  await page.goto("/employer/candidates/8");
  await expect(
    profile.getByRole("heading", { name: "Bùi Ngọc Mai", exact: true }),
  ).toBeVisible();
  await expect(
    profile.getByRole("button", { name: "Xem CV ứng tuyển", exact: true }),
  ).toHaveCount(0);
  await expect(profile.locator(".ec-status")).toHaveText("Đã ứng tuyển");
  await expect(
    page.getByText("Hồ sơ này chưa có kết quả phân tích AI.", { exact: true }),
  ).toBeVisible();
});

test("closed-job chat retains per-thread drafts, ignores IME submission and sends text safely without network writes", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/messages?conversation=3");
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
  });
  await expect(page.locator(".em-chat-preserved")).toContainText(
    "vẫn có thể trao đổi",
  );
  const composer = page.getByLabel("Tin nhắn của bạn", { exact: true });
  await composer.fill("   ");
  await page.getByRole("button", { name: "Gửi tin nhắn", exact: true }).click();
  await expect(
    page.getByText("Nhập tin nhắn từ 1 đến 1.000 ký tự.", { exact: true }),
  ).toBeVisible();
  await expect(composer).toBeFocused();
  await composer.fill("Bản nháp cho vị trí đã đóng");
  await page.getByRole("button", { name: /Trần Thị Linh/ }).click();
  await expect(composer).toHaveValue("");
  await composer.fill("Bản nháp khác");
  await page.getByRole("button", { name: /Đỗ Thùy Dương/ }).click();
  await expect(composer).toHaveValue("Bản nháp cho vị trí đã đóng");
  const payload = '<img src=x onerror="window.bad=true">';
  await composer.fill(payload);
  const count = await page.locator(".em-chat-message").count();
  await composer.dispatchEvent("keydown", {
    key: "Enter",
    isComposing: true,
  });
  await expect(page.locator(".em-chat-message")).toHaveCount(count);
  await composer.press("Control+Enter");
  await expect(composer).toHaveValue(payload + "\n");
  await expect(page.locator(".em-chat-message")).toHaveCount(count);
  await composer.press("Enter");
  await expect(page.locator(".em-chat-message")).toHaveCount(count + 1);
  await expect(page.locator(".em-chat-message").last()).toContainText(payload);
  await expect(page.locator(".em-chat-message img")).toHaveCount(0);
  await expect(composer).toHaveValue("");
  await navigate(page, "Thông báo");
  await page.goBack();
  await expect(page.locator(".em-chat-message").last()).toContainText(payload);
  expect(writes).toEqual([]);
  await page.goto("/employer/messages?conversation=999999");
  await expect(
    page.getByRole("heading", {
      name: "Không tìm thấy hội thoại",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".em-chat-message")).toHaveCount(0);
});

test("notification read filters, action destinations and mark-all persist across sidebar navigation", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/notifications?read=unread");
  await expect(page.locator(".em-not-item")).toHaveCount(3);
  await expect(
    page
      .locator(".em-not-heading")
      .getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true }),
  ).toBeVisible();
  const first = page
    .locator(".em-not-item")
    .filter({ hasText: "Nguyễn Văn An vừa ứng tuyển" });
  await first.getByRole("link", { name: "Xem hồ sơ", exact: true }).click();
  await expect(page).toHaveURL(/\/employer\/candidates\/1$/);
  await expect(page.locator(".ea-detail:visible")).toContainText(
    "Nguyễn Văn An",
  );
  await navigate(page, "Thông báo");
  await expect(page.locator(".em-not-item[data-unread=true]")).toHaveCount(2);
  await page
    .getByRole("navigation", { name: "Lọc trạng thái đọc", exact: true })
    .getByRole("link", { name: /Chưa đọc/ })
    .click();
  await page
    .getByRole("button", { name: "Đánh dấu đã đọc", exact: true })
    .first()
    .click();
  await expect(page.locator(".em-not-item")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true })
    .click();
  await expect(page.locator(".em-not-item")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true }),
  ).toBeDisabled();
  await navigate(page, "Tin nhắn");
  await navigate(page, "Thông báo");
  await expect(page.locator(".em-not-item[data-unread=true]")).toHaveCount(0);
});

test("mobile chat opens one thread at a time and restores list focus without marking hidden threads read", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await loginMock(page, "employer", "/employer/messages");
  const thread = page.getByRole("button", { name: /Nguyễn Văn An/ });
  await expect(
    page.getByLabel("Tin nhắn của bạn", { exact: true }),
  ).not.toBeVisible();
  await expect(
    thread.getByLabel("1 tin nhắn chưa đọc", { exact: true }),
  ).toBeVisible();
  await thread.click();
  await expect(page.locator("#em-chat-title")).toBeFocused();
  await expect(
    page.getByLabel("Tin nhắn của bạn", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Danh sách hội thoại", exact: true })
    .click();
  await expect(thread).toBeFocused();
  await expect(
    thread.getByLabel("1 tin nhắn chưa đọc", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Tìm hội thoại", { exact: true }).fill("khongco");
  await expect(
    page.getByText("Không tìm thấy hội thoại", { exact: true }),
  ).toBeVisible();
});

test("required dropdowns have unique choices, retain selection and support keyboard navigation", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/candidates");
  const sort = page.getByRole("combobox", {
    name: "Sắp xếp hồ sơ",
    exact: true,
  });
  await sort.click();
  await expect(page.getByRole("option")).toHaveCount(3);
  await expect(
    page.getByRole("option", { name: "Điểm AI cao nhất", exact: true }),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(sort).toBeFocused();
  await page.goto("/employer/candidates/2");
  const review = page.getByRole("combobox", {
    name: "Trạng thái xét duyệt",
    exact: true,
  });
  await expect(review).toHaveText("Đang xem xét");
  await review.click();
  await expect(page.getByRole("option")).toHaveCount(3);
  await expect(
    page.getByRole("option", { name: "Đang xem xét", exact: true }),
  ).toHaveCount(1);
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { name: "Từ chối", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(review).toHaveText("Từ chối");
  await expect(
    page.locator(".ec-review .selection-clear,.ec-sort .selection-clear"),
  ).toHaveCount(0);
});

test("quantity and salary suffixes reserve space while number keyboard controls work", async ({
  page,
}) => {
  await loginMock(page, "employer", "/employer/jobs/new");
  const quantity = page.getByRole("spinbutton", {
    name: "Số lượng tuyển",
    exact: true,
  });
  await quantity.fill("1");
  await quantity.press("ArrowUp");
  await expect(quantity).toHaveValue("2");
  for (const suffix of await page.locator(".ep-input-suffix").all()) {
    const bounds = await suffix.evaluate((node) => ({
      input: node.querySelector("input")!.getBoundingClientRect().right,
      unit: node.querySelector("span")!.getBoundingClientRect().left,
    }));
    expect(bounds.input).toBeLessThanOrEqual(bounds.unit + 1);
  }
  await page
    .getByRole("combobox", { name: "Hình thức hiển thị lương", exact: true })
    .click();
  await expect(page.getByRole("option")).toHaveCount(3);
  await expect(
    page.getByRole("option", { name: "Khoảng lương cụ thể", exact: true }),
  ).toHaveCount(1);
});

for (const width of [360, 768, 1440]) {
  test(`employer pages remain usable and accessible at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    await loginMock(page, "employer");
    for (const [label, path] of [
      ["dashboard", "/employer"],
      ["jobs", "/employer/jobs"],
      ["company", "/employer/company"],
      ["new-job", "/employer/jobs/new"],
      ["candidates", "/employer/candidates"],
      ["application-detail", "/employer/candidates/1"],
      ["messages", "/employer/messages?conversation=1"],
      ["notifications", "/employer/notifications"],
    ]) {
      await page.goto(path);
      await waitForSettledWorkspace(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`${label}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
  });
}
