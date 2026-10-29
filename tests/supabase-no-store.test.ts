import { afterEach, describe, expect, it, vi } from "vitest";
import { createStatelessClient } from "@/lib/supabase/server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("createStatelessClient", () => {
  it("returns null when Supabase isn't set up", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(createStatelessClient()).toBeNull();
  });

  it("asks Supabase afresh every time: no read is cached", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const fetchMock = vi.fn(
      async () =>
        new Response("[]", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const supabase = createStatelessClient();
    await supabase!.from("inventory").select("sku");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = (
      fetchMock.mock.calls[0] as unknown as [unknown, RequestInit]
    )[1];
    expect(init.cache).toBe("no-store");
  });
});
