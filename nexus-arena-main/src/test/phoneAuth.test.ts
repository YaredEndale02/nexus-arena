import { describe, expect, it } from "vitest";
import { normalizePhoneNumber, isPhoneNumber, toAuthEmailCredential } from "@/lib/phoneAuth";

describe("phoneAuth", () => {
  it("normalizes Ethiopian 09 and 07 phone numbers", () => {
    expect(normalizePhoneNumber("0911223344")).toBe("251911223344");
    expect(normalizePhoneNumber("0712345678")).toBe("251712345678");
    expect(normalizePhoneNumber("+251911223344")).toBe("251911223344");
  });

  it("identifies phone numbers vs emails", () => {
    expect(isPhoneNumber("0911223344")).toBe(true);
    expect(isPhoneNumber("+251911223344")).toBe(true);
    expect(isPhoneNumber("player@example.com")).toBe(false);
  });

  it("converts phone numbers to synthetic auth emails", () => {
    expect(toAuthEmailCredential("0911223344")).toBe("251911223344@phone.nexus");
    expect(toAuthEmailCredential("player@example.com")).toBe("player@example.com");
  });
});
