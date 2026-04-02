import { test, expect } from "bun:test";
import './src/tests/setup-browser-env';

test("global document exists", () => {
  expect(globalThis.document).toBeDefined();
  expect((globalThis as any).document.body).toBeDefined();
  expect(document).toBeDefined();
  expect(document.body).toBeDefined();
});
