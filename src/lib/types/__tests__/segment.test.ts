import { describe, it, expect } from "vitest";
import {
  SEGMENT_VALUES,
  SEGMENT_LABELS,
  SEGMENT_TO_CATEGORIES,
  isSegment,
  type Segment,
} from "@/lib/types/segment";

describe("segment type contracts", () => {
  it("SEGMENT_VALUES contains exactly health, general, athlete", () => {
    expect([...SEGMENT_VALUES]).toEqual(["health", "general", "athlete"]);
  });

  it("SEGMENT_LABELS maps each segment to Korean label per D-01", () => {
    expect(SEGMENT_LABELS.health).toBe("발 건강 고민");
    expect(SEGMENT_LABELS.general).toBe("일반 소비자");
    expect(SEGMENT_LABELS.athlete).toBe("운동선수");
  });

  it("SEGMENT_TO_CATEGORIES has a non-empty slug list for every segment", () => {
    for (const segment of SEGMENT_VALUES) {
      const slugs = SEGMENT_TO_CATEGORIES[segment];
      expect(Array.isArray(slugs)).toBe(true);
      expect(slugs.length).toBeGreaterThan(0);
      for (const slug of slugs) {
        expect(typeof slug).toBe("string");
        expect(slug.length).toBeGreaterThan(0);
      }
    }
  });

  describe("isSegment", () => {
    it("accepts every declared segment value", () => {
      for (const segment of SEGMENT_VALUES) {
        expect(isSegment(segment)).toBe(true);
      }
    });

    it("rejects unknown strings, null, undefined, objects, numbers", () => {
      expect(isSegment("unknown")).toBe(false);
      expect(isSegment("")).toBe(false);
      expect(isSegment(null)).toBe(false);
      expect(isSegment(undefined)).toBe(false);
      expect(isSegment(42)).toBe(false);
      expect(isSegment({ segment: "health" })).toBe(false);
    });

    it("narrows the input type to Segment", () => {
      const raw: unknown = "athlete";
      if (isSegment(raw)) {
        // Type assertion — compiler should accept Segment here.
        const s: Segment = raw;
        expect(s).toBe("athlete");
      } else {
        throw new Error("expected isSegment to narrow correctly");
      }
    });
  });
});
