import {
  CONTACT_FIELDS,
  contactInputSchema,
  formDataToValues,
  parseAddressesFromFormData,
  zodFieldErrors,
} from "@/lib/contacts/schema";

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
        values({ photo: "data:image/png;base64,abc" }),
      ).photo,
    ).toBe("data:image/png;base64,abc");
  });

  it("rejects a non-image photo payload", () => {
    const result = contactInputSchema.safeParse(
      values({ photo: "https://example.com/a.png" }),
    );
    expect(zodFieldErrors(result.error!).photo).toBe(
      "Photo must be an image data URL",
    );
  });

  it("keeps addresses with content and drops empty rows", () => {
    const parsed = contactInputSchema.parse({
      ...values(),
      addresses: [
        {
          type: "Home",
          address: "1 Market St",
          city: "San Francisco",
          state: "",
          postal_code: "",
          country: "USA",
        },
        {
          type: "Work",
          address: "",
          city: "",
          state: "",
          postal_code: "",
          country: "",
        },
      ],
    });

    expect(parsed.addresses).toEqual([
      {
        type: "Home",
        address: "1 Market St",
        city: "San Francisco",
        state: null,
        postal_code: null,
        country: "USA",
      },
    ]);
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

    expect(parseAddressesFromFormData(formData)).toEqual([
      {
        type: "Work",
        address: "100 Analytical Way",
        city: "London",
        state: null,
        postal_code: null,
        country: "UK",
      },
    ]);
  });
});
