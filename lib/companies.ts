// Single source of truth for all NEPSE company names and sectors.
// DO NOT add delisted or merged symbols (e.g. LBBL → LSL, SRBL → LSL).

export const COMPANIES: Record<string, { name: string; sector: string }> = {
  // ── Commercial Banks ──────────────────────────────────────────────────────
  NABIL:  { name:'Nabil Bank Limited',                                         sector:'Commercial Banks' },
  SCB:    { name:'Standard Chartered Bank Nepal Limited',                      sector:'Commercial Banks' },
  NICA:   { name:'NIC Asia Bank Limited',                                      sector:'Commercial Banks' },
  GBIME:  { name:'Global IME Bank Limited',                                    sector:'Commercial Banks' },
  EBL:    { name:'Everest Bank Limited',                                       sector:'Commercial Banks' },
  HBL:    { name:'Himalayan Bank Limited',                                     sector:'Commercial Banks' },
  KBL:    { name:'Kumari Bank Limited',                                        sector:'Commercial Banks' },
  SBI:    { name:'Nepal SBI Bank Limited',                                     sector:'Commercial Banks' },
  ADBL:   { name:'Agriculture Development Bank Limited',                       sector:'Commercial Banks' },
  PCBL:   { name:'Prime Commercial Bank Limited',                              sector:'Commercial Banks' },
  MBL:    { name:'Machhapuchchhre Bank Limited',                               sector:'Commercial Banks' },
  NBB:    { name:'Nepal Bangladesh Bank Limited',                              sector:'Commercial Banks' },
  NMB:    { name:'NMB Bank Limited',                                           sector:'Commercial Banks' },
  PRVU:   { name:'Prabhu Bank Limited',                                        sector:'Commercial Banks' },
  SANIMA: { name:'Sanima Bank Limited',                                        sector:'Commercial Banks' },
  CZBIL:  { name:'Citizens Bank International Limited',                        sector:'Commercial Banks' },
  NIMB:   { name:'Nepal Investment Mega Bank Limited',                         sector:'Commercial Banks' },
  LSL:    { name:'Laxmi Sunrise Bank Limited',                                 sector:'Commercial Banks' }, // merged from LBBL + SRBL
  BOKL:   { name:'Bank of Kathmandu Lumbini Limited',                          sector:'Commercial Banks' },
  JBNL:   { name:'Janata Bank Nepal Limited',                                  sector:'Commercial Banks' },
  CBL:    { name:'Century Bank Limited',                                       sector:'Commercial Banks' },

  // ── Development Banks ─────────────────────────────────────────────────────
  CORBL:  { name:'Corporate Development Bank Limited',                         sector:'Development Banks' },
  KSBBL:  { name:'Kamana Sewa Bikas Bank Limited',                             sector:'Development Banks' },
  SADBL:  { name:'Sindhu Bikas Bank Limited',                                  sector:'Development Banks' },
  MLBL:   { name:'Muktinath Bikas Bank Limited',                               sector:'Development Banks' },
  SHINE:  { name:'Shine Resunga Development Bank Limited',                     sector:'Development Banks' },
  MNBBL:  { name:'Manakamana Nepal Bikas Bank Limited',                        sector:'Development Banks' },
  GBBL:   { name:'Garima Bikas Bank Limited',                                  sector:'Development Banks' },
  SABL:   { name:'Saptakoshi Development Bank Limited',                        sector:'Development Banks' },
  JBBL:   { name:'Jyoti Bikas Bank Limited',                                   sector:'Development Banks' },

  // ── Hydropower ────────────────────────────────────────────────────────────
  CHCL:   { name:'Chilime Hydropower Company Limited',                         sector:'Hydropower' },
  BPCL:   { name:'Butwal Power Company Limited',                               sector:'Hydropower' },
  UPPER:  { name:'Upper Tamakoshi Hydropower Limited',                         sector:'Hydropower' },
  NHDL:   { name:'Nepal Hydro Developers Limited',                             sector:'Hydropower' },
  NHPC:   { name:'National Hydropower Company Limited',                        sector:'Hydropower' },
  GVL:    { name:'Gandaki Jalvidhyut Company Limited',                         sector:'Hydropower' },
  AHPC:   { name:'Api Power Company Limited',                                  sector:'Hydropower' },
  SHEL:   { name:'Sanima Mai Hydropower Limited',                              sector:'Hydropower' },
  KPCL:   { name:'Kulekhani Hydropower Company Limited',                       sector:'Hydropower' },
  MHNL:   { name:'Madhya Bhotekoshi Jalavidhyut Company Limited',              sector:'Hydropower' },
  HIDCL:  { name:'Hydroelectricity Investment and Development Company Limited', sector:'Hydropower' },
  SJCL:   { name:'Solu Jal Vidyut Company Limited',                            sector:'Hydropower' },
  RADHI:  { name:'Radhi Bidyut Company Limited',                               sector:'Hydropower' },
  AKJCL:  { name:'Annapurna Khola Jalvidhyut Company Limited',                 sector:'Hydropower' },
  BARUN:  { name:'Barun Hydropower Company Limited',                           sector:'Hydropower' },
  SAHAS:  { name:'Sahas Urja Limited',                                         sector:'Hydropower' },
  NPCL:   { name:'Nepal Power Company Limited',                                sector:'Hydropower' },
  HPPL:   { name:'Himalayan Power Partner Limited',                            sector:'Hydropower' },
  MKJC:   { name:'Mandu Hydropower Company Limited',                           sector:'Hydropower' },
  RNLI:   { name:'Rairang Hydropower Development Company Limited',              sector:'Hydropower' },
  HURJA:  { name:'Hurja Power Company Limited',                                sector:'Hydropower' },
  DHPL:   { name:'Dolti Power Company Limited',                                sector:'Hydropower' },
  NGPL:   { name:'National Grid Power Company Limited',                        sector:'Hydropower' },
  RRHPL:  { name:'Ridi Hydropower Development Company Limited',                sector:'Hydropower' },

  // ── Life Insurance ────────────────────────────────────────────────────────
  NLIC:   { name:'Nepal Life Insurance Company Limited',                       sector:'Life Insurance' },
  PLICL:  { name:'Prime Life Insurance Company Limited',                       sector:'Life Insurance' },
  LICN:   { name:'Life Insurance Corporation Nepal Limited',                   sector:'Life Insurance' },
  SLICL:  { name:'Surya Life Insurance Company Limited',                       sector:'Life Insurance' },
  NLG:    { name:'Nepal Life Insurance Limited',                               sector:'Life Insurance' },
  SICL:   { name:'Sanima Life Insurance Company Limited',                      sector:'Life Insurance' },
  RBCL:   { name:'Reliable Life Insurance Company Limited',                    sector:'Life Insurance' },
  MLICL:  { name:'MetLife Insurance Company Nepal Limited',                    sector:'Life Insurance' },

  // ── Non-Life Insurance ────────────────────────────────────────────────────
  HEI:    { name:'Himalayan Everest Insurance Limited',                        sector:'Non-Life Insurance' },
  PRIN:   { name:'Premier Insurance Company Limited',                          sector:'Non-Life Insurance' },
  NIL:    { name:'Nepal Insurance Company Limited',                            sector:'Non-Life Insurance' },
  SGI:    { name:'Sagarmatha Insurance Company Limited',                       sector:'Non-Life Insurance' },
  EIC:    { name:'Everest Insurance Company Limited',                          sector:'Non-Life Insurance' },
  UIC:    { name:'United Insurance Company Nepal Limited',                     sector:'Non-Life Insurance' },
  NICL:   { name:'National Insurance Company Limited',                         sector:'Non-Life Insurance' },
  PIC:    { name:'Premier Insurance Company Nepal Limited',                    sector:'Non-Life Insurance' },
  LGIL:   { name:'Lumbini General Insurance Limited',                          sector:'Non-Life Insurance' },
  SRLI:   { name:'Siddhartha Insurance Limited',                               sector:'Non-Life Insurance' },
  AIL:    { name:'Asian Life Insurance Company Limited',                       sector:'Non-Life Insurance' },

  // ── Finance ───────────────────────────────────────────────────────────────
  GFCL:   { name:'Goodwill Finance Company Limited',                           sector:'Finance' },
  MFIL:   { name:'Manjushree Finance Limited',                                 sector:'Finance' },
  ICFC:   { name:'ICFC Finance Limited',                                       sector:'Finance' },
  JFL:    { name:'Janaki Finance Company Limited',                             sector:'Finance' },
  SFCL:   { name:'Sana Kisan Bikas Laghubitta Bittiya Sanstha',               sector:'Finance' },
  PROFL:  { name:'Professional Diyalo Finance Limited',                        sector:'Finance' },
  GUFL:   { name:'Goodwill Finance Limited',                                   sector:'Finance' },
  SIFC:   { name:'Siddhartha Finance Limited',                                 sector:'Finance' },
  MPFL:   { name:'Multipurpose Finance Company Limited',                       sector:'Finance' },
  GMFIL:  { name:'Goodwill Multipurpose Finance Institution',                  sector:'Finance' },

  // ── Microfinance ──────────────────────────────────────────────────────────
  SWBBL:  { name:'Swabalamban Laghubitta Bittiya Sanstha Limited',             sector:'Microfinance' },
  NESDO:  { name:'NESDO Laghubitta Bittiya Sanstha Limited',                   sector:'Microfinance' },
  FOWAD:  { name:'Forward Microfinance Laghubitta Bittiya Sanstha',            sector:'Microfinance' },
  CBBL:   { name:'Chhimek Laghubitta Bittiya Sanstha Limited',                 sector:'Microfinance' },
  NUBL:   { name:'Nirdhan Utthan Laghubitta Bittiya Sanstha',                  sector:'Microfinance' },
  GILB:   { name:'Grameen Bikas Laghubitta Bittiya Sanstha',                   sector:'Microfinance' },
  MLBBL:  { name:'Mithila Laghubitta Bittiya Sanstha Limited',                 sector:'Microfinance' },
  SDBL:   { name:'Sana Dev Laghubitta Bittiya Sanstha Limited',                sector:'Microfinance' },
  MSMBS:  { name:'Mirmire Laghubitta Bittiya Sanstha Limited',                 sector:'Microfinance' },
  SLBBL:  { name:'Suryodaya Laghubitta Bittiya Sanstha Limited',               sector:'Microfinance' },
  DDBL:   { name:'Deprosc Development Bank Limited',                           sector:'Microfinance' },
  SMFDB:  { name:'Sana Kisan Bikas Bank Limited',                              sector:'Microfinance' },
  NLBBL:  { name:'Nepal Laghubitta Bittiya Sanstha Limited',                   sector:'Microfinance' },
  KMCDB:  { name:'Kisan Microfinance Development Bank',                        sector:'Microfinance' },

  // ── Hotels & Tourism ──────────────────────────────────────────────────────
  SHL:    { name:'Soaltee Hotel Limited',                                      sector:'Hotels/Tourism' },
  OHL:    { name:'Oriental Hotels Limited',                                    sector:'Hotels/Tourism' },
  TRH:    { name:'Taragaon Regency Hotels Limited',                            sector:'Hotels/Tourism' },
  CGH:    { name:'Chandragiri Hills Limited',                                  sector:'Hotels/Tourism' },

  // ── Manufacturing ─────────────────────────────────────────────────────────
  SHIVM:  { name:'Shivam Cements Limited',                                     sector:'Manufacturing' },
  HDL:    { name:'Himalayan Distillery Limited',                               sector:'Manufacturing' },
  BNT:    { name:'Bottlers Nepal (Tarai) Limited',                             sector:'Manufacturing' },
  NIFRA:  { name:'Nepal Infrastructure Bank Limited',                          sector:'Manufacturing' },

  // ── Trading ───────────────────────────────────────────────────────────────
  STC:    { name:'Salt Trading Corporation Limited',                           sector:'Trading' },
  BBC:    { name:'Bishal Bazar Company Limited',                               sector:'Trading' },

  // ── Others ────────────────────────────────────────────────────────────────
  CIT:    { name:'Citizen Investment Trust',                                   sector:'Others' },
  NMBMF:  { name:'NMB Microfinance Bittiya Sanstha Limited',                  sector:'Others' },
};

/** Derived flat array used as static fallback in the UI */
export const STATIC_STOCKS = Object.entries(COMPANIES).map(
  ([symbol, { name, sector }]) => ({ symbol, name, sector })
);
