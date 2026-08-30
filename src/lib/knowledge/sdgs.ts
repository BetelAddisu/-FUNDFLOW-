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
    keywords: ['poverty', 'income', 'livelihood', 'poor', 'vulnerable', 'social protection'],
  },
  {
    id: 2,
    title: 'Zero Hunger',
    description: 'End hunger, achieve food security and improved nutrition and promote sustainable agriculture.',
    keywords: ['agriculture', 'food security', 'nutrition', 'farming', 'hunger', 'sustainable agriculture'],
  },
  {
    id: 3,
    title: 'Good Health and Well-being',
    description: 'Ensure healthy lives and promote well-being for all at all ages.',
    keywords: ['health', 'healthcare', 'medical', 'well-being', 'hospital', 'clinic', 'pharmaceutical'],
  },
  {
    id: 4,
    title: 'Quality Education',
    description: 'Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all.',
    keywords: ['education', 'training', 'school', 'learning', 'skills', 'capacity building'],
  },
  {
    id: 5,
    title: 'Gender Equality',
    description: 'Achieve gender equality and empower all women and girls.',
    keywords: ['gender', 'women', 'girls', 'empowerment', 'equality', 'female'],
  },
  {
    id: 6,
    title: 'Clean Water and Sanitation',
    description: 'Ensure availability and sustainable management of water and sanitation for all.',
    keywords: ['water', 'sanitation', 'hygiene', 'wastewater', 'drinking water'],
  },
  {
    id: 7,
    title: 'Affordable and Clean Energy',
    description: 'Ensure access to affordable, reliable, sustainable and modern energy for all.',
    keywords: ['energy', 'renewable', 'solar', 'electricity', 'clean energy', 'power', 'electric'],
  },
  {
    id: 8,
    title: 'Decent Work and Economic Growth',
    description: 'Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all.',
    keywords: ['employment', 'jobs', 'economic growth', 'decent work', 'labor', 'entrepreneurship', 'sme'],
  },
  {
    id: 9,
    title: 'Industry, Innovation and Infrastructure',
    description: 'Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation.',
    keywords: ['industry', 'innovation', 'infrastructure', 'manufacturing', 'technology', 'industrialization'],
  },
  {
    id: 10,
    title: 'Reduced Inequalities',
    description: 'Reduce inequality within and among countries.',
    keywords: ['inequality', 'inclusion', 'marginalized', 'disability', 'migrants'],
  },
  {
    id: 11,
    title: 'Sustainable Cities and Communities',
    description: 'Make cities and human settlements inclusive, safe, resilient and sustainable.',
    keywords: ['urban', 'city', 'housing', 'transport', 'settlements', 'community'],
  },
  {
    id: 12,
    title: 'Responsible Consumption and Production',
    description: 'Ensure sustainable consumption and production patterns.',
    keywords: ['recycling', 'waste', 'sustainable production', 'circular economy', 'resource efficiency'],
  },
  {
    id: 13,
    title: 'Climate Action',
    description: 'Take urgent action to combat climate change and its impacts.',
    keywords: ['climate', 'carbon', 'emission', 'greenhouse', 'climate change', 'resilience', 'adaptation'],
  },
  {
    id: 14,
    title: 'Life Below Water',
    description: 'Conserve and sustainably use the oceans, seas and marine resources for sustainable development.',
    keywords: ['ocean', 'marine', 'fishery', 'aquaculture', 'coastal'],
  },
  {
    id: 15,
    title: 'Life on Land',
    description: 'Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss.',
    keywords: ['forest', 'land', 'biodiversity', 'ecosystem', 'deforestation', 'desertification', 'conservation'],
  },
  {
    id: 16,
    title: 'Peace, Justice and Strong Institutions',
    description: 'Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels.',
    keywords: ['governance', 'justice', 'institution', 'peace', 'accountability', 'transparency'],
  },
  {
    id: 17,
    title: 'Partnerships for the Goals',
    description: 'Strengthen the means of implementation and revitalize the global partnership for sustainable development.',
    keywords: ['partnership', 'collaboration', 'cooperation', 'global partnership', 'financing'],
  },
];

// Sector to SDG mapping for quick lookup
export const sectorToSDG: Record<string, number[]> = {
  agriculture: [2, 15],
  farming: [2, 15],
  livestock: [2, 15],
  textile: [8, 9, 12],
  leather: [8, 9, 12],
  manufacturing: [8, 9, 12],
  metal: [8, 9],
  construction: [9, 11],
  service: [8, 11],
  tourism: [8, 11, 14],
  hospitality: [8, 11],
  'renewable energy': [7, 13],
  solar: [7, 13],
  energy: [7, 13],
  water: [6, 13],
  waste: [12, 13],
  recycling: [12, 13],
  forestry: [15, 13],
  fisheries: [14, 2],
  aquaculture: [14, 2],
  'food processing': [2, 12],
  health: [3],
  education: [4],
  technology: [9, 8],
  finance: [8, 17],
  transport: [9, 11],
};

export function findRelevantSDGs(
  businessType: string,
  products: string[],
  impactText: string,
  rawMaterialSourcing?: string
): SDG[] {
  const matchedSDGs = new Set<number>();
  const text = `${businessType} ${products.join(' ')} ${impactText} ${rawMaterialSourcing || ''}`.toLowerCase();

  // Match by sector keywords
  for (const [sector, sdgIds] of Object.entries(sectorToSDG)) {
    if (text.includes(sector.toLowerCase())) {
      sdgIds.forEach(id => matchedSDGs.add(id));
    }
  }

  // Match by SDG keywords
  for (const sdg of sdgs) {
    for (const keyword of sdg.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matchedSDGs.add(sdg.id);
        break;
      }
    }
  }

  // Check for green business keywords
  const greenKeywords = ['green', 'renewable', 'sustainable', 'eco', 'organic', 'energy efficient', 'carbon neutral', 'climate smart'];
  if (greenKeywords.some(k => text.includes(k))) {
    matchedSDGs.add(7); // Affordable and Clean Energy
    matchedSDGs.add(13); // Climate Action
    matchedSDGs.add(12); // Responsible Consumption
  }

  // Check for social impact keywords
  const socialKeywords = ['women', 'youth', 'employment', 'jobs', 'training', 'skills', 'inclusive', 'gender'];
  if (socialKeywords.some(k => text.includes(k))) {
    matchedSDGs.add(5); // Gender Equality
    matchedSDGs.add(8); // Decent Work
    matchedSDGs.add(10); // Reduced Inequalities
  }

  return Array.from(matchedSDGs).map(id => sdgs.find(s => s.id === id)!).filter(Boolean);
}