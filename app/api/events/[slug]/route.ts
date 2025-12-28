import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import mongoose, { type Types } from "mongoose";

import { Event } from "@/database";
import connectDB from "@/lib/mongodb";



type EventMode = "online" | "offline" | "hybrid";

// Shape of the event returned from Mongoose when using `.lean()`.
// Keep this intentionally minimal/explicit to avoid leaking Mongoose Document types into responses.
interface EventLean {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: EventMode;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

function getSlugFromRequestUrl(req: NextRequest): string | undefined {
  // Example: /api/events/my-event-slug -> "my-event-slug"
  const pathname = new URL(req.url).pathname;
  const segments = pathname.split("/").filter(Boolean);
  const last = segments.at(-1);

  // If the URL ends at "/events" or "/events/", there is no slug.
  if (!last || last === "events") return undefined;

  return last;
}

function normalizeAndValidateSlug(
  raw: string | undefined
): { ok: true; slug: string } | { ok: false; message: string } {
  if (typeof raw === "undefined") {
    return { ok: false, message: "Missing required slug in URL" };
  }

  let decoded: string;
  try {
    // Be defensive: percent-decoding can throw for malformed sequences.
    decoded = decodeURIComponent(raw);
  } catch {
    return { ok: false, message: "Invalid slug: malformed encoding" };
  }

  const slug = decoded.trim().toLowerCase();

  if (!slug) {
    return { ok: false, message: "Invalid slug: must not be empty" };
  }

  if (slug.length > 128) {
    return { ok: false, message: "Invalid slug: too long" };
  }

  // Match the slug generation logic used in the Event pre-save hook (lowercase, hyphen-separated).
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return {
      ok: false,
      message:
        "Invalid slug: must contain only lowercase letters, numbers, and hyphens",
    };
  }

  return { ok: true, slug };
}

export async function GET(req: NextRequest) {
  const rawSlug = getSlugFromRequestUrl(req);
  const validation = normalizeAndValidateSlug(rawSlug);

  if (!validation.ok) {
    return NextResponse.json({ message: validation.message }, { status: 400 });
  }

  try {
    await connectDB();

    const event = await Event.findOne({ slug: validation.slug })
      .lean<EventLean>()
      .exec();

    if (!event) {
      return NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ event }, { status: 200 });
  } catch (error: unknown) {
    // Mongoose-related errors (connection/query) should be treated as server errors.
    if (error instanceof mongoose.Error) {
      return NextResponse.json(
        { message: "Database error", error: error.message },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Unexpected error", error: message },
      { status: 500 }
    );
  }
}
