// ASE-style practice questions for the automobile series (A1–A9, G1).
// Original questions written for study; not official ASE test items.
//
// Test specifications (scored questions per content area) follow ASE's published
// specs: A1 and A2 as revised January 2026, A3–A9 and G1 as effective July 2023.
// `minutes` uses 1.5 minutes per scored question for the exam clock.
//
// Questions live in ase-bank/<TEST>.js and push into ASE_QUESTIONS:
//   type 'mc'   : `choices` + `answer` (index). Choices are shuffled at runtime.
//   type 'tech' : "Technician A says / Technician B says". Choices are fixed:
//                 0 = A only, 1 = B only, 2 = Both A and B, 3 = Neither A nor B.
//   `sub` is the content-area key from ASE_TESTS[test].areas.
const ASE_TESTS = {
  A1: { name: "Engine Repair", icon: '🔩', master: true, scored: 45, minutes: 67.5, areas: [
    { key: 'A', name: "General Engine Diagnosis", n: 18 },
    { key: 'B', name: "Cylinder Head and Valve Train Diagnosis and Repair", n: 6 },
    { key: 'C', name: "Engine Block Diagnosis and Repair", n: 4 },
    { key: 'D', name: "Lubrication and Cooling Systems Diagnosis and Repair", n: 8 },
    { key: 'E', name: "Fuel, Electrical, Ignition, Air Induction, and Exhaust Systems Inspection and Service", n: 9 },
  ] },
  A2: { name: "Automatic Transmission/Transaxle", icon: '⚙️', master: true, scored: 45, minutes: 67.5, areas: [
    { key: 'A', name: "Transmission/Transaxle Diagnosis", n: 26 },
    { key: 'B', name: "In-Vehicle Transmission/Transaxle Maintenance and Repair", n: 12 },
    { key: 'C', name: "Transmission/Transaxle Removal, Inspection, and Installation", n: 7 },
  ] },
  A3: { name: "Manual Drive Train and Axles", icon: '🕹️', master: true, scored: 40, minutes: 60, areas: [
    { key: 'A', name: "Clutch Diagnosis and Repair", n: 6 },
    { key: 'B', name: "Transmission Diagnosis and Repair", n: 7 },
    { key: 'C', name: "Transaxle Diagnosis and Repair", n: 7 },
    { key: 'D', name: "Drive Shaft, Half-Shaft, Universal Joint/CV Joint Diagnosis and Repair", n: 5 },
    { key: 'E', name: "Drive Axle Diagnosis and Repair", n: 7 },
    { key: 'F', name: "Four-Wheel Drive/All-Wheel Drive Component Diagnosis and Repair", n: 8 },
  ] },
  A4: { name: "Suspension and Steering", icon: '🛞', master: true, scored: 40, minutes: 60, areas: [
    { key: 'A', name: "Steering Systems Diagnosis and Repair", n: 12 },
    { key: 'B', name: "Suspension Systems Diagnosis and Repair", n: 12 },
    { key: 'C', name: "Wheel Alignment Diagnosis, Adjustment, and Repair", n: 11 },
    { key: 'D', name: "Wheel and Tire Diagnosis and Repair", n: 5 },
  ] },
  A5: { name: "Brakes", icon: '🛑', master: true, scored: 45, minutes: 67.5, areas: [
    { key: 'A', name: "Hydraulic, Power Assist, and Parking Brake Systems Diagnosis and Repair", n: 19 },
    { key: 'B', name: "Drum Brake Diagnosis and Repair", n: 5 },
    { key: 'C', name: "Disc Brake Diagnosis and Repair", n: 11 },
    { key: 'D', name: "Electronic Brake Control Systems (ABS, TCS, ESC) Diagnosis and Repair", n: 10 },
  ] },
  A6: { name: "Electrical/Electronic Systems", icon: '⚡', master: true, scored: 50, minutes: 75, areas: [
    { key: 'A', name: "General Electrical/Electronic System Diagnosis", n: 13 },
    { key: 'B', name: "Battery and Starting System Diagnosis and Repair", n: 9 },
    { key: 'C', name: "Charging System Diagnosis and Repair", n: 5 },
    { key: 'D', name: "Lighting Systems Diagnosis and Repair", n: 6 },
    { key: 'E', name: "Body Electrical Systems Diagnosis and Repair", n: 17 },
  ] },
  A7: { name: "Heating and Air Conditioning", icon: '❄️', master: true, scored: 50, minutes: 75, areas: [
    { key: 'A', name: "HVAC and Engine Cooling System Service, Diagnosis, and Repair", n: 21 },
    { key: 'B', name: "Refrigeration System Component Diagnosis and Repair", n: 10 },
    { key: 'C', name: "Operating Systems and Related Controls Diagnosis and Repair", n: 19 },
  ] },
  A8: { name: "Engine Performance", icon: '📈', master: true, scored: 50, minutes: 75, areas: [
    { key: 'A', name: "General Engine Diagnosis", n: 12 },
    { key: 'B', name: "Ignition System Diagnosis and Repair", n: 8 },
    { key: 'C', name: "Fuel, Air Induction, and Exhaust Systems Diagnosis and Repair", n: 9 },
    { key: 'D', name: "Emissions Control Systems Diagnosis and Repair", n: 8 },
    { key: 'E', name: "Computerized Engine Controls Diagnosis and Repair", n: 13 },
  ] },
  A9: { name: "Light Vehicle Diesel Engines", icon: '🛢️', master: false, scored: 50, minutes: 75, areas: [
    { key: 'A', name: "General Diagnosis", n: 9 },
    { key: 'B', name: "Cylinder Head and Valve Train Diagnosis and Repair", n: 5 },
    { key: 'C', name: "Engine Block Diagnosis and Repair", n: 5 },
    { key: 'D', name: "Lubrication and Cooling Systems Diagnosis and Repair", n: 6 },
    { key: 'E', name: "Air Induction and Exhaust Systems Diagnosis and Repair", n: 12 },
    { key: 'F', name: "Fuel System Diagnosis and Repair", n: 13 },
  ] },
  G1: { name: "Auto Maintenance and Light Repair", icon: '🧰', master: false, scored: 55, minutes: 82.5, areas: [
    { key: 'A', name: "Engine Systems", n: 9 },
    { key: 'B', name: "Automatic Transmission/Transaxle", n: 4 },
    { key: 'C', name: "Manual Drive Train and Axles", n: 6 },
    { key: 'D', name: "Suspension and Steering", n: 13 },
    { key: 'E', name: "Brakes", n: 11 },
    { key: 'F', name: "Electrical", n: 8 },
    { key: 'G', name: "Heating, Ventilation, and Air Conditioning", n: 4 },
  ] },
};

const TECH_CHOICES = ['A only', 'B only', 'Both A and B', 'Neither A nor B'];

const ASE_QUESTIONS = [];

// Free sample: about 15% of every content area (at least 2 questions) is open to
// everyone; Pro unlocks the rest. Uses the lowest-numbered questions so the set is
// stable. The web demo build ships only these questions.
const FREE_SHARE = 0.15;
function markFreeQuestions(questions) {
  // The web demo ships pre-marked questions (only the free sample); keep those flags.
  if (questions.length && questions.every((q) => typeof q.free === 'boolean')) return questions;
  const groups = {};
  for (const q of questions) (groups[`${q.test}|${q.sub}`] = groups[`${q.test}|${q.sub}`] || []).push(q);
  const num = (q) => Number(q.id.split('-')[1]);
  for (const group of Object.values(groups)) {
    group.sort((a, b) => num(a) - num(b));
    const n = Math.max(2, Math.round(group.length * FREE_SHARE));
    group.forEach((q, i) => { q.free = i < n; });
  }
  return questions;
}
if (typeof module !== 'undefined') module.exports = { ASE_TESTS, TECH_CHOICES, markFreeQuestions };
