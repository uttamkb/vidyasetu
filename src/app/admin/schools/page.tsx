import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, School, MapPin } from "lucide-react";
import Link from "next/link";
import { SchoolModal } from "./edit-school-modal";

interface SchoolsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    board?: string;
  }>;
}

export default async function AdminSchoolsPage({ searchParams }: SchoolsPageProps) {
  await connection();
  const session = await auth();

  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;
  const search = params.search?.toLowerCase().trim();
  const boardFilter = params.board;

  const where: Prisma.SchoolWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { state: { contains: search, mode: "insensitive" } },
      { district: { contains: search, mode: "insensitive" } },
    ];
  }
  if (boardFilter && ["CBSE", "ICSE", "STATE", "IB"].includes(boardFilter)) {
    where.board = boardFilter;
  }

  const [schools, total] = await Promise.all([
    prisma.school.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        state: true,
        district: true,
        board: true,
        _count: {
          select: {
            questions: true,
            sourceDocuments: true,
          },
        },
      },
    }),
    prisma.school.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const boardBadge = (board: string) => {
    const variants: Record<string, string> = {
      CBSE: "bg-blue-100 text-blue-800 border-blue-200",
      ICSE: "bg-purple-100 text-purple-800 border-purple-200",
      STATE: "bg-orange-100 text-orange-800 border-orange-200",
      IB: "bg-indigo-100 text-indigo-800 border-indigo-200",
    };
    return (
      <Badge className={`${variants[board] ?? "bg-gray-100 text-gray-800"} border font-semibold`}>
        {board}
      </Badge>
    );
  };

  const buildQuery = (overrides: Record<string, string>) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (boardFilter) q.set("board", boardFilter);
    Object.entries(overrides).forEach(([k, v]) => q.set(k, v));
    return q.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight text-slate-900 flex items-center gap-2">
            <School className="h-8 w-8 text-blue-600" />
            School Registry
          </h1>
          <p className="text-muted-foreground mt-1">
            {total.toLocaleString()} registered schools • Page {page} of {totalPages}
          </p>
        </div>
        <SchoolModal />
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4">
          <form className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-blue-500" />
                <Input
                  name="search"
                  placeholder="Search by school name, state, or district..."
                  defaultValue={search ?? ""}
                  className="pl-9 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              name="board"
              defaultValue={boardFilter ?? ""}
              className="h-9 rounded-md border border-slate-200 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Boards</option>
              <option value="CBSE">CBSE</option>
              <option value="ICSE">ICSE</option>
              <option value="STATE">State Board</option>
              <option value="IB">IB</option>
            </select>
            <button
              type="submit"
              className="h-9 px-4 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:opacity-90 shadow-sm"
            >
              Filter
            </button>
            {(search || boardFilter) && (
              <Link
                href={"/admin/schools" as Route}
                className="h-9 px-4 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 flex items-center transition-colors"
              >
                Clear
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Schools Table */}
      <Card className="shadow-md border-slate-200 overflow-hidden">
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b bg-slate-50/75">
                  <th className="h-12 px-4 text-left align-middle font-semibold text-slate-700">School Details</th>
                  <th className="h-12 px-4 text-left align-middle font-semibold text-slate-700">Board</th>
                  <th className="h-12 px-4 text-left align-middle font-semibold text-slate-700">Location</th>
                  <th className="h-12 px-4 text-center align-middle font-semibold text-slate-700">Source Docs</th>
                  <th className="h-12 px-4 text-center align-middle font-semibold text-slate-700">Questions in Bank</th>
                  <th className="h-12 px-4 text-center align-middle font-semibold text-slate-700 w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0 bg-white">
                {schools.map((sch) => (
                  <tr key={sch.id} className="border-b transition-colors hover:bg-slate-50/50">
                    <td className="p-4 align-middle">
                      <div className="font-semibold text-slate-900 text-base">{sch.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{sch.id}</div>
                    </td>
                    <td className="p-4 align-middle">{boardBadge(sch.board)}</td>
                    <td className="p-4 align-middle">
                      {sch.district || sch.state ? (
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                          <span>
                            {sch.district}
                            {sch.district && sch.state ? ", " : ""}
                            {sch.state}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Not specified</span>
                      )}
                    </td>
                    <td className="p-4 align-middle text-center font-bold text-slate-700">
                      {sch._count.sourceDocuments.toLocaleString()}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <Badge variant="outline" className="font-bold border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-0.5">
                        {sch._count.questions.toLocaleString()}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle text-center">
                      <SchoolModal school={sch} />
                    </td>
                  </tr>
                ))}
                {schools.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-500 font-medium">
                      No registered schools found matching the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500 font-medium">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/schools?${buildQuery({ page: String(page - 1) })}` as Route}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-sm hover:bg-slate-50 font-semibold text-slate-600 transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/schools?${buildQuery({ page: String(page + 1) })}` as Route}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-sm hover:bg-slate-50 font-semibold text-slate-600 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
