// Convex functions for listings.
// `submit` writes one listing; `list` returns them newest-first.
// The document is validated against convex/schema.ts on insert, so an
// invalid payload is rejected automatically.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submit = mutation({
  // The flat listing object from js/form.js collect(). Validated on insert
  // against the schema, so we accept it as an object here.
  args: { listing: v.any() },
  handler: async (ctx, { listing }) => {
    const id = await ctx.db.insert("listings", listing);
    return { id };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("listings").order("desc").collect();
  },
});
