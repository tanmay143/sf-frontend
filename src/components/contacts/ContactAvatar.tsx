import type { CSSProperties } from "react";
import { avatarHue, initials } from "@/lib/contacts/format";
import type { Contact } from "@/lib/contacts/types";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/** Circular profile photo when present; otherwise initials tinted by email. */
export default function ContactAvatar({
  contact,
  size = "md",
}: {
  contact: Pick<Contact, "first_name" | "last_name" | "email" | "photo">;
  size?: keyof typeof SIZES;
}) {
  const sizeClass = SIZES[size];

  if (contact.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URLs; next/image is not suitable
      <img
        src={contact.photo}
        alt=""
        aria-hidden="true"
        className={`inline-block shrink-0 rounded-full aspect-square object-cover ${sizeClass}`}
      />
    );
  }

  const style = {
    "--avatar-hue": avatarHue(contact.email),
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`contact-avatar inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-semibold ${sizeClass}`}
    >
      {initials(contact)}
    </span>
  );
}
