"use client";

import { useState, useTransition } from "react";
import { Search, MoreHorizontal, CheckCircle2, XCircle, Edit, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateStudentAction } from "./actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StudentData = {
  id: number;
  fullName: string;
  phone: string;
  courses: string[];
  isPaid: boolean;
  status: string;
};

export function StudentsTable({ students }: { students: StudentData[] }) {
  const [search, setSearch] = useState("");
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStudent) return;

    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await updateStudentAction(
        editingStudent.phone,
        editingStudent.fullName,
        formData
      );

      if (result.success) {
        toast.success(result.message);
        setEditingStudent(null);
      } else {
        toast.error(result.message);
      }
    });
  };

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
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
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
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">{student.fullName}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">{student.phone}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {student.courses.map((course) => (
                        <Badge variant="secondary" key={course} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-none">
                          {course}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.isPaid ? (
                      <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-none border-none">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> To'langan
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 shadow-none border-none">
                        <XCircle className="w-3 h-3 mr-1" /> To'lanmagan
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setEditingStudent(student)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Modal */}
      <Dialog 
        open={!!editingStudent} 
        onOpenChange={(open) => !open && setEditingStudent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>O'quvchini tahrirlash</DialogTitle>
            <DialogDescription>
              {editingStudent?.fullName} ma'lumotlarini o'zgartirish
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">F.I.SH.</Label>
              <Input 
                id="fullName" 
                name="fullName" 
                defaultValue={editingStudent?.fullName} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon raqam</Label>
              <Input 
                id="phone" 
                name="phone" 
                defaultValue={editingStudent?.phone} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseName">Guruh (Kurs)</Label>
              <Input 
                id="courseName" 
                name="courseName" 
                defaultValue={editingStudent?.courses[0]} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status (Holati)</Label>
              <Input 
                id="status" 
                name="status" 
                defaultValue={editingStudent?.status} 
                required 
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingStudent(null)}
              >
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isPending}>
                <Save className="w-4 h-4 mr-2" />
                {isPending ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
