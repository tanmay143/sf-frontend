"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ADDRESS_FIELD_SPECS,
} from "@/lib/contacts/schema";
import { ADDRESS_TYPES, EMPTY_ADDRESS, type AddressInput, type AddressType } from "@/lib/contacts/types";

import { addressToFormValues } from "@/lib/contacts/format";

function blankAddress(type: AddressType = "Home"): AddressInput {
  return { ...EMPTY_ADDRESS, type };
}

function toDraft(address: AddressInput) {
  return addressToFormValues(address);
}

type AddressDraft = ReturnType<typeof toDraft>;

function fromDraft(draft: AddressDraft): AddressInput {
  return {
    type: draft.type as AddressType,
    address: draft.address.trim() || null,
    city: draft.city.trim() || null,
    state: draft.state.trim() || null,
    postal_code: draft.postal_code.trim() || null,
    country: draft.country.trim() || null,
  };
}

export default function AddressesField({
  initialAddresses,
}: {
  initialAddresses?: AddressInput[];
}) {
  const [drafts, setDrafts] = useState<AddressDraft[]>(() =>
    (initialAddresses?.length ? initialAddresses : [blankAddress()]).map(toDraft),
  );

  useEffect(() => {
    if (initialAddresses?.length) {
      setDrafts(initialAddresses.map(toDraft));
    }
  }, [initialAddresses]);

  function updateDraft(index: number, patch: Partial<AddressDraft>) {
    setDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, ...patch } : draft,
      ),
    );
  }

  function addAddress() {
    setDrafts((current) => [...current, toDraft(blankAddress("Other"))]);
  }

  function removeAddress(index: number) {
    setDrafts((current) =>
      current.length === 1 ? [toDraft(blankAddress())] : current.filter((_, i) => i !== index),
    );
  }

  const serialized = JSON.stringify(drafts.map(fromDraft));

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Addresses</legend>

      <div className="border-b border-hairline pb-2">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Addresses
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Add one or more addresses with a type: Home, Work, or Other.
        </p>
      </div>

      <input type="hidden" name="addresses" value={serialized} readOnly />

      <div className="space-y-4">
        {drafts.map((draft, index) => (
          <div
            key={`address-${index}`}
            className="rounded-lg border border-border bg-card/40 p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <label className="grid gap-1">
                <span className="text-[13px] font-medium text-foreground">
                  Type
                </span>
                <select
                  value={draft.type}
                  onChange={(event) =>
                    updateDraft(index, {
                      type: event.target.value as AddressType,
                    })
                  }
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {ADDRESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => removeAddress(index)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                Remove
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {ADDRESS_FIELD_SPECS.map((field) => (
                <label
                  key={field.name}
                  className={`grid gap-1 ${field.wide ? "sm:col-span-2" : ""}`}
                >
                  <span className="text-[13px] font-medium text-foreground">
                    {field.label}
                  </span>
                  <input
                    type="text"
                    value={draft[field.name]}
                    maxLength={field.maxLength}
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                    onChange={(event) =>
                      updateDraft(index, { [field.name]: event.target.value })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addAddress}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Add address
      </button>
    </fieldset>
  );
}
