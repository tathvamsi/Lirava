import { afterEach, it } from "node:test";
import assert from "node:assert/strict";
import { fetchVakils, sendVakilMessage } from "../src/lib/backend-client";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

it("loads the vakil list from the one vakils endpoint", async () => {
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    paths.push(new URL(String(input)).pathname);
    return Response.json({ vakils: [{ id: "vakil_existing" }] });
  };
  const vakils = await fetchVakils();
  assert.deepEqual(paths, ["/api/vakils"]);
  assert.equal(vakils[0].id, "vakil_existing");
});

it("does not retry a missing endpoint under another name", async () => {
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    paths.push(new URL(String(input)).pathname);
    return new Response(null, { status: 404 });
  };
  await assert.rejects(fetchVakils());
  assert.deepEqual(paths, ["/api/vakils"]);
});

it("sends the message under the vakilId name only", async () => {
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return Response.json({});
  };
  await sendVakilMessage("vakil_existing", "Hello");
  assert.equal(requestBody?.vakilId, "vakil_existing");
  assert.equal("agentId" in (requestBody ?? {}), false);
  assert.equal("dotId" in (requestBody ?? {}), false);
});
