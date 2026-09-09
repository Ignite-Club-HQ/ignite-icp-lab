# Source reference: supabase/functions/recover-account/index_test.ts

Sanitized, inert source; not executable or a production schema export.

````text
import { assertEquals } from "https://reference.invalid";
import { extractBearerToken } from "./index.ts";

Deno.test("extractBearerToken: null header returns null", () => {
  assertEquals(extractBearerToken(null), null);
});

Deno.test("extractBearerToken: empty header returns null", () => {
  assertEquals(extractBearerToken(""), null);
});

Deno.test("extractBearerToken: missing Bearer prefix returns null", () => {
  assertEquals(extractBearerToken("abc.def.ghi"), null);
});

Deno.test("extractBearerToken: Bearer with empty token returns null", () => {
  assertEquals(extractBearerToken("Bearer "), null);
});

Deno.test("extractBearerToken: Bearer with whitespace-only token returns null", () => {
  assertEquals(extractBearerToken("Bearer      "), null);
});

Deno.test("extractBearerToken: literal 'undefined' returns null", () => {
  assertEquals(extractBearerToken("Bearer undefined"), null);
});

Deno.test("extractBearerToken: literal 'null' returns null", () => {
  assertEquals(extractBearerToken("Bearer null"), null);
});

Deno.test("extractBearerToken: literal 'UNDEFINED' (case-insensitive) returns null", () => {
  assertEquals(extractBearerToken("Bearer UNDEFINED"), null);
});

Deno.test("extractBearerToken: valid token returned trimmed", () => {
  assertEquals(extractBearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
});

Deno.test("extractBearerToken: case-insensitive bearer prefix accepted", () => {
  assertEquals(extractBearerToken("bearer abc.def.ghi"), "abc.def.ghi");
});

````
