/**
 * Tone and style markers.
 *
 * These drive both directions of the pipeline: the analyzer counts them to
 * report formality/confidence/subjectivity, and the rewrite rules add or
 * remove them to hit a requested tone.
 */

/** Contraction <-> expansion. Expanding raises formality; contracting lowers it. */
export const CONTRACTIONS = [
  ["can't", 'cannot'], ["won't", 'will not'], ["don't", 'do not'],
  ["doesn't", 'does not'], ["didn't", 'did not'], ["isn't", 'is not'],
  ["aren't", 'are not'], ["wasn't", 'was not'], ["weren't", 'were not'],
  ["hasn't", 'has not'], ["haven't", 'have not'], ["hadn't", 'had not'],
  ["shouldn't", 'should not'], ["wouldn't", 'would not'], ["couldn't", 'could not'],
  ["mustn't", 'must not'], ["needn't", 'need not'], ["it's", 'it is'],
  ["that's", 'that is'], ["there's", 'there is'], ["here's", 'here is'],
  ["what's", 'what is'], ["who's", 'who is'], ["let's", 'let us'],
  ["I'm", 'I am'], ["you're", 'you are'], ["we're", 'we are'],
  ["they're", 'they are'], ["I've", 'I have'], ["you've", 'you have'],
  ["we've", 'we have'], ["they've", 'they have'], ["I'll", 'I will'],
  ["you'll", 'you will'], ["we'll", 'we will'], ["they'll", 'they will'],
  ["he'll", 'he will'], ["she'll", 'she will'], ["it'll", 'it will'],
  ["I'd", 'I would'], ["you'd", 'you would'], ["we'd", 'we would'],
  ["they'd", 'they would'], ["he's", 'he is'], ["she's", 'she is'],
];

/** Hedges soften a claim; removing them raises confidence and directness. */
export const HEDGES = [
  'perhaps', 'maybe', 'possibly', 'probably', 'arguably', 'seemingly',
  'apparently', 'somewhat', 'rather', 'quite', 'fairly', 'relatively',
  'generally', 'typically', 'usually', 'often', 'sometimes', 'occasionally',
  'roughly', 'approximately', 'more or less', 'kind of', 'sort of',
  'a bit', 'a little', 'in some ways', 'to some extent', 'in general',
  'it seems', 'it appears', 'i think', 'i believe', 'i feel', 'i guess',
  'i suppose', 'we believe', 'we think', 'one might argue', 'it could be argued',
];

/** Hedging verbs and modals, counted separately because they carry more weight. */
export const HEDGE_MODALS = ['may', 'might', 'could', 'would', 'should', 'can'];

/** Boosters raise confidence; they are what "persuasive" adds. */
export const BOOSTERS = [
  'clearly', 'certainly', 'definitely', 'undoubtedly', 'absolutely',
  'plainly', 'obviously', 'indeed', 'in fact', 'without question',
  'decisively', 'unquestionably', 'always', 'never', 'must', 'will',
];

/** Degree intensifiers; "concise" strips them, "persuasive" keeps the strong ones. */
export const INTENSIFIERS = [
  'very', 'really', 'extremely', 'incredibly', 'highly', 'totally',
  'completely', 'absolutely', 'utterly', 'so', 'super', 'quite',
  'particularly', 'especially', 'remarkably', 'exceptionally',
];

/**
 * "very X" -> single stronger word. Removing the intensifier shortens the
 * sentence and usually strengthens it.
 */
export const INTENSIFIER_COLLAPSE = {
  'very big': 'huge', 'very small': 'tiny', 'very good': 'excellent',
  'very bad': 'terrible', 'very important': 'critical', 'very hard': 'grueling',
  'very easy': 'effortless', 'very fast': 'rapid', 'very slow': 'sluggish',
  'very happy': 'delighted', 'very sad': 'miserable', 'very angry': 'furious',
  'very tired': 'exhausted', 'very hot': 'scorching', 'very cold': 'freezing',
  'very old': 'ancient', 'very new': 'brand-new', 'very large': 'enormous',
  'very interesting': 'fascinating', 'very clear': 'unmistakable',
  'very strong': 'powerful', 'very weak': 'feeble', 'very clever': 'brilliant',
  'very careful': 'meticulous', 'very common': 'ubiquitous', 'very sure': 'certain',
  'really big': 'huge', 'really good': 'excellent', 'really bad': 'terrible',
  'extremely large': 'enormous', 'extremely small': 'minuscule',
};

/**
 * Discourse connectives graded by register, used to swap sentence openers
 * ("But" -> "However") without changing the logical relation.
 */
export const DISCOURSE_MARKERS = [
  { relation: 'contrast', variants: [['but', -1], ['however', 1], ['nevertheless', 2], ['yet', 0], ['still', 0], ['that said', -1]] },
  { relation: 'addition', variants: [['and', -1], ['also', 0], ['in addition', 1], ['moreover', 2], ['furthermore', 2], ['plus', -1]] },
  { relation: 'cause', variants: [['so', -1], ['therefore', 1], ['thus', 2], ['consequently', 2], ['as a result', 1], ['hence', 2]] },
  { relation: 'example', variants: [['like', -1], ['for example', 0], ['for instance', 0], ['such as', 0], ['e.g.', 2]] },
  { relation: 'summary', variants: [['in short', 0], ['overall', 0], ['in summary', 1], ['to conclude', 1], ['in conclusion', 1]] },
  { relation: 'sequence', variants: [['then', -1], ['next', 0], ['after that', 0], ['subsequently', 2]] },
  { relation: 'concession', variants: [['though', -1], ['although', 0], ['even though', 0], ['albeit', 2], ['notwithstanding', 2]] },
];

/** Informal words with a neutral or formal counterpart. */
export const INFORMAL_WORDS = {
  'a lot of': 'many', 'lots of': 'many', 'tons of': 'many', 'loads of': 'many',
  'kids': 'children', 'guys': 'people', 'folks': 'people', 'stuff': 'material',
  'things': 'items', 'okay': 'acceptable', 'ok': 'acceptable', 'big deal': 'significant matter',
  'get rid of': 'remove', 'come up with': 'develop', 'find out': 'determine',
  'go over': 'review', 'look into': 'investigate', 'put off': 'postpone',
  'set up': 'establish', 'deal with': 'address', 'check out': 'examine',
  'point out': 'note', 'bring up': 'raise', 'cut down on': 'reduce',
  'gonna': 'going to', 'wanna': 'want to', 'gotta': 'have to',
  'pretty much': 'largely', 'sort of': 'somewhat', 'kind of': 'somewhat',
};

/** Formal words with a plain-English counterpart (the reverse direction). */
export const FORMAL_WORDS = {
  'utilize': 'use', 'commence': 'start', 'terminate': 'end', 'endeavor': 'try',
  'ascertain': 'find out', 'facilitate': 'help', 'demonstrate': 'show',
  'sufficient': 'enough', 'numerous': 'many', 'obtain': 'get', 'require': 'need',
  'purchase': 'buy', 'assist': 'help', 'inquire': 'ask', 'reside': 'live',
  'attempt': 'try', 'accomplish': 'do', 'additional': 'more', 'initial': 'first',
  'subsequent': 'later', 'prior': 'earlier', 'currently': 'now', 'presently': 'now',
  'approximately': 'about', 'regarding': 'about', 'concerning': 'about',
  'nevertheless': 'still', 'notwithstanding': 'despite', 'henceforth': 'from now on',
};

/** Words carrying obvious sentiment, scored -3..+3 (AFINN-style, hand-trimmed). */
export const SENTIMENT_LEXICON = {
  excellent: 3, outstanding: 3, superb: 3, brilliant: 3, wonderful: 3,
  fantastic: 3, delighted: 3, thrilled: 3, love: 3, perfect: 3,
  great: 2, good: 2, strong: 2, effective: 2, useful: 2, helpful: 2,
  clear: 1, solid: 2, improve: 2, benefit: 2, success: 3, gain: 1,
  happy: 2, glad: 2, pleased: 2, positive: 2, valuable: 2, robust: 2,
  advantage: 2, opportunity: 2, progress: 2, achieve: 2, support: 1,
  fine: 1, easy: 1, simple: 1, safe: 1, ready: 1, agree: 1, works: 1,
  bad: -2, poor: -2, weak: -2, terrible: -3, awful: -3, horrible: -3,
  fail: -3, failure: -3, problem: -2, issue: -1, difficult: -1, hard: -1,
  risk: -1, danger: -2, threat: -2, loss: -2, damage: -2, broken: -2,
  wrong: -2, error: -2, mistake: -2, confusing: -2, unclear: -1,
  disappointing: -2, frustrated: -2, angry: -3, sad: -2, worried: -2,
  concern: -1, decline: -1, delay: -1, waste: -2, expensive: -1,
  unfortunately: -2, unable: -1, never: -1, worse: -2, worst: -3,
};

/** Negators that flip the sentiment of a following word. */
export const NEGATORS = ['not', 'no', 'never', 'without', 'cannot', "n't", 'neither', 'nor'];

/** First and second person pronouns, used for the personal-voice metric. */
export const FIRST_PERSON = ['i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours'];
export const SECOND_PERSON = ['you', 'your', 'yours'];

/** Auxiliaries that signal passive voice when followed by a past participle. */
export const PASSIVE_AUX = ['is', 'are', 'was', 'were', 'be', 'been', 'being', 'get', 'gets', 'got'];
