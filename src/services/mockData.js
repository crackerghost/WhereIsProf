export const professors = [
  {
    id: 1,
    name: "Dr. Aris Thorne",
    department: "Computer Science",
    cabinNumber: "CS-301",
    status: "available", // available, busy, in-class
    email: "athorne@college.edu",
    floor: 3,
  },
  {
    id: 2,
    name: "Prof. Sarah Jenkins",
    department: "Mathematics",
    cabinNumber: "MA-102",
    status: "in-class",
    email: "sjenkins@college.edu",
    floor: 1,
  },
  {
    id: 3,
    name: "Dr. Robert Miller",
    department: "Physics",
    cabinNumber: "PH-205",
    status: "busy",
    email: "rmiller@college.edu",
    floor: 2,
  },
  {
    id: 4,
    name: "Dr. Elena Rodriguez",
    department: "Computer Science",
    cabinNumber: "CS-305",
    status: "available",
    email: "erodriguez@college.edu",
    floor: 3,
  },
  {
    id: 5,
    name: "Prof. David Chen",
    department: "Electrical Engineering",
    cabinNumber: "EE-110",
    status: "available",
    email: "dchen@college.edu",
    floor: 1,
  },
  {
    id: 6,
    name: "Dr. Lisa Wong",
    department: "Biology",
    cabinNumber: "BI-402",
    status: "in-class",
    email: "lwong@college.edu",
    floor: 4,
  },
  {
    id: 7,
    name: "Prof. James Wilson",
    department: "Mechanical Engineering",
    cabinNumber: "ME-215",
    status: "busy",
    email: "jwilson@college.edu",
    floor: 2,
  },
  {
    id: 8,
    name: "Dr. Maria Garcia",
    department: "Chemistry",
    cabinNumber: "CH-312",
    status: "available",
    email: "mgarcia@college.edu",
    floor: 3,
  },
  {
    id: 9,
    name: "Prof. Thomas Brown",
    department: "Computer Science",
    cabinNumber: "CS-310",
    status: "available",
    email: "tbrown@college.edu",
    floor: 3,
  },
  {
    id: 10,
    name: "Dr. Karen White",
    department: "Mathematics",
    cabinNumber: "MA-105",
    status: "in-class",
    email: "kwhite@college.edu",
    floor: 1,
  },
];

export const departments = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Electrical Engineering",
  "Biology",
  "Mechanical Engineering",
  "Chemistry",
];

export const studentTimetable = [
  {
    id: 1,
    time: "09:00 - 10:00",
    subject: "Data Structures",
    faculty: "Dr. Aris Thorne",
    room: "CS-101",
  },
  {
    id: 2,
    time: "10:15 - 11:15",
    subject: "Calculus II",
    faculty: "Prof. Sarah Jenkins",
    room: "MA-102",
  },
  {
    id: 3,
    time: "11:30 - 12:30",
    subject: "Quantum Physics",
    faculty: "Dr. Robert Miller",
    room: "PH-205",
  },
];

export const facultyTimetable = [
  {
    id: 1,
    time: "09:00 - 10:00",
    subject: "Advanced Algorithms",
    room: "CS-301",
    class: "CS-Year 3",
  },
  {
    id: 2,
    time: "11:30 - 12:30",
    subject: "Operating Systems",
    room: "CS-305",
    class: "CS-Year 2",
  },
];

export const subjectUpdates = [
  {
    id: 1,
    subject: "Data Structures",
    faculty: "Dr. Aris Thorne",
    updates: [
      {
        id: 101,
        type: "text",
        content: "Please review the lecture notes on AVL Trees before tomorrow's lab.",
        date: "2026-05-12 14:30",
      },
      {
        id: 102,
        type: "file",
        fileName: "AVL_Tree_Implementation.pdf",
        fileSize: "1.2 MB",
        date: "2026-05-11 10:15",
      },
    ],
  },
  {
    id: 2,
    subject: "Calculus II",
    faculty: "Prof. Sarah Jenkins",
    updates: [
      {
        id: 201,
        type: "text",
        content: "Quiz 3 results have been uploaded to the portal.",
        date: "2026-05-12 09:00",
      },
    ],
  },
  {
    id: 3,
    subject: "Quantum Physics",
    faculty: "Dr. Robert Miller",
    updates: [
      {
        id: 301,
        type: "file",
        fileName: "Quantum_Entanglement_Lab.zip",
        fileSize: "5.8 MB",
        date: "2026-05-10 16:45",
      },
      {
        id: 302,
        type: "text",
        content: "Lab submission deadline extended to Friday midnight.",
        date: "2026-05-10 16:50",
      },
    ],
  },
];
