// HTTP endpoints so the plain static frontend can talk to Convex with a
// simple fetch() — no Convex client library or build step needed.
// These are served from your ".convex.site" URL (put that in js/config.js).
//
//   POST /submitListing   body = the listing JSON  -> { id }
//   GET  /listings                                 -> [ listing, ... ]
//
// NOTE: CORS is wide-open ("*") to get you running. Before production,
// lock Access-Control-Allow-Origin to your Vercel domain, and require auth
// on /listings (that route is for the admin page).

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const http = httpRouter();

http.route({
  path: "/submitListing",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let listing;
    try {
      listing = await request.json();
    } catch (_) {
      return Response.json({ error: "invalid-json" }, { status: 400, headers: cors });
    }
    const result = await ctx.runMutation(api.listings.submit, { listing });
    return Response.json(result, { headers: cors }); // { id }
  }),
});

http.route({
  path: "/submitListing",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: cors })),
});

http.route({
  path: "/listings",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const rows = await ctx.runQuery(api.listings.list, {});
    return Response.json(rows, { headers: cors });
  }),
});

export default http;
