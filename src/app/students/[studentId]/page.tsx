import { notFound } from "next/navigation";
import { StudentProfile } from "@/components/student-profile";
import { students } from "@/data/mock-data";

export function generateStaticParams() {
  return students.map((student) => ({ studentId: student.id }));
}

export default async function StudentProfileRoute({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  if (!students.some((student) => student.id === studentId)) notFound();

  return <StudentProfile studentId={studentId} />;
}
