export const DOCUMENTS = [
  {
    title: 'Library hours',
    id: '1',
    text: 'The library closes at 10 p.m. on weekdays and 6 p.m. on weekends.',
    relevant: true,
  },
  {
    title: 'Exam-week exception',
    id: '2',
    text: 'During exam week, the library stays open until midnight every day.',
    relevant: true,
  },
  {
    title: 'Printing guide',
    id: '3',
    text: 'Printers are on the first floor. Bring your student ID.',
    relevant: false,
  },
  {
    title: 'Campus dining',
    id: '4',
    text: 'The café serves breakfast from 7 to 10 a.m.',
    relevant: false,
  },
];
export const QUESTIONS = {
  'Regular hours': 'When does the library close on a regular Tuesday?',
  'Exam week': 'When does the library close on Tuesday during exam week?',
};
export function contextAnswer(question: string, count: number) {
  if (!count)
    return {
      text: 'I don’t have the library’s hours. Check the current schedule before you go.',
      state: 'Missing reference',
      citations: [] as string[],
    };
  if (question === 'Exam week' && count < 2)
    return {
      text: 'The library closes at 10 p.m. on weekdays. [1]',
      state: 'Missing the exception',
      citations: ['1'],
    };
  return {
    text:
      question === 'Exam week'
        ? 'During exam week, the library closes at midnight—even on Tuesday. [2]'
        : 'On a regular Tuesday, the library closes at 10 p.m. [1]',
    state: 'Supported answer',
    citations: [question === 'Exam week' ? '2' : '1'],
  };
}
export const ANSWERS: Record<string, string> = {
  'simple-short': 'A cache saves a result so it can be reused.',
  simple:
    'A cache saves a result so the application can reuse it. Repeated requests can skip the expensive work, but saved information can become outdated.',
  grounded:
    'On Tuesday during exam week, the library closes at midnight. The exam-week schedule overrides the usual 10 p.m. weekday closing time. [2]',
  partial: 'The library closes at 10 p.m. on weekdays. [1]',
  missing:
    'I don’t have the library schedule. Check the current hours before you go.',
  incomplete: 'The library’s closing time depends on whether it is…',
};
export const QUALITY_CASES = {
  'Library hours': {
    question: QUESTIONS['Exam week'],
    reference: 'Exam week: midnight every day. Regular weekdays: 10 p.m.',
    answers: {
      Grounded: ANSWERS.grounded,
      Unsupported: 'The library closes at 2 a.m. during exam week. [2]',
      Incomplete: 'The library has extended hours during exam week.',
    },
    checks: [
      'Includes a closing time',
      'Matches the reference',
      'Includes a citation',
    ],
    results: {
      Grounded: [true, true, true],
      Unsupported: [true, false, true],
      Incomplete: [false, false, false],
    },
  },
  'Study rooms': {
    question: 'How long can I book a study room, and how do I reserve one?',
    reference:
      'Bookings last up to two hours. Reserve through the library website.',
    answers: {
      Grounded:
        'Book a room for up to two hours through the library website. [1]',
      Unsupported: 'Book a room for four hours at the front desk. [1]',
      Incomplete: 'You can book a room for up to two hours. [1]',
    },
    checks: [
      'Answers both parts',
      'Matches the reference',
      'Includes a citation',
    ],
    results: {
      Grounded: [true, true, true],
      Unsupported: [true, false, true],
      Incomplete: [false, true, true],
    },
  },
};
