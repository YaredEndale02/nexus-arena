import { describe, expect, it } from "vitest";
import { calculateTimeLeft } from "@/components/RegistrationCountdown";

describe("calculateTimeLeft", () => {
  it("returns zeros and isExpired for null/empty dates", () => {
    const result = calculateTimeLeft(null);
    expect(result.isExpired).toBe(true);
    expect(result.totalSeconds).toBe(0);
  });

  it("returns zeros and isExpired for past dates", () => {
    const pastDate = new Date(Date.now() - 100000).toISOString();
    const result = calculateTimeLeft(pastDate);
    expect(result.isExpired).toBe(true);
    expect(result.totalSeconds).toBe(0);
  });

  it("correctly calculates days, hours, minutes, seconds for future dates", () => {
    // 2 days, 3 hours, 15 minutes, 30 seconds into the future
    const futureMs = (2 * 86400 + 3 * 3600 + 15 * 60 + 30) * 1000;
    const futureDate = new Date(Date.now() + futureMs).toISOString();

    const result = calculateTimeLeft(futureDate);
    expect(result.isExpired).toBe(false);
    expect(result.days).toBe(2);
    expect(result.hours).toBe(3);
    expect(result.minutes).toBe(15);
    // Allow 1 second rounding flexibility in test execution
    expect(result.seconds).toBeGreaterThanOrEqual(29);
    expect(result.seconds).toBeLessThanOrEqual(30);
  });
});
