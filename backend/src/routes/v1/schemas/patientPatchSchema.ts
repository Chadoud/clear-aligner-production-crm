/** JSON Schema for PATCH /api/v1/patients/:ref body (Fastify / AJV). */
export const patchPatientBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    case_status: { type: "integer" },
    case_ref: { type: "string", minLength: 1, maxLength: 64 },
    skip_status_email: { type: "boolean" },
    first_name: { type: "string", maxLength: 120 },
    last_name: { type: "string", maxLength: 120 },
    title: {
      anyOf: [{ type: "null" }, { type: "integer", enum: [0, 1] }],
    },
    email: {
      anyOf: [{ type: "null" }, { type: "string", maxLength: 255 }],
    },
    address: {
      anyOf: [{ type: "null" }, { type: "string", maxLength: 255 }],
    },
    phone: {
      anyOf: [{ type: "null" }, { type: "string", maxLength: 255 }],
    },
    date_of_birth: {
      anyOf: [
        { type: "null" },
        { type: "string", const: "" },
        {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
      ],
    },
    aligner_monitoring_months: {
      anyOf: [{ type: "null" }, { type: "integer", minimum: 1, maximum: 36 }],
    },
  },
} as const;
