import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/app-auth";
import CommentsClient from "./CommentsClient";

export default async function CommentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return <CommentsClient />;
}
