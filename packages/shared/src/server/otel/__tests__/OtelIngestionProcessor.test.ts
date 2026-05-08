import { describe, it, expect } from "vitest";
import { OtelIngestionProcessor } from "../OtelIngestionProcessor";

/**
 * Helper: build a minimal OTEL ResourceSpan with one span
 * that has the given attributes.
 */
function makeResourceSpan(attributes: Record<string, any>) {
  return {
    resource: { attributes: [] },
    scopeSpans: [
      {
        scope: { name: "test", version: "1.0" },
        spans: [
          {
            traceId: { data: Buffer.from("abcdef1234567890abcdef1234567890", "hex") },
            spanId: { data: Buffer.from("1234567890abcdef", "hex") },
            name: "test-span",
            kind: 1,
            startTimeUnixNano: 1700000000000000000,
            endTimeUnixNano: 1700000001000000000,
            attributes: Object.entries(attributes).map(([key, value]) => ({
              key,
              value: toOtelValue(value),
            })),
          },
        ],
      },
    ],
  };
}

/**
 * Convert a plain JS value to OTEL AnyValue format.
 * Simulates what protobuf.decode(...).toObject({ longs: String }) produces.
 */
function toOtelValue(value: unknown): any {
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      // With longs: String, protobuf stores integers as strings
      return { intValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (typeof value === "boolean") {
    return { boolValue: value };
  }
  if (value === null || value === undefined) {
    return { stringValue: String(value) };
  }
  return { stringValue: JSON.stringify(value) };
}

describe("OtelIngestionProcessor - convertValueToPlainJavascript integer handling", () => {
  it("should convert string intValue (protobuf longs:String) to number", async () => {
    const processor = new OtelIngestionProcessor({ projectId: "test" });
    const spans = [
      makeResourceSpan({
        "test.int_field": 42,
        "test.another_int": 100,
      }),
    ];

    const events = await processor.processToIngestionEvents(spans);
    expect(events.length).toBeGreaterThan(0);

    // The observation event should have attributes with proper numeric values
    const obsEvent = events.find((e: any) => e.type !== "trace-create");
    expect(obsEvent).toBeDefined();

    // Check that the metadata contains the integer as a number, not a JSON object
    const metadata = obsEvent!.body.metadata;
    expect(metadata).toBeDefined();
    expect(metadata.attributes).toBeDefined();

    // These should be numbers, not {"intValue":"42"} objects
    expect(metadata.attributes["test.int_field"]).toBe(42);
    expect(metadata.attributes["test.another_int"]).toBe(100);
  });

  it("should handle double values correctly alongside integers", async () => {
    const processor = new OtelIngestionProcessor({ projectId: "test" });
    const spans = [
      makeResourceSpan({
        "test.int_field": 42,
        "test.double_field": 3.14,
        "test.string_field": "hello",
      }),
    ];

    const events = await processor.processToIngestionEvents(spans);
    const obsEvent = events.find((e: any) => e.type !== "trace-create");
    const attrs = obsEvent!.body.metadata.attributes;

    expect(attrs["test.int_field"]).toBe(42);
    expect(attrs["test.double_field"]).toBe(3.14);
    expect(attrs["test.string_field"]).toBe("hello");
  });

  it("should handle zero as a valid integer", async () => {
    const processor = new OtelIngestionProcessor({ projectId: "test" });
    const spans = [makeResourceSpan({ "test.zero": 0 })];

    const events = await processor.processToIngestionEvents(spans);
    const obsEvent = events.find((e: any) => e.type !== "trace-create");
    const attrs = obsEvent!.body.metadata.attributes;

    expect(attrs["test.zero"]).toBe(0);
  });

  it("should handle negative integers", async () => {
    const processor = new OtelIngestionProcessor({ projectId: "test" });
    const spans = [makeResourceSpan({ "test.negative": -1 })];

    const events = await processor.processToIngestionEvents(spans);
    const obsEvent = events.find((e: any) => e.type !== "trace-create");
    const attrs = obsEvent!.body.metadata.attributes;

    expect(attrs["test.negative"]).toBe(-1);
  });

  it("should handle large integers that use Long objects", async () => {
    // Simulate a Long object (high/low) for values > 2^32
    const processor = new OtelIngestionProcessor({ projectId: "test" });
    const spans = [
      {
        resource: { attributes: [] },
        scopeSpans: [
          {
            scope: { name: "test", version: "1.0" },
            spans: [
              {
                traceId: { data: Buffer.from("abcdef1234567890abcdef1234567890", "hex") },
                spanId: { data: Buffer.from("1234567890abcdef", "hex") },
                name: "test-span",
                kind: 1,
                startTimeUnixNano: 1700000000000000000,
                endTimeUnixNano: 1700000001000000000,
                attributes: [
                  {
                    key: "test.large_int",
                    value: { intValue: { low: 0, high: 1 } }, // = 2^32
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const events = await processor.processToIngestionEvents(spans);
    const obsEvent = events.find((e: any) => e.type !== "trace-create");
    const attrs = obsEvent!.body.metadata.attributes;

    expect(attrs["test.large_int"]).toBe(Math.pow(2, 32));
  });
});
