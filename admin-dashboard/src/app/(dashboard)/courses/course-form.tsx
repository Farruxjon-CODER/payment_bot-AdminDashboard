"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCourse, updateCourse } from "./actions";

type CourseData = {
  id: number;
  name: string;
  teacherName: string;
  schedule: string;
  monthlyFee: number;
  isActive: boolean;
};

type CourseFormProps = {
  mode: "create" | "edit";
  course?: CourseData;
  trigger: React.ReactNode;
};

export function CourseForm({ mode, course, trigger }: CourseFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(course?.name ?? "");
  const [teacherName, setTeacherName] = useState(course?.teacherName ?? "");
  const [schedule, setSchedule] = useState(course?.schedule ?? "");
  const [monthlyFee, setMonthlyFee] = useState(
    course?.monthlyFee?.toString() ?? ""
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      name,
      teacherName,
      schedule,
      monthlyFee: parseInt(monthlyFee, 10) || 0,
    };

    startTransition(async () => {
      if (mode === "edit" && course) {
        await updateCourse(course.id, data);
      } else {
        await createCourse(data);
      }
      setOpen(false);

      // Reset form after creation
      if (mode === "create") {
        setName("");
        setTeacherName("");
        setSchedule("");
        setMonthlyFee("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Yangi kurs qo'shish" : "Kursni tahrirlash"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Yangi fan va o'qituvchini tizimga kiritish."
              : `"${course?.name}" kursini tahrirlash.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Fan nomi
            </Label>
            <Input
              id="name"
              placeholder="IELTS, Matematika..."
              className="col-span-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teacherName" className="text-right">
              O'qituvchi
            </Label>
            <Input
              id="teacherName"
              placeholder="Ism Familiya"
              className="col-span-3"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="schedule" className="text-right">
              Dars jadvali
            </Label>
            <Input
              id="schedule"
              placeholder="Dush-Chor-Juma 14:00-15:30"
              className="col-span-3"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="monthlyFee" className="text-right">
              Oylik to'lov
            </Label>
            <Input
              id="monthlyFee"
              type="number"
              placeholder="500000"
              className="col-span-3"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saqlanmoqda..."
                : mode === "create"
                  ? "Qo'shish"
                  : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
