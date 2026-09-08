/** Fixed workshop fixtures, not facts about an actual campus service. */
export const SOURCE_UPDATE_TIME = 12;
export const CHALLENGE_SOURCES = [
  {
    id: 'hours',
    title: 'Library hours',
    text: 'Regular weekdays: 10 p.m. Regular weekends: 6 p.m. At 12 seconds, exam-week hours take effect: midnight every day.',
  },
  {
    id: 'rooms',
    title: 'Study rooms',
    text: 'Reserve through the library website for up to two hours.',
  },
  {
    id: 'printing',
    title: 'Printing',
    text: 'Printers are on the first floor. Bring a student ID. Color printing costs 25 cents per page.',
  },
  {
    id: 'borrowing',
    title: 'Borrowing',
    text: 'Books can be borrowed for 21 days. Renew online unless another reader has placed a hold.',
  },
  {
    id: 'access',
    title: 'Visitor access',
    text: 'Visitors can enter until 8 p.m. After 8 p.m., a student ID is required, including during exams.',
  },
  {
    id: 'wifi',
    title: 'Wi-Fi',
    text: 'Use Campus Wi-Fi with your student account. Visitors use Guest Wi-Fi.',
  },
  {
    id: 'quiet',
    title: 'Quiet floors',
    text: 'Floor three is silent study. Group conversations belong in a reserved room.',
  },
  {
    id: 'examples',
    title: 'Policy examples',
    text: 'The third retrieved document includes worked examples: a book with a hold cannot be renewed online; a visitor without a student ID must leave by 8 p.m., even during exams.',
  },
];

export type ChallengeQuestion = {
  id: string;
  label: string;
  question: string;
  source: string;
  docs: number;
  minTokens: number;
  reasoning?: boolean;
  answer: string;
  updatedAnswer?: string;
  incomplete: string;
  exceptionAnswer?: string;
};

export const CHALLENGE_QUESTIONS: ChallengeQuestion[] = [
  {
    id: 'weekday',
    label: 'Weekday hours',
    question: 'When does the library close on Tuesday?',
    source: 'hours',
    docs: 1,
    minTokens: 16,
    answer: 'The library closes at 10 p.m. on Tuesday. [hours]',
    updatedAnswer:
      'Exam-week hours are now in effect: midnight on Tuesday. [hours]',
    incomplete: 'The library has weekday hours.',
  },
  {
    id: 'weekend',
    label: 'Weekend hours',
    question: 'When does the library close on Saturday?',
    source: 'hours',
    docs: 1,
    minTokens: 16,
    answer: 'The library closes at 6 p.m. on Saturday. [hours]',
    updatedAnswer:
      'Exam-week hours are now in effect: midnight on Saturday. [hours]',
    incomplete: 'The library has weekend hours.',
  },
  {
    id: 'rooms',
    label: 'Room bookings',
    question: 'How long can I book a room, and where do I reserve it?',
    source: 'rooms',
    docs: 1,
    minTokens: 32,
    answer:
      'Book a room for up to two hours through the library website. [rooms]',
    incomplete: 'You can book a room for up to two hours. [rooms]',
  },
  {
    id: 'printing',
    label: 'Print a document',
    question: 'Where can I print, and what do I need to bring?',
    source: 'printing',
    docs: 1,
    minTokens: 32,
    answer:
      'Use the first-floor printers and bring your student ID. [printing]',
    incomplete: 'Printers are on the first floor. [printing]',
  },
  {
    id: 'loan',
    label: 'Borrow a book',
    question: 'How many days can I borrow a book?',
    source: 'borrowing',
    docs: 1,
    minTokens: 16,
    answer: 'You can borrow a book for 21 days. [borrowing]',
    incomplete: 'Books can be borrowed.',
  },
  {
    id: 'renewal',
    label: 'Renew with a hold',
    question: 'Can I renew a book online if someone else has placed a hold?',
    source: 'borrowing',
    docs: 2,
    minTokens: 32,
    reasoning: true,
    answer:
      'No. Online renewal is unavailable when another reader has a hold. [borrowing]',
    incomplete: 'Books can be renewed online. [borrowing]',
    exceptionAnswer: 'Yes, books can be renewed online. [borrowing]',
  },
  {
    id: 'visitor',
    label: 'Visit after 8 p.m.',
    question:
      'Can a visitor without a student ID stay after 8 p.m. during exams?',
    source: 'access',
    docs: 2,
    minTokens: 32,
    reasoning: true,
    answer:
      'No. A student ID is required after 8 p.m., including during exams. [access]',
    incomplete: 'Visitors can use the library. [access]',
    exceptionAnswer:
      'Yes. Extended exam hours allow visitors to stay later. [access]',
  },
  {
    id: 'wifi',
    label: 'Guest Wi-Fi',
    question: 'Which Wi-Fi should a visitor use?',
    source: 'wifi',
    docs: 1,
    minTokens: 16,
    answer: 'Visitors should connect to Guest Wi-Fi. [wifi]',
    incomplete: 'Wi-Fi is available.',
  },
  {
    id: 'quiet',
    label: 'Group study',
    question:
      'Can my group talk on the third floor, and where should we go instead?',
    source: 'quiet',
    docs: 2,
    minTokens: 32,
    answer:
      'Floor three is silent study. Use a reserved room for group conversation. [quiet]',
    incomplete: 'Floor three is silent study. [quiet]',
  },
  {
    id: 'color',
    label: 'Color printing',
    question: 'How much does one page of color printing cost?',
    source: 'printing',
    docs: 1,
    minTokens: 16,
    answer: 'Color printing costs 25 cents per page. [printing]',
    incomplete: 'Color printing has a per-page charge.',
  },
];

export const CHALLENGE_WORKLOAD = [0, 1].flatMap((wave) =>
  CHALLENGE_QUESTIONS.map((question, index) => ({
    id: wave * CHALLENGE_QUESTIONS.length + index,
    question,
    arrival: wave * SOURCE_UPDATE_TIME + index * 0.8,
    version: wave === 1 && question.updatedAnswer ? 2 : 1,
  })),
);
