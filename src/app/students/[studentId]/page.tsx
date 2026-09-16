import { StudentProfile } from "@/components/student-profile";

export const dynamic = "force-dynamic";

export default async function StudentProfileRoute({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  return <StudentProfile studentId={studentId} />;
}
