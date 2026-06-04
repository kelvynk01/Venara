/**
 * middleware.ts — Clerk auth gate (Brief §16).
 * Everything except the sign-in / sign-up routes requires an authenticated session.
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless found in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|png|gif|svg|ico|webp|woff2?|ttf|otf)).*)',
    // Always run for API routes.
    '/(api|trpc)(.*)',
  ],
};
