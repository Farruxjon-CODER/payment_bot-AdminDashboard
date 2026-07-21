"use client";

import { useState } from "react";
import { Search, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type StudentData = {
  id: number;
  fullName: string;
  phone: string;
  courses: string[];
  isPaid: boolean;
};

export function StudentsTable({ students }: { students: StudentData[] }) {
  const [search, setSearch] = useState("");

  const filtered = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="O'quvchilarni izlash..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button>+ Yangi o'quvchi</Button>
      </div>

      {/* Data Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>F.I.SH.</TableHead>
              <TableHead>Telefon raqam</TableHead>
              <TableHead>Kurslar</TableHead>
              <TableHead>To'lov holati</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Hozircha o'quvchilar kiritilmagan
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.fullName}</TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {student.courses.map((course) => (
                        <Badge variant="secondary" key={course}>
                          {course}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.isPaid ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-none">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> To'langan
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-none border-none">
                        <XCircle className="w-3 h-3 mr-1" /> To'lanmagan
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
