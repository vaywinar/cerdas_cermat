import { Question } from './schema';

// Demo questions for the quiz application
export const demoQuestions: Question[] = [
  {
    id: 1,
    text: "Siapakah penemu bola lampu?",
    type: "multiple_choice",
    category: "Sains",
    options: JSON.stringify(["Thomas Edison", "Albert Einstein", "Isaac Newton", "Nikola Tesla"]),
    correctAnswer: "Thomas Edison",
    points: 10,
    wrongAnswerPenalty: 5
  },
  {
    id: 2,
    text: "Berapa jumlah planet dalam tata surya kita?",
    type: "multiple_choice",
    category: "Sains",
    options: JSON.stringify(["7", "8", "9", "10"]),
    correctAnswer: "8",
    points: 10,
    wrongAnswerPenalty: 5
  },
  {
    id: 3,
    text: "Apa nama ibukota Indonesia?",
    type: "short_answer",
    category: "Geografi",
    options: null,
    correctAnswer: "Jakarta",
    points: 20,
    wrongAnswerPenalty: 15
  },
  {
    id: 4,
    text: "Siapakah presiden pertama Indonesia?",
    type: "short_answer",
    category: "Sejarah",
    options: null,
    correctAnswer: "Soekarno",
    points: 20,
    wrongAnswerPenalty: 15
  },
  {
    id: 5,
    text: "Berapakah hasil dari 15 × 12?",
    type: "multiple_choice",
    category: "Matematika",
    options: JSON.stringify(["150", "180", "190", "200"]),
    correctAnswer: "180",
    points: 10,
    wrongAnswerPenalty: 5
  },
  {
    id: 6,
    text: "Simbol kimia untuk emas adalah?",
    type: "multiple_choice",
    category: "Sains",
    options: JSON.stringify(["Au", "Ag", "Fe", "Cu"]),
    correctAnswer: "Au",
    points: 10,
    wrongAnswerPenalty: 5
  },
  {
    id: 7,
    text: "Nama sungai terpanjang di dunia?",
    type: "short_answer",
    category: "Geografi",
    options: null,
    correctAnswer: "Nil",
    points: 20,
    wrongAnswerPenalty: 15
  },
  {
    id: 8,
    text: "Berapakah jumlah provinsi di Indonesia saat ini?",
    type: "multiple_choice",
    category: "Geografi",
    options: JSON.stringify(["33", "34", "35", "36"]),
    correctAnswer: "34",
    points: 10,
    wrongAnswerPenalty: 5
  },
  {
    id: 9,
    text: "Siapa yang menemukan teori relativitas?",
    type: "short_answer",
    category: "Sains",
    options: null,
    correctAnswer: "Albert Einstein",
    points: 20,
    wrongAnswerPenalty: 15
  },
  {
    id: 10,
    text: "Berapa hasil dari 25 kuadrat?",
    type: "multiple_choice",
    category: "Matematika",
    options: JSON.stringify(["525", "625", "725", "825"]),
    correctAnswer: "625",
    points: 10,
    wrongAnswerPenalty: 5
  }
];
