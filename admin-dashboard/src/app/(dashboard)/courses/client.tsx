"use client";

import { BookOpen, Users, Clock, Pencil } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseForm } from "./course-form";

type CourseData = {
  id: number;
  name: string;
  teacherName: string;
  schedule: string;
  monthlyFee: number;
  isActive: boolean;
};

export function CoursesGrid({ courses }: { courses: CourseData[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <Card key={course.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-bold">{course.name}</CardTitle>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-4">
              <div className="flex items-center text-sm">
                <Users className="mr-2 h-4 w-4 text-primary" />
                <span className="font-medium">{course.teacherName}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                {course.schedule}
              </div>
              <div className="pt-4 border-t mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Oylik to'lov:</span>
                <span className="text-lg font-bold text-primary">
                  {new Intl.NumberFormat("uz-UZ").format(course.monthlyFee)} UZS
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <CourseForm
              mode="edit"
              course={course}
              trigger={
                <Button variant="outline" className="w-full">
                  <Pencil className="h-4 w-4 mr-2" /> Tahrirlash
                </Button>
              }
            />
          </CardFooter>
        </Card>
      ))}

      {/* Add new course card — wired to the Create modal */}
      <CourseForm
        mode="create"
        trigger={
          <Card className="hover:shadow-md transition-shadow border-dashed flex flex-col items-center justify-center p-6 text-muted-foreground cursor-pointer hover:bg-slate-50 min-h-[250px]">
            <div className="rounded-full bg-slate-100 p-4 mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="font-semibold text-lg">Yangi kurs qo&apos;shish</h3>
            <p className="text-sm text-center mt-1">Yangi fan va o&apos;qituvchini tizimga kiritish</p>
          </Card>
        }
      />
    </div>
  );
}
