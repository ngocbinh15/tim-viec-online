import { test } from "node:test";
import assert from "node:assert/strict";
import {
  displayBirthDate,
  parseBirthDate,
  readBirthDate,
  serializeBirthDate,
} from "../src/features/auth/birth-date";

test("birthdays round trip between Vietnamese display and ISO transport without a timezone shift", () => {
  for (const iso of ["2000-05-20", "2000-02-29", "0099-01-01"]) {
    const date = parseBirthDate(iso);
    assert.ok(date);
    assert.equal(serializeBirthDate(date), iso);
    assert.equal(readBirthDate(displayBirthDate(iso)), iso);
  }
});

test("invalid or incomplete birthday edits stay invalid instead of rolling over", () => {
  for (const text of ["31/04/2000", "29/02/2001", "00/12/2000", "20/05/", ""]) {
    assert.equal(readBirthDate(text), text);
  }
  for (const iso of ["2001-02-29", "2000-04-31", "0000-01-01", "2000-13-01"]) {
    assert.equal(parseBirthDate(iso), undefined);
  }
});

test("digit-only mobile input formats into the same ISO birthday", () => {
  assert.equal(readBirthDate("20052000"), "2000-05-20");
  assert.equal(displayBirthDate(readBirthDate("20052000")), "20/05/2000");
  assert.equal(readBirthDate("31042000"), "31042000");
});
