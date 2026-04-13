"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "./AuthProvider"

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  if (!user) return null

  const email = user.email ?? ""
  const initial = email.charAt(0).toUpperCase()

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-opacity hover:opacity-80 select-none"
        style={{
          background: "color-mix(in srgb, var(--le-lavender) 35%, transparent)",
          color: "var(--le-lavender)",
          border: "1px solid color-mix(in srgb, var(--le-lavender) 25%, transparent)",
        }}
        title={email}
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-lg py-1 z-50"
          style={{
            background: "color-mix(in srgb, var(--le-surface) 95%, transparent)",
            border: "1px solid var(--le-border)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="px-3 py-2 text-xs truncate"
            style={{ color: "var(--le-text-muted)" }}
          >
            {email}
          </div>
          <div
            style={{
              borderTop: "1px solid color-mix(in srgb, var(--le-border) 40%, transparent)",
            }}
          />
          <a
            href="/settings"
            className="block px-3 py-2 text-sm transition-colors hover:bg-white/5"
            style={{ color: "var(--le-text)" }}
            onClick={() => setOpen(false)}
          >
            Settings
          </a>
          <button
            onClick={async () => {
              setOpen(false)
              await signOut()
            }}
            className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/5"
            style={{ color: "var(--le-text)" }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
