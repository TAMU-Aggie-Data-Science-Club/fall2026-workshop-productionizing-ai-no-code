import { tokenCost } from './simulation';

// Deliberately illustrative splits, not the vocabulary of a particular model.
const QUESTION = 'Why| do| leaves| change| color| in| the| fall|?'.split('|');
const REFERENCE =
  'Shorter| days| mean| less| sunlight|.| Chloro|phyll| gives| leaves| their| green| color|.| Yellow| and| orange| pigments| are| also| present| in| the| leaf|.'.split(
    '|',
  );
const ANSWERS = {
  Brief:
    'In| fall|,| less| sunlight| breaks| down| chloro|phyll|,| revealing| yellow| and| orange| pigments| already| in| leaves|.'.split(
      '|',
    ),
  Detailed:
    'In| fall|,| shorter| days| and| cooler| weather| cause| leaves| to| stop| replacing| chloro|phyll|,| the| pigment| that| makes| them| green|.| As| it| breaks| down|,| yellow| and| orange| pigments| already| in| the| leaf| become| visible|.| Some| trees| also| produce| red| pigments| as| sugars| build| up| in| their| leaves|.'.split(
      '|',
    ),
};

export type TokenExampleConfig = {
  reference: boolean;
  answer: 'Brief' | 'Detailed';
};

export const INPUT_SENT_AT = 0.65;
export const OUTPUT_START_AT = 1.4;
export const TOKEN_INTERVAL = 0.12;

export function tokenExample(config: TokenExampleConfig) {
  const groups = [
    {
      label: 'Instruction',
      tokens: (config.answer === 'Brief'
        ? 'Explain| in| one| sentence|.'
        : 'Explain| in| three| sentences|.'
      ).split('|'),
    },
    { label: 'Question', tokens: QUESTION },
    ...(config.reference ? [{ label: 'Reference', tokens: REFERENCE }] : []),
  ];
  const input = groups.reduce((sum, group) => sum + group.tokens.length, 0);
  const output = ANSWERS[config.answer];
  const generationEnd = OUTPUT_START_AT + (output.length - 1) * TOKEN_INTERVAL;
  return {
    groups,
    input,
    output,
    generationEnd,
    duration: generationEnd + 0.65,
  };
}

export function tokenFrame(
  example: ReturnType<typeof tokenExample>,
  elapsed: number,
  started: boolean,
) {
  const input = started && elapsed >= INPUT_SENT_AT ? example.input : 0;
  const output =
    !started || elapsed < OUTPUT_START_AT
      ? 0
      : elapsed >= example.generationEnd
        ? example.output.length
        : Math.min(
            example.output.length,
            1 + Math.floor((elapsed - OUTPUT_START_AT) / TOKEN_INTERVAL),
          );
  const stage = !started
    ? 'ready'
    : output === example.output.length
      ? 'complete'
      : output > 0
        ? 'output'
        : 'input';
  return { input, output, stage, ...tokenCost(input, output) };
}
