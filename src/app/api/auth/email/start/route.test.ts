import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  verifyTurnstile: vi.fn(),
  storeCode: vi.fn(),
  sendCodeEmail: vi.fn(),
}));
vi.mock("@/lib/server/turnstile", () => ({ verifyTurnstile: m.verifyTurnstile }));
vi.mock("@/lib/server/email", async (orig) => ({
  ...(await orig<typeof import("@/lib/server/email")>()),
  genCode: () => "123456",
  issueEnvelope: () => "signed-envelope",
  storeCode: m.storeCode,
  sendCodeEmail: m.sendCodeEmail,
}));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(new Request("http://x/api/auth/email/start", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }));

beforeEach(() => {
  m.verifyTurnstile.mockReset().mockResolvedValue({ ok: true });
  m.storeCode.mockReset().mockResolvedValue(true);
  m.sendCodeEmail.mockReset().mockResolvedValue({ sent: true });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("POST /api/auth/email/start", () => {
  it("sends a code and returns the challenge", async () => {
    const res = await post({ email: "  Sam@Example.com ", turnstile: "tok" });
    expect(await res.json()).toEqual({ ok: true, sent: true, challenge: "signed-envelope", expires_in_seconds: 600 });
    expect(m.verifyTurnstile).toHaveBeenCalledWith("tok", "1.2.3.4");
    expect(m.storeCode).toHaveBeenCalledWith("sam@example.com", "123456");
    expect(m.sendCodeEmail).toHaveBeenCalledWith("sam@example.com", "123456");
  });

  it("rejects an invalid or missing email before anything else runs", async () => {
    expect(await (await post({ email: "nope" })).json()).toEqual({ ok: false, reason: "invalid_email" });
    expect(await (await post("{bad json")).json()).toEqual({ ok: false, reason: "invalid_email" });
    expect(m.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("stops at the captcha gate without sending mail", async () => {
    m.verifyTurnstile.mockResolvedValue({ ok: false, reason: "captcha_required" });
    expect(await (await post({ email: "a@b.co" })).json()).toEqual({ ok: false, reason: "captcha_required" });
    expect(m.storeCode).not.toHaveBeenCalled();
    expect(m.sendCodeEmail).not.toHaveBeenCalled();
  });

  it("applies the resend lock", async () => {
    m.storeCode.mockResolvedValue(false);
    expect(await (await post({ email: "a@b.co" })).json()).toEqual({ ok: false, reason: "too_soon", retry_in_seconds: 30 });
    expect(m.sendCodeEmail).not.toHaveBeenCalled();
  });

  it("returns the code in demo mode when no mail provider is set", async () => {
    m.sendCodeEmail.mockResolvedValue({ sent: false, demo: true, code: "123456" });
    expect(await (await post({ email: "a@b.co" })).json()).toMatchObject({ ok: true, sent: false, demo: true, code: "123456" });
  });

  it("reports send_failed when the provider errors", async () => {
    m.sendCodeEmail.mockResolvedValue({ sent: false, error: "boom" });
    expect(await (await post({ email: "a@b.co" })).json()).toEqual({ ok: false, reason: "send_failed", error: "boom" });
  });

  /* the real sender against a mocked Resend: a 422 with a body that is not
     JSON still reaches the caller as a readable reason, never a 500 */
  it("passes a legible reason through when Resend answers 422 with a non-JSON body", async () => {
    const real = await vi.importActual<typeof import("@/lib/server/email")>("@/lib/server/email");
    m.sendCodeEmail.mockImplementation(real.sendCodeEmail);
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "cyrus.ai <no-reply@example.com>");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>upstream error</html>", { status: 422 })));
    const res = await post({ email: "a@b.co" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, reason: "send_failed", error: "resend rejected the request (422)" });
  });
});
