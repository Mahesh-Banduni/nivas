"use client";

import { ownerCancelBookingAction } from "@/app/owner/actions";
import { Icon } from "@/components/ui/icon";

export function CancelReservation({ bookingId }: { bookingId: string }) {
  return (
    <details className="group relative">
      <summary className="btn btn-outline btn-sm cursor-pointer list-none text-rose [&::-webkit-details-marker]:hidden">
        <Icon name="close" size={13} /> Cancel
      </summary>
      <div className="absolute right-0 z-30 mt-1.5 w-72 rounded-xl border border-line bg-cream p-3 shadow-xl">
        <p className="text-[11.5px] font-medium text-ink">Cancel this reservation?</p>
        <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
          The guest is notified and refunds follow the listing&apos;s cancellation policy. Nights are released immediately.
        </p>
        <form
          action={ownerCancelBookingAction}
          className="mt-2.5 space-y-2"
          onSubmit={(event) => {
            if (!window.confirm("Cancel this reservation? The guest will be notified.")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="bookingId" value={bookingId} />
          <label className="label" htmlFor={`reason-${bookingId}`}>Reason for the guest</label>
          <input
            id={`reason-${bookingId}`}
            name="reason"
            required
            defaultValue="Cancelled by host"
            className="field text-[11.5px]"
          />
          <button type="submit" className="btn btn-clay btn-sm w-full">
            <Icon name="alert" size={13} /> Confirm cancellation
          </button>
        </form>
      </div>
    </details>
  );
}
