import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Read DATABASE_URL from .env.local manually
import { readFileSync } from "fs";
const envLines = readFileSync(".env.local", "utf-8").replace(/\r\n/g, "\n").split("\n");
const dbLine = envLines.find((l) => l.startsWith("DATABASE_URL="));
const DATABASE_URL = dbLine ? dbLine.replace("DATABASE_URL=", "").replace(/^["']|["']$/g, "") : process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
console.log("DATABASE_URL:", DATABASE_URL.substring(0, 50) + "...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaNeon({ connectionString: DATABASE_URL } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma = new PrismaClient({ adapter } as any);

/** Compact curriculum seed. Each string is "chapter|topic|subtopic1,subtopic2,..." */
const MATH = `Number Systems|Introduction|Rational Numbers,Irrational Numbers,Real Numbers
Number Systems|Decimal Expansions|Terminating Decimals,Recurring Decimals,Non-Recurring Decimals
Polynomials|Introduction|Definition and Types,Degree,Zeroes
Polynomials|Factorization|Grouping,Using Identities,Splitting Middle Term
Polynomials|Algebraic Identities|Square of Sum,Square of Difference,Difference of Squares
Coordinate Geometry|Cartesian Plane|Axes and Quadrants,Coordinates,Plotting Points
Linear Equations|Introduction|Standard Form,Solutions
Linear Equations|Graphical|Plotting,Lines Parallel to Axes
Euclid's Geometry|Definitions|Definitions,Axioms,Postulates
Lines and Angles|Basic Terms|Types of Angles,Pairs of Angles
Lines and Angles|Parallel Lines|Corresponding Angles,Alternate Interior Angles
Triangles|Congruence|SAS,ASA,SSS,RHS
Triangles|Properties|Angles Opposite Equal Sides,Sides Opposite Equal Angles
Quadrilaterals|Types|Parallelogram,Rectangle,Rhombus,Square
Quadrilaterals|Midpoint Theorem|Statement,Converse
Areas|Area Concepts|Same Base Same Parallels,Parallelogram Area,Triangle Area
Circles|Basics|Chords and Arcs,Angle Subtended,Perpendicular from Centre
Circles|Cyclic Quadrilaterals|Angle in Semicircle,Properties
Constructions|Basic|Angle Bisector,Perpendicular Bisector
Constructions|Triangles|Base and Sum,Base and Difference,Perimeter
Heron's Formula|Triangle Area|Derivation,Applications
Heron's Formula|Quadrilateral|Dividing into Triangles
Surface Areas|Cuboid and Cube|Surface Area,Volume
Surface Areas|Cylinder|Curved Surface,Total Surface,Volume
Surface Areas|Cone|Curved Surface,Total Surface,Volume
Surface Areas|Sphere|Surface Area,Volume,Hemisphere
Statistics|Data|Raw Data,Frequency,Class Intervals
Statistics|Measures|Mean,Median,Mode
Probability|Experimental|Coin Toss,Dice Throw
Probability|Theoretical|Formula,Sum of Probabilities`;

const SCIENCE = `Matter|Physical Nature|Particles,Particle Size
Matter|States|Solid,Liquid,Gas,Interconversion
Matter|Evaporation|Factors,Cooling Effect
Pure Matter|Mixtures|Homogeneous,Heterogeneous,Solutions,Suspensions,Colloids
Pure Matter|Separation|Evaporation,Centrifugation,Sublimation,Chromatography,Distillation
Pure Matter|Pure Substances|Elements,Compounds
Atoms|Laws|Conservation of Mass,Constant Proportions
Atoms|Structure|Dalton's Theory,Atomic Mass,Molecules
Atoms|Mole Concept|Avogadro's Number,Molar Mass
Structure of Atom|Models|Thomson,Rutherford,Bohr
Structure of Atom|Particles|Electrons,Protons,Neutrons,Isotopes
Structure of Atom|Distribution|Shells,Valency,Octet Rule
Cell|Discovery|Cell Theory,Prokaryotic vs Eukaryotic
Cell|Structure|Membrane,Wall,Nucleus,Cytoplasm,ER,Golgi,Mitochondria
Tissues|Plant|Meristematic,Simple Permanent,Complex Permanent
Tissues|Animal|Epithelial,Connective,Muscular,Nervous
Diversity|Classification|Five Kingdom,Hierarchy
Diversity|Plants|Thallophyta,Bryophyta,Pteridophyta,Gymnosperms,Angiosperms
Diversity|Animals|Porifera,Coelenterata,Platyhelminthes,Arthropoda,Vertebrata
Motion|Description|Distance,Speed,Velocity,Acceleration
Motion|Graphs|Distance-Time,Velocity-Time
Motion|Equations|First,Second,Third,Derivations
Motion|Circular|Definition,Examples
Force|Basics|Balanced Forces,First Law,Inertia
Force|Second Law|F=ma,Momentum,Derivation
Force|Third Law|Action-Reaction,Applications
Force|Conservation|Derivation,Applications
Gravitation|Universal Law|Newton's Law,G and g
Gravitation|Free Fall|Acceleration,Mass and Weight
Gravitation|Pressure|Buoyancy,Archimedes,Relative Density
Work and Energy|Work|Definition,Conditions,Constant Force
Work and Energy|Energy|Kinetic,Potential,Conservation
Work and Energy|Power|Definition,Commercial Unit
Sound|Production|How Produced,Medium,Wave Types
Sound|Characteristics|Wavelength,Frequency,Amplitude,Pitch,Loudness
Sound|Reflection|Echo,Reverberation,SONAR
Health|Disease|Signs,Acute vs Chronic,Infectious
Health|Causes|Agents,Spread,Treatment,Prevention
Natural Resources|Air|Atmosphere,Pollution,Ozone
Natural Resources|Water|Water Cycle,Pollution
Natural Resources|Soil|Formation,Erosion,Cycles
Food Resources|Crops|Nutrients,Irrigation,Protection
Food Resources|Animals|Cattle,Poultry,Fish,Bee Keeping`;

const SST = `French Revolution|Causes|Social,Political,Economic
French Revolution|Events|Bastille,Reign of Terror,Directory
French Revolution|Impact|Rights of Man,Napoleon
Russian Revolution|Background|Liberalism,Socialism
Russian Revolution|Events|1905,February,October,Civil War
Nazism|Weimar Republic|Treaty of Versailles,Crisis
Nazism|Hitler's Rise|Nazi Party,Enabling Act
Nazism|Impact|Holocaust,Youth,Propaganda
Forest Society|Deforestation|Colonialism,Commercial Agriculture
Forest Society|Rebellion|Santal,Forest Rights
Pastoralists|Lifestyle|Nomadic,Gujjar,Bakarwal
Pastoralists|Colonial Impact|Grazing Tax,Sedentarization
Peasants|French Peasants|Revolution,Abolition of Feudalism
Peasants|Indian Peasants|Indigo,Champaran
India Size|Location|Latitudes,Longitudes,Extent
India Physical|Mountains|Himalayas,Peninsular
India Physical|Drainage|Himalayan Rivers,Peninsular Rivers
India Climate|Factors|Latitude,Altitude,Pressure
India Climate|Seasons|Winter,Summer,Monsoon
India Vegetation|Types|Tropical Rainforest,Deciduous,Thorn
India Population|Distribution|Density,Growth,Urbanization
Democracy|Features|Free and Fair Elections,Accountability
Constitution|Making|Constituent Assembly,Principles
Constitution|Features|Secularism,Federalism,Fundamental Rights
Electoral Politics|Elections|Universal Adult Franchise,Political Parties
Institutions|Parliament|Lok Sabha,Rajya Sabha,President
Institutions|Judiciary|Supreme Court,Independence
Democratic Rights|Rights|Right to Equality,Freedom,Education
Democratic Rights|Duties|Fundamental Duties
Economics|Story of Village|Farming,Non-Farm Activities
Economics|People as Resource|Education,Health
Economics|Poverty|Poverty Line,Anti-Poverty Measures
Economics|Food Security|Buffer Stock,PDS`;

const ENGLISH = `Beehive|Poem 1|Road Not Taken,Theme,Poetic Devices
Beehive|Poem 2|Wind,Theme,Imagery
Beehive|Poem 3|Rain on the Roof,Symbolism
Beehive|Poem 4|Lake Isle of Innisfree,Escapism
Beehive|Poem 5|Legend of Northland,Moral
Beehive|Poem 6|No Men Are Foreign,Universal Brotherhood
Beehive|Poem 7|Duck and Kangaroo,Rhyme Scheme
Beehive|Poem 8|On Killing a Tree,Patience
Beehive|Poem 9|Snake,Conflict
Beehive|Poem 10|A Slumber Did My Spirit Seal,Romanticism
Beehive|Prose 1|Fun They Had,Future Education
Beehive|Prose 2|Sound of Music,Courage
Beehive|Prose 3|Little Girl,Parent-Child Relationship
Beehive|Prose 4|True Beauty,Inner Beauty
Beehive|Prose 5|Snake and Mirror,Self-Importance
Beehive|Prose 6|My Childhood,APJ Abdul Kalam
Beehive|Prose 7|Packing,Humor
Beehive|Prose 8|Reach for the Top,Determination
Beehive|Prose 9|Bond of Love,Human-Animal Bond
Beehive|Prose 10|Kathmandu,Cultural Diversity
Moments|Story 1|Lost Child,Emotions
Moments|Story 2|Adventures of Toto,Humor
Moments|Story 3|Iswaran,Storytelling
Moments|Story 4|In the Kingdom of Fools,Wisdom
Moments|Story 5|Happy Prince,Charity
Moments|Story 6|Weathering the Storm,Courage
Moments|Story 7|Last Leaf,Hope
Moments|Story 8|House Is Not a Home,Resilience
Moments|Story 9|Accidental Tourist,Humor
Moments|Story 10|Beggar,Transformation
Grammar|Tenses|Present,Past,Future
Grammar|Modals|Can,Could,May,Might,Must
Grammar|Active Passive|Rules,Conversion
Grammar|Reported Speech|Statements,Questions,Commands
Grammar|Clauses|Noun,Adjective,Adverb
Writing|Letter|Formal,Informal
Writing|Article|Format,Examples
Writing|Story|Beginning,Climax,Ending`;

const HINDI = `Kshitij|Poem 1|Do Bailon Ki Katha,Theme
Kshitij|Poem 2|Lhasa Ki Aur,Travelogue
Kshitij|Poem 3|Upbhoktavad Ki Sanskriti,Criticism
Kshitij|Poem 4|Savaiya,Devotional
Kshitij|Poem 5|Kartoos,Patriotism
Kshitij|Poem 6|Dhool,Imagery
Kshitij|Poem 7|Agnipath,Motivation
Kshitij|Poem 8|Ek Phool Ki Chah,Simplicity
Kshitij|Poem 9|Geet Agar Gaaenge,Hope
Kshitij|Poem 10|Kallu Kumhar Ki Unakoti,Art
Kshitij|Poem 11|Mera Chhota Sa Niji Pustakalay,Hobby
Kshitij|Poem 12|Diye Jal Uthe,Inspiration
Kshitij|Prose 1|Is Jal Pralay Mein,Nature
Kshitij|Prose 2|Mere Sang Ki Auratein,Women
Kshitij|Prose 3|Reedh Ki Haddi,Satire
Kshitij|Prose 4|Matri Warg,Family
Kshitij|Prose 5|Kis Tarah Aakhirkar,Humour
Kritika|Story 1|Gilli Danda,Childhood
Kritika|Story 2|Diary Ka Ek Panna,Reflection
Kritika|Story 3|Kartoos,Patriotism
Kritika|Story 4|Ek Kunwara Ladka,Youth
Kritika|Story 5|Ghar Ki Yaad,Nostalgia
Vyakaran|Sangya|Types,Examples
Vyakaran|Sarvnaam|Types,Examples
Vyakaran|Visheshan|Types,Examples
Vyakaran|Kriya|Types,Examples
Vyakaran|Kaarak|8 Kaarak
Vyakaran|Vachan|Ek Vachan,Bahu Vachan
Vyakaran|Ling|Pulling,Striling
Lekhan|Patra|Aavedan Patra,Sampark Patra
Lekhan|Nibandh|Vishay Vistriti,Format
Lekhan|Kahani|Kathan,Patra,Samvad`;

async function seedSubject(name: string, color: string, raw: string, grade = "9", board = "CBSE") {
  const subject = await prisma.subject.upsert({
    where: { name_grade_board: { name, grade, board } },
    update: {},
    create: { name, grade, board, color },
  });

  // Make the seed idempotent: re-running should replace this subject's curriculum tree.
  await prisma.chapter.deleteMany({ where: { subjectId: subject.id } });

  const lines = raw.split("\n").filter(Boolean);
  const chapters = new Map<string, { ci: number; topics: Map<string, { ti: number; subtopics: string[] }> }>();

  for (const line of lines) {
    const [chName, tpName, subs] = line.split("|");
    if (!chapters.has(chName)) chapters.set(chName, { ci: chapters.size, topics: new Map() });
    const ch = chapters.get(chName)!;
    if (!ch.topics.has(tpName)) ch.topics.set(tpName, { ti: ch.topics.size, subtopics: subs.split(",") });
  }

  for (const [chName, { ci, topics }] of chapters) {
    const chapter = await prisma.chapter.create({ data: { subjectId: subject.id, name: chName, orderIndex: ci } });
    for (const [tpName, { ti, subtopics }] of topics) {
      const topic = await prisma.topic.create({ data: { chapterId: chapter.id, name: tpName, orderIndex: ti } });
      for (let si = 0; si < subtopics.length; si++) {
        await prisma.subtopic.create({
          data: { topicId: topic.id, name: subtopics[si].trim(), orderIndex: si, difficulty: Math.min(5, Math.floor(si / 2) + 1) },
        });
      }
    }
  }
  console.log(`  ✓ ${name}: ${lines.length} topics, ${lines.reduce((a, l) => a + l.split("|")[2].split(",").length, 0)} subtopics`);
  return subject;
}

async function main() {
  console.log("Seeding CBSE Class 9 curriculum...");
  await seedSubject("Mathematics", "bg-blue-500", MATH);
  await seedSubject("Science", "bg-green-500", SCIENCE);
  await seedSubject("Social Science", "bg-amber-500", SST);
  await seedSubject("English", "bg-purple-500", ENGLISH);
  await seedSubject("Hindi", "bg-rose-500", HINDI);

  const counts = await prisma.$transaction([
    prisma.subject.count(),
    prisma.chapter.count(),
    prisma.topic.count(),
    prisma.subtopic.count(),
  ]);
  console.log(`\nDone! ${counts[0]} subjects, ${counts[1]} chapters, ${counts[2]} topics, ${counts[3]} subtopics`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
