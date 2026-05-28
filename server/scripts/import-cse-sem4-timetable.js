require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const Department = require('../models/Department');
const User = require('../models/User');
const ClassGroup = require('../models/ClassGroup');
const ClassSession = require('../models/ClassSession');

const DEFAULT_PASSWORD = 'Faculty@123';

const facultyByCode = {
  JP: 'Dr. Prabhudev Jagadeesh',
  KCN: 'Dr. Niranjan C Kundur',
  RSR: 'Mrs. Ranjitha S R',
  BS: 'Mrs. Bindu S',
  BHV: 'Mrs. Bhavana H V',
  MBT: 'Dr. Manjunath B Talawar',
  BHB: 'Mrs. Bhavani B H',
  NH: 'Mrs. Nivedita Hebbale',
  KS: 'Mrs. Kavya S',
  TMR: 'Mrs. Tejaswini M R',
  NMJ: 'Ms. Neha M Jain',
  SR: 'Ms. Shreya R',
  ST: 'Mrs. Shruti T',
  BNR: 'Mrs. Rashmi B N',
  KSR: 'Dr. Rajeshwari K S',
  SK: 'Ms. Shweta Kaddi',
  LS: 'Faculty LS',
  VB: 'Faculty VB',
  DMS: 'Faculty DMS',
  NSL: 'Faculty NSL',
  KVS: 'Faculty KVS',
  SB: 'Faculty SB',
  PH: 'Dr. Pooja H',
};

const SLOTS = {
  S1: ['9.00', '10.00'],
  S2: ['10.00', '11.00'],
  S3: ['11.00', '12.00'],
  S4: ['12.00', '1.00'],
  S5: ['1.45', '2.45'],
  S6: ['2.45', '3.45'],
  S7: ['3.45', '4.45'],
};

const R = (day, slot, subject, codes, batch = '') => ({ day, slot, subject, codes, batch });

const timetable = {
  A: {
    room: 'A324',
    floor: 3,
    rows: [
      R('Monday', 'S1', 'BCS402', ['KCN']),
      R('Monday', 'S2', 'BCS403', ['RSR', 'ST'], 'A1'),
      R('Monday', 'S2', 'BCS403', ['NH', 'LS'], 'A2'),
      R('Monday', 'S2', 'BCS403', ['VB', 'SR'], 'A3'),
      R('Monday', 'S5', 'BBOC407', ['BS']),

      R('Tuesday', 'S1', 'BCS402', ['KCN', 'BNR'], 'A1'),
      R('Tuesday', 'S1', 'BCS402', ['NMJ', 'ST'], 'A2'),
      R('Tuesday', 'S1', 'BCS402', ['DMS', 'TMR'], 'A3'),
      R('Tuesday', 'S3', 'BCS403', ['RSR']),
      R('Tuesday', 'S4', 'BCS403', ['RSR']),

      R('Wednesday', 'S1', 'BCSL404', ['JP', 'KSR'], 'A1'),
      R('Wednesday', 'S1', 'BCSL456D', ['BNR', 'KCN'], 'A2'),
      R('Wednesday', 'S3', 'BUHK408', ['BHV']),
      R('Wednesday', 'S5', 'BCS401', ['JP']),

      R('Thursday', 'S1', 'BCS403', ['RSR']),
      R('Thursday', 'S2', 'BCS402', ['KCN']),
      R('Thursday', 'S3', 'BCS401', ['JP']),
      R('Thursday', 'S4', 'BCS405A/BCS405B', ['ST']),
      R('Thursday', 'S5', 'BCSL404', ['JP', 'MBT'], 'A2'),
      R('Thursday', 'S5', 'BCSL456D', ['BNR', 'KCN'], 'A3'),

      R('Friday', 'S1', 'BCSL404', ['JP', 'VB'], 'A3'),
      R('Friday', 'S1', 'BCSL456D', ['BNR', 'KCN'], 'A1'),
      R('Friday', 'S2', 'BCS402', ['KCN']),
      R('Friday', 'S3', 'BCS405A/BCS405B', ['ST']),

      R('Saturday', 'S1', 'BBOC407', ['BS']),
      R('Saturday', 'S2', 'BCS405A/BCS405B', ['ST']),
      R('Saturday', 'S3', 'BCS405A/BCS405B', ['ST']),
      R('Saturday', 'S4', 'BCS401', ['JP']),
    ],
  },
  B: {
    room: 'A302',
    floor: 3,
    rows: [
      R('Monday', 'S1', 'BCS401', ['MBT']),
      R('Monday', 'S2', 'BCS402', ['BHB']),
      R('Monday', 'S3', 'BCSL404', ['MBT', 'NSL'], 'B3'),
      R('Monday', 'S3', 'BCSL456D', ['TMR', 'BHV'], 'B1'),

      R('Tuesday', 'S1', 'BCS403', ['NH']),
      R('Tuesday', 'S2', 'BCS401', ['MBT']),
      R('Tuesday', 'S3', 'BCS403', ['NH', 'SR'], 'B1'),
      R('Tuesday', 'S3', 'BCS403', ['VB', 'NMJ'], 'B2'),
      R('Tuesday', 'S3', 'BCS403', ['TMR', 'BHV'], 'B3'),

      R('Wednesday', 'S1', 'BCS401', ['MBT']),
      R('Wednesday', 'S2', 'BBOC407', ['KS']),
      R('Wednesday', 'S3', 'BCS402', ['BHB', 'ST'], 'B1'),
      R('Wednesday', 'S3', 'BCS402', ['TMR', 'SR'], 'B2'),
      R('Wednesday', 'S3', 'BCS402', ['KVS', 'SB'], 'B3'),

      R('Thursday', 'S1', 'BCS403', ['NH']),
      R('Thursday', 'S2', 'BCSL404', ['MBT', 'NSL'], 'B1'),
      R('Thursday', 'S2', 'BCSL456D', ['RSR', 'BHV'], 'B2'),
      R('Thursday', 'S3', 'BCS405A/BCS405B', ['ST']),
      R('Thursday', 'S4', 'BBOC407', ['KS']),
      R('Thursday', 'S5', 'BUHK408', ['TMR']),

      R('Friday', 'S1', 'BCSL404', ['MBT', 'NSL'], 'B2'),
      R('Friday', 'S1', 'BCSL456D', ['RSR', 'ST'], 'B3'),
      R('Friday', 'S2', 'BCS402', ['BHB']),
      R('Friday', 'S3', 'BCS405A/BCS405B', ['ST']),

      R('Saturday', 'S1', 'BCS402', ['BHB']),
      R('Saturday', 'S2', 'BCS405A/BCS405B', ['ST']),
      R('Saturday', 'S3', 'BCS405A/BCS405B', ['ST']),
      R('Saturday', 'S4', 'BCS403', ['NH']),
    ],
  },
  C: {
    room: 'A303',
    floor: 3,
    rows: [
      R('Monday', 'S1', 'BCSL404', ['PH', 'BHV'], 'C2'),
      R('Monday', 'S1', 'BCSL456D', ['BNR', 'ST'], 'C1'),
      R('Monday', 'S2', 'BCS401', ['JP']),
      R('Monday', 'S3', 'BCS402', ['NMJ']),
      R('Monday', 'S4', 'BUHK408', ['SR']),
      R('Monday', 'S5', 'BCSL404', ['RSR', 'LS'], 'C1'),
      R('Monday', 'S5', 'BCSL456D', ['BNR', 'BHV'], 'C3'),

      R('Tuesday', 'S1', 'BCS403', ['MBT']),
      R('Tuesday', 'S2', 'BCS401', ['JP']),
      R('Tuesday', 'S3', 'BCSL404', ['JP', 'KSR'], 'C3'),
      R('Tuesday', 'S3', 'BCSL456D', ['ST', 'SK'], 'C2'),

      R('Wednesday', 'S1', 'BBOC407', ['KS']),
      R('Wednesday', 'S2', 'BCS402', ['NMJ']),
      R('Wednesday', 'S3', 'BCS403', ['MBT', 'RSR'], 'C1'),
      R('Wednesday', 'S3', 'BCS403', ['LS', 'SK'], 'C2'),
      R('Wednesday', 'S3', 'BCS403', ['NMJ', 'NH'], 'C3'),

      R('Thursday', 'S1', 'BCS402', ['NMJ', 'BHV'], 'C1'),
      R('Thursday', 'S1', 'BCS402', ['BNR', 'SR'], 'C2'),
      R('Thursday', 'S2', 'BBOC407', ['KS']),
      R('Thursday', 'S3', 'BCS402', ['NMJ']),
      R('Thursday', 'S4', 'BCS405A/BCS405B', ['ST']),

      R('Friday', 'S1', 'BCS402', ['NMJ', 'BHV'], 'C3'),
      R('Friday', 'S4', 'BCS403', ['MBT']),
      R('Friday', 'S5', 'BCS405A/BCS405B', ['ST']),

      R('Saturday', 'S1', 'BCS401', ['JP']),
      R('Saturday', 'S2', 'BCS405A/BCS405B', ['ST']),
      R('Saturday', 'S3', 'BCS405A/BCS405B', ['ST']),
      R('Saturday', 'S4', 'BCS403', ['MBT']),
    ],
  },
};

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');

const ensureFaculty = async (departmentId, code) => {
  const name = facultyByCode[code] || `Faculty ${code}`;
  const email = `${slugify(name)}.${slugify(code)}@jssateb.edu.in`;
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'faculty' || String(existing.department || '') !== String(departmentId)) {
      existing.role = 'faculty';
      existing.department = departmentId;
      await existing.save();
    }
    return { id: existing._id, created: false };
  }

  const created = await User.create({
    name,
    email,
    password: DEFAULT_PASSWORD,
    role: 'faculty',
    department: departmentId,
  });
  return { id: created._id, created: true };
};

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing');
  await mongoose.connect(process.env.MONGO_URI);

  const department = await Department.findOneAndUpdate(
    { code: 'CSE' },
    { $setOnInsert: { name: 'Computer Science and Engineering', code: 'CSE' } },
    { upsert: true, returnDocument: 'after' }
  );

  const facultyCodes = new Set();
  Object.values(timetable).forEach((sec) => sec.rows.forEach((r) => r.codes.forEach((c) => facultyCodes.add(c))));

  const facultyIdByCode = {};
  let facultyCreated = 0;
  for (const code of facultyCodes) {
    const { id, created } = await ensureFaculty(department._id, code);
    facultyIdByCode[code] = id;
    if (created) facultyCreated += 1;
  }

  const classGroupBySection = {};
  for (const section of Object.keys(timetable)) {
    const sectionInfo = timetable[section];
    const classGroup = await ClassGroup.findOneAndUpdate(
      {
        department: department._id,
        name: 'CSE',
        semester: '4',
        section,
      },
      {
        $setOnInsert: {
          department: department._id,
          name: 'CSE',
          semester: '4',
          section,
        },
        $set: {
          floor: sectionInfo.floor,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    classGroupBySection[section] = classGroup;
  }

  await ClassSession.deleteMany({ classGroup: { $in: Object.values(classGroupBySection).map((g) => g._id) } });

  let sessionsCreated = 0;
  for (const section of Object.keys(timetable)) {
    const sectionInfo = timetable[section];
    const group = classGroupBySection[section];

    for (const row of sectionInfo.rows) {
      const [startTime, endTime] = SLOTS[row.slot];
      for (const code of row.codes) {
        await ClassSession.create({
          classGroup: group._id,
          faculty: facultyIdByCode[code],
          subject: row.subject,
          day: row.day,
          startTime,
          endTime,
          floor: sectionInfo.floor,
          roomNumber: sectionInfo.room,
          batch: row.batch || '',
        });
        sessionsCreated += 1;
      }
    }
  }

  console.log(JSON.stringify({
    ok: true,
    department: 'CSE',
    classGroups: Object.keys(classGroupBySection).length,
    facultyCreated,
    sessionsCreated,
    defaultFacultyPassword: DEFAULT_PASSWORD,
  }, null, 2));

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
