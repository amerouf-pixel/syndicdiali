import { Apartment, Expense, Incident, Announcement, Poll } from '../types';

export const INITIAL_RESERVE = 14500;

export const INITIAL_APARTMENTS: Apartment[] = [
  { id: 1, number: '1', floor: 1, owner: { fr: 'M. Karim Bennani', ar: 'السيد كريم بناني', en: 'Mr. Karim Bennani' }, phone: '+212600112233', paid: true, amount: 250, method: 'methodTransfer', paidDate: '02/10/2026', receiptNo: 'SYN-2026-001' },
  { id: 2, number: '2', floor: 1, owner: { fr: 'Mme. Fatima Zahra Alami', ar: 'السيدة فاطمة الزهراء العلمي', en: 'Mrs. Fatima Zahra Alami' }, phone: '+212600112234', paid: true, amount: 250, method: 'methodCash', paidDate: '03/10/2026', receiptNo: 'SYN-2026-002' },
  { id: 3, number: '3', floor: 1, owner: { fr: 'M. Youssef Tazi', ar: 'السيد يوسف التازي', en: 'Mr. Youssef Tazi' }, phone: '+212600112235', paid: false, amount: 250, method: null, paidDate: null, receiptNo: null },
  { id: 4, number: '4', floor: 1, owner: { fr: 'M. Mehdi Chraibi (Vous)', ar: 'السيد مهدي الشرايبي (أنت)', en: 'Mr. Mehdi Chraibi (You)' }, phone: '+212600112236', paid: true, amount: 250, method: 'methodTransfer', paidDate: '05/10/2026', receiptNo: 'SYN-2026-004' },
  { id: 5, number: '5', floor: 2, owner: { fr: 'Dr. Nadia Berrada', ar: 'الدكتورة نادية برادة', en: 'Dr. Nadia Berrada' }, phone: '+212600112237', paid: true, amount: 250, method: 'methodCheck', paidDate: '05/10/2026', receiptNo: 'SYN-2026-005' },
  { id: 6, number: '6', floor: 2, owner: { fr: 'M. Hassan El Fassi', ar: 'السيد حسن الفاسي', en: 'Mr. Hassan El Fassi' }, phone: '+212600112238', paid: false, amount: 500, method: null, paidDate: null, receiptNo: null },
  { id: 7, number: '7', floor: 2, owner: { fr: 'Mme. Salma Idrissi', ar: 'السيدة سلمى الإدريسي', en: 'Mrs. Salma Idrissi' }, phone: '+212600112239', paid: true, amount: 250, method: 'methodCash', paidDate: '06/10/2026', receiptNo: 'SYN-2026-007' },
  { id: 8, number: '8', floor: 2, owner: { fr: 'M. Omar Kettani', ar: 'السيد عمر الكتاني', en: 'Mr. Omar Kettani' }, phone: '+212600112240', paid: true, amount: 250, method: 'methodTransfer', paidDate: '07/10/2026', receiptNo: 'SYN-2026-008' },
  { id: 9, number: '9', floor: 3, owner: { fr: 'M. Rachid Mansouri', ar: 'السيد رشيد المنصوري', en: 'Mr. Rachid Mansouri' }, phone: '+212600112241', paid: false, amount: 250, method: null, paidDate: null, receiptNo: null },
  { id: 10, number: '10', floor: 3, owner: { fr: 'Mme. Leila Tahiri', ar: 'السيدة ليلى الطاهري', en: 'Mrs. Leila Tahiri' }, phone: '+212600112242', paid: true, amount: 250, method: 'methodCash', paidDate: '08/10/2026', receiptNo: 'SYN-2026-010' },
  { id: 11, number: '11', floor: 3, owner: { fr: 'M. Amine Lahlou', ar: 'السيد أمين لحلو', en: 'Mr. Amine Lahlou' }, phone: '+212600112243', paid: true, amount: 250, method: 'methodTransfer', paidDate: '09/10/2026', receiptNo: 'SYN-2026-011' },
  { id: 12, number: '12', floor: 3, owner: { fr: 'Mme. Kenza Skalli', ar: 'السيدة كنزة الصقلي', en: 'Mrs. Kenza Skalli' }, phone: '+212600112244', paid: false, amount: 250, method: null, paidDate: null, receiptNo: null }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 101,
    category: 'catSecurity',
    date: '05/10/2026',
    amount: 1200,
    vendor: 'Gardiennage Atlas / M. Brahim',
    title: {
      fr: 'Salaire Gardien & Sécurité de nuit (Octobre)',
      ar: 'راتب الحارس والأمن الليلي (أكتوبر)',
      en: 'Doorman & Night Security Salary (October)'
    }
  },
  {
    id: 102,
    category: 'catCleaning',
    date: '07/10/2026',
    amount: 600,
    vendor: 'Nettoyage Pro Casa',
    title: {
      fr: 'Ménage escaliers, hall et produits détergents',
      ar: 'تنظيف الدرج والمدخل ومواد النظافة',
      en: 'Stairwell & lobby cleaning + supplies'
    }
  },
  {
    id: 103,
    category: 'catElevator',
    date: '10/10/2026',
    amount: 450,
    vendor: 'Otis / Ascenseurs Maroc',
    title: {
      fr: 'Contrat maintenance mensuel de l’ascenseur',
      ar: 'عقد الصيانة الشهري للمصعد الكهربائي',
      en: 'Monthly elevator maintenance contract'
    }
  },
  {
    id: 104,
    category: 'catUtilities',
    date: '12/10/2026',
    amount: 380,
    vendor: 'SRM / Lydec',
    title: {
      fr: 'Facture électricité minuterie & eau garage',
      ar: 'فاتورة كهرباء الدرج وماء المرآب المشترك',
      en: 'Common area electricity & garage water bill'
    }
  }
];

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 201,
    status: 'reported',
    date: '18/10/2026',
    reporter: 'Appt 6 (M. El Fassi)',
    location: {
      fr: 'Sous-sol / Porte du Garage',
      ar: 'المرآب السفلي / باب الكراج',
      en: 'Basement / Garage Gate'
    },
    description: {
      fr: 'Le moteur de la porte télécommandée du garage grince et se bloque à mi-chemin.',
      ar: 'محرك باب المرآب الأوتوماتيكي يصدر صوتاً ويتوقف في المنتصف.',
      en: 'The remote garage door motor screeches and stops halfway.'
    }
  },
  {
    id: 202,
    status: 'in_progress',
    date: '15/10/2026',
    reporter: 'Appt 2 (Mme. Alami)',
    location: {
      fr: 'Couloir 2ème étage',
      ar: 'ممر الطابق الثاني',
      en: '2nd Floor Hallway'
    },
    description: {
      fr: 'Détecteur de mouvement de la lumière en panne (l’électricien passe demain à 10h).',
      ar: 'حساس الإنارة الأوتوماتيكي معطل (المعلم الكهربائي سيحضر غداً على الساعة 10).',
      en: 'Motion sensor light broken (Electrician scheduled tomorrow at 10 AM).'
    }
  },
  {
    id: 203,
    status: 'fixed',
    date: '09/10/2026',
    reporter: 'Appt 10 (Mme. Tahiri)',
    location: {
      fr: 'Ascenseur Principal',
      ar: 'المصعد الرئيسي',
      en: 'Main Elevator'
    },
    description: {
      fr: 'Bouton du 3ème étage remplacé et testé avec succès.',
      ar: 'تم تغيير زر الطابق الثالث وتجربته بنجاح.',
      en: '3rd floor button replaced and tested successfully.'
    }
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 301,
    urgent: true,
    date: '18/10/2026',
    title: {
      fr: '💧 Coupure d’eau programmée jeudi de 10h à 13h',
      ar: '💧 انقطاع مبرمج للماء يوم الخميس من 10 صباحاً إلى 1 ظهراً',
      en: '💧 Scheduled Water Shutoff Thursday 10 AM - 1 PM'
    },
    body: {
      fr: 'Nettoyage annuel et désinfection de la bâche à eau de la résidence. Merci de prendre vos précautions.',
      ar: 'سيتم تنظيف وتعقيم خزان المياه الرئيسي للإقامة. المرجو أخذ احتياطاتكم.',
      en: 'Annual cleaning and disinfection of the building water tank. Please plan accordingly.'
    }
  },
  {
    id: 302,
    urgent: false,
    date: '14/10/2026',
    title: {
      fr: '🚗 Stationnement dans le parking sous-sol',
      ar: '🚗 تنظيم ركن السيارات في المرآب السفلي',
      en: '🚗 Underground Parking Etiquette'
    },
    body: {
      fr: 'Merci de bien respecter le marquage jaune de votre place attribuée pour faciliter la manœuvre de vos voisins.',
      ar: 'نرجو من جميع السكان احترام الخطوط الصفراء المحددة لكل شقة لتسهيل حركة الجيران.',
      en: 'Please park strictly within your yellow-marked bay to allow easy access for neighbors.'
    }
  }
];

export const INITIAL_POLLS: Poll[] = [
  {
    id: 401,
    yesVotes: 8,
    noVotes: 2,
    userVote: null,
    cost: '3 500 MAD',
    title: {
      fr: 'Installation de 4 caméras HD supplémentaires à l’entrée et au parking',
      ar: 'تركيب 4 كاميرات مراقبة إضافية عالية الدقة في المدخل والمرآب',
      en: 'Install 4 additional HD security cameras at entrance and garage'
    }
  },
  {
    id: 402,
    yesVotes: 9,
    noVotes: 1,
    userVote: 'yes',
    cost: '2 800 MAD',
    title: {
      fr: 'Peinture rafraîchissement du hall d’entrée (Devis Peintre M. Aziz)',
      ar: 'صباغة وتجديد بهو مدخل العمارة (عرض ثمن المعلم عزيز)',
      en: 'Repainting and refreshing the main entrance lobby'
    }
  }
];
