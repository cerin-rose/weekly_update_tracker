"use client";

import type { Student } from "@/types";

export function StudentRosterTable({ students, onStudent }: { students: Student[]; onStudent: (studentId: string) => void }) {
  return <div className="directory-table-wrap">
    <table className="review-table directory-table">
      <caption className="sr-only">Student roster</caption>
      <thead>
        <tr>
          <th scope="col">Student</th>
          <th scope="col">Program</th>
          <th scope="col">Role</th>
          <th scope="col">Workstream</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {students.map((student) => <tr key={student.id}>
          <td>
            <span className="directory-student">
              <span className="owner-mark" aria-hidden="true">{student.initials}</span>
              <button className="student-name-link" type="button" aria-label={`Open ${student.name} profile`} onClick={() => onStudent(student.id)}>{student.name}</button>
            </span>
          </td>
          <td>{student.programAffiliation}</td>
          <td>{student.leadershipRole}</td>
          <td>{student.primaryWorkstream}</td>
          <td><span className={`student-active ${student.active ? "is-active" : "is-inactive"}`}>{student.active ? "Active" : "Inactive"}</span></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
