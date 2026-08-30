export interface SDG {
  id: number;
  title: string;
  description: string;
  keywords: string[];
}

export const sdgs: SDG[] = [
  {
    id: 1,
    title: 'No Poverty',
    description: 'End poverty in all its forms everywhere.',
    keywords: ['poverty', 'income', 'livelihood'],
  },
  {
    id: 2,
    title: 'Zero Hunger',
    description: 'End hunger, achieve food security and improved nutrition, and promote sustainable agriculture.',
    keywords: ['agriculture', 'food', 'farm', 'nutrition'],
  },
  {
    id: 3,
    title: 'Good Health and Well-being',
    description: 'Ensure healthy lives and promote well-being for all at all ages.',
    keywords: ['health', 'medical', 'pharma', 'wellness'],
  },
  {
    id: 4,
    title: 'Quality Education',
    description: 'Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all.',
    keywords: ['education', 'training', 'school', 'skill'],
  },
  {
    id: 5,
    title: 'Gender Equality',
    description: 'Achieve gender equality and empower all women and girls.',
    keywords: ['women', 'gender', 'female', 'empowerment'],
  },
  {
    id: 6,
    title: 'Clean Water and Sanitation',
    description: 'Ensure availability and sustainable management of water and sanitation for all.',
    keywords: ['water', 'sanitation', 'hygiene'],
  },
  {
    id: 7,
    title: 'Affordable and Clean Energy',
    description: 'Ensure access to affordable, reliable, sustainable and modern energy for all.',
    keywords: ['energy', 'renewable', 'solar', 'electricity', 'clean energy'],
  },
  {
    id: 8,
    title: 'Decent Work and Economic Growth',
    description: 'Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all.',
    keywords: ['employment', 'jobs', 'economic growth', 'decent work'],
  },
  {
    id: 9,
    title: 'Industry, Innovation and Infrastructure',
    description: 'Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation.',
    keywords: ['industry', 'innovation', 'infrastructure', 'manufacturing', 'technology'],
  },
  {
    id: 10,
    title: 'Reduced Inequalities',
    description: 'Reduce inequality within and among countries.',
    keywords: ['inequality', 'inclusion', 'marginalized'],
  },
  {
    id: 11,
    title: 'Sustainable Cities and Communities',
    description: 'Make cities and human settlements inclusive, safe, resilient and sustainable.',
    keywords: ['urban', 'city', 'housing', 'transport'],
  },
  {
    id: 12,
    title: 'Responsible Consumption and Production',
    description: 'Ensure sustainable consumption and production patterns.',
    keywords: ['recycling', 'waste', 'sustainable production', 'circular economy'],
  },
  {
    id: 13,
    title: 'Climate Action',
    description: 'Take urgent action to combat climate change and its impacts.',
    keywords: ['climate', 'carbon', 'emission', 'greenhouse'],
  },
  {
    id: 14,
    title: 'Life Below Water',
    description: 'Conserve and sustainably use the oceans, seas and marine resources for sustainable development.',
    keywords: ['ocean', 'marine', 'fishery', 'aquaculture'],
  },
  {
    id: 15,
    title: 'Life on Land',
    description: 'Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss.',
    keywords: ['forest', 'land', 'biodiversity', 'ecosystem', 'agriculture'],
  },
  {
    id: 16,
    title: 'Peace, Justice and Strong Institutions',
    description: 'Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels.',
    keywords: ['justice', 'governance', 'institution', 'peace'],
  },
  {
    id: 17,
    title: 'Partnerships for the Goals',
    description: 'Strengthen the means of implementation and revitalize the global partnership for sustainable development.',
    keywords: ['partnership', 'collaboration', 'cooperation'],
  },
];