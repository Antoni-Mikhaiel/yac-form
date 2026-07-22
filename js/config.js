/* ============================================================
   YAC — runtime config
   ------------------------------------------------------------
   Paste your Convex HTTP Actions URL here. It is your deployment
   URL with ".convex.site"  (NOT ".convex.cloud").
   Find it in the Convex dashboard, or it's printed by `npx convex dev`.

   Example: "https://happy-otter-123.convex.site"

   Leave it empty to keep using the local localStorage fallback.
   This URL is NOT a secret — it's meant to be called from the browser,
   so it's fine to commit and to serve as a static file.
   ============================================================ */
window.YAC = window.YAC || {};
window.YAC.config = {
  convexUrl: "https://academic-tapir-124.eu-west-1.convex.site",
};
