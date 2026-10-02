/**
 * CORTEX Git: W3C OpenTelemetry Trace Propagation (ADR-002)
 * Native integration with Cloudflare Traces & Distributed Observability
 */

export interface W3CTraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: string;
  traceparent: string;
}

export function generateTraceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateSpanId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function parseOrCreateTraceContext(request?: Request | null): W3CTraceContext {
  const header = request?.headers?.get("traceparent");
  if (header) {
    const match = header.trim().match(/^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i);
    if (match) {
      const traceId = match[2].toLowerCase();
      const parentSpanId = match[3].toLowerCase();
      const childSpanId = generateSpanId();
      return {
        traceId,
        spanId: childSpanId,
        parentSpanId,
        traceFlags: "01",
        traceparent: `00-${traceId}-${childSpanId}-01`,
      };
    }
  }
  const traceId = generateTraceId();
  const spanId = generateSpanId();
  return {
    traceId,
    spanId,
    traceFlags: "01",
    traceparent: `00-${traceId}-${spanId}-01`,
  };
}

export function attachTraceHeaders(headers: Headers, trace: W3CTraceContext): void {
  headers.set("traceparent", trace.traceparent);
  headers.set("x-abs-trace-id", trace.traceId);
  headers.set("x-cortex-trace-id", trace.traceId);
}
