import { redirect } from "next/navigation";

const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLScdBHWk4FkGES06IfJPjexHjvHLqcosSmBvZeThrXvmJW63Ug/viewform?usp=header";

export default function SubmitPage() {
  redirect(googleFormUrl);
}
