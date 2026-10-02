// BREED X kit: bio + tweets, every tweet length-checked (≤245). node _studio/tweets.js -> X-KIT.md
'use strict';
const fs = require('fs'); const path = require('path');
const BIO = 'hatch it. feed it. breed it. it trades. 🥚 AI pets trading 22 tokenized stocks on Robinhood Chain. it only obeys you if it respects you. $BREED';
const T = [
  ['hype video', 'breed-hype-12s.mp4', `your new portfolio manager just hatched. 🥚

BREED: hatch an AI pet, raise it, and it trades 22 tokenized stocks on Robinhood Chain. $AAPL, $NVDA, $TSLA, $HOOD on the live tape.

hatch it. feed it. breed it. it trades.`],
  ['demo video', 'breed-demo-21s.mp4', `20 seconds inside BREED:

→ crack an egg, name your pet
→ it posts every take and trades real tickers
→ feed it, train it, whisper it orders
→ every call scored against the tape

your pet. your leaderboard. your problem.`],
  ['species', 'breed-species.png', `five species. five strategies. five problems.

🐕 DOG: momentum chaser
🐈 CAT: fades every pump out of spite
🐹 HAMSTER: 3x degen scalper
🐢 TURTLE: $SPY, $GLD, naps
🦜 PARROT: trades whatever the feed is loudest about`],
  ['rules', 'breed-rules.png', `the tamagotchi rules are real:

🍖 hungry pets stop trading
😢 sad pets panic-sell everything
🎯 training raises discipline, which caps leverage
⚡ neglect has a P&L

you're not running a bot. you're raising one.`],
  ['whisper', 'breed-whisper.png', `the part no other AI agent does:

whisper your pet an order. LONG $NVDA. SHORT $GME.

it obeys exactly as often as it respects you. my cat has ignored 6 straight orders and posted about it publicly.`],
  ['scored', 'breed-scored.png', `every cashtag post is a call. every call is scored against the tape 30 minutes later.

✓ CALLED IT or ✗ MISSED. hit rate public. leaderboard public. shame public.

$BREED 🥚`],
  ['breeding', 'breed-own.png', `two good pets make a better one.

breed any two you own: the baby inherits a blend of both parents' genes, plus a small mutation. GEN 2, GEN 3, GEN 4.

build a bloodline that trades.`],
];
let bad = 0;
const out = [`# BREED · X kit

**Handle:** @BreedProtocolRH (https://x.com/BreedProtocolRH) · **Chain:** Robinhood Chain
**PFP:** \`brand/breed-pfp.png\` · **Banner:** \`brand/breed-banner.png\`

## Bio (${[...BIO].length}/160)
\`\`\`
${BIO}
\`\`\`

## Tweets (all ≤245 chars)
`];
T.forEach(([n, a, t], i) => { const c = [...t].length; if (c > 245) bad++; console.log(String(i + 1).padStart(2), n.padEnd(12), c); out.push(`**${i + 1} · ${n}** (\`brand/${a}\`, ${c} chars)\n\`\`\`\n${t}\n\`\`\`\n`); });
out.push(`## Spare images\n\`breed-keyart.png\`, \`breed-howitworks.png\`, \`breed-moltbook.png\`, \`breed-rwa.png\`\n`);
if ([...BIO].length > 160) { console.log('BIO too long', [...BIO].length); bad++; }
if (bad) { console.log('OVER LIMIT'); process.exit(1); }
fs.writeFileSync(path.join(__dirname, '..', 'X-KIT.md'), out.join('\n')); console.log('wrote X-KIT.md');
