"use client";

import * as React from "react";
import { useSession } from "next-auth/react";

import { SegmentSelectModal } from "@/components/segment/segment-select-modal";
import {
  isSegment,
  type Segment,
} from "@/lib/types/segment";

/**
 * SegmentProvider — Phase 06 D-01/D-02.
 *
 * Tracks the authenticated or guest user's customer segment and surfaces the
 * selection modal on first visit (no segment in DB or localStorage).
 *
 * Precedence:
 * 1. Authenticated: GET /api/user/segment → DB value wins.
 * 2. Otherwise: localStorage['fitsole_segment'].
 * 3. If neither present → open modal (non-dismissable until a pick is made).
 *
 * On pick:
 * - Always write localStorage (so guests persist).
 * - If authenticated, also POST /api/user/segment (best-effort, non-blocking).
 */

const STORAGE_KEY = "fitsole_segment";

type SegmentContextValue = {
  segment: Segment | null;
  setSegment: (segment: Segment) => void;
  openSegmentModal: () => void;
  isLoaded: boolean;
};

const SegmentContext = React.createContext<SegmentContextValue | null>(null);

function readLocalSegment(): Segment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isSegment(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeLocalSegment(segment: Segment) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, segment);
  } catch {
    // Ignore — private mode / storage disabled.
  }
}

async function fetchServerSegment(): Promise<Segment | null> {
  try {
    const res = await fetch("/api/user/segment", {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { segment?: unknown };
    return isSegment(data.segment) ? data.segment : null;
  } catch {
    return null;
  }
}

async function postServerSegment(segment: Segment): Promise<void> {
  try {
    await fetch("/api/user/segment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ segment }),
    });
  } catch {
    // Non-fatal — localStorage still holds the selection.
  }
}

export function SegmentProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [segment, setSegmentState] = React.useState<Segment | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const hydratedRef = React.useRef(false);

  // Hydrate from localStorage synchronously on mount, then reconcile with DB
  // once the session resolves.
  React.useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const local = readLocalSegment();
    if (local) {
      setSegmentState(local);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function reconcile() {
      if (status === "loading") return;

      const local = readLocalSegment();

      if (status === "authenticated") {
        const server = await fetchServerSegment();
        if (cancelled) return;
        if (server) {
          setSegmentState(server);
          // Keep localStorage in sync so guest→auth transitions feel stable.
          writeLocalSegment(server);
        } else if (local) {
          // Authenticated user has a guest selection — persist it to DB.
          setSegmentState(local);
          await postServerSegment(local);
        } else {
          setSegmentState(null);
          setModalOpen(true);
        }
      } else {
        // Unauthenticated (guest).
        if (local) {
          setSegmentState(local);
        } else {
          setModalOpen(true);
        }
      }

      if (!cancelled) setIsLoaded(true);
    }

    reconcile();

    return () => {
      cancelled = true;
    };
  }, [status]);

  const setSegment = React.useCallback(
    (next: Segment) => {
      setSegmentState(next);
      writeLocalSegment(next);
      if (status === "authenticated") {
        void postServerSegment(next);
      }
      setModalOpen(false);
    },
    [status]
  );

  const openSegmentModal = React.useCallback(() => {
    setModalOpen(true);
  }, []);

  const value = React.useMemo<SegmentContextValue>(
    () => ({ segment, setSegment, openSegmentModal, isLoaded }),
    [segment, setSegment, openSegmentModal, isLoaded]
  );

  return (
    <SegmentContext.Provider value={value}>
      {children}
      <SegmentSelectModal
        open={modalOpen}
        onSelect={setSegment}
        onClose={() => setModalOpen(false)}
        // First visit (no segment yet) must not be dismissable per D-01;
        // subsequent "바꾸기" opens can be dismissed.
        dismissable={segment !== null}
      />
    </SegmentContext.Provider>
  );
}

export function useSegment(): SegmentContextValue {
  const ctx = React.useContext(SegmentContext);
  if (!ctx) {
    throw new Error("useSegment must be used within a SegmentProvider");
  }
  return ctx;
}
