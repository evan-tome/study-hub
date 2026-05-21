export interface Course {
  code: string;
  name: string;
  faculty: string;
}

export const COURSES: Course[] = [
  // Computer Science
  { code: 'CSCI 1020', name: 'Programming Workshop I', faculty: 'Science' },
  { code: 'CSCI 1030', name: 'Programming Workshop II', faculty: 'Science' },
  { code: 'CSCI 2010', name: 'Computer Architecture', faculty: 'Science' },
  { code: 'CSCI 2050', name: 'Algorithm Design and Analysis', faculty: 'Science' },
  { code: 'CSCI 2072', name: 'Numerical Methods', faculty: 'Science' },
  { code: 'CSCI 2110', name: 'Discrete Mathematics for Computer Science', faculty: 'Science' },
  { code: 'CSCI 3010', name: 'Programming Languages', faculty: 'Science' },
  { code: 'CSCI 3030', name: 'Software Quality Assurance', faculty: 'Science' },
  { code: 'CSCI 3230', name: 'Database Systems', faculty: 'Science' },
  { code: 'CSCI 3610', name: 'Artificial Intelligence', faculty: 'Science' },
  { code: 'CSCI 4030', name: 'Machine Learning', faculty: 'Science' },
  { code: 'CSCI 4210', name: 'Computer Vision', faculty: 'Science' },
  // Software Engineering
  { code: 'SOFE 2020', name: 'Programming Concepts for Engineers', faculty: 'Engineering' },
  { code: 'SOFE 2800', name: 'Operating Systems', faculty: 'Engineering' },
  { code: 'SOFE 3200', name: 'Computer Networks', faculty: 'Engineering' },
  { code: 'SOFE 3500', name: 'Real Time Systems', faculty: 'Engineering' },
  { code: 'SOFE 3700', name: 'Software Architecture and Design', faculty: 'Engineering' },
  { code: 'SOFE 4500', name: 'Software Project Management', faculty: 'Engineering' },
  // Electrical & Computer Engineering
  { code: 'ELET 3640', name: 'Digital Systems Design', faculty: 'Engineering' },
  { code: 'ELET 4610', name: 'Embedded Systems', faculty: 'Engineering' },
  // Mechanical Engineering
  { code: 'MECE 2420', name: 'Fluid Mechanics', faculty: 'Engineering' },
  { code: 'MECE 3510', name: 'Thermodynamics', faculty: 'Engineering' },
  { code: 'MECE 4240', name: 'Machine Design', faculty: 'Engineering' },
  // Engineering General
  { code: 'ENGR 1020', name: 'Engineering Design and Practice', faculty: 'Engineering' },
  { code: 'ENGR 2820', name: 'Materials Science and Engineering', faculty: 'Engineering' },
  { code: 'NUCL 2020', name: 'Nuclear Engineering', faculty: 'Engineering' },
  // Mathematics
  { code: 'MATH 1010', name: 'Calculus I', faculty: 'Science' },
  { code: 'MATH 1020', name: 'Calculus II', faculty: 'Science' },
  { code: 'MATH 2050', name: 'Differential Equations', faculty: 'Science' },
  { code: 'MATH 2080', name: 'Linear Algebra', faculty: 'Science' },
  { code: 'MATH 3010', name: 'Real Analysis', faculty: 'Science' },
  { code: 'STAT 2010', name: 'Statistics for Engineers', faculty: 'Science' },
  { code: 'STAT 3010', name: 'Probability Theory', faculty: 'Science' },
  // Physics & Chemistry
  { code: 'PHYS 1010', name: 'Introductory Physics I', faculty: 'Science' },
  { code: 'PHYS 1020', name: 'Introductory Physics II', faculty: 'Science' },
  { code: 'CHEM 1010', name: 'Introductory Chemistry I', faculty: 'Science' },
  { code: 'CHEM 1020', name: 'Introductory Chemistry II', faculty: 'Science' },
  // Biology
  { code: 'BIOL 1010', name: 'Cell Biology', faculty: 'Science' },
  { code: 'BIOL 2010', name: 'Genetics', faculty: 'Science' },
  { code: 'BIOL 3010', name: 'Molecular Biology', faculty: 'Science' },
  // Business & IT
  { code: 'BUSI 1020', name: 'Introduction to Business', faculty: 'Business & IT' },
  { code: 'BUSI 1600', name: 'Accounting Foundations', faculty: 'Business & IT' },
  { code: 'BUSI 2000', name: 'Microeconomics', faculty: 'Business & IT' },
  { code: 'BUSI 2010', name: 'Macroeconomics', faculty: 'Business & IT' },
  { code: 'BUSI 3000', name: 'Marketing Management', faculty: 'Business & IT' },
  { code: 'BUSI 3500', name: 'Financial Management', faculty: 'Business & IT' },
  { code: 'INFR 1016', name: 'Introduction to Web Systems', faculty: 'Business & IT' },
  { code: 'INFR 2141', name: 'Object-Oriented Programming', faculty: 'Business & IT' },
  { code: 'INFR 3110', name: 'Systems Analysis and Design', faculty: 'Business & IT' },
  // Health Sciences
  { code: 'HLSC 1000', name: 'Introduction to Health Sciences', faculty: 'Health Sciences' },
  { code: 'HLSC 2010', name: 'Epidemiology', faculty: 'Health Sciences' },
  { code: 'NURS 1020', name: 'Foundations of Nursing', faculty: 'Health Sciences' },
  // Education
  { code: 'EDUC 1001', name: 'Education in Canada', faculty: 'Education' },
  { code: 'EDUC 2200', name: 'Educational Psychology', faculty: 'Education' },
  // Social Science & Humanities
  { code: 'COMM 1050', name: 'Writing for Academic and Professional Purposes', faculty: 'Social Science' },
  { code: 'SSCI 1010', name: 'Introduction to Social Science', faculty: 'Social Science' },
  { code: 'CRIM 1000', name: 'Introduction to Criminology', faculty: 'Social Science' },
  { code: 'PSYC 1010', name: 'Introduction to Psychology', faculty: 'Social Science' },
  { code: 'SOCI 1000', name: 'Introduction to Sociology', faculty: 'Social Science' },
];

const _map = new Map(COURSES.map((c) => [c.code, c]));

export function getCourse(code: string): Course | undefined {
  return _map.get(code);
}

export function getCourseName(code: string): string {
  return _map.get(code)?.name ?? code;
}
