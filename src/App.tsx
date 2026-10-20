import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Building2,
  Wallet,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wrench,
  Megaphone,
  Phone,
  MessageCircle,
  FileText,
  Plus,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Zap,
  Droplets,
  ArrowUpDown,
  Camera,
  Check,
  X,
  Vote,
  ChevronRight,
  Search,
  Receipt,
  LogIn,
  LogOut,
  Cloud,
  RotateCcw,
  Trash2
} from 'lucide-react';
import {
  ActiveTab,
  Apartment,
  ApartmentFilter,
  Announcement,
  Expense,
  ExpenseCategory,
  Incident,
  Language,
  PaymentMethod,
  Poll,
  UserRole
} from './types';
import { TRANSLATIONS } from './i18n/translations';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_APARTMENTS,
  INITIAL_EXPENSES,
  INITIAL_INCIDENTS,
  INITIAL_POLLS,
  INITIAL_RESERVE
} from './data/initialData';
import {
  applyPollVote,
  buildWhatsAppMessage,
  calculateTreasuryStats,
  collectApartmentDue,
  createEmptyApplicationState,
  createNewApartmentEntry,
  filterApartmentsList,
  formatEmergencyTelHref,
  getNextIncidentStatus,
  PureEmergencyContact
} from './utils/syndicLogic';
import {
  AnnouncementModal,
  ExpenseModal,
  IncidentModal,
  PaymentModal,
  ProofModal,
  ReceiptModal,
  ResetConfirmModal,
  WhatsAppPreviewModal
} from './components/Modals';
import PricingSection from './components/PricingSection';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  logOutFirebase,
  subscribeToResidenceData,
  seedUserResidenceData,
  createApartmentInFirestore,
  updateApartmentPaymentInFirestore,
  createExpenseInFirestore,
  createIncidentInFirestore,
  updateIncidentStatusInFirestore,
  createAnnouncementInFirestore,
  updatePollVoteInFirestore,
  deleteAllUserResidenceDataInFirestore,
  User
} from './firebase';

const CONTACT_STYLES = [
  { icon: ShieldAlert, color: 'bg-emerald-100 text-emerald-700' },
  { icon: ArrowUpDown, color: 'bg-rose-100 text-rose-700' },
  { icon: Droplets, color: 'bg-sky-100 text-sky-700' },
  { icon: Zap, color: 'bg-amber-100 text-amber-700' }
];

const INITIAL_EMPTY_CONTACTS: PureEmergencyContact[] = [
  { id: 1, name: '', role: '', phone: '' },
  { id: 2, name: '', role: '', phone: '' }
];

const LOCAL_DB_KEY = 'syndic_diali_local_db_v1';

interface PersistedSyndicDatabase {
  reserve: number;
  apartments: Apartment[];
  expenses: Expense[];
  incidents: Incident[];
  announcements: Announcement[];
  polls: Poll[];
  emergencyContacts: PureEmergencyContact[];
}

function loadPersistedDatabase(): PersistedSyndicDatabase | null {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSyndicDatabase>;
    if (
      typeof parsed.reserve === 'number' &&
      Array.isArray(parsed.apartments) &&
      Array.isArray(parsed.expenses) &&
      Array.isArray(parsed.incidents) &&
      Array.isArray(parsed.announcements) &&
      Array.isArray(parsed.polls)
    ) {
      return {
        reserve: parsed.reserve,
        apartments: parsed.apartments,
        expenses: parsed.expenses,
        incidents: parsed.incidents,
        announcements: parsed.announcements,
        polls: parsed.polls,
        emergencyContacts: Array.isArray(parsed.emergencyContacts)
          ? parsed.emergencyContacts
          : INITIAL_EMPTY_CONTACTS
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const initialDb = useMemo(() => loadPersistedDatabase(), []);

  // États principaux
  const [lang, setLang] = useState<Language>('fr');
  const [role, setRole] = useState<UserRole>('syndic');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Authentification Firebase & Synchronisation Firestore
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Données dynamiques (initialisées depuis la base persistée ou les données initiales)
  const [reserve, setReserve] = useState<number>(() =>
    initialDb ? initialDb.reserve : INITIAL_RESERVE
  );
  const [apartments, setApartments] = useState<Apartment[]>(() =>
    initialDb ? initialDb.apartments : INITIAL_APARTMENTS
  );
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    initialDb ? initialDb.expenses : INITIAL_EXPENSES
  );
  const [incidents, setIncidents] = useState<Incident[]>(() =>
    initialDb ? initialDb.incidents : INITIAL_INCIDENTS
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    initialDb ? initialDb.announcements : INITIAL_ANNOUNCEMENTS
  );
  const [polls, setPolls] = useState<Poll[]>(() =>
    initialDb ? initialDb.polls : INITIAL_POLLS
  );
  const [emergencyContacts, setEmergencyContacts] = useState<PureEmergencyContact[]>(() =>
    initialDb ? initialDb.emergencyContacts : INITIAL_EMPTY_CONTACTS
  );
  const [aptFilter, setAptFilter] = useState<ApartmentFilter>('all');
  const [aptSearch, setAptSearch] = useState('');

  // Modales
  const [paymentModalApt, setPaymentModalApt] = useState<Apartment | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState<PaymentMethod>('methodCash');
  const [receiptModalApt, setReceiptModalApt] = useState<Apartment | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showAnnoModal, setShowAnnoModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const hasResetSessionRef = useRef(false);
  const [proofModalExpense, setProofModalExpense] = useState<Expense | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    apt: Apartment;
    message: string;
    url: string;
  } | null>(null);

  // Champs de formulaire : Nouvel appartement & propriétaire
  const [newAptNumber, setNewAptNumber] = useState('');
  const [newAptFloor, setNewAptFloor] = useState('1');
  const [newAptOwner, setNewAptOwner] = useState('');
  const [newAptPhone, setNewAptPhone] = useState('');
  const [newAptAmount, setNewAptAmount] = useState('250');

  // Champs de formulaire : Dépense, Panne, Annonce
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseVendor, setNewExpenseVendor] = useState('');
  const [newExpenseDate, setNewExpenseDate] = useState(() =>
    new Date().toLocaleDateString('fr-FR')
  );
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<ExpenseCategory>('catCleaning');

  const [newIncidentLoc, setNewIncidentLoc] = useState('');
  const [newIncidentDesc, setNewIncidentDesc] = useState('');

  const [newAnnoTitle, setNewAnnoTitle] = useState('');
  const [newAnnoBody, setNewAnnoBody] = useState('');

  // Sauvegarde automatique dans la base locale à chaque modification
  useEffect(() => {
    try {
      const payload: PersistedSyndicDatabase = {
        reserve,
        apartments,
        expenses,
        incidents,
        announcements,
        polls,
        emergencyContacts
      };
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error('Local persistence error:', err);
    }
  }, [reserve, apartments, expenses, incidents, announcements, polls, emergencyContacts]);

  // Écoute de l'état d'authentification Firebase
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsubAuth();
  }, []);

  // Abonnement temps réel Firestore lorsque l'utilisateur est connecté
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const resetKey = `syndic_diali_reset_${currentUser.uid}`;
    if (localStorage.getItem(resetKey) === 'true') {
      hasResetSessionRef.current = true;
      setReserve(0);
    }

    const unsubFirestore = subscribeToResidenceData(currentUser.uid, {
      onApartments: (apts, isEmpty) => {
        if (isEmpty) {
          if (hasResetSessionRef.current || localStorage.getItem(resetKey) === 'true') {
            setApartments([]);
            setReserve(0);
          } else {
            seedUserResidenceData(currentUser.uid).catch((err) =>
              console.error('Seed error:', err)
            );
          }
        } else {
          setApartments(apts);
        }
      },
      onExpenses: (exps) => setExpenses(exps),
      onIncidents: (incs) => setIncidents(incs),
      onAnnouncements: (annos) => setAnnouncements(annos),
      onPolls: (pls) => setPolls(pls)
    });

    return () => unsubFirestore();
  }, [authReady, currentUser]);

  // Dictionnaire courant
  const t = TRANSLATIONS[lang];
  const isRTL = t.dir === 'rtl';

  // Calculs financiers en temps réel
  const treasuryStats = useMemo(
    () => calculateTreasuryStats(apartments, expenses, reserve),
    [apartments, expenses, reserve]
  );

  // Formatage des montants avec espace standard lisible
  const formatMoney = (amount: number) => {
    const formatted = amount.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');
    return `${formatted} ${t.currency}`;
  };

  // Icône par catégorie de dépense
  const getCategoryIcon = (catKey: ExpenseCategory) => {
    switch (catKey) {
      case 'catElevator':
        return <ArrowUpDown className="w-5 h-5 text-indigo-600" />;
      case 'catCleaning':
        return <Sparkles className="w-5 h-5 text-emerald-600" />;
      case 'catSecurity':
        return <ShieldAlert className="w-5 h-5 text-slate-700" />;
      case 'catUtilities':
        return <Zap className="w-5 h-5 text-amber-600" />;
      default:
        return <Droplets className="w-5 h-5 text-sky-600" />;
    }
  };

  // ==========================================
  // ACTIONS SYNDIC & RÉSIDENT (AVEC PERSISTANCE FIRESTORE)
  // ==========================================

  // 1. Encaisser un appartement en 2 clics (lié au propriétaire, à l'appartement et à la caisse)
  const handleConfirmPayment = async () => {
    if (!paymentModalApt) return;
    const today = new Date().toLocaleDateString('fr-FR');
    const { updatedApartments, updatedApt } = collectApartmentDue(
      apartments,
      paymentModalApt.id,
      selectedPayMethod,
      today
    );

    setApartments(updatedApartments);
    setPaymentModalApt(null);
    if (updatedApt) {
      setReceiptModalApt(updatedApt);
      if (currentUser && updatedApt.receiptNo) {
        await updateApartmentPaymentInFirestore(
          currentUser.uid,
          updatedApt.id,
          selectedPayMethod,
          today,
          updatedApt.receiptNo,
          updatedApt.amount
        );
      }
    }
  };

  // 1b. Ajouter un appartement et un propriétaire (enregistré en base et relié aux cotisations)
  const handleAddApartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAptNumber.trim() || !newAptOwner.trim()) return;

    const createdApt: Apartment = createNewApartmentEntry(apartments, {
      number: newAptNumber,
      floor: newAptFloor,
      ownerName: newAptOwner,
      phone: newAptPhone,
      amount: newAptAmount
    });

    setApartments((prev) => [...prev, createdApt]);
    setNewAptNumber('');
    setNewAptFloor('1');
    setNewAptOwner('');
    setNewAptPhone('');
    setNewAptAmount('250');

    if (currentUser) {
      await createApartmentInFirestore(currentUser.uid, createdApt);
    }
  };

  // 2. Préparer un message WhatsApp poli dans la langue active
  const openWhatsApp = (apt: Apartment, isReceipt: boolean) => {
    const { message, url } = buildWhatsAppMessage(apt, lang, isReceipt);
    setWhatsAppModalData({ apt, message, url });
  };

  // 3. Ajouter une dépense (et déduire automatiquement de la caisse)
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseTitle.trim() || !newExpenseAmount) return;
    const numericAmount = parseFloat(newExpenseAmount);
    if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > 1000000) return;

    const cleanTitle = newExpenseTitle.trim().slice(0, 200);
    const cleanVendor = (newExpenseVendor.trim() || 'Prestataire Vérifié').slice(0, 120);
    const cleanDate = (
      newExpenseDate.trim() || new Date().toLocaleDateString('fr-FR')
    ).slice(0, 32);

    const newExp: Expense = {
      id: Date.now(),
      category: newExpenseCategory,
      date: cleanDate,
      amount: numericAmount,
      vendor: cleanVendor,
      title: {
        fr: cleanTitle,
        ar: cleanTitle,
        en: cleanTitle
      }
    };

    setExpenses([newExp, ...expenses]);
    setNewExpenseTitle('');
    setNewExpenseVendor('');
    setNewExpenseDate(new Date().toLocaleDateString('fr-FR'));
    setNewExpenseAmount('');
    setShowExpenseModal(false);

    if (currentUser) {
      await createExpenseInFirestore(currentUser.uid, newExp);
    }
  };

  // 4. Signaler une nouvelle panne
  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentLoc.trim() || !newIncidentDesc.trim()) return;

    const cleanLoc = newIncidentLoc.trim().slice(0, 150);
    const cleanDesc = newIncidentDesc.trim().slice(0, 500);

    const newInc: Incident = {
      id: Date.now(),
      status: 'reported',
      date: new Date().toLocaleDateString('fr-FR'),
      reporter: role === 'syndic' ? 'Syndic (Inspection)' : 'Appt 4 (M. Chraibi)',
      location: {
        fr: cleanLoc,
        ar: cleanLoc,
        en: cleanLoc
      },
      description: {
        fr: cleanDesc,
        ar: cleanDesc,
        en: cleanDesc
      }
    };

    setIncidents([newInc, ...incidents]);
    setNewIncidentLoc('');
    setNewIncidentDesc('');
    setShowIncidentModal(false);

    if (currentUser) {
      await createIncidentInFirestore(currentUser.uid, newInc);
    }
  };

  // 5. Faire avancer le statut d'une panne (Signalé -> En cours -> Réparé)
  const advanceIncidentStatus = async (id: number) => {
    const target = incidents.find((i) => i.id === id);
    if (!target) return;
    const nextStatus = getNextIncidentStatus(target.status);

    setIncidents(
      incidents.map((inc) => (inc.id === id ? { ...inc, status: nextStatus } : inc))
    );

    if (currentUser) {
      await updateIncidentStatusInFirestore(currentUser.uid, id, nextStatus);
    }
  };

  // 6. Publier une annonce
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnoTitle.trim() || !newAnnoBody.trim()) return;

    const cleanTitle = newAnnoTitle.trim().slice(0, 200);
    const cleanBody = newAnnoBody.trim().slice(0, 1000);

    const newAnno: Announcement = {
      id: Date.now(),
      urgent: true,
      date: new Date().toLocaleDateString('fr-FR'),
      title: {
        fr: cleanTitle,
        ar: cleanTitle,
        en: cleanTitle
      },
      body: {
        fr: cleanBody,
        ar: cleanBody,
        en: cleanBody
      }
    };

    setAnnouncements([newAnno, ...announcements]);
    setNewAnnoTitle('');
    setNewAnnoBody('');
    setShowAnnoModal(false);

    if (currentUser) {
      await createAnnouncementInFirestore(currentUser.uid, newAnno);
    }
  };

  // 7. Voter sur un devis (Oui / Non)
  const handleVote = async (pollId: number, choice: 'yes' | 'no') => {
    const updatedPolls = applyPollVote(polls, pollId, choice);
    setPolls(updatedPolls);
    const targetPoll = updatedPolls.find((p) => p.id === pollId);
    if (currentUser && targetPoll) {
      await updatePollVoteInFirestore(currentUser.uid, targetPoll);
    }
  };

  // 8. Réinitialiser complètement les données du client connecté (Firestore + état local)
  const handleConfirmReset = async () => {
    setIsResetting(true);
    hasResetSessionRef.current = true;
    try {
      if (currentUser) {
        localStorage.setItem(`syndic_diali_reset_${currentUser.uid}`, 'true');
        await deleteAllUserResidenceDataInFirestore(currentUser.uid);
      }
      const empty = createEmptyApplicationState();
      setReserve(empty.reserve);
      setApartments([]);
      setExpenses([]);
      setIncidents([]);
      setAnnouncements([]);
      setPolls([]);
      setEmergencyContacts([
        { id: 1, name: '', role: '', phone: '' },
        { id: 2, name: '', role: '', phone: '' }
      ]);
      setShowResetModal(false);
    } catch (error) {
      console.error('Reset error:', error);
    } finally {
      setIsResetting(false);
    }
  };

  // 9. Gestion des contacts d'urgence (champs vides modifiables par le syndic)
  const handleAddEmergencyContact = () => {
    setEmergencyContacts((prev) => [
      ...prev,
      { id: Date.now() + prev.length, name: '', role: '', phone: '' }
    ]);
  };

  const handleUpdateEmergencyContact = (
    id: number,
    field: 'name' | 'role' | 'phone',
    value: string
  ) => {
    setEmergencyContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleDeleteEmergencyContact = (id: number) => {
    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // Appartements filtrés
  const filteredApartments = useMemo(
    () => filterApartmentsList(apartments, aptFilter, aptSearch, lang),
    [apartments, aptFilter, aptSearch, lang]
  );

  // Appartement du résident connecté (Appt 4 en démo)
  const myResidentApt = apartments.find((a) => a.id === 4);

  const openIncidentsCount = incidents.filter((i) => i.status !== 'fixed').length;

  return (
    <div
      dir={t.dir}
      className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12 overflow-x-hidden"
    >
      {/* ==========================================
          BARRE SUPÉRIEURE : LOGO + LANGUES + RÔLE + AUTH
      ========================================== */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Nom */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                {t.appName}
              </h1>
              <p className="text-xs text-slate-500 font-medium">{t.appSubtitle}</p>
            </div>
          </div>

          {/* Contrôles : Connexion Google + Sélecteur Rôle + Sélecteur Langue */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Bouton Google Sign-In / Firestore Cloud */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-800">
                <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[110px]">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={() => logOutFirebase()}
                  aria-label={t.signOutBtn}
                  className="ms-1 p-1 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors"
                  title={t.signOutBtn}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  signInWithGoogle().catch((err) => console.error('Google Sign-In:', err))
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{t.signInGoogleBtn}</span>
              </button>
            )}

            {/* Bascule Rôle Démo */}
            <button
              type="button"
              onClick={() => setRole(role === 'syndic' ? 'resident' : 'syndic')}
              title={t.switchRoleTip}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-xs border whitespace-nowrap shrink-0 ${
                role === 'syndic'
                  ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                  : 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>{role === 'syndic' ? t.roleSyndic : t.roleResident}</span>
            </button>

            {/* Bouton Paramètres : Réinitialiser */}
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              aria-label={t.resetAppBtn}
              title={`${t.settingsLabel} • ${t.resetAppBtn}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{t.resetAppBtn}</span>
            </button>

            {/* Sélecteur 3 Langues */}
            <div
              role="group"
              aria-label="Sélecteur de langue"
              className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200"
            >
              <button
                type="button"
                onClick={() => setLang('fr')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  lang === 'fr'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLang('ar')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  lang === 'ar'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  lang === 'en'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Desktop (4 onglets clairs) */}
        <nav
          aria-label="Navigation principale"
          className="hidden md:block border-t border-slate-100 bg-slate-50/70"
        >
          <div className="max-w-5xl mx-auto px-4 flex items-center gap-2 py-2 overflow-x-auto">
            {[
              { id: 'dashboard' as ActiveTab, label: t.navDashboard, icon: Wallet, count: null },
              {
                id: 'apartments' as ActiveTab,
                label: t.navApartments,
                icon: Building2,
                count: treasuryStats.unpaidCount > 0 ? treasuryStats.unpaidCount : null
              },
              {
                id: 'incidents' as ActiveTab,
                label: t.navIncidents,
                icon: Wrench,
                count: openIncidentsCount > 0 ? openIncidentsCount : null
              },
              {
                id: 'announcements' as ActiveTab,
                label: t.navAnnouncements,
                icon: Megaphone,
                count: null
              }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`text-xs font-extrabold tabular-nums ${
                        isActive ? 'text-emerald-100' : 'text-rose-600'
                      }`}
                    >
                      ({tab.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ==========================================
          CONTENU PRINCIPAL
      ========================================== */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Bandeau statut personnel si Mode Résident */}
        {role === 'resident' && myResidentApt && (
          <div className="bg-gradient-to-r from-sky-700 to-emerald-700 rounded-2xl p-5 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-sky-100">{t.myApartmentStatus}</p>
                <h2 className="text-lg sm:text-xl font-extrabold mt-0.5">
                  {myResidentApt.paid ? t.myStatusPaid : t.myStatusUnpaid}
                </h2>
              </div>
            </div>
            {myResidentApt.paid && (
              <button
                type="button"
                onClick={() => setReceiptModalApt(myResidentApt)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-bold px-4 py-3 rounded-xl text-sm shadow-xs transition-colors whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.downloadMyReceipt}</span>
              </button>
            )}
          </div>
        )}

        {/* ==========================================
            ONGLET 1 : TABLEAU DE BORD & CAISSE
        ========================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Barre d'état de transparence + Actions rapides Syndic */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.transparencyBadge}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500 font-semibold">
                  {currentUser ? t.cloudSyncedBadge : t.localDemoBadge}
                </span>
              </div>

              {role === 'syndic' && (
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('apartments')}
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition-colors truncate"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.quickCollectBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(true)}
                    className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition-colors truncate"
                  >
                    <Receipt className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.addExpenseBtn}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3 Grandes Cartes de Trésorerie Ultra-Lisibles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Solde actuel en caisse */}
              <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600">{t.currentBalance}</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div
                    data-testid="treasury-balance"
                    className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight tabular-nums"
                  >
                    {formatMoney(treasuryStats.currentBalance)}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700 tabular-nums">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {treasuryStats.paidCount}/{apartments.length} {t.paidApartmentsCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total encaissé ce mois */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600">{t.collectedMonth}</span>
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                    + {formatMoney(treasuryStats.collectedThisMonth)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAptFilter('unpaid');
                      setActiveTab('apartments');
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline tabular-nums"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {treasuryStats.unpaidCount} {t.unpaidApartmentsCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Total dépensé ce mois */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600">{t.spentMonth}</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                    - {formatMoney(treasuryStats.spentThisMonth)}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500 tabular-nums">
                    {expenses.length} {t.justifiedInvoicesSub}
                  </p>
                </div>
              </div>
            </div>

            {/* Rubrique visible : Appartements et propriétaires (reliée à Caisse & Bilan) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">{t.apartmentsTitle}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                      {t.apartmentsSubtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('apartments')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
                >
                  <span>
                    {lang === 'ar' ? 'الكل' : lang === 'en' ? 'All' : 'Tous'} ({apartments.length})
                  </span>
                  <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Formulaire d'ajout d'un appartement et propriétaire (Mode Syndic) */}
              {role === 'syndic' && (
                <form
                  onSubmit={handleAddApartment}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5"
                >
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {t.addApartmentSectionTitle}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {t.addApartmentSectionSub}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label
                        htmlFor="dash-apt-number"
                        className="block text-xs font-extrabold text-slate-700 mb-1"
                      >
                        {t.aptNumberLabel}
                      </label>
                      <input
                        id="dash-apt-number"
                        type="text"
                        required
                        value={newAptNumber}
                        onChange={(e) => setNewAptNumber(e.target.value)}
                        placeholder={t.aptNumberPlaceholder}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="dash-apt-floor"
                        className="block text-xs font-extrabold text-slate-700 mb-1"
                      >
                        {t.aptFloorLabel}
                      </label>
                      <input
                        id="dash-apt-floor"
                        type="number"
                        min="0"
                        max="100"
                        value={newAptFloor}
                        onChange={(e) => setNewAptFloor(e.target.value)}
                        placeholder={t.aptFloorPlaceholder}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-1">
                      <label
                        htmlFor="dash-apt-owner"
                        className="block text-xs font-extrabold text-slate-700 mb-1"
                      >
                        {t.aptOwnerLabel}
                      </label>
                      <input
                        id="dash-apt-owner"
                        type="text"
                        required
                        value={newAptOwner}
                        onChange={(e) => setNewAptOwner(e.target.value)}
                        placeholder={t.aptOwnerPlaceholder}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="dash-apt-phone"
                        className="block text-xs font-extrabold text-slate-700 mb-1"
                      >
                        {t.aptPhoneLabel}
                      </label>
                      <input
                        id="dash-apt-phone"
                        type="tel"
                        dir="ltr"
                        value={newAptPhone}
                        onChange={(e) => setNewAptPhone(e.target.value)}
                        placeholder={t.aptPhonePlaceholder}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="dash-apt-amount"
                        className="block text-xs font-extrabold text-slate-700 mb-1"
                      >
                        {t.aptAmountLabel}
                      </label>
                      <input
                        id="dash-apt-amount"
                        type="number"
                        required
                        min="1"
                        step="any"
                        value={newAptAmount}
                        onChange={(e) => setNewAptAmount(e.target.value)}
                        placeholder={t.aptAmountPlaceholder}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-extrabold text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition-colors"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>{t.addApartmentSubmitBtn}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Liste directe des appartements, propriétaires et cotisations liée à la caisse */}
              {apartments.length === 0 ? (
                <div className="p-6 text-center text-sm font-bold text-slate-400">
                  {t.emptyApartmentsText}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {apartments.map((apt) => {
                    const isPaid = apt.paid;
                    return (
                      <div
                        key={apt.id}
                        data-testid={`dashboard-apt-card-${apt.number}`}
                        className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 transition-colors ${
                          isPaid
                            ? 'border-emerald-500/70 bg-white'
                            : 'border-rose-500/80 bg-rose-50/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl font-black text-base flex items-center justify-center shrink-0 tabular-nums ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {apt.number}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-slate-400 block">
                                {t.apt} {apt.number} • {t.floor} {apt.floor}
                              </span>
                              <h4 className="text-sm font-extrabold text-slate-900 truncate">
                                {t.ownerPrefix} : {apt.owner[lang]}
                              </h4>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-black tabular-nums shrink-0 ${
                              isPaid ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {formatMoney(apt.amount)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-extrabold ${
                              isPaid ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{t.statusPaid}</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>{t.statusUnpaid}</span>
                              </>
                            )}
                          </span>

                          {isPaid ? (
                            <button
                              type="button"
                              onClick={() => setReceiptModalApt(apt)}
                              aria-label={`${t.receiptBtn} - ${t.apt} ${apt.number} (${apt.owner[lang]})`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors whitespace-nowrap"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{t.receiptBtn}</span>
                            </button>
                          ) : role === 'syndic' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayMethod('methodCash');
                                setPaymentModalApt(apt);
                              }}
                              aria-label={`${t.collectBtn} - ${t.apt} ${apt.number} (${apt.owner[lang]})`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors whitespace-nowrap shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span>{t.collectBtn}</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Journal transparent des dépenses avec justificatifs */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h3 className="text-lg font-extrabold text-slate-900">{t.recentExpenses}</h3>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <div className="p-8 text-center text-sm font-bold text-slate-400">
                    {t.emptyExpensesText}
                  </div>
                ) : (
                  expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          {getCategoryIcon(exp.category)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                            <span>{t[exp.category]}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{exp.date}</span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-0.5">
                            {exp.title[lang]}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{exp.vendor}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="text-lg font-extrabold text-rose-600 tabular-nums whitespace-nowrap">
                          - {formatMoney(exp.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setProofModalExpense(exp)}
                          aria-label={`${t.viewProof} - ${exp.title[lang]}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                        >
                          <Camera className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span>{t.viewProof}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section Abonnement SyndicDiali (Stripe Checkout) */}
            <PricingSection lang={lang} />
          </div>
        )}

        {/* ==========================================
            ONGLET 2 : APPARTEMENTS ET PROPRIÉTAIRES & COTISATIONS
        ========================================== */}
        {activeTab === 'apartments' && (
          <div className="space-y-5">
            {/* Formulaire d'ajout d'un appartement et d'un propriétaire */}
            {role === 'syndic' && (
              <form
                onSubmit={handleAddApartment}
                className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                      {t.addApartmentSectionTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                      {t.addApartmentSectionSub}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label
                      htmlFor="tab-apt-number"
                      className="block text-xs font-extrabold text-slate-700 mb-1"
                    >
                      {t.aptNumberLabel}
                    </label>
                    <input
                      id="tab-apt-number"
                      type="text"
                      required
                      value={newAptNumber}
                      onChange={(e) => setNewAptNumber(e.target.value)}
                      placeholder={t.aptNumberPlaceholder}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tab-apt-floor"
                      className="block text-xs font-extrabold text-slate-700 mb-1"
                    >
                      {t.aptFloorLabel}
                    </label>
                    <input
                      id="tab-apt-floor"
                      type="number"
                      min="0"
                      max="100"
                      value={newAptFloor}
                      onChange={(e) => setNewAptFloor(e.target.value)}
                      placeholder={t.aptFloorPlaceholder}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white px-3 py-2 text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-1">
                    <label
                      htmlFor="tab-apt-owner"
                      className="block text-xs font-extrabold text-slate-700 mb-1"
                    >
                      {t.aptOwnerLabel}
                    </label>
                    <input
                      id="tab-apt-owner"
                      type="text"
                      required
                      value={newAptOwner}
                      onChange={(e) => setNewAptOwner(e.target.value)}
                      placeholder={t.aptOwnerPlaceholder}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tab-apt-phone"
                      className="block text-xs font-extrabold text-slate-700 mb-1"
                    >
                      {t.aptPhoneLabel}
                    </label>
                    <input
                      id="tab-apt-phone"
                      type="tel"
                      dir="ltr"
                      value={newAptPhone}
                      onChange={(e) => setNewAptPhone(e.target.value)}
                      placeholder={t.aptPhonePlaceholder}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white px-3 py-2 text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tab-apt-amount"
                      className="block text-xs font-extrabold text-slate-700 mb-1"
                    >
                      {t.aptAmountLabel}
                    </label>
                    <input
                      id="tab-apt-amount"
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={newAptAmount}
                      onChange={(e) => setNewAptAmount(e.target.value)}
                      placeholder={t.aptAmountPlaceholder}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white px-3 py-2 text-sm font-extrabold text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>{t.addApartmentSubmitBtn}</span>
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{t.apartmentsTitle}</h2>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">
                    {t.apartmentsSubtitle}
                  </p>
                </div>

                {/* Filtres rapides Vert / Rouge */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setAptFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      aptFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'ar' ? 'الكل' : lang === 'en' ? 'All' : 'Tous'} ({apartments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAptFilter('paid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      aptFilter === 'paid'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {t.filterPaid} ({treasuryStats.paidCount})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAptFilter('unpaid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      aptFilter === 'unpaid'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {t.filterUnpaid} ({treasuryStats.unpaidCount})
                    </span>
                  </button>
                </div>
              </div>

              {/* Barre de recherche rapide */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                <input
                  type="search"
                  value={aptSearch}
                  onChange={(e) => setAptSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  aria-label={t.searchPlaceholder}
                  className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>

            {/* Grille visuelle des appartements */}
            {filteredApartments.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm font-bold text-slate-400">
                {t.emptyApartmentsText}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredApartments.map((apt) => {
                  const isPaid = apt.paid;
                  return (
                    <div
                      key={apt.id}
                      data-testid={`apartment-card-${apt.number}`}
                      className={`rounded-2xl bg-white p-5 border-2 transition-colors flex flex-col justify-between ${
                        isPaid
                          ? 'border-emerald-500/70 hover:border-emerald-600'
                          : 'border-rose-500/80 hover:border-rose-600 bg-rose-50/20'
                      }`}
                    >
                      <div>
                        {/* En-tête de la carte : Numéro Appt + Propriétaire + Statut */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-11 h-11 rounded-xl font-black text-lg flex items-center justify-center shrink-0 tabular-nums ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {apt.number}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-400">
                                {t.apt} {apt.number} • {t.floor} {apt.floor}
                              </span>
                              <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                                {apt.owner[lang]}
                              </h3>
                            </div>
                          </div>

                          {/* Indicateur Vert ou Rouge */}
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-extrabold shrink-0 ${
                              isPaid ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{t.statusPaid}</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{t.statusUnpaid}</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Montant payé ou Montant en retard */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">
                            {isPaid ? t.receiptPeriodVal : t.dueAmount}
                          </span>
                          <span
                            className={`text-lg font-black tabular-nums ${
                              isPaid ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {formatMoney(apt.amount)}
                          </span>
                        </div>
                      </div>

                      {/* Boutons d'action selon le rôle */}
                      <div className="mt-4 pt-2 flex flex-col gap-2">
                        {isPaid ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setReceiptModalApt(apt)}
                              aria-label={`${t.receiptBtn} - ${t.apt} ${apt.number}`}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors whitespace-nowrap"
                            >
                              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{t.receiptBtn}</span>
                            </button>
                            {role === 'syndic' && (
                              <button
                                type="button"
                                onClick={() => openWhatsApp(apt, true)}
                                aria-label={`${t.whatsappSendReceipt} - ${t.apt} ${apt.number}`}
                                className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors whitespace-nowrap shrink-0"
                                title={t.whatsappSendReceipt}
                              >
                                <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>WhatsApp</span>
                              </button>
                            )}
                          </div>
                        ) : role === 'syndic' ? (
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayMethod('methodCash');
                                setPaymentModalApt(apt);
                              }}
                              aria-label={`${t.collectBtn} - ${t.apt} ${apt.number}`}
                              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-xs transition-colors whitespace-nowrap"
                            >
                              <Check className="w-4 h-4 shrink-0" />
                              <span>{t.collectBtn}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openWhatsApp(apt, false)}
                              aria-label={`${t.whatsappRemind} - ${t.apt} ${apt.number}`}
                              className="w-full flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold py-2 px-3 rounded-xl text-xs transition-colors whitespace-nowrap"
                            >
                              <MessageCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>{t.whatsappRemind}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-center py-2 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl">
                            {t.statusUnpaid}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            ONGLET 3 : PANNES & CONTACTS D'URGENCE
        ========================================== */}
        {activeTab === 'incidents' && (
          <div className="space-y-6">
            {/* En-tête + Gros bouton Signaler une panne */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{t.incidentsTitle}</h2>
                <p className="text-sm text-slate-500 font-medium mt-0.5">{t.incidentsSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIncidentModal(true)}
                className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-5 py-3 rounded-xl text-sm shadow-xs transition-colors whitespace-nowrap shrink-0"
              >
                <Wrench className="w-4 h-4 shrink-0" />
                <span>{t.reportIncidentBtn}</span>
              </button>
            </div>

            {/* Liste des pannes avec code couleur */}
            {incidents.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm font-bold text-slate-400">
                {t.emptyIncidentsText}
              </div>
            ) : (
              <div className="space-y-4">
                {incidents.map((inc) => {
                  const isReported = inc.status === 'reported';
                  const isInProgress = inc.status === 'in_progress';
                  const isFixed = inc.status === 'fixed';

                  return (
                    <div
                      key={inc.id}
                      className={`bg-white rounded-2xl p-5 border-2 transition-colors ${
                        isReported
                          ? 'border-rose-500/80'
                          : isInProgress
                          ? 'border-amber-500/80'
                          : 'border-emerald-500/70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                              isReported
                                ? 'bg-rose-100 text-rose-700'
                                : isInProgress
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isReported ? (
                              <AlertCircle className="w-6 h-6" />
                            ) : isInProgress ? (
                              <Clock className="w-6 h-6" />
                            ) : (
                              <CheckCircle2 className="w-6 h-6" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
                              <span
                                className={
                                  isReported
                                    ? 'text-rose-700'
                                    : isInProgress
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                                }
                              >
                                {isReported
                                  ? t.statusReported
                                  : isInProgress
                                  ? t.statusInProgress
                                  : t.statusFixed}
                              </span>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="text-slate-400 font-bold tabular-nums">{inc.date}</span>
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                              {inc.location[lang]}
                            </h3>
                            <p className="text-sm text-slate-600 font-medium mt-1">
                              {inc.description[lang]}
                            </p>
                            <p className="text-xs text-slate-400 font-bold mt-2">
                              {t.reportedBy} : {inc.reporter}
                            </p>
                          </div>
                        </div>

                        {/* Bouton Syndic pour faire avancer l'état du ticket en 1 clic */}
                        {role === 'syndic' && !isFixed && (
                          <button
                            type="button"
                            onClick={() => advanceIncidentStatus(inc.id)}
                            aria-label={`${t.advanceStatusBtn} - ${inc.location[lang]}`}
                            className="self-start sm:self-center shrink-0 flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-colors whitespace-nowrap"
                          >
                            <span>{t.advanceStatusBtn}</span>
                            <ChevronRight className={`w-4 h-4 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Carnet de numéros d'urgence personnalisables par le syndic */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{t.emergencyTitle}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    {t.emergencySubtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddEmergencyContact}
                  className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>{t.addContactBtn}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {emergencyContacts.map((contact, idx) => {
                  const style = CONTACT_STYLES[idx % CONTACT_STYLES.length];
                  const Icon = style.icon;
                  const telHref = formatEmergencyTelHref(contact.phone);
                  const hasPhone = telHref !== '#';

                  return (
                    <div
                      key={contact.id}
                      data-testid={`emergency-contact-card-${idx}`}
                      className="p-4 rounded-2xl border border-slate-200 flex flex-col gap-3 bg-slate-50/60"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${style.color}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 space-y-2 min-w-0">
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(e) =>
                              handleUpdateEmergencyContact(contact.id, 'name', e.target.value)
                            }
                            placeholder={t.contactNamePlaceholder}
                            aria-label={`${t.contactNameLabel} ${idx + 1}`}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-extrabold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-emerald-600 transition-colors"
                          />
                          <input
                            type="text"
                            value={contact.role}
                            onChange={(e) =>
                              handleUpdateEmergencyContact(contact.id, 'role', e.target.value)
                            }
                            placeholder={t.contactRolePlaceholder}
                            aria-label={`${t.contactRoleLabel} ${idx + 1}`}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
                          />
                          <input
                            type="tel"
                            dir="ltr"
                            value={contact.phone}
                            onChange={(e) =>
                              handleUpdateEmergencyContact(contact.id, 'phone', e.target.value)
                            }
                            placeholder={t.contactPhonePlaceholder}
                            aria-label={`${t.contactPhoneLabel} ${idx + 1}`}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-800 tabular-nums placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-emerald-600 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                        <button
                          type="button"
                          onClick={() => handleDeleteEmergencyContact(contact.id)}
                          aria-label={`${t.deleteContactBtn} ${idx + 1}`}
                          title={t.deleteContactBtn}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <a
                          href={telHref}
                          onClick={(e) => {
                            if (!hasPhone) e.preventDefault();
                          }}
                          aria-label={
                            contact.name.trim()
                              ? `${t.callNowBtn} ${contact.name.trim()}`
                              : `${t.callNowBtn} ${idx + 1}`
                          }
                          className={`flex items-center gap-1.5 font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs transition-colors whitespace-nowrap shrink-0 ${
                            hasPhone
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-emerald-600/50 text-white/90 cursor-not-allowed'
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.callNowBtn}</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            ONGLET 4 : ANNONCES & VOTES RAPIDES (DEVIS)
        ========================================== */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            {/* Section Tableau d'affichage */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Megaphone className="w-6 h-6 text-emerald-600 shrink-0" />
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {t.announcementsTitle}
                  </h2>
                </div>
                {role === 'syndic' && (
                  <button
                    type="button"
                    onClick={() => setShowAnnoModal(true)}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>{t.newAnnouncementBtn}</span>
                  </button>
                )}
              </div>

              {announcements.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm font-bold text-slate-400">
                  {t.emptyAnnouncementsText}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {announcements.map((anno) => (
                    <div
                      key={anno.id}
                      className={`rounded-2xl p-5 border-2 bg-white ${
                        anno.urgent ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                        <span className="tabular-nums">{anno.date}</span>
                        <span className="text-slate-600">Syndic</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                        {anno.title[lang]}
                      </h3>
                      <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                        {anno.body[lang]}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section Votes Rapides Pour/Contre (AG digitale) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2.5">
                <Vote className="w-6 h-6 text-sky-600 shrink-0" />
                <h3 className="text-lg font-extrabold text-slate-900">{t.pollsSectionTitle}</h3>
              </div>

              {polls.length === 0 ? (
                <div className="p-6 text-center text-sm font-bold text-slate-400">
                  {t.emptyAnnouncementsText}
                </div>
              ) : (
                <div className="space-y-4">
                  {polls.map((poll) => {
                    const total = poll.yesVotes + poll.noVotes;
                    const yesPercent = total > 0 ? Math.round((poll.yesVotes / total) * 100) : 0;
                    const noPercent = 100 - yesPercent;

                    return (
                      <div
                        key={poll.id}
                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="text-base font-extrabold text-slate-900 max-w-xl">
                            {poll.title[lang]}
                          </h4>
                          <span className="text-amber-800 font-black text-xs sm:text-sm tabular-nums">
                            {t.quotePrefix} : {poll.cost}
                          </span>
                        </div>

                        {/* Barre de progression visuelle Vert / Rouge */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-extrabold tabular-nums">
                            <span className="text-emerald-700">
                              {t.voteYes} : {poll.yesVotes} ({yesPercent}%)
                            </span>
                            <span className="text-rose-700">
                              {t.voteNo} : {poll.noVotes} ({noPercent}%)
                            </span>
                          </div>
                          <div className="w-full h-3.5 bg-rose-200 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${yesPercent}%` }}
                              className="bg-emerald-500 h-full transition-opacity duration-200"
                            />
                          </div>
                          <p className="text-xs text-slate-500 font-semibold tabular-nums">
                            {total} {t.totalVotes}
                          </p>
                        </div>

                        {/* Boutons de vote en 1 clic */}
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => handleVote(poll.id, 'yes')}
                            aria-label={`${t.voteYes} - ${poll.title[lang]}`}
                            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-colors whitespace-nowrap ${
                              poll.userVote === 'yes'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            <Check className="w-4 h-4 shrink-0" />
                            <span>{t.voteYes}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVote(poll.id, 'no')}
                            aria-label={`${t.voteNo} - ${poll.title[lang]}`}
                            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-colors whitespace-nowrap ${
                              poll.userVote === 'no'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-white border-2 border-rose-500 text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            <X className="w-4 h-4 shrink-0" />
                            <span>{t.voteNo}</span>
                          </button>
                          {poll.userVote && (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>{t.votedBadge}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ==========================================
          BARRE DE NAVIGATION MOBILE (4 BOUTONS EN BAS)
      ========================================== */}
      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-lg"
      >
        <div className="grid grid-cols-4 gap-1 p-1.5">
          {[
            { id: 'dashboard' as ActiveTab, label: t.navDashboard, icon: Wallet },
            { id: 'apartments' as ActiveTab, label: t.navApartments, icon: Building2 },
            { id: 'incidents' as ActiveTab, label: t.navIncidents, icon: Wrench },
            { id: 'announcements' as ActiveTab, label: t.navAnnouncements, icon: Megaphone }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                    : 'text-slate-600 font-bold hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5 mb-1 shrink-0" />
                <span className="text-[10px] leading-tight text-center truncate w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ==========================================
          MODALES INTERACTIVES
      ========================================== */}
      <PaymentModal
        apt={paymentModalApt}
        lang={lang}
        t={t}
        selectedPayMethod={selectedPayMethod}
        setSelectedPayMethod={setSelectedPayMethod}
        onConfirm={handleConfirmPayment}
        onClose={() => setPaymentModalApt(null)}
        formatMoney={formatMoney}
      />

      <ReceiptModal
        apt={receiptModalApt}
        lang={lang}
        t={t}
        onClose={() => setReceiptModalApt(null)}
        onOpenWhatsApp={openWhatsApp}
        formatMoney={formatMoney}
      />

      <ExpenseModal
        isOpen={showExpenseModal}
        lang={lang}
        t={t}
        newExpenseTitle={newExpenseTitle}
        setNewExpenseTitle={setNewExpenseTitle}
        newExpenseVendor={newExpenseVendor}
        setNewExpenseVendor={setNewExpenseVendor}
        newExpenseDate={newExpenseDate}
        setNewExpenseDate={setNewExpenseDate}
        newExpenseAmount={newExpenseAmount}
        setNewExpenseAmount={setNewExpenseAmount}
        newExpenseCategory={newExpenseCategory}
        setNewExpenseCategory={setNewExpenseCategory}
        onSubmit={handleAddExpense}
        onClose={() => setShowExpenseModal(false)}
      />

      <IncidentModal
        isOpen={showIncidentModal}
        lang={lang}
        t={t}
        newIncidentLoc={newIncidentLoc}
        setNewIncidentLoc={setNewIncidentLoc}
        newIncidentDesc={newIncidentDesc}
        setNewIncidentDesc={setNewIncidentDesc}
        onSubmit={handleAddIncident}
        onClose={() => setShowIncidentModal(false)}
      />

      <AnnouncementModal
        isOpen={showAnnoModal}
        lang={lang}
        t={t}
        newAnnoTitle={newAnnoTitle}
        setNewAnnoTitle={setNewAnnoTitle}
        newAnnoBody={newAnnoBody}
        setNewAnnoBody={setNewAnnoBody}
        onSubmit={handleAddAnnouncement}
        onClose={() => setShowAnnoModal(false)}
      />

      <ProofModal
        expense={proofModalExpense}
        lang={lang}
        t={t}
        onClose={() => setProofModalExpense(null)}
        formatMoney={formatMoney}
      />

      <WhatsAppPreviewModal
        data={whatsAppModalData}
        lang={lang}
        t={t}
        onClose={() => setWhatsAppModalData(null)}
      />

      <ResetConfirmModal
        isOpen={showResetModal}
        t={t}
        isResetting={isResetting}
        onConfirmReset={handleConfirmReset}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
}
