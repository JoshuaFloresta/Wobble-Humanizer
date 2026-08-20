/**
 * Register-graded synonym sets.
 *
 * Each set is one sense, so swaps stay meaning-preserving: the engine will
 * never trade "address" (speak to) for "address" (postal). Variants are
 * [lemma, register, grade]:
 *
 *   register  -2 slang | -1 casual | 0 neutral | 1 formal | 2 academic
 *   grade     approximate US reading grade at which the word is familiar
 *
 * The selector scores candidates against the tone's target register and the
 * requested reading grade, so the same set serves "simplify" and "formalize"
 * by moving in opposite directions.
 */

export const SYNONYM_SETS = [
  // --- Verbs: doing and using -------------------------------------------
  { pos: 'verb', sense: 'use', variants: [['use', 0, 3], ['employ', 1, 7], ['utilize', 2, 10], ['apply', 0, 5], ['draw on', -1, 4]] },
  { pos: 'verb', sense: 'make', variants: [['make', 0, 2], ['create', 0, 5], ['produce', 0, 6], ['generate', 1, 8], ['construct', 1, 8]] },
  { pos: 'verb', sense: 'begin', variants: [['start', 0, 2], ['begin', 0, 4], ['commence', 2, 10], ['initiate', 2, 10], ['kick off', -1, 4]] },
  { pos: 'verb', sense: 'end', variants: [['end', 0, 2], ['finish', 0, 3], ['conclude', 1, 8], ['terminate', 2, 10], ['wrap up', -1, 4]] },
  { pos: 'verb', sense: 'help', variants: [['help', 0, 2], ['assist', 1, 7], ['aid', 1, 6], ['support', 0, 5], ['facilitate', 2, 11]] },
  { pos: 'verb', sense: 'show', variants: [['show', 0, 2], ['display', 0, 6], ['demonstrate', 1, 9], ['illustrate', 1, 9], ['reveal', 0, 7]] },
  { pos: 'verb', sense: 'tell', variants: [['tell', 0, 2], ['inform', 1, 7], ['notify', 1, 8], ['advise', 1, 7], ['let know', -1, 3]] },
  { pos: 'verb', sense: 'ask', variants: [['ask', 0, 2], ['request', 1, 6], ['inquire', 2, 9], ['query', 2, 9]] },
  { pos: 'verb', sense: 'answer', variants: [['answer', 0, 3], ['reply', 0, 4], ['respond', 1, 7]] },
  { pos: 'verb', sense: 'get', variants: [['get', 0, 2], ['obtain', 1, 8], ['acquire', 2, 9], ['receive', 0, 6], ['secure', 1, 8]] },
  { pos: 'verb', sense: 'give', variants: [['give', 0, 2], ['provide', 0, 6], ['supply', 0, 6], ['furnish', 2, 10], ['offer', 0, 5]] },
  { pos: 'verb', sense: 'buy', variants: [['buy', 0, 2], ['purchase', 1, 7], ['procure', 2, 11]] },
  { pos: 'verb', sense: 'need', variants: [['need', 0, 2], ['require', 1, 7], ['necessitate', 2, 12]] },
  { pos: 'verb', sense: 'want', variants: [['want', 0, 2], ['wish', 0, 4], ['desire', 1, 8], ['seek', 1, 7]] },
  { pos: 'verb', sense: 'think', variants: [['think', 0, 2], ['believe', 0, 4], ['consider', 1, 7], ['maintain', 2, 9], ['reckon', -1, 5]] },
  { pos: 'verb', sense: 'find-out', variants: [['find out', -1, 3], ['discover', 0, 6], ['determine', 1, 8], ['ascertain', 2, 12], ['establish', 1, 8]] },
  { pos: 'verb', sense: 'look-at', variants: [['look at', -1, 2], ['examine', 1, 7], ['review', 0, 6], ['inspect', 1, 8], ['study', 0, 4]] },
  { pos: 'verb', sense: 'explain', variants: [['explain', 0, 5], ['clarify', 1, 8], ['elucidate', 2, 13], ['spell out', -1, 4]] },
  { pos: 'verb', sense: 'improve', variants: [['improve', 0, 5], ['enhance', 1, 8], ['strengthen', 0, 7], ['optimize', 2, 10], ['better', 0, 4]] },
  { pos: 'verb', sense: 'change', variants: [['change', 0, 3], ['alter', 1, 7], ['modify', 1, 8], ['adjust', 0, 6], ['revise', 1, 8]] },
  { pos: 'verb', sense: 'reduce', variants: [['cut', 0, 2], ['reduce', 0, 5], ['decrease', 0, 6], ['diminish', 2, 9], ['curtail', 2, 11]] },
  { pos: 'verb', sense: 'increase', variants: [['raise', 0, 3], ['increase', 0, 5], ['expand', 0, 6], ['augment', 2, 11], ['boost', -1, 4]] },
  { pos: 'verb', sense: 'fix', variants: [['fix', 0, 2], ['repair', 0, 5], ['resolve', 1, 7], ['rectify', 2, 11], ['address', 1, 7]] },
  { pos: 'verb', sense: 'stop', variants: [['stop', 0, 2], ['halt', 1, 6], ['cease', 2, 9], ['discontinue', 2, 11]] },
  { pos: 'verb', sense: 'let', variants: [['let', 0, 2], ['allow', 0, 4], ['permit', 1, 7], ['enable', 1, 7], ['authorize', 2, 10]] },
  { pos: 'verb', sense: 'stay', variants: [['stay', 0, 2], ['remain', 0, 6], ['persist', 2, 9]] },

  // --- Verbs, batch 2: coverage past the original core set ---------------
  { pos: 'verb', sense: 'keep', variants: [['keep', 0, 2], ['retain', 1, 7], ['preserve', 1, 7], ['sustain', 1, 8]] },
  { pos: 'verb', sense: 'build', variants: [['build', 0, 2], ['develop', 0, 5], ['fabricate', 1, 9], ['erect', 2, 10]] },
  { pos: 'verb', sense: 'break', variants: [['break', 0, 2], ['damage', 0, 5], ['disrupt', 1, 8], ['impair', 2, 10]] },
  { pos: 'verb', sense: 'move', variants: [['move', 0, 2], ['shift', 0, 4], ['relocate', 1, 8], ['transfer', 1, 7]] },
  { pos: 'verb', sense: 'join', variants: [['join', 0, 2], ['combine', 0, 5], ['merge', 1, 7], ['integrate', 1, 8], ['unite', 1, 7]] },
  { pos: 'verb', sense: 'separate', variants: [['separate', 0, 4], ['divide', 0, 5], ['split', 0, 3], ['segregate', 2, 10]] },
  { pos: 'verb', sense: 'avoid', variants: [['avoid', 0, 3], ['prevent', 0, 5], ['circumvent', 2, 12], ['sidestep', -1, 5]] },
  { pos: 'verb', sense: 'cause', variants: [['cause', 0, 3], ['trigger', 0, 5], ['induce', 2, 10], ['prompt', 1, 6]] },
  { pos: 'verb', sense: 'continue', variants: [['continue', 0, 3], ['proceed', 1, 7], ['persevere', 2, 10]] },
  { pos: 'verb', sense: 'decide', variants: [['decide', 0, 3], ['choose', 0, 3], ['opt', 1, 6], ['elect', 2, 9]] },
  { pos: 'verb', sense: 'plan', variants: [['plan', 0, 3], ['organize', 0, 6], ['arrange', 0, 6], ['coordinate', 1, 8]] },
  { pos: 'verb', sense: 'lead', variants: [['lead', 0, 2], ['direct', 0, 5], ['guide', 0, 4], ['spearhead', 1, 8], ['oversee', 1, 7]] },
  { pos: 'verb', sense: 'follow', variants: [['follow', 0, 2], ['pursue', 1, 7], ['track', 0, 4]] },
  { pos: 'verb', sense: 'share', variants: [['share', 0, 3], ['distribute', 1, 7], ['circulate', 1, 8], ['disseminate', 2, 11]] },
  { pos: 'verb', sense: 'remove', variants: [['remove', 0, 3], ['eliminate', 1, 7], ['delete', 0, 5], ['discard', 0, 6]] },
  { pos: 'verb', sense: 'add', variants: [['add', 0, 2], ['append', 2, 9], ['incorporate', 1, 8], ['include', 0, 5]] },
  { pos: 'verb', sense: 'try', variants: [['try', 0, 2], ['attempt', 1, 6], ['endeavor', 2, 11]] },
  { pos: 'verb', sense: 'handle', variants: [['handle', 0, 3], ['manage', 0, 4], ['deal with', -1, 3], ['tackle', 0, 5]] },
  { pos: 'verb', sense: 'speed-up', variants: [['speed up', -1, 3], ['accelerate', 1, 8], ['expedite', 2, 11]] },
  { pos: 'verb', sense: 'slow', variants: [['slow down', -1, 3], ['decelerate', 2, 10], ['delay', 0, 5]] },
  { pos: 'verb', sense: 'focus', variants: [['focus', 0, 4], ['concentrate', 1, 7], ['prioritize', 1, 8]] },
  { pos: 'verb', sense: 'gather', variants: [['gather', 0, 3], ['collect', 0, 4], ['compile', 1, 7], ['assemble', 1, 7]] },
  { pos: 'verb', sense: 'protect', variants: [['protect', 0, 3], ['safeguard', 1, 7], ['shield', 0, 5], ['defend', 0, 5]] },
  { pos: 'verb', sense: 'limit', variants: [['limit', 0, 3], ['restrict', 1, 7], ['constrain', 2, 9], ['cap', -1, 4]] },
  { pos: 'verb', sense: 'suggest', variants: [['suggest', 0, 4], ['propose', 1, 7], ['recommend', 1, 7], ['advocate', 2, 9]] },
  { pos: 'verb', sense: 'agree', variants: [['agree', 0, 3], ['concur', 2, 10], ['consent', 1, 8]] },
  { pos: 'verb', sense: 'disagree', variants: [['disagree', 0, 4], ['object', 1, 6], ['dispute', 1, 7], ['dissent', 2, 11]] },
  { pos: 'verb', sense: 'affect', variants: [['affect', 0, 5], ['influence', 0, 6], ['impact', 0, 5], ['shape', 1, 6]] },
  { pos: 'verb', sense: 'depend', variants: [['depend on', -1, 4], ['rely on', 0, 5], ['hinge on', 2, 9]] },
];

export const SYNONYM_SETS_NOUNS = [
  { pos: 'noun', sense: 'problem', variants: [['problem', 0, 3], ['issue', 0, 5], ['difficulty', 1, 7], ['challenge', 0, 6], ['complication', 2, 10]] },
  { pos: 'noun', sense: 'idea', variants: [['idea', 0, 3], ['concept', 1, 7], ['notion', 1, 8], ['thought', 0, 4]] },
  { pos: 'noun', sense: 'result', variants: [['result', 0, 4], ['outcome', 0, 6]] },
  { pos: 'noun', sense: 'goal', variants: [['goal', 0, 3], ['aim', 0, 4], ['objective', 1, 8], ['target', 0, 5]] },
  { pos: 'noun', sense: 'way', variants: [['way', 0, 2], ['method', 0, 6], ['approach', 0, 6], ['technique', 1, 8], ['methodology', 2, 12]] },
  { pos: 'noun', sense: 'change', variants: [['change', 0, 3], ['shift', 0, 5], ['transition', 1, 9], ['transformation', 2, 11]] },
  { pos: 'noun', sense: 'part', variants: [['part', 0, 2], ['piece', 0, 3], ['component', 1, 8], ['element', 1, 7], ['segment', 1, 8]] },
  { pos: 'noun', sense: 'job', variants: [['job', 0, 2], ['task', 0, 4], ['role', 0, 5], ['function', 1, 7], ['responsibility', 1, 9]] },
  { pos: 'noun', sense: 'help', variants: [['help', 0, 2], ['support', 0, 5], ['assistance', 1, 8], ['aid', 1, 6]] },
  { pos: 'noun', sense: 'start', variants: [['start', 0, 2], ['beginning', 0, 4], ['outset', 2, 9], ['inception', 2, 12]] },
  { pos: 'noun', sense: 'end', variants: [['end', 0, 2], ['finish', 0, 3], ['conclusion', 1, 8], ['termination', 2, 11]] },
  { pos: 'noun', sense: 'proof', variants: [['proof', 0, 4], ['evidence', 0, 6], ['backing', 0, 5], ['corroboration', 2, 13]] },
  { pos: 'noun', sense: 'meeting', variants: [['meeting', 0, 3], ['session', 0, 6], ['gathering', 0, 6], ['convening', 2, 11]] },
  { pos: 'noun', sense: 'rule', variants: [['rule', 0, 3], ['policy', 0, 6], ['regulation', 1, 9], ['guideline', 0, 7], ['requirement', 1, 8]] },
  { pos: 'noun', sense: 'money', variants: [['money', 0, 2], ['funds', 1, 6], ['capital', 1, 8], ['resources', 1, 7]] },
  { pos: 'noun', sense: 'work', variants: [['work', 0, 2], ['effort', 0, 5], ['labor', 1, 6], ['undertaking', 2, 11]] },
  { pos: 'noun', sense: 'benefit', variants: [['benefit', 0, 5], ['advantage', 0, 6], ['upside', -1, 5], ['gain', 0, 5]] },
  { pos: 'noun', sense: 'risk', variants: [['risk', 0, 4], ['danger', 0, 5], ['hazard', 1, 7], ['exposure', 1, 8]] },
  { pos: 'noun', sense: 'view', variants: [['view', 0, 3], ['opinion', 0, 6], ['position', 1, 7], ['perspective', 1, 9], ['standpoint', 1, 9]] },

  // --- Nouns, batch 2 -------------------------------------------------
  { pos: 'noun', sense: 'plan', variants: [['plan', 0, 3], ['strategy', 1, 7], ['scheme', -1, 6], ['blueprint', 1, 8]] },
  { pos: 'noun', sense: 'team', variants: [['team', 0, 2], ['group', 0, 3], ['unit', 1, 6], ['squad', -1, 4]] },
  { pos: 'noun', sense: 'company', variants: [['company', 0, 3], ['organization', 1, 6], ['firm', 1, 6], ['enterprise', 2, 9]] },
  { pos: 'noun', sense: 'customer', variants: [['customer', 0, 3], ['client', 1, 6], ['patron', 2, 9], ['user', 0, 4]] },
  { pos: 'noun', sense: 'price', variants: [['price', 0, 3], ['cost', 0, 3], ['fee', 0, 4], ['charge', 0, 5]] },
  { pos: 'noun', sense: 'increase', variants: [['increase', 0, 4], ['rise', 0, 4], ['growth', 0, 4], ['surge', 1, 7]] },
  { pos: 'noun', sense: 'decrease', variants: [['decrease', 0, 4], ['decline', 0, 5], ['drop', 0, 3], ['reduction', 1, 7]] },
  { pos: 'noun', sense: 'example', variants: [['example', 0, 3], ['instance', 1, 7], ['illustration', 1, 8], ['case', 0, 4]] },
  { pos: 'noun', sense: 'detail', variants: [['detail', 0, 3], ['particular', 1, 7], ['nuance', 2, 10]] },
  { pos: 'noun', sense: 'area', variants: [['area', 0, 2], ['field', 0, 3], ['domain', 1, 7], ['sector', 1, 7]] },
  { pos: 'noun', sense: 'level', variants: [['level', 0, 3], ['degree', 0, 4], ['extent', 1, 7], ['magnitude', 2, 10]] },
  { pos: 'noun', sense: 'feedback', variants: [['feedback', 0, 4], ['input', 0, 4], ['commentary', 1, 8], ['critique', 1, 7]] },
  { pos: 'noun', sense: 'limit', variants: [['limit', 0, 3], ['boundary', 0, 5], ['threshold', 1, 7], ['ceiling', 1, 6]] },
  { pos: 'noun', sense: 'cause', variants: [['cause', 0, 3], ['reason', 0, 3], ['basis', 1, 7], ['rationale', 2, 9]] },
  { pos: 'noun', sense: 'effect', variants: [['effect', 0, 3], ['consequence', 1, 7], ['impact', 0, 5], ['repercussion', 2, 11]] },
  { pos: 'noun', sense: 'option', variants: [['option', 0, 4], ['choice', 0, 3], ['alternative', 1, 7]] },
  { pos: 'noun', sense: 'skill', variants: [['skill', 0, 3], ['ability', 0, 4], ['competence', 1, 8], ['expertise', 1, 7]] },
  { pos: 'noun', sense: 'success', variants: [['success', 0, 3], ['achievement', 1, 7], ['accomplishment', 1, 8], ['triumph', 1, 6]] },
  { pos: 'noun', sense: 'failure', variants: [['failure', 0, 3], ['setback', 0, 5], ['shortfall', 1, 8], ['downfall', 1, 7]] },
];

export const SYNONYM_SETS_MODIFIERS = [
  { pos: 'adj', sense: 'big', variants: [['big', 0, 2], ['large', 0, 3], ['substantial', 2, 10], ['considerable', 2, 10], ['sizable', 1, 9]] },
  { pos: 'adj', sense: 'small', variants: [['small', 0, 2], ['little', 0, 2], ['minor', 0, 6], ['modest', 1, 8], ['negligible', 2, 12]] },
  { pos: 'adj', sense: 'important', variants: [['important', 0, 4], ['key', 0, 3], ['significant', 1, 9], ['critical', 1, 8], ['crucial', 1, 9], ['vital', 1, 8]] },
  { pos: 'adj', sense: 'hard', variants: [['hard', 0, 2], ['tough', -1, 3], ['difficult', 0, 6], ['challenging', 1, 8], ['demanding', 1, 8]] },
  { pos: 'adj', sense: 'easy', variants: [['easy', 0, 2], ['simple', 0, 3], ['straightforward', 1, 8], ['effortless', 1, 9]] },
  { pos: 'adj', sense: 'good', variants: [['good', 0, 2], ['strong', 0, 3], ['effective', 1, 7], ['favorable', 1, 9], ['excellent', 0, 6]] },
  { pos: 'adj', sense: 'bad', variants: [['bad', 0, 2], ['poor', 0, 3], ['weak', 0, 3], ['inadequate', 2, 10], ['detrimental', 2, 12]] },
  { pos: 'adj', sense: 'clear', variants: [['clear', 0, 3], ['plain', 0, 4], ['evident', 1, 8], ['apparent', 1, 8], ['unambiguous', 2, 12]] },
  { pos: 'adj', sense: 'fast', variants: [['fast', 0, 2], ['quick', 0, 3], ['rapid', 1, 6], ['swift', 1, 7], ['expeditious', 2, 14]] },
  { pos: 'adj', sense: 'enough', variants: [['enough', 0, 3], ['sufficient', 1, 9], ['adequate', 1, 9]] },
  { pos: 'adj', sense: 'many', variants: [['many', 0, 2], ['numerous', 1, 8], ['multiple', 1, 7], ['several', 0, 5]] },
  { pos: 'adj', sense: 'main', variants: [['main', 0, 3], ['chief', 1, 6], ['primary', 1, 7], ['principal', 2, 9], ['foremost', 2, 10]] },
  { pos: 'adj', sense: 'whole', variants: [['whole', 0, 3], ['complete', 0, 5], ['entire', 0, 7], ['comprehensive', 2, 11]] },
  { pos: 'adv', sense: 'quickly', variants: [['quickly', 0, 3], ['rapidly', 1, 7], ['swiftly', 1, 8], ['promptly', 1, 8]] },
  { pos: 'adv', sense: 'often', variants: [['often', 0, 3], ['frequently', 1, 7], ['regularly', 0, 6], ['routinely', 1, 9]] },
  { pos: 'adv', sense: 'later', variants: [['later', 0, 3], ['afterward', 0, 6], ['subsequently', 2, 11]] },
  { pos: 'adv', sense: 'before', variants: [['earlier', 0, 4], ['previously', 1, 7], ['formerly', 2, 9]] },
  { pos: 'adv', sense: 'so', variants: [['so', 0, 2], ['therefore', 1, 7], ['thus', 2, 8], ['consequently', 2, 10], ['accordingly', 2, 10]] },
  { pos: 'adv', sense: 'also', variants: [['also', 0, 2], ['too', 0, 2], ['additionally', 1, 8], ['moreover', 2, 10], ['furthermore', 2, 10]] },

  // --- Modifiers, batch 2 -----------------------------------------------
  { pos: 'adj', sense: 'new', variants: [['new', 0, 2], ['recent', 0, 4], ['novel', 1, 8], ['fresh', 0, 4]] },
  { pos: 'adj', sense: 'old', variants: [['old', 0, 2], ['former', 1, 6], ['outdated', 0, 6], ['obsolete', 1, 8]] },
  { pos: 'adj', sense: 'common', variants: [['common', 0, 2], ['typical', 0, 5], ['standard', 0, 5], ['conventional', 1, 8]] },
  { pos: 'adj', sense: 'unique', variants: [['unique', 0, 4], ['distinct', 1, 7], ['unusual', 0, 5], ['uncommon', 0, 6]] },
  { pos: 'adj', sense: 'certain', variants: [['certain', 0, 3], ['sure', 0, 2], ['confident', 0, 5], ['definite', 0, 6]] },
  { pos: 'adj', sense: 'uncertain', variants: [['uncertain', 0, 4], ['unclear', 0, 4], ['ambiguous', 1, 8], ['doubtful', 0, 6]] },
  { pos: 'adj', sense: 'likely', variants: [['likely', 0, 3], ['probable', 1, 7], ['plausible', 1, 8]] },
  { pos: 'adj', sense: 'unlikely', variants: [['unlikely', 0, 4], ['improbable', 2, 9], ['remote', 1, 7]] },
  { pos: 'adj', sense: 'necessary', variants: [['necessary', 0, 3], ['essential', 0, 5], ['required', 0, 5], ['mandatory', 1, 8]] },
  { pos: 'adj', sense: 'possible', variants: [['possible', 0, 3], ['feasible', 1, 7], ['viable', 1, 7], ['attainable', 1, 8]] },
  { pos: 'adj', sense: 'impossible', variants: [['impossible', 0, 3], ['unattainable', 2, 10], ['unfeasible', 2, 10]] },
  { pos: 'adj', sense: 'helpful', variants: [['helpful', 0, 3], ['useful', 0, 3], ['beneficial', 1, 7], ['valuable', 0, 5]] },
  { pos: 'adj', sense: 'harmful', variants: [['harmful', 0, 3], ['damaging', 0, 5], ['adverse', 2, 9]] },
  { pos: 'adj', sense: 'current', variants: [['current', 0, 4], ['present', 0, 4], ['existing', 0, 5], ['ongoing', 0, 5]] },
  { pos: 'adj', sense: 'future', variants: [['future', 0, 3], ['upcoming', 0, 5], ['forthcoming', 1, 8], ['prospective', 2, 10]] },
  { pos: 'adj', sense: 'thorough', variants: [['thorough', 0, 4], ['detailed', 0, 4], ['meticulous', 1, 9]] },
  { pos: 'adj', sense: 'basic', variants: [['basic', 0, 2], ['fundamental', 1, 7], ['elementary', 0, 6], ['rudimentary', 2, 10]] },
  { pos: 'adj', sense: 'advanced', variants: [['advanced', 0, 4], ['sophisticated', 1, 8], ['complex', 0, 5]] },
  { pos: 'adv', sense: 'carefully', variants: [['carefully', 0, 3], ['cautiously', 1, 7], ['meticulously', 2, 10]] },
  { pos: 'adv', sense: 'clearly', variants: [['clearly', 0, 3], ['evidently', 1, 8], ['obviously', 0, 4]] },
  { pos: 'adv', sense: 'finally', variants: [['finally', 0, 3], ['ultimately', 1, 7], ['eventually', 0, 5]] },
  { pos: 'adv', sense: 'currently', variants: [['currently', 0, 4], ['presently', 1, 7], ['now', 0, 1]] },
  { pos: 'adv', sense: 'generally', variants: [['generally', 0, 3], ['broadly', 1, 7], ['typically', 0, 5]] },
  { pos: 'adv', sense: 'significantly', variants: [['significantly', 0, 5], ['substantially', 2, 9], ['considerably', 1, 8]] },
];

export const ALL_SYNONYM_SETS = [
  ...SYNONYM_SETS,
  ...SYNONYM_SETS_NOUNS,
  ...SYNONYM_SETS_MODIFIERS,
];

/**
 * Index every variant lemma to the sets that contain it.
 *
 * A lemma can belong to more than one set ("change" is both a verb and a
 * noun sense), so entries are grouped by part of speech and the caller
 * disambiguates with its own POS guess.
 *
 * @returns {Map<string, {pos:string,sense:string,lemma:string,register:number,grade:number,variants:object[]}[]>}
 */
export function buildSynonymIndex(sets = ALL_SYNONYM_SETS) {
  const index = new Map();
  for (const set of sets) {
    const variants = set.variants.map(([lemma, register, grade]) => ({ lemma, register, grade }));
    for (const variant of variants) {
      const entry = {
        pos: set.pos,
        sense: set.sense,
        lemma: variant.lemma,
        register: variant.register,
        grade: variant.grade,
        variants,
      };
      const existing = index.get(variant.lemma);
      if (existing) existing.push(entry);
      else index.set(variant.lemma, [entry]);
    }
  }
  return index;
}

/** Largest variant word count, so callers know how many tokens to look ahead. */
export const MAX_VARIANT_WORDS = ALL_SYNONYM_SETS.reduce(
  (max, set) => Math.max(max, ...set.variants.map(([lemma]) => lemma.split(' ').length)),
  1,
);
