import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const subjects = [
  { name: "Mathematics", color: "bg-blue-500", icon: "Calculator", grade: "9", board: "CBSE" },
  { name: "Science", color: "bg-green-500", icon: "FlaskConical", grade: "9", board: "CBSE" },
  { name: "Social Science", color: "bg-orange-500", icon: "Globe", grade: "9", board: "CBSE" },
  { name: "English", color: "bg-purple-500", icon: "BookOpen", grade: "9", board: "CBSE" },
  { name: "Hindi", color: "bg-rose-500", icon: "Pen", grade: "9", board: "CBSE" },
];

const topicMap: Record<string, string[]> = {
  Mathematics: [
    "Number Systems", "Polynomials", "Coordinate Geometry", "Linear Equations",
    "Euclid's Geometry", "Lines & Angles", "Triangles", "Quadrilaterals",
    "Area", "Circles", "Constructions", "Heron's Formula",
    "Surface Areas & Volumes", "Statistics", "Probability",
  ],
  Science: [
    "Matter in Our Surroundings", "Is Matter Around Us Pure", "Atoms & Molecules",
    "Structure of Atom", "The Fundamental Unit of Life", "Tissues",
    "Diversity in Living Organisms", "Motion", "Force & Laws of Motion",
    "Gravitation", "Work & Energy", "Sound", "Why Do We Fall Ill",
    "Natural Resources", "Improvement in Food Resources",
  ],
  "Social Science": [
    "French Revolution", "Socialism in Europe", "Nazism & Rise of Hitler",
    "Forest Society", "Pastoralists in the Modern World", "Peasants & Farmers",
    "India - Size & Location", "Physical Features of India", "Drainage",
    "Climate", "Natural Vegetation", "Population", "Democracy",
    "Constitutional Design", "Electoral Politics",
  ],
  English: [
    "Beehive Prose", "Beehive Poetry", "Moments Prose",
    "Grammar - Tenses", "Grammar - Modals",
    "Writing - Letters", "Writing - Articles", "Writing - Reports",
  ],
  Hindi: [
    "Kshitij Prose", "Kshitij Poetry", "Kritika",
    "Vyakaran - Sandhi", "Vyakaran - Samas",
    "Nibandh Lekhan", "Patra Lekhan",
  ],
};

function generateQuestions(subject: string, week: number) {
  const topics = topicMap[subject] || ["General"];
  const topic = topics[(week - 1) % topics.length];
  const questions = [];

  for (let i = 0; i < 5; i++) {
    questions.push({
      question: `${subject} - ${topic}: MCQ Question ${i + 1} for Week ${week}`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: "Option A",
      type: "MCQ",
      marks: 1,
    });
  }

  for (let i = 0; i < 3; i++) {
    questions.push({
      question: `${subject} - ${topic}: Short Answer Question ${i + 1} for Week ${week}`,
      correctAnswer: "Sample correct answer with key points",
      type: "SHORT_ANSWER",
      marks: 3,
      keywords: ["key point 1", "key point 2", "important concept"],
    });
  }

  for (let i = 0; i < 2; i++) {
    questions.push({
      question: `${subject} - ${topic}: Long Answer Question ${i + 1} for Week ${week}`,
      correctAnswer: "Detailed sample answer covering all aspects",
      type: "LONG_ANSWER",
      marks: 5,
      keywords: ["introduction", "main points", "conclusion", "examples"],
    });
  }

  return questions;
}

export async function POST() {
  try {
    const createdSubjects = [];
    for (const subject of subjects) {
      const s = await prisma.subject.upsert({
        where: {
          name_grade_board: {
            name: subject.name,
            grade: subject.grade,
            board: subject.board,
          },
        },
        update: {},
        create: subject,
      });
      createdSubjects.push(s);
    }

    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + (7 - now.getDay()));
    sunday.setHours(23, 59, 59, 999);

    for (const subject of createdSubjects) {
      const questions = generateQuestions(subject.name, 1);
      await prisma.assignment.create({
        data: {
          title: `${subject.name} - Week 1 Assignment`,
          description: `Practice assignment for ${subject.name} covering Week 1 topics.`,
          weekNumber: 1,
          subjectId: subject.id,
          questions: questions as any,
          maxMarks: 25,
          dueDate: sunday,
          timeLimit: 60,
        },
      });
    }

    const materialTypes = ["NOTES", "VIDEO", "PDF", "PRACTICE"];
    for (const subject of createdSubjects) {
      const topics = topicMap[subject.name] || ["General"];
      for (let i = 0; i < Math.min(4, topics.length); i++) {
        await prisma.studyMaterial.create({
          data: {
            title: `${subject.name} - ${topics[i]} ${materialTypes[i % 4]}`,
            description: `Study material for ${topics[i]}`,
            type: materialTypes[i % 4],
            url: "#",
            subjectId: subject.id,
            topic: topics[i],
          },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Database seeded successfully" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
