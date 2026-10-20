export interface PureApartment {
  id: number;
  number: string;
  floor: number;
  owner: { fr: string; ar: string; en: string };
  phone: string;
  paid: boolean;
  amount: number;
  method: 'methodCash' | 'methodTransfer' | 'methodCheck' | null;
  paidDate: string | null;
  receiptNo: string | null;
}

export interface PureExpense {
  id: number;
  amount: number;
}

export interface PureIncident {
  id: number;
  status: 'reported' | 'in_progress' | 'fixed';
}

export interface PurePoll {
  id: number;
  yesVotes: number;
  noVotes: number;
  userVote: 'yes' | 'no' | null;
}

export function calculateTreasuryStats(
  apartments: PureApartment[],
  expenses: PureExpense[],
  initialReserve = 14500
) {
  const collectedThisMonth = apartments
    .filter((a) => a.paid)
    .reduce((acc, a) => acc + a.amount, 0);
  const spentThisMonth = expenses.reduce((acc, e) => acc + e.amount, 0);
  const currentBalance = initialReserve + collectedThisMonth - spentThisMonth;
  const paidCount = apartments.filter((a) => a.paid).length;
  const unpaidCount = apartments.length - paidCount;

  return {
    currentBalance,
    collectedThisMonth,
    spentThisMonth,
    paidCount,
    unpaidCount
  };
}

export function collectApartmentDue<T extends PureApartment>(
  apartments: T[],
  apartmentId: number,
  method: 'methodCash' | 'methodTransfer' | 'methodCheck',
  paidDate: string
): { updatedApartments: T[]; updatedApt: T | undefined } {
  const paddedId = apartmentId < 10 ? `00${apartmentId}` : apartmentId < 100 ? `0${apartmentId}` : `${apartmentId}`;
  const receiptNo = `SYN-2026-${paddedId}`;
  const updatedApartments = apartments.map((apt) => {
    if (apt.id === apartmentId) {
      return {
        ...apt,
        paid: true,
        amount: apt.amount > 0 ? apt.amount : 250,
        method,
        paidDate,
        receiptNo
      };
    }
    return apt;
  });
  const updatedApt = updatedApartments.find((a) => a.id === apartmentId);
  return { updatedApartments, updatedApt };
}

export function getNextIncidentStatus(
  status: 'reported' | 'in_progress' | 'fixed'
): 'reported' | 'in_progress' | 'fixed' {
  if (status === 'reported') return 'in_progress';
  if (status === 'in_progress') return 'fixed';
  return 'fixed';
}

export function applyPollVote<T extends PurePoll>(
  polls: T[],
  pollId: number,
  choice: 'yes' | 'no'
): T[] {
  return polls.map((p) => {
    if (p.id !== pollId) return p;
    let yes = p.yesVotes;
    let no = p.noVotes;

    if (p.userVote === 'yes') yes--;
    if (p.userVote === 'no') no--;

    if (choice === 'yes') yes++;
    if (choice === 'no') no++;

    return { ...p, yesVotes: yes, noVotes: no, userVote: choice };
  });
}

export function filterApartmentsList<T extends PureApartment>(
  apartments: T[],
  statusFilter: 'all' | 'paid' | 'unpaid',
  searchQuery: string,
  lang: 'fr' | 'ar' | 'en'
): T[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return apartments.filter((apt) => {
    if (statusFilter === 'paid' && !apt.paid) return false;
    if (statusFilter === 'unpaid' && apt.paid) return false;
    if (!normalizedQuery) return true;
    const ownerName = apt.owner[lang].toLowerCase();
    return (
      ownerName.includes(normalizedQuery) ||
      apt.number.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function buildWhatsAppMessage(
  apt: PureApartment,
  lang: 'fr' | 'ar' | 'en',
  isReceipt: boolean
): { message: string; url: string } {
  const ownerName = apt.owner[lang];
  let message = '';
  if (lang === 'fr') {
    message = isReceipt
      ? `Bonjour ${ownerName} (Appt ${apt.number}), merci pour votre règlement de ${apt.amount} MAD (Octobre 2026). Votre reçu officiel N° ${apt.receiptNo} est disponible sur Syndic Diali.`
      : `Bonjour ${ownerName} (Appt ${apt.number}), sauf erreur de notre part, la cotisation syndic de ${apt.amount} MAD est en attente. Merci beaucoup pour votre collaboration ! - Le Syndic`;
  } else if (lang === 'ar') {
    message = isReceipt
      ? `السلام عليكم ${ownerName} (شقة ${apt.number})، شكراً لأدائكم واجب السنديك (${apt.amount} د.م.). توصيلكم الرسمي رقم ${apt.receiptNo} متوفر على تطبيق سنديك ديالي.`
      : `السلام عليكم ${ownerName} (شقة ${apt.number})، نذكركم بلطف بواجب السنديك الشهري البالغ ${apt.amount} د.م. شكراً لتعاونكم من أجل مصلحة العمارة.`;
  } else {
    message = isReceipt
      ? `Hello ${ownerName} (Apt ${apt.number}), thank you for your payment of ${apt.amount} MAD. Your official receipt #${apt.receiptNo} is ready on Syndic Diali.`
      : `Hello ${ownerName} (Apt ${apt.number}), friendly reminder that your monthly HOA contribution of ${apt.amount} MAD is currently due. Thank you!`;
  }
  const cleanPhone = apt.phone.replace(/[^0-9]/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  return { message, url };
}

export type PureExpenseCategory =
  | 'catElevator'
  | 'catCleaning'
  | 'catSecurity'
  | 'catUtilities'
  | 'catPlumbing';

export interface RawExtractedReceipt {
  amount?: unknown;
  vendor?: unknown;
  date?: unknown;
  category?: unknown;
  title?: unknown;
}

export interface NormalizedReceiptData {
  amount: number;
  vendor: string;
  date: string;
  category: PureExpenseCategory;
  title: string;
}

const VALID_CATEGORIES: PureExpenseCategory[] = [
  'catElevator',
  'catCleaning',
  'catSecurity',
  'catUtilities',
  'catPlumbing'
];

export function normalizeExtractedReceipt(
  raw: RawExtractedReceipt,
  fallbackDate = '19/10/2026'
): NormalizedReceiptData {
  let numericAmount =
    typeof raw.amount === 'number'
      ? raw.amount
      : typeof raw.amount === 'string'
      ? parseFloat(raw.amount.replace(/[^0-9.,]/g, '').replace(',', '.'))
      : 0;

  if (isNaN(numericAmount) || numericAmount <= 0) {
    numericAmount = 350;
  } else if (numericAmount > 1000000) {
    numericAmount = 1000000;
  }
  numericAmount = Math.round(numericAmount * 100) / 100;

  const rawVendor = typeof raw.vendor === 'string' ? raw.vendor.trim() : '';
  const vendor = (rawVendor || 'Prestataire Vérifié').slice(0, 120);

  let date = typeof raw.date === 'string' ? raw.date.trim() : '';
  // Convert YYYY-MM-DD to DD/MM/YYYY if needed
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (isoMatch) {
    date = `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  if (!date) {
    date = fallbackDate;
  }
  date = date.slice(0, 32);

  const rawCat = typeof raw.category === 'string' ? raw.category.trim() : '';
  const category: PureExpenseCategory = VALID_CATEGORIES.includes(
    rawCat as PureExpenseCategory
  )
    ? (rawCat as PureExpenseCategory)
    : 'catCleaning';

  const rawTitle = typeof raw.title === 'string' ? raw.title.trim() : '';
  const title = (rawTitle || `Facture ${vendor}`).slice(0, 200);

  return {
    amount: numericAmount,
    vendor,
    date,
    category,
    title
  };
}

export interface PureEmergencyContact {
  id: number;
  name: string;
  role: string;
  phone: string;
}

export function getSubscriptionPlanPrice(
  planType: 'standard_monthly' | 'standard_yearly'
): number {
  return planType === 'standard_yearly' ? 490 : 49;
}

export function formatEmergencyTelHref(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return cleaned ? `tel:${cleaned}` : '#';
}

export function createEmergencyContact(
  name: string,
  role: string,
  phone: string,
  id = Date.now()
): PureEmergencyContact {
  return {
    id,
    name: name.trim(),
    role: role.trim(),
    phone: phone.trim()
  };
}

export function createNewApartmentEntry(
  existingApartments: PureApartment[],
  input: {
    number: string;
    floor: number | string;
    ownerName: string;
    phone?: string;
    amount?: number | string;
  }
): PureApartment {
  const maxExistingId = existingApartments.reduce(
    (max, a) => (a.id > max ? a.id : max),
    0
  );
  const nextId = Math.min(500, Math.max(1, maxExistingId + 1));
  const cleanNumber = input.number.trim().slice(0, 16) || String(nextId);
  const parsedFloor =
    typeof input.floor === 'number'
      ? Math.round(input.floor)
      : parseInt(String(input.floor), 10);
  const cleanFloor =
    !isNaN(parsedFloor) && parsedFloor >= 0 && parsedFloor <= 100 ? parsedFloor : 1;

  const cleanOwner = input.ownerName.trim().slice(0, 120);
  const parsedAmount =
    typeof input.amount === 'number'
      ? input.amount
      : parseFloat(String(input.amount ?? '250'));
  const cleanAmount =
    !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= 1000000
      ? Math.round(parsedAmount * 100) / 100
      : 250;

  const cleanPhone = (input.phone || '').trim() || '+212600112233';

  return {
    id: nextId,
    number: cleanNumber,
    floor: cleanFloor,
    owner: {
      fr: cleanOwner,
      ar: cleanOwner,
      en: cleanOwner
    },
    phone: cleanPhone,
    paid: false,
    amount: cleanAmount,
    method: null,
    paidDate: null,
    receiptNo: null
  };
}

export function createEmptyApplicationState() {
  return {
    reserve: 0,
    apartments: [] as PureApartment[],
    expenses: [] as PureExpense[],
    incidents: [] as PureIncident[],
    polls: [] as PurePoll[],
    emergencyContacts: [] as PureEmergencyContact[]
  };
}




