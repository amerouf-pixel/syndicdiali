import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTreasuryStats,
  collectApartmentDue,
  getNextIncidentStatus,
  applyPollVote,
  filterApartmentsList,
  buildWhatsAppMessage,
  normalizeExtractedReceipt,
  createEmptyApplicationState,
  getSubscriptionPlanPrice,
  formatEmergencyTelHref,
  createEmergencyContact,
  createNewApartmentEntry
} from './syndicLogic.ts';
import type { PureApartment } from './syndicLogic.ts';

const SAMPLE_APARTMENTS: PureApartment[] = [
  {
    id: 1,
    number: '1',
    floor: 1,
    owner: { fr: 'M. Karim Bennani', ar: 'السيد كريم بناني', en: 'Mr. Karim Bennani' },
    phone: '+212600112233',
    paid: true,
    amount: 250,
    method: 'methodTransfer',
    paidDate: '02/10/2026',
    receiptNo: 'SYN-2026-001'
  },
  {
    id: 3,
    number: '3',
    floor: 1,
    owner: { fr: 'M. Youssef Tazi', ar: 'السيد يوسف التازي', en: 'Mr. Youssef Tazi' },
    phone: '+212600112235',
    paid: false,
    amount: 250,
    method: null,
    paidDate: null,
    receiptNo: null
  }
];

test('calculateTreasuryStats computes balance, collected, spent, and counts accurately', () => {
  const expenses = [{ id: 101, amount: 1200 }, { id: 102, amount: 600 }];
  const stats = calculateTreasuryStats(SAMPLE_APARTMENTS, expenses, 14500);

  assert.equal(stats.collectedThisMonth, 250);
  assert.equal(stats.spentThisMonth, 1800);
  assert.equal(stats.currentBalance, 14500 + 250 - 1800);
  assert.equal(stats.paidCount, 1);
  assert.equal(stats.unpaidCount, 1);
});

test('collectApartmentDue marks apartment paid and generates formatted receipt number', () => {
  const { updatedApartments, updatedApt } = collectApartmentDue(
    SAMPLE_APARTMENTS,
    3,
    'methodCash',
    '18/10/2026'
  );

  assert.ok(updatedApt);
  assert.equal(updatedApt.paid, true);
  assert.equal(updatedApt.method, 'methodCash');
  assert.equal(updatedApt.receiptNo, 'SYN-2026-003');
  assert.equal(updatedApartments.filter((a) => a.paid).length, 2);
});

test('getNextIncidentStatus progresses from reported -> in_progress -> fixed', () => {
  assert.equal(getNextIncidentStatus('reported'), 'in_progress');
  assert.equal(getNextIncidentStatus('in_progress'), 'fixed');
  assert.equal(getNextIncidentStatus('fixed'), 'fixed');
});

test('applyPollVote handles initial vote and changing vote without double counting', () => {
  const initialPolls = [
    { id: 401, yesVotes: 8, noVotes: 2, userVote: null as 'yes' | 'no' | null }
  ];

  const afterYes = applyPollVote(initialPolls, 401, 'yes');
  assert.equal(afterYes[0].yesVotes, 9);
  assert.equal(afterYes[0].noVotes, 2);
  assert.equal(afterYes[0].userVote, 'yes');

  const afterSwitchToNo = applyPollVote(afterYes, 401, 'no');
  assert.equal(afterSwitchToNo[0].yesVotes, 8);
  assert.equal(afterSwitchToNo[0].noVotes, 3);
  assert.equal(afterSwitchToNo[0].userVote, 'no');
});

test('filterApartmentsList filters by status and search query in active language', () => {
  const unpaidOnly = filterApartmentsList(SAMPLE_APARTMENTS, 'unpaid', '', 'fr');
  assert.equal(unpaidOnly.length, 1);
  assert.equal(unpaidOnly[0].id, 3);

  const byArabicSearch = filterApartmentsList(SAMPLE_APARTMENTS, 'all', 'كريم', 'ar');
  assert.equal(byArabicSearch.length, 1);
  assert.equal(byArabicSearch[0].id, 1);
});

test('buildWhatsAppMessage generates localized reminder and receipt links', () => {
  const reminderFr = buildWhatsAppMessage(SAMPLE_APARTMENTS[1], 'fr', false);
  assert.ok(reminderFr.message.includes('M. Youssef Tazi'));
  assert.ok(reminderFr.url.startsWith('https://wa.me/212600112235?text='));

  const receiptAr = buildWhatsAppMessage(SAMPLE_APARTMENTS[0], 'ar', true);
  assert.ok(receiptAr.message.includes('SYN-2026-001'));
});

test('normalizeExtractedReceipt parses amount, vendor, ISO date, and category with safe fallbacks', () => {
  const parsed = normalizeExtractedReceipt({
    amount: '485,50 MAD',
    vendor: '  SRM Casablanca / Lydec  ',
    date: '2026-10-19',
    category: 'catUtilities',
    title: 'Facture eau et électricité parties communes'
  });

  assert.equal(parsed.amount, 485.5);
  assert.equal(parsed.vendor, 'SRM Casablanca / Lydec');
  assert.equal(parsed.date, '19/10/2026');
  assert.equal(parsed.category, 'catUtilities');
  assert.equal(parsed.title, 'Facture eau et électricité parties communes');

  const fallback = normalizeExtractedReceipt({}, '19/10/2026');
  assert.equal(fallback.amount, 350);
  assert.equal(fallback.vendor, 'Prestataire Vérifié');
  assert.equal(fallback.date, '19/10/2026');
  assert.equal(fallback.category, 'catCleaning');
});

test('createEmptyApplicationState resets all collections and treasury amounts to zero', () => {
  const empty = createEmptyApplicationState();
  const stats = calculateTreasuryStats(empty.apartments, empty.expenses, empty.reserve);

  assert.equal(stats.currentBalance, 0);
  assert.equal(stats.collectedThisMonth, 0);
  assert.equal(stats.spentThisMonth, 0);
  assert.equal(stats.paidCount, 0);
  assert.equal(stats.unpaidCount, 0);
  assert.equal(empty.emergencyContacts.length, 0);
});

test('getSubscriptionPlanPrice returns 49 MAD/month and 490 MAD/year', () => {
  assert.equal(getSubscriptionPlanPrice('standard_monthly'), 49);
  assert.equal(getSubscriptionPlanPrice('standard_yearly'), 490);
});

test('createEmergencyContact and formatEmergencyTelHref handle real user-entered phone numbers', () => {
  const contact = createEmergencyContact('  M. Tariq ', ' Plombier ', ' 06 61 99 88 77 ', 1);
  assert.equal(contact.name, 'M. Tariq');
  assert.equal(contact.role, 'Plombier');
  assert.equal(contact.phone, '06 61 99 88 77');
  assert.equal(formatEmergencyTelHref(contact.phone), 'tel:0661998877');
  assert.equal(formatEmergencyTelHref(''), '#');
});

test('createNewApartmentEntry creates an apartment & owner and links collection to treasury', () => {
  const newApt = createNewApartmentEntry(SAMPLE_APARTMENTS, {
    number: '13',
    floor: 4,
    ownerName: 'M. Driss Berrada',
    phone: '06 61 55 44 33',
    amount: 300
  });

  assert.equal(newApt.id, 4);
  assert.equal(newApt.number, '13');
  assert.equal(newApt.floor, 4);
  assert.equal(newApt.owner.fr, 'M. Driss Berrada');
  assert.equal(newApt.amount, 300);
  assert.equal(newApt.paid, false);

  const listWithNew = [...SAMPLE_APARTMENTS, newApt];
  const { updatedApartments, updatedApt } = collectApartmentDue(
    listWithNew,
    newApt.id,
    'methodTransfer',
    '19/10/2026'
  );

  assert.ok(updatedApt);
  assert.equal(updatedApt.paid, true);
  assert.equal(updatedApt.amount, 300);
  assert.equal(updatedApt.owner.fr, 'M. Driss Berrada');
  assert.equal(updatedApt.receiptNo, 'SYN-2026-004');

  const stats = calculateTreasuryStats(updatedApartments, [], 14500);
  assert.equal(stats.collectedThisMonth, 250 + 300);
  assert.equal(stats.currentBalance, 14500 + 550);
  assert.equal(stats.paidCount, 2);
});




