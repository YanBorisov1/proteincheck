import type { LocaleCode } from '../i18n';

export interface Guide {
  id: string;
  minutes: number;
  title: string;
  summary: string;
  sections: Array<{ heading: string; paragraphs: string[]; list?: string[] }>;
}

const en: Guide[] = [
  {
    id: 'read-a-protein-label',
    minutes: 3,
    title: 'How to read a protein label',
    summary: 'Five checks that take 30 seconds and see through most marketing.',
    sections: [
      {
        heading: '1. Ignore the big number on the front',
        paragraphs: [
          '“20 g PROTEIN” tells you nothing on its own. A 100 g bar with 20 g protein and 450 kcal is a very different food from a 60 g bar with 20 g protein and 200 kcal.',
        ],
      },
      {
        heading: '2. Work out the share of calories from protein',
        paragraphs: [
          'Multiply protein (g per 100 g) by 4 and divide by the calories per 100 g. That is the fraction of the energy coming from protein.',
          'Example: 20 g protein × 4 = 80 kcal. If the bar has 400 kcal per 100 g, only 20% of its energy is protein, which is the bare EU minimum for “high protein”.',
        ],
        list: ['Under 12%: not a protein food', '12–20%: a “source of protein”', '20–35%: high protein', 'Above 35%: very protein-dense'],
      },
      {
        heading: '3. Read the first three ingredients',
        paragraphs: [
          'Ingredients are listed by weight, largest first. If sugar, glucose syrup or a chocolate coating comes before the protein, you know what the product is mostly made of.',
        ],
      },
      {
        heading: '4. Find the protein source',
        paragraphs: [
          'Whey, casein, milk, egg and soy are complete proteins. Collagen and gelatin are not, even though they count fully towards the protein number. Pea and rice are good together but weaker alone.',
        ],
      },
      {
        heading: '5. Check sugar against protein',
        paragraphs: [
          'Divide sugars by protein. Below 0.25 g of sugar per gram of protein is good; above 1 means the product contains more sugar than protein.',
        ],
      },
    ],
  },
  {
    id: 'amino-spiking',
    minutes: 2,
    title: 'What is amino spiking?',
    summary: 'How cheap amino acids can inflate the protein figure on a label.',
    sections: [
      {
        heading: 'How protein is measured',
        paragraphs: [
          'Labs rarely measure protein directly. They measure nitrogen and multiply it by 6.25, because protein is about 16% nitrogen. Anything that contains nitrogen therefore looks like protein in the test.',
        ],
      },
      {
        heading: 'The trick',
        paragraphs: [
          'Some manufacturers add cheap free amino acids or nitrogen compounds to the protein. They raise the measured “protein” without adding the complete protein you are paying for.',
        ],
        list: [
          'Glycine and glutamine: real amino acids, but cheap and not essential',
          'Taurine and creatine: useful supplements, but not protein at all',
          'Arginine, alanine, citrulline: often added in “blends”',
        ],
      },
      {
        heading: 'How to spot it',
        paragraphs: [
          'Look for these names next to the protein or inside a “protein matrix” or “amino blend”, especially when no amounts are given. Reputable brands either avoid them or list exact amounts separately from protein.',
        ],
      },
    ],
  },
  {
    id: 'sugar-alcohols',
    minutes: 3,
    title: 'Sugar alcohols explained',
    summary: 'Maltitol, erythritol and friends: why “low sugar” bars can still upset your stomach.',
    sections: [
      {
        heading: 'What they are',
        paragraphs: [
          'Sugar alcohols (polyols) are sweet carbohydrates that the body only partly absorbs. They have fewer calories than sugar and don’t count as “sugar” on the label, which is why they are popular in protein bars.',
        ],
      },
      {
        heading: 'They are not all the same',
        paragraphs: ['The unabsorbed part ferments in your gut, which can cause gas, bloating and diarrhoea. How much depends on the type:'],
        list: [
          'Erythritol: best tolerated, almost zero calories, no effect on blood sugar',
          'Xylitol: good for teeth, laxative in larger amounts, very toxic to dogs',
          'Sorbitol and mannitol: strong laxative effect from about 20 g',
          'Maltitol: raises blood sugar about half as much as sugar and is one of the worst for digestion',
          'Glycerol: keeps bars soft; has calories but is often left out of carb counts',
        ],
      },
      {
        heading: 'The EU warning',
        paragraphs: [
          'In the EU, products with more than 10% added polyols must say “excessive consumption may produce laxative effects”. If you see it, check how many grams of polyols a serving contains.',
        ],
      },
    ],
  },
  {
    id: 'protein-quality',
    minutes: 3,
    title: 'Protein quality: PDCAAS and DIAAS',
    summary: 'Why 20 g of collagen is not the same as 20 g of whey.',
    sections: [
      {
        heading: 'Essential amino acids',
        paragraphs: [
          'Your body builds protein from 20 amino acids. Nine of them you must get from food. A “complete” protein provides all nine in useful amounts.',
        ],
      },
      {
        heading: 'Two scores',
        paragraphs: [
          'PDCAAS (used since 1993) and DIAAS (recommended by the FAO since 2013) both rate a protein by its weakest essential amino acid and by how well it is digested. 1.0 or 100% means it fully covers your needs; PDCAAS is capped at 1.0, DIAAS is not.',
        ],
        list: [
          'Whey, casein, milk, egg: about 1.0 or more',
          'Soy: about 0.9–1.0',
          'Pea: about 0.7–0.9 (low in methionine)',
          'Rice, wheat: about 0.4–0.6 (low in lysine)',
          'Collagen and gelatin: close to 0, because they contain no tryptophan',
        ],
      },
      {
        heading: 'Combining plant proteins',
        paragraphs: [
          'Pea is low in methionine but rich in lysine; rice is the opposite. Together they cover each other’s gaps, which is why good vegan powders combine them.',
        ],
      },
    ],
  },
  {
    id: 'net-carbs-and-fillers',
    minutes: 2,
    title: '“Net carbs” and hidden fillers',
    summary: 'How isolated fibres and starches make products look leaner than they are.',
    sections: [
      {
        heading: 'What “net carbs” means',
        paragraphs: [
          '“Net carbs” is a marketing figure: total carbohydrates minus fibre and often minus sugar alcohols. It is not regulated in the EU.',
        ],
      },
      {
        heading: 'Isolated fibres',
        paragraphs: [
          'Soluble corn fibre, polydextrose, inulin and resistant dextrin are added to raise the fibre number and lower net carbs. Some, such as isomalto-oligosaccharides (IMO), are largely digested like sugar despite being labelled as fibre.',
        ],
      },
      {
        heading: 'Cheap fillers',
        paragraphs: [
          'Maltodextrin and glucose syrup are refined starches that act like sugar in your body but don’t appear in the “sugars” line. In powders they bulk up the tub; in bars they glue things together.',
        ],
      },
    ],
  },
  {
    id: 'eu-protein-claims',
    minutes: 2,
    title: 'What “high protein” really means',
    summary: 'The legal rules behind the words on the pack.',
    sections: [
      {
        heading: 'The EU rules',
        paragraphs: ['Regulation (EC) No 1924/2006 sets two protein claims:'],
        list: ['“Source of protein”: at least 12% of the energy comes from protein', '“High protein”: at least 20% of the energy comes from protein'],
      },
      {
        heading: 'The loophole',
        paragraphs: [
          'A product called “Protein Bar” or “Protein Cookie” doesn’t make a formal claim, so these rules don’t strictly apply. That is how sugary snacks with a little protein get the word in big letters. ProteinCheck checks these products against the same thresholds anyway.',
        ],
      },
    ],
  },
];

const GUIDES: Partial<Record<LocaleCode, Guide[]>> = { en };

/** Guides in the requested language, falling back to English per guide. */
export function getGuides(locale: LocaleCode): Guide[] {
  const local = GUIDES[locale] ?? [];
  return en.map((g) => local.find((l) => l.id === g.id) ?? g);
}
