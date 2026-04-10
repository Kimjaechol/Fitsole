import { describe, it, expect, afterEach, beforeEach } from "vitest";

import { STORE_GANGNAM, getKakaoStaticMapUrl } from "@/lib/stores/constants";

describe("STORE_GANGNAM constant (D-12)", () => {
  it("exports all required fields", () => {
    expect(STORE_GANGNAM.slug).toBe("gangnam");
    expect(STORE_GANGNAM.name).toBe("FitSole 강남점");
    expect(STORE_GANGNAM.address).toBe(
      "서울특별시 강남구 강남역 지하상가"
    );
    expect(STORE_GANGNAM.hours.weekday).toBe("평일 10:00-21:00");
    expect(STORE_GANGNAM.hours.weekend).toBe("주말 10:00-20:00");
    expect(typeof STORE_GANGNAM.phone).toBe("string");
    expect(typeof STORE_GANGNAM.lat).toBe("number");
    expect(typeof STORE_GANGNAM.lng).toBe("number");
  });
});

describe("getKakaoStaticMapUrl helper (D-13)", () => {
  const ORIGINAL_ENV = process.env.KAKAO_MAP_KEY;

  beforeEach(() => {
    delete process.env.KAKAO_MAP_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.KAKAO_MAP_KEY;
    } else {
      process.env.KAKAO_MAP_KEY = ORIGINAL_ENV;
    }
  });

  it("returns null when KAKAO_MAP_KEY env var is not set", () => {
    expect(getKakaoStaticMapUrl(STORE_GANGNAM)).toBeNull();
  });

  it("returns a dapi.kakao.com URL when KAKAO_MAP_KEY is set", () => {
    process.env.KAKAO_MAP_KEY = "test-key";
    const url = getKakaoStaticMapUrl(STORE_GANGNAM);
    expect(url).not.toBeNull();
    expect(url).toContain("dapi.kakao.com");
    expect(url).toContain(String(STORE_GANGNAM.lat));
    expect(url).toContain(String(STORE_GANGNAM.lng));
  });
});
