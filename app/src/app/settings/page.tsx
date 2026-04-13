"use client"

import { useAuth } from "@/components/AuthProvider"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push("/")
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p
          className="text-sm italic"
          style={{ fontFamily: "var(--font-display)", color: "var(--le-text-muted)" }}
        >
          loading...
        </p>
      </div>
    )
  }

  const email = user.email ?? ""
  const initial = email.charAt(0).toUpperCase()
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.push("/")
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--le-bg)" }}>
      <div className="max-w-md mx-auto px-4 py-12">
        {/* Back link */}
        <a
          href="/"
          className="inline-block text-sm mb-8 transition-opacity hover:opacity-80"
          style={{ color: "var(--le-text-muted)" }}
        >
          &larr; back to app
        </a>

        {/* Profile section */}
        <div className="flex items-center gap-4 mb-10">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-medium select-none"
            style={{
              background: "color-mix(in srgb, var(--le-lavender) 35%, transparent)",
              color: "var(--le-lavender)",
              border: "1px solid color-mix(in srgb, var(--le-lavender) 25%, transparent)",
            }}
          >
            {initial}
          </div>
          <div>
            <p className="text-lg" style={{ color: "var(--le-text)" }}>
              {email}
            </p>
            {createdAt && (
              <p className="text-xs" style={{ color: "var(--le-text-muted)" }}>
                joined {createdAt}
              </p>
            )}
          </div>
        </div>

        {/* Settings sections */}
        <div className="flex flex-col gap-6">
          <Section title="Account">
            <Row label="Email" value={email} />
            <Row label="Sign-in method" value="Email OTP" />
          </Section>

          {/* Placeholder for future sections */}
          {/* <Section title="Connected accounts">
            <p style={{ color: "var(--le-text-muted)" }} className="text-sm">
              No connected accounts. Google and Apple sign-in coming soon.
            </p>
          </Section> */}

          <div className="pt-4 flex flex-col gap-3 items-start">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-5 py-2.5 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{
                background: "color-mix(in srgb, var(--le-rose) 18%, transparent)",
                color: "var(--le-rose)",
                border: "1px solid color-mix(in srgb, var(--le-rose) 25%, transparent)",
              }}
            >
              {signingOut ? "signing out..." : "sign out"}
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs transition-opacity hover:opacity-80 mt-4"
                style={{ color: "var(--le-text-muted)" }}
              >
                delete my account
              </button>
            ) : (
              <div
                className="mt-4 p-4 rounded-lg w-full"
                style={{
                  background: "color-mix(in srgb, var(--le-error) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--le-error) 20%, transparent)",
                }}
              >
                <p className="text-sm mb-3" style={{ color: "var(--le-text)" }}>
                  This permanently deletes your account and all your data. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      setDeleting(true)
                      setDeleteError(null)
                      const res = await fetch("/api/account", { method: "DELETE" })
                      if (!res.ok) {
                        const data = await res.json()
                        setDeleteError(data.error ?? "Failed to delete account")
                        setDeleting(false)
                        return
                      }
                      await signOut()
                      router.push("/")
                    }}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{
                      background: "color-mix(in srgb, var(--le-error) 25%, transparent)",
                      color: "var(--le-error)",
                    }}
                  >
                    {deleting ? "deleting..." : "yes, delete everything"}
                  </button>
                  <button
                    onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-80"
                    style={{ color: "var(--le-text-muted)" }}
                  >
                    cancel
                  </button>
                </div>
                {deleteError && (
                  <p className="text-xs mt-2" style={{ color: "var(--le-error)" }}>
                    {deleteError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2
        className="text-xs uppercase tracking-wider mb-3"
        style={{ color: "var(--le-text-muted)" }}
      >
        {title}
      </h2>
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "color-mix(in srgb, var(--le-surface) 80%, transparent)",
          border: "1px solid color-mix(in srgb, var(--le-border) 40%, transparent)",
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{
        borderBottom: "1px solid color-mix(in srgb, var(--le-border) 20%, transparent)",
      }}
    >
      <span className="text-sm" style={{ color: "var(--le-text-muted)" }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: "var(--le-text)" }}>
        {value}
      </span>
    </div>
  )
}
