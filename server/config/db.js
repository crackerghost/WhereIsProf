const mongoose = require('mongoose');
const Department = require('../models/Department');

const defaultDepartments = [
  { name: 'Computer Science and Engineering', code: 'CSE' },
  { name: 'Information Science and Engineering', code: 'ISE' },
  { name: 'Artificial Intelligence and Machine Learning', code: 'AIML' },
  { name: 'Electronics and Communication Engineering', code: 'ECE' },
  { name: 'Electrical and Electronics Engineering', code: 'EEE' },
  { name: 'Mechanical Engineering', code: 'MECH' },
  { name: 'Civil Engineering', code: 'CIVIL' },
  { name: 'Chemical Engineering', code: 'CHEM' },
  { name: 'Biotechnology Engineering', code: 'BT' },
  { name: 'Aerospace Engineering', code: 'AERO' },
  { name: 'Industrial Engineering', code: 'IE' },
  { name: 'Computer Science and Design', code: 'CSD' },
  { name: 'Computer Science and Business Systems', code: 'CSBS' },
  { name: 'Data Science', code: 'DS' },
];

const seedDefaultDepartments = async () => {
  const ops = defaultDepartments.map((dept) => ({
    updateOne: {
      filter: { code: dept.code },
      update: { $setOnInsert: dept },
      upsert: true,
    },
  }));

  await Department.bulkWrite(ops);
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedDefaultDepartments();
    console.log('Default departments ensured');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
