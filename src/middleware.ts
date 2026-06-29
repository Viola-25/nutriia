import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware((auth, req) => {
  const { userId } = auth();

  if (userId && req.nextUrl.pathname === "/") {
    return Response.redirect(new URL("/dashboard", req.url));
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
