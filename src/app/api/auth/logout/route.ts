import { deleteSession } from "@/lib/session";

/** Signs out (POST, so a link or image elsewhere can't sign someone out). */
export async function POST(request: Request) {
  await deleteSession();
  return Response.redirect(new URL("/", request.url), 303);
}
