export const SECTOR_COLORS: Record<string, string> = {
  'Commercial Banks':   '#c0392b',
  'Development Banks':  '#e67e22',
  'Hydropower':         '#1a9e72',
  'Life Insurance':     '#2980b9',
  'Non-Life Insurance': '#8e44ad',
  'Finance':            '#d35400',
  'Microfinance':       '#27ae60',
  'Hotels/Tourism':     '#e74c3c',
  'Manufacturing':      '#7f8c8d',
  'Trading':            '#f39c12',
  'Others':             '#95a5a6',
};

export const TV_SUPPORTED = new Set([
  'NABIL','SCB','NICA','GBIME','EBL','KBL','SBI','ADBL','PCBL','MBL',
  'NBB','PRVU','SANIMA','LSL','CZBIL','NIMB','CHCL','BPCL','UPPER',
  'NHDL','NHPC','GVL','AHPC','SHEL','KPCL','NLIC','PLICL',
  'LICN','NLG','GFCL','MFIL','ICFC','SWBBL','NESDO','CBBL','NUBL',
]);

export const RANGE_MAP: Record<string, { interval: string; range: string }> = {
  '1D': { interval: 'D', range: '5D'  },
  '5D': { interval: 'D', range: '5D'  },
  '1M': { interval: 'D', range: '1M'  },
  '3M': { interval: 'D', range: '3M'  },
  '6M': { interval: 'D', range: '6M'  },
  '1Y': { interval: 'W', range: '12M' },
};

export const LOADING_MSGS = [
  'Fetching live price from NEPSE…',
  'Analyzing financial metrics…',
  'Calculating PE, EPS, Book Value…',
  'Evaluating risk factors…',
  'Generating AI report…',
  'Almost ready…',
];

export const SECTIONS = [
  { key: 'snapshot',          icon: '📊', title: 'Market Snapshot'   },
  { key: 'business',          icon: '🏢', title: 'Business Overview' },
  { key: 'financials',        icon: '💰', title: 'Financial Health'  },
  { key: 'catalysts',         icon: '🚀', title: 'Growth Catalysts'  },
  { key: 'risks',             icon: '⚠️', title: 'Risk Factors'      },
  { key: 'analyst_consensus', icon: '🎯', title: 'Market Sentiment'  },
];

export const POPULAR_CHIPS = [
  'NABIL','CHCL','GBIME','UPPER','NICA','SCB','EBL','NLIC','BPCL','ADBL',
];
