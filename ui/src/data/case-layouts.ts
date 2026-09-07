// Editorial structure from the case references. Existing API copy and credits remain authoritative.
const relapImages = [
  '/media/201ae73f06-AxPUbHM.png',
  '/media/e451bafff3-4jxEpQm.png',
  '/media/9f122975ca-8c6ULR0.png',
  '/media/9089d85d80-XgEdQ4u.png',
  '/media/85ac7ea324-wAyClRG.png',
];
export interface CaseLayout {
  tags: string[];
  accent: string;
  sections: { title: string; images: string[] }[];
  numbers: { value: string; text: string }[];
}
export const caseLayouts: Record<string, CaseLayout> = {
  relap: {
    tags: ['AdTech', 'Branding', 'Web', 'Product'],
    accent: '#2fc1cb',
    sections: ['Brandbook', 'Website', 'AdRoom'].map(title => ({ title, images: relapImages })),
    numbers: [
      { value: '#1', text: 'Native Advertising network in Russian Internet (2018)' },
      { value: '>600', text: 'Creative promos and special projects designed' },
      { value: '12', text: "New advertising formats invented, 4 of them made it to production and formed most of Relap’s revenue" },
      { value: '3', text: 'Designers developed from entry-level to senior level' },
    ],
  },
};
