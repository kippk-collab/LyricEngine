"use client"

import { useState, type FormEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "./AuthProvider"

type Phase = "email" | "sending" | "code" | "verifying"

function LoginForm() {
  const { signInWithOtp, verifyOtp } = useAuth()
  const [phase, setPhase] = useState<Phase>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPhase("sending")
    const { error } = await signInWithOtp(email.trim())
    if (error) {
      setError(error)
      setPhase("email")
    } else {
      setPhase("code")
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPhase("verifying")
    const { error } = await verifyOtp(email.trim(), code.trim())
    if (error) {
      setError(error)
      setPhase("code")
    }
    // On success, AuthProvider's onAuthStateChange fires and LoginGate opens
  }

  async function handleResend() {
    setError(null)
    setPhase("sending")
    const { error } = await signInWithOtp(email.trim())
    if (error) setError(error)
    setPhase("code")
  }

  const isSubmitting = phase === "sending" || phase === "verifying"

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <h1
          className="text-3xl font-light text-center mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--le-text)" }}
        >
          LyricEngine
        </h1>
        <p
          className="text-center text-sm mb-8"
          style={{ color: "var(--le-text-muted)" }}
        >
          enter your email to get started
        </p>

        <AnimatePresence mode="wait">
          {(phase === "email" || phase === "sending") && (
            <motion.form
              key="email-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSendCode}
              className="flex flex-col gap-4"
            >
              <input
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: "color-mix(in srgb, var(--le-surface) 80%, transparent)",
                  border: "1px solid var(--le-border)",
                  color: "var(--le-text)",
                }}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  background: "color-mix(in srgb, var(--le-accent) 20%, transparent)",
                  color: "var(--le-accent)",
                  border: "1px solid color-mix(in srgb, var(--le-accent) 30%, transparent)",
                }}
              >
                {phase === "sending" ? "sending..." : "send code"}
              </button>
            </motion.form>
          )}

          {(phase === "code" || phase === "verifying") && (
            <motion.form
              key="code-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleVerify}
              className="flex flex-col gap-4"
            >
              <p
                className="text-sm text-center"
                style={{ color: "var(--le-text-muted)" }}
              >
                code sent to <span style={{ color: "var(--le-text)" }}>{email}</span>
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                required
                autoFocus
                autoComplete="one-time-code"
                placeholder="enter code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-lg text-sm text-center tracking-[0.3em] outline-none transition-colors"
                style={{
                  background: "color-mix(in srgb, var(--le-surface) 80%, transparent)",
                  border: "1px solid var(--le-border)",
                  color: "var(--le-text)",
                  fontFamily: "var(--font-geist-mono)",
                }}
              />
              <button
                type="submit"
                disabled={isSubmitting || code.length < 6}
                className="w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  background: "color-mix(in srgb, var(--le-accent) 20%, transparent)",
                  color: "var(--le-accent)",
                  border: "1px solid color-mix(in srgb, var(--le-accent) 30%, transparent)",
                }}
              >
                {phase === "verifying" ? "verifying..." : "verify"}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={isSubmitting}
                className="text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ color: "var(--le-text-muted)" }}
              >
                resend code
              </button>
              <button
                type="button"
                onClick={() => { setPhase("email"); setCode(""); setError(null) }}
                disabled={isSubmitting}
                className="text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ color: "var(--le-text-muted)" }}
              >
                use a different email
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-center mt-4"
              style={{ color: "var(--le-error)" }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm italic"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--le-text-muted)",
          }}
        >
          loading...
        </motion.p>
      </div>
    )
  }

  if (!user) return <LoginForm />

  return <>{children}</>
}
