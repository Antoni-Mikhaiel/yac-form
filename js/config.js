/* ============================================================
   YAC — runtime config
   ------------------------------------------------------------
   Picks the Convex HTTP Actions URL by where the page is running:
     • localhost / 127.0.0.1  → DEV deployment  (npx convex dev)
     • anywhere else (Vercel) → PROD deployment (npx convex deploy)

   So local testing never writes to production, and the live site
   never writes to your throwaway dev deployment. No build step —
   these ".convex.site" URLs are public (browser-callable), not secrets.

   After `npx convex deploy`, prod is: giddy-woodpecker-41
   Dev (from `npx convex dev`) is:      academic-tapir-124
   ============================================================ */
window.YAC = window.YAC || {};

(function () {
  var DEV = "https://academic-tapir-124.eu-west-1.convex.site";
  var PROD = "https://giddy-woodpecker-41.eu-west-1.convex.site";

  var host = location.hostname;
  var isLocal = /^(localhost|127\.|0\.0\.0\.0|\[?::1)/.test(host) || host === "";

  window.YAC.config = { convexUrl: (isLocal ? DEV : PROD) || DEV };
})();
