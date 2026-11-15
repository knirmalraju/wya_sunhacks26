"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Icon, btn } from "@/components/ui";

// This browser's account key. Kept in localStorage so the same device always
// signs back into the same profile.
function deviceId() {
  try {
    const saved = localStorage.getItem("wya-device");
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem("wya-device", id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function SignInButtons() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const go = async () => {
    setBusy(true);
    setError("");
    const r = await signIn("device", { device: deviceId(), callbackUrl: "/", redirect: false });
    if (r?.ok && !r.error) window.location.assign(r.url || "/");
    else {
      setError("Couldn't sign you in. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={go} disabled={busy} className={`${btn.primary} min-h-[56px] w-full text-base`}>
        {busy ? "Signing you in…" : <>Get started<Icon name="send" size={18} /></>}
      </button>
      {error && <p role="alert" className="text-sm font-semibold text-maroon">{error}</p>}
      <p className="text-[13px] leading-relaxed text-muted">One tap. This device keeps your account, so you&apos;ll come back to the same profile.</p>
    </div>
  );
}
