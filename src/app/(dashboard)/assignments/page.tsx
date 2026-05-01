import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

async function getAssignments(userId: string) {
  const assignments = await prisma.assignment.findMany({
    include: {
      subject: true,
      submissions: {
        where: { userId },
      },
    },
    orderBy: [{ weekNumber: "desc" }, { createdAt: "desc" }],
  });

  return assignments.map((a: any) => {
    const submission = a.submissions[0];
    let status = "NOT_STARTED";
    if (submission) {
      status = submission.status;
    }

    return {
      id: a.id,
      title: a.title,
      description: a.description,
      weekNumber: a.weekNumber,
      subject: a.subject,
      maxMarks: a.maxMarks,
      dueDate: a.dueDate,
      timeLimit: a.timeLimit,
      status,
      score: submission?.score ?? null,
    };
  });
}

export default async function AssignmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const assignments = await getAssignments(session.user.id);

  const statusColors: Record<string, string> = {
    NOT_STARTED: "bg-gray-500",
    IN_PROGRESS: "bg-yellow-500",
    SUBMITTED: "bg-green-500",
  };

  const statusLabels: Record<string, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    SUBMITTED: "Submitted",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
        <p className="text-muted-foreground">
          Your weekly assignments across all CBSE Class 9 subjects.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment: any) => (
          <Card key={assignment.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Week {assignment.weekNumber}</Badge>
                <div className={`w-2 h-2 rounded-full ${statusColors[assignment.status]}`} />
              </div>
              <CardTitle className="text-lg mt-2">{assignment.title}</CardTitle>
              <CardDescription>{assignment.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${assignment.subject.color}`} />
                <span className="text-sm">{assignment.subject.name}</span>
              </div>

              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Due: {new Date(assignment.dueDate).toLocaleDateString("en-IN")}
                  </span>
                </div>
                {assignment.timeLimit && (
                  <div className="text-sm text-muted-foreground">
                    Time Limit: {assignment.timeLimit} minutes
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  Max Marks: {assignment.maxMarks}
                </div>
                {assignment.score !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Score</span>
                      <span className="font-medium">
                        {assignment.score}/{assignment.maxMarks}
                      </span>
                    </div>
                    <Progress
                      value={(assignment.score / assignment.maxMarks) * 100}
                      className="h-2"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <Link href={`/assignments/${assignment.id}`}>
                  <Button className="w-full" variant={assignment.status === "SUBMITTED" ? "outline" : "default"}>
                    {assignment.status === "SUBMITTED" ? "View Result" : "Start Assignment"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
