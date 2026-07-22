// Convex schema — this replaces "SQL to create tables".
// Running `npx convex dev` (or `deploy`) reads this file and creates/updates
// the `listings` table for you. Convex also adds `_id` and `_creationTime`
// to every document automatically, so we don't declare id / created_at here.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// nullable string helper: the form sends null for empty optional fields
const nstr = v.union(v.string(), v.null());
const nnum = v.union(v.number(), v.null());

export default defineSchema({
  listings: defineTable({
    lang: v.string(),

    full_name: v.string(),
    phone: v.string(),
    whatsapp: v.string(),
    email: nstr,

    operation: v.string(),      // 'sale' | 'rent'
    property_type: v.string(),

    city: v.string(),
    district: v.string(),
    project: nstr,
    plot_number: nstr,

    area: nnum,
    bedrooms: nnum,
    bathrooms: nnum,
    floor: nstr,
    finishing: v.string(),
    status: v.string(),

    asking_price: nstr,
    negotiable: nstr,
    payment_method: nstr,
    down_payment: nstr,
    installment_period: nstr,
    installment_amount: nstr,
    monthly_rent: nstr,
    contract_duration: nstr,

    features: v.array(v.string()),
    description: nstr,

    photos: v.array(
      v.object({
        name: v.string(),
        size: v.number(),
        type: v.string(),
        thumbnail: v.union(v.string(), v.null()),
      })
    ),
  })
    // indexes that make the admin's search / group-by fast later
    .index("by_operation", ["operation"])
    .index("by_property_type", ["property_type"])
    .index("by_city", ["city"]),
});
