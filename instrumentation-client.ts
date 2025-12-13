import posthog from "posthog-js"

// Automatically initialize PostHog when this file is loaded by Next.js
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: '2025-05-24',
  capture_exceptions: true, // Enables capturing exceptions using Error Tracking
  debug: process.env.NODE_ENV === "development",
})
