import { z } from "zod";
import { ADDRESS_TYPES, type AddressInput, type ContactInput } from "./types";
import {
  isAllowedPhotoDataUrl,
  PHOTO_DATA_URL_ERROR,
} from "./photoValidation";

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

export const addressInputSchema = z.object({
  type: z.enum(ADDRESS_TYPES),
  address: optionalText(300, "Street address"),
  city: optionalText(120, "City"),
  state: optionalText(120, "State"),
  postal_code: optionalText(20, "Postal code"),
  country: optionalText(120, "Country"),
});

function hasAddressContent(address: AddressInput): boolean {
  return Boolean(
    address.address?.trim() ||
      address.city?.trim() ||
      address.state?.trim() ||
      address.postal_code?.trim() ||
      address.country?.trim(),
  );
}

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
  photo: z
    .string()
    .trim()
    .max(700_000, "Photo is too large (max ~500 KB)")
    .refine(
      (value) => value === "" || isAllowedPhotoDataUrl(value),
      PHOTO_DATA_URL_ERROR,
    )
    .transform((value) => value || null)
    .nullable()
    .default(null),
  addresses: z
    .array(addressInputSchema)
    .default([])
    .transform((addresses) => addresses.filter(hasAddressContent)),
}) satisfies z.ZodType<ContactInput, unknown>;

export type ContactFormValues = z.input<typeof contactInputSchema>;

/** Collapse a ZodError into one message per field, keyed by input name. */
export function zodFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof ContactInput, string>> {
  const fieldErrors: Partial<Record<keyof ContactInput, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as keyof ContactInput] = issue.message;
    }
  }
  return fieldErrors;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

export interface ContactFieldSpec {
  name: Exclude<keyof ContactInput, "addresses" | "photo">;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export interface AddressFieldSpec {
  name: keyof Omit<AddressInput, "type">;
  label: string;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  wide?: boolean;
}

export const ADDRESS_FIELD_SPECS: AddressFieldSpec[] = [
  {
    name: "address",
    label: "Street address",
    maxLength: 300,
    placeholder: "1 Market St, Suite 400",
    autoComplete: "street-address",
    wide: true,
  },
  {
    name: "city",
    label: "City",
    maxLength: 120,
    placeholder: "San Francisco",
    autoComplete: "address-level2",
  },
  {
    name: "state",
    label: "State / region",
    maxLength: 120,
    placeholder: "CA",
    autoComplete: "address-level1",
  },
  {
    name: "postal_code",
    label: "Postal code",
    maxLength: 20,
    placeholder: "94105",
    autoComplete: "postal-code",
  },
  {
    name: "country",
    label: "Country",
    maxLength: 120,
    placeholder: "USA",
    autoComplete: "country-name",
  },
];

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

/** Max upload size before base64 encoding (~500 KB). */
export const MAX_PHOTO_BYTES = 500 * 1024;

const NAMED_ADDRESS_KEY = /^addresses\[(\d+)\]\[(\w+)\]$/;

/** Parse indexed native form fields for progressive enhancement (no-JS / pre-hydration). */
export function parseAddressesFromNamedFields(formData: FormData): AddressInput[] {
  const byIndex = new Map<number, Partial<Record<string, string>>>();

  for (const [key, value] of formData.entries()) {
    const match = key.match(NAMED_ADDRESS_KEY);
    if (!match) continue;
    const index = Number(match[1]);
    const field = match[2];
    const bucket = byIndex.get(index) ?? {};
    bucket[field] = String(value);
    byIndex.set(index, bucket);
  }

  if (byIndex.size === 0) return [];

  return [...byIndex.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, row]) => ({
      type: ADDRESS_TYPES.includes(row.type as (typeof ADDRESS_TYPES)[number])
        ? (row.type as AddressInput["type"])
        : "Home",
      address: row.address?.trim() || null,
      city: row.city?.trim() || null,
      state: row.state?.trim() || null,
      postal_code: row.postal_code?.trim() || null,
      country: row.country?.trim() || null,
    }));
}

export function parseAddressesFromFormData(formData: FormData): {
  addresses: AddressInput[];
  error?: string;
} {
  const named = parseAddressesFromNamedFields(formData);
  if (named.some(hasAddressContent)) {
    return { addresses: named };
  }

  const raw = String(formData.get("addresses") ?? "").trim();
  if (!raw) return { addresses: [] };

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { addresses: [], error: "Addresses payload is invalid" };
    }
    return { addresses: parsed as AddressInput[] };
  } catch {
    return { addresses: [], error: "Addresses payload is invalid" };
  }
}

/** Pull the contact fields out of a submitted form, as raw strings. */
export function formDataToValues(
  formData: FormData,
): Record<Exclude<keyof ContactInput, "addresses">, string> & {
  addressesJson: string;
} {
  const values = Object.fromEntries(
    CONTACT_FIELDS.map((field) => [
      field.name,
      String(formData.get(field.name) ?? ""),
    ]),
  ) as Record<Exclude<keyof ContactInput, "addresses">, string>;

  // Photo is not a text field in CONTACT_FIELDS — carried via hidden input.
  values.photo = String(formData.get("photo") ?? "");
  const addressesJson = String(formData.get("addresses") ?? "[]");

  return {
    ...values,
    addressesJson,
  };
}
