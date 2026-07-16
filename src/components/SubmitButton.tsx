"use client";

import { useFormStatus } from "react-dom";

// A submit button that reflects the pending state of its enclosing <form>'s
// server action. Swaps its label and disables itself while the action runs.
export default function SubmitButton({
  idle,
  pending: pendingLabel,
  className,
}: {
  idle: string;
  pending: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? pendingLabel : idle}
    </button>
  );
}
