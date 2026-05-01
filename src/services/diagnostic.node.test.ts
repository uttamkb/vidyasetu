import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDiagnosticPlan, estimateInitialMastery, type DiagnosticSubject } from "./diagnostic";

const subjects: DiagnosticSubject[] = [
  {
    id: "math",
    name: "Mathematics",
    orderIndex: 0,
    chapters: [
      {
        id: "math-ch-1",
        name: "Number Systems",
        orderIndex: 0,
        topics: [
          {
            id: "math-topic-1",
            name: "Real Numbers",
            orderIndex: 0,
            subtopics: [
              { id: "math-sub-1", name: "Rational Numbers", orderIndex: 0 },
              { id: "math-sub-2", name: "Irrational Numbers", orderIndex: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "science",
    name: "Science",
    orderIndex: 1,
    chapters: [
      {
        id: "sci-ch-1",
        name: "Motion",
        orderIndex: 0,
        topics: [
          {
            id: "sci-topic-1",
            name: "Describing Motion",
            orderIndex: 0,
            subtopics: [
              { id: "sci-sub-1", name: "Distance", orderIndex: 0 },
              { id: "sci-sub-2", name: "Velocity", orderIndex: 1 },
            ],
          },
        ],
      },
    ],
  },
];

describe("diagnostic service", () => {
  it("builds an interleaved plan across subjects", () => {
    const plan = buildDiagnosticPlan(subjects, { targetQuestionCount: 4 });

    assert.equal(plan.length, 4);
    assert.deepEqual(plan.map((item) => item.subjectName), [
      "Mathematics",
      "Science",
      "Mathematics",
      "Science",
    ]);
    assert.deepEqual(plan.map((item) => item.orderIndex), [0, 1, 2, 3]);
  });

  it("does not exceed available subtopics", () => {
    const plan = buildDiagnosticPlan(subjects, { targetQuestionCount: 25 });
    assert.equal(plan.length, 4);
  });

  it("returns an empty plan for empty curriculum", () => {
    const plan = buildDiagnosticPlan([], { targetQuestionCount: 25 });
    assert.equal(plan.length, 0);
  });

  it("estimates initial mastery conservatively", () => {
    const estimates = estimateInitialMastery([
      { subtopicId: "math-sub-1", isCorrect: true, confidence: 5 },
      { subtopicId: "math-sub-2", isCorrect: false, confidence: 2 },
    ]);

    const correct = estimates.find((estimate) => estimate.subtopicId === "math-sub-1");
    const incorrect = estimates.find((estimate) => estimate.subtopicId === "math-sub-2");

    assert.ok(correct);
    assert.ok(incorrect);
    assert.equal(correct.masteryScore, 84);
    assert.equal(correct.stability, 7);
    assert.equal(correct.retrievability, 1);
    assert.equal(incorrect.masteryScore, 18);
    assert.equal(incorrect.stability, 1);
    assert.equal(incorrect.retrievability, 0);
  });

  it("handles uneven subtopics in round-robin correctly", () => {
    const unevenSubjects: DiagnosticSubject[] = [
      {
        id: "math",
        name: "Math",
        chapters: [
          {
            id: "m-ch-1",
            name: "M-CH1",
            topics: [
              {
                id: "m-t-1",
                name: "M-T1",
                subtopics: [
                  { id: "m-s-1", name: "M-S1" },
                  { id: "m-s-2", name: "M-S2" },
                  { id: "m-s-3", name: "M-S3" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "sci",
        name: "Sci",
        chapters: [
          {
            id: "s-ch-1",
            name: "S-CH1",
            topics: [
              {
                id: "s-t-1",
                name: "S-T1",
                subtopics: [{ id: "s-s-1", name: "S-S1" }],
              },
            ],
          },
        ],
      },
    ];

    const plan = buildDiagnosticPlan(unevenSubjects, { targetQuestionCount: 10 });
    // Should be: Math(1), Sci(1), Math(2), Math(3)
    assert.equal(plan.length, 4);
    assert.deepEqual(plan.map((p) => p.subjectName), ["Math", "Sci", "Math", "Math"]);
  });

  it("calculates mastery score impact of confidence", () => {
    // High confidence, correct
    const high = estimateInitialMastery([{ subtopicId: "1", isCorrect: true, confidence: 5 }]);
    // Low confidence, correct
    const low = estimateInitialMastery([{ subtopicId: "2", isCorrect: true, confidence: 1 }]);

    // Base correct is 20 + 1.0 * 60 = 80
    // High confidence: 80 + (5-3)*2 = 84
    // Low confidence: 80 + (1-3)*2 = 76
    assert.equal(high[0].masteryScore, 84);
    assert.equal(low[0].masteryScore, 76);
  });

  it("clamps targetQuestionCount to 1-100", () => {
    const largePlan = buildDiagnosticPlan(subjects, { targetQuestionCount: 999 });
    const smallPlan = buildDiagnosticPlan(subjects, { targetQuestionCount: 0 });

    // subjects has 4 subtopics total
    assert.equal(largePlan.length, 4);
    assert.equal(smallPlan.length, 1); // Clamp to min 1
  });
});
