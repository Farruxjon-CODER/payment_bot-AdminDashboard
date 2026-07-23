"use client";

import { useState, useTransition, useEffect } from "react";
import { Edit, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateGroup } from "./actions";

type GroupData = {
  id: number;
  name: string;
  teacher: string | null;
  startTime: string | null;
  endTime: string | null;
  monthlyFee: number;
  status: string | null;
};

type GroupFormModalProps = {
  group: GroupData;
  trigger: React.ReactNode;
};

export function GroupFormModal({ group, trigger }: GroupFormModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(group?.name ?? "");
  const [teacher, setTeacher] = useState(group?.teacher ?? "");
  const [startTime, setStartTime] = useState(group?.startTime ?? "");
  const [endTime, setEndTime] = useState(group?.endTime ?? "");
  const [monthlyFee, setMonthlyFee] = useState(
    group?.monthlyFee?.toString() ?? "0"
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      name,
      teacher,
      startTime,
      endTime,
      monthlyFee: parseInt(monthlyFee, 10) || 0,
    };

    startTransition(async () => {
      try {
        await updateGroup(group.id, data);
        toast.success("Guruh ma'lumotlari yangilandi!");
        setOpen(false);
      } catch (error) {
        toast.error("Xatolik yuz berdi! Iltimos qaytadan urinib ko'ring.");
        console.error(error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle>Guruhni tahrirlash</DialogTitle>
          <DialogDescription>
            "{group.name}" guruhi ma'lumotlarini tahrirlash.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Guruh nomi
            </Label>
            <Input
              id="name"
              placeholder="IELTS 01..."
              className="col-span-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              readOnly
              disabled
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teacher" className="text-right">
              O'qituvchi
            </Label>
            <Input
              id="teacher"
              placeholder="Ism Familiya"
              className="col-span-3"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">
              Boshlanish vaqti
            </Label>
            <Input
              id="startTime"
              placeholder="14:00"
              className="col-span-3"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endTime" className="text-right">
              Tugash vaqti
            </Label>
            <Input
              id="endTime"
              placeholder="15:30"
              className="col-span-3"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="monthlyFee" className="text-right">
              Oylik to'lov
            </Label>
            <Input
              id="monthlyFee"
              type="number"
              placeholder="0"
              className="col-span-3"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GroupTable({ groups }: { groups: GroupData[] }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Return null on first server-render to prevent Intl.NumberFormat mismatch
  }

  return (

    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guruh / Fan</TableHead>
              <TableHead>O'qituvchi</TableHead>
              <TableHead>Vaqti</TableHead>
              <TableHead>Oylik To'lov</TableHead>
              <TableHead className="text-right">Harakatlar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Guruhlar topilmadi.
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">{group.name}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">{group.teacher || "Noma'lum"}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {group.startTime && group.endTime 
                      ? `${group.startTime} - ${group.endTime}`
                      : group.startTime || group.endTime || "Vaqt belgilanmagan"}
                  </TableCell>
                  <TableCell className="text-slate-900 dark:text-slate-100 font-medium">
                    {group.monthlyFee === 0 
                      ? <span className="text-slate-400 italic">Narx belgilanmagan</span> 
                      : `${new Intl.NumberFormat("uz-UZ").format(group.monthlyFee)} UZS`}
                  </TableCell>
                  <TableCell className="text-right">
                    <GroupFormModal
                      group={group}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      }
                    />
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
