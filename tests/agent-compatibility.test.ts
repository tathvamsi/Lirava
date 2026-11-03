import { afterEach, it } from "node:test";
import assert from "node:assert/strict";
import { fetchAgents, sendAgentMessage } from "../src/lib/backend-client";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

it("falls back to the legacy agent list when the new route is unavailable", async () => {
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    paths.push(new URL(String(input)).pathname);
    return paths.length === 1
      ? new Response(null, { status: 404 })
      : Response.json({ dots: [{ id: "dot_existing" }] });
  };
  const agents = await fetchAgents("user_test");
  assert.deepEqual(paths, ["/api/agents", "/api/dots"]);
  assert.equal(agents[0].id, "dot_existing");
});

it("sends the same agent identifier under both names during migration", async () => {
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return Response.json({});
  };
  await sendAgentMessage("dot_existing", "Hello");
  assert.equal(requestBody?.agentId, "dot_existing");
  assert.equal(requestBody?.dotId, "dot_existing");
});
