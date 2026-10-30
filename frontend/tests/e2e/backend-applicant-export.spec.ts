import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Sheet = { name: string; rows: string[][] };
type Workbook = { name: string; sheets: Sheet[] };

// Inspect the OOXML payload, rather than accepting a renamed HTML/CSV download.
// ZIP entries are read directly; no archive-controlled filesystem paths are used.
function inspectExport(filename: string): Workbook[] {
  const script = String.raw`
    function workbook($path) {
      $zip = new ZipArchive;
      if ($zip->open($path) !== true) throw new RuntimeException('Invalid XLSX');
      $book = simplexml_load_string($zip->getFromName('xl/workbook.xml'));
      $relationships = simplexml_load_string($zip->getFromName('xl/_rels/workbook.xml.rels'));
      $targets = [];
      foreach ($relationships->Relationship as $relationship) {
        $targets[(string) $relationship['Id']] = (string) $relationship['Target'];
      }
      $shared = [];
      if (($strings = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
        foreach (simplexml_load_string($strings)->si as $item) {
          $shared[] = implode('', array_map('strval', $item->xpath('.//*[local-name()="t"]')));
        }
      }
      $sheets = [];
      foreach ($book->sheets->sheet as $sheet) {
        $id = (string) $sheet->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'];
        $target = $targets[$id];
        $target = str_starts_with($target, '/') ? ltrim($target, '/') : 'xl/'.$target;
        $xml = simplexml_load_string($zip->getFromName($target));
        $rows = [];
        foreach ($xml->sheetData->row as $row) {
          $cells = [];
          foreach ($row->c as $cell) {
            if (isset($cell->f)) throw new RuntimeException('Unexpected spreadsheet formula');
            $type = (string) $cell['t'];
            $cells[] = $type === 's' ? $shared[(int) $cell->v] : ($type === 'inlineStr'
              ? implode('', array_map('strval', $cell->xpath('.//*[local-name()="t"]'))) : (string) $cell->v);
          }
          $rows[] = $cells;
        }
        $sheets[] = ['name' => (string) $sheet['name'], 'rows' => $rows];
      }
      $zip->close();
      return $sheets;
    }
    $path = $argv[1];
    if (str_ends_with(strtolower($path), '.xlsx')) {
      $result = [['name' => basename($path), 'sheets' => workbook($path)]];
    } else {
      $archive = new ZipArchive;
      if ($archive->open($path) !== true) throw new RuntimeException('Invalid ZIP');
      $result = [];
      for ($i = 0; $i < $archive->numFiles; $i++) {
        $name = $archive->getNameIndex($i);
        if (!str_ends_with($name, '.xlsx') || basename($name) !== $name) throw new RuntimeException('Unexpected archive entry');
        $temporary = tempnam(sys_get_temp_dir(), 'applicant-e2e-');
        try {
          file_put_contents($temporary, $archive->getFromIndex($i));
          $result[] = ['name' => $name, 'sheets' => workbook($temporary)];
        } finally { unlink($temporary); }
      }
      $archive->close();
    }
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
  `;
  return JSON.parse(
    execFileSync(process.env.PHP_BINARY || "php", ["-r", script, filename], {
      encoding: "utf8",
      timeout: 15_000,
    }),
  ) as Workbook[];
}

async function loginEmployer(page: Page) {
  await page.goto("/login?returnTo=%2Femployer%2Fjobs");
  await page
    .getByLabel("Email", { exact: true })
    .fill("employer@frontend-e2e.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("BrowserTest1!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/employer\/jobs$/);
}

test("employer downloads one applicant workbook, a multi-sheet workbook and separate workbooks", async ({
  page,
}, info) => {
  await loginEmployer(page);
  const selectedJob = "Frontend Engineer E2E";
  await page
    .getByRole("checkbox", { name: `Chọn tin ${selectedJob}`, exact: true })
    .check();
  const openExport = page.getByRole("button", {
    name: "Xuất danh sách",
    exact: true,
  });
  await openExport.click();
  const dialog = page.getByRole("dialog", {
    name: "Xuất danh sách ứng viên",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(openExport).toBeFocused();
  await openExport.press("Enter");

  async function download(name: string, extension: "xlsx" | "zip") {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/backend/employer/applications/export") &&
        response.request().method() === "POST",
    );
    const [downloaded] = await Promise.all([
      page.waitForEvent("download"),
      dialog
        .getByRole("button", { name: "Tải danh sách", exact: true })
        .click(),
    ]);
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain(
      extension === "zip"
        ? "application/zip"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(downloaded.suggestedFilename()).toMatch(
      new RegExp(`\\.${extension}$`),
    );
    expect(downloaded.suggestedFilename()).not.toMatch(/[\\/]/);
    const destination = info.outputPath(`${name}.${extension}`);
    await downloaded.saveAs(destination);
    expect(readFileSync(destination).subarray(0, 4)).toEqual(
      Buffer.from([0x50, 0x4b, 3, 4]),
    );
    await expect(dialog).toBeHidden();
    return inspectExport(destination);
  }

  const single = await download("single-job", "xlsx");
  expect(single).toHaveLength(1);
  expect(single[0].sheets).toHaveLength(1);
  expect(single[0].sheets[0].name).toContain(selectedJob);
  expect(single[0].sheets[0].rows[0]).toContain("Họ và tên");
  expect(single[0].sheets[0].rows.flat()).toContain(
    "candidate@frontend-e2e.test",
  );
  expect(single[0].sheets[0].rows.flat()).toContain("0912345678");

  await page
    .getByRole("checkbox", {
      name: "Chọn tin Backend Engineer E2E",
      exact: true,
    })
    .check();
  await page
    .getByRole("checkbox", {
      name: "Chọn tin Closed Engineer E2E",
      exact: true,
    })
    .check();
  await openExport.click();
  await dialog.getByRole("radio", { name: /Một file Excel/ }).check();
  const combined = await download("all-jobs", "xlsx");
  expect(combined[0].sheets).toHaveLength(3);
  expect(new Set(combined[0].sheets.map((sheet) => sheet.name)).size).toBe(3);
  for (const sheet of combined[0].sheets)
    expect(sheet.rows[0]).toContain("Họ và tên");
  expect(
    combined[0].sheets.find((sheet) =>
      sheet.name.includes("Closed Engineer E2E"),
    )?.rows,
  ).toHaveLength(1);

  await page.setViewportSize({ width: 360, height: 800 });
  await openExport.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: /File riêng cho từng tin/ }).check();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(361);
  await page.screenshot({
    path: info.outputPath("applicant-export-mobile.png"),
    fullPage: true,
  });
  const separate = await download("separate-jobs", "zip");
  expect(separate).toHaveLength(3);
  expect(new Set(separate.map((workbook) => workbook.name)).size).toBe(3);
  expect(separate.every((workbook) => workbook.sheets.length === 1)).toBe(true);
  expect(
    separate.flatMap((workbook) =>
      workbook.sheets.flatMap((sheet) => sheet.rows.flat()),
    ),
  ).toContain("candidate@frontend-e2e.test");
});
