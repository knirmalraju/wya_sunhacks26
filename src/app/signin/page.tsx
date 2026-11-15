import { redirect } from "next/navigation";

// There's no sign-in anymore; old links land on Home.
export default function SignIn() {
  redirect("/");
}
