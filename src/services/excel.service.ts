import * as xlsx from "xlsx";
import * as path from "path";
import { StudentService } from "./student.service";

export interface ExcelStudent {
  fullName: string;
  phone: string;
  courseName: string;
  teacherName: string;
  status: string;
}

export class ExcelService {
  /**
   * Load students from OQUVCHILAR.xlsx
   */
  static loadStudents(): ExcelStudent[] {
    try {
      const filePath = path.join(process.cwd(), "OQUVCHILAR.xlsx");
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Read raw data (skip header row using array-of-arrays format)
      const rawData = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      
      const students: ExcelStudent[] = [];
      
      // Start at 1 to skip the header row
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0 || !row[0]) continue;

        students.push({
          fullName: row[0]?.toString().trim() || "",
          phone: row[1]?.toString().trim() || "",
          courseName: row[2]?.toString().trim() || "",
          teacherName: row[3]?.toString().trim() || "",
          status: row[4]?.toString().trim() || "",
        });
      }

      return students;
    } catch (error) {
      console.error("Error reading Excel file:", error);
      return [];
    }
  }

  /**
   * Find a parent/student by their normalized phone number
   * and shape the data to perfectly match the Bot's existing UI logic.
   */
  static findByPhone(phone: string) {
    const students = this.loadStudents();
    const normalizedTarget = StudentService.normalizePhone(phone);
    
    // Find all rows matching this phone number
    const matchingRows = students.filter(s => 
      StudentService.normalizePhone(s.phone) === normalizedTarget
    );

    if (matchingRows.length === 0) return null;

    // Group courses by student fullName
    const studentsMap = new Map<string, any>();
    
    let studentIdCounter = 1;
    let enrollmentIdCounter = 1;

    for (const row of matchingRows) {
      if (!studentsMap.has(row.fullName)) {
        studentsMap.set(row.fullName, {
          id: studentIdCounter++,
          fullName: row.fullName,
          enrollments: []
        });
      }
      
      const student = studentsMap.get(row.fullName);
      student.enrollments.push({
        id: enrollmentIdCounter++,
        course: {
          name: row.courseName,
          teacherName: row.teacherName,
          // Defaults since Excel lacks these columns
          schedule: "Ma'lum emas", 
          monthlyFee: 0, 
        }
      });
    }

    // Return mocked User structure to satisfy the existing bot UI logic
    return {
      id: 1, 
      students: Array.from(studentsMap.values())
    };
  }
}
