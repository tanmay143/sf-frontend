import {
  CONTACT_FIELDS,
  contactInputSchema,
  formDataToValues,
  parseAddressesFromFormData,
  parseAddressesFromNamedFields,
  zodFieldErrors,
} from "@/lib/contacts/schema";
import { PHOTO_DATA_URL_ERROR } from "@/lib/contacts/photoValidation";

function values(overrides: Record<string, string> = {}) {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "Ada@Example.com",
    phone: "",
    company: "",
    job_title: "",
    notes: "",
    photo: "",
    ...overrides,
  };
}

describe("contactInputSchema", () => {
  it("lowercases the email and nulls out the blanks", () => {
    const parsed = contactInputSchema.parse(values());

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.notes).toBeNull();
    expect(parsed.addresses).toEqual([]);
  });

  it("trims what the user typed", () => {
    expect(contactInputSchema.parse(values({ company: "  Acme  " })).company).toBe(
      "Acme",
    );
  });

  it("requires the three fields the API requires", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: " ", last_name: "", email: "" }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name is required",
      last_name: "Last name is required",
      email: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const result = contactInputSchema.safeParse(values({ email: "not-an-email" }));
    expect(zodFieldErrors(result.error!).email).toBe("Enter a valid email address");
  });

  it("enforces the API's length limits", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: "a".repeat(101) }),
    );

    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name must be 100 characters or fewer",
    });
  });

  it("nulls a blank photo and accepts a data URL", () => {
    expect(contactInputSchema.parse(values()).photo).toBeNull();
    expect(
      contactInputSchema.parse(
        values({ photo: "data:image/png;base64,iVBORw0KGgo=" }),
      ).photo,
    ).toBe("data:image/png;base64,iVBORw0KGgo=");
  });

  it("rejects a non-image photo payload", () => {
    const result = contactInputSchema.safeParse(
      values({ photo: "https://example.com/a.png" }),
    );
    expect(zodFieldErrors(result.error!).photo).toBe(PHOTO_DATA_URL_ERROR);
  });

  it("rejects disallowed image types such as SVG", () => {
    const result = contactInputSchema.safeParse(
      values({ photo: "data:image/svg+xml;base64,PHN2Zy8+" }),
    );
    expect(zodFieldErrors(result.error!).photo).toBe(PHOTO_DATA_URL_ERROR);
  });

  it("rejects malformed base64 in a photo data URL", () => {
    const result = contactInputSchema.safeParse(
      values({ photo: "data:image/png;base64,not!!!valid" }),
    );
    expect(zodFieldErrors(result.error!).photo).toBe(PHOTO_DATA_URL_ERROR);
  });
});

describe("formDataToValues", () => {
  it("pulls every known field out, defaulting to an empty string", () => {
    const formData = new FormData();
    formData.set("first_name", "Grace");
    formData.set("email", "grace@example.com");
    formData.set("ignored", "nope");

    const extracted = formDataToValues(formData);

    expect(extracted.first_name).toBe("Grace");
    expect(extracted.last_name).toBe("");
    expect(extracted.photo).toBe("");
    expect(Object.keys(extracted).sort()).toEqual(
      [...CONTACT_FIELDS.map((field) => field.name), "addressesJson", "photo"].sort(),
    );
  });

  it("parses addresses from the hidden JSON field", () => {
    const formData = new FormData();
    formData.set(
      "addresses",
      JSON.stringify([
        {
          type: "Work",
          address: "100 Analytical Way",
          city: "London",
          state: null,
          postal_code: null,
          country: "UK",
        },
      ]),
    );

    expect(parseAddressesFromFormData(formData)).toEqual({
      addresses: [
        {
          type: "Work",
          address: "100 Analytical Way",
          city: "London",
          state: null,
          postal_code: null,
          country: "UK",
        },
      ],
    });
  });

  it("prefers named address fields over stale hidden JSON", () => {
    const formData = new FormData();
    formData.set("addresses", "[]");
    formData.set("addresses[0][type]", "Home");
    formData.set("addresses[0][city]", "Boston");

    expect(parseAddressesFromFormData(formData)).toEqual({
      addresses: [
        {
          type: "Home",
          address: null,
          city: "Boston",
          state: null,
          postal_code: null,
          country: null,
        },
      ],
    });
  });

  it("uses named fields even when every value is blank", () => {
    const formData = new FormData();
    formData.set(
      "addresses",
      JSON.stringify([
        {
          type: "Home",
          address: "1 Market St",
          city: "San Francisco",
          state: null,
          postal_code: null,
          country: "USA",
        },
      ]),
    );
    formData.set("addresses[0][type]", "Home");
    formData.set("addresses[0][address]", "");
    formData.set("addresses[0][city]", "");

    expect(parseAddressesFromFormData(formData)).toEqual({
      addresses: [
        {
          type: "Home",
          address: null,
          city: null,
          state: null,
          postal_code: null,
          country: null,
        },
      ],
    });
  });

  it("rejects malformed addresses JSON when no named fields are present", () => {
    const formData = new FormData();
    formData.set("addresses", "{not-json");

    expect(parseAddressesFromFormData(formData)).toEqual({
      addresses: [],
      error: "Addresses payload is invalid",
    });
  });

  it("parses indexed native address fields", () => {
    const formData = new FormData();
    formData.set("addresses[0][type]", "Other");
    formData.set("addresses[0][address]", "42 Lane");

    expect(parseAddressesFromNamedFields(formData)).toEqual([
      {
        type: "Other",
        address: "42 Lane",
        city: null,
        state: null,
        postal_code: null,
        country: null,
      },
    ]);
  });
});
