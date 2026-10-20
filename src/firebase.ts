import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  Apartment,
  Announcement,
  Expense,
  Incident,
  IncidentStatus,
  PaymentMethod,
  Poll
} from './types';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_APARTMENTS,
  INITIAL_EXPENSES,
  INITIAL_INCIDENTS,
  INITIAL_POLLS
} from './data/initialData';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Local phone lookup so no PII phone numbers are stored in shared Firestore documents
const DEFAULT_PHONE_BY_APT: Record<number, string> = Object.fromEntries(
  INITIAL_APARTMENTS.map((a) => [a.id, a.phone])
);

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logOutFirebase(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { User };

// Seed initial building data into Firestore for the authenticated user
export async function seedUserResidenceData(uid: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    for (const apt of INITIAL_APARTMENTS) {
      const docId = `${uid}_apt_${apt.id}`;
      batch.set(doc(db, 'apartments', docId), {
        ownerUid: uid,
        aptId: apt.id,
        number: apt.number.slice(0, 16),
        floor: apt.floor,
        residentNameFr: apt.owner.fr.slice(0, 120),
        residentNameAr: apt.owner.ar.slice(0, 120),
        residentNameEn: apt.owner.en.slice(0, 120),
        paid: apt.paid,
        amount: apt.amount,
        method: apt.method || 'none',
        paidDate: (apt.paidDate || '').slice(0, 32),
        receiptNo: (apt.receiptNo || '').slice(0, 32),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    for (const exp of INITIAL_EXPENSES) {
      const docId = `${uid}_exp_${exp.id}`;
      batch.set(doc(db, 'expenses', docId), {
        ownerUid: uid,
        category: exp.category,
        date: exp.date.slice(0, 32),
        amount: exp.amount,
        vendor: exp.vendor.slice(0, 120),
        titleFr: exp.title.fr.slice(0, 200),
        titleAr: exp.title.ar.slice(0, 200),
        titleEn: exp.title.en.slice(0, 200),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    for (const inc of INITIAL_INCIDENTS) {
      const docId = `${uid}_inc_${inc.id}`;
      batch.set(doc(db, 'incidents', docId), {
        ownerUid: uid,
        status: inc.status,
        date: inc.date.slice(0, 32),
        reporter: inc.reporter.slice(0, 100),
        locationFr: inc.location.fr.slice(0, 150),
        locationAr: inc.location.ar.slice(0, 150),
        locationEn: inc.location.en.slice(0, 150),
        descriptionFr: inc.description.fr.slice(0, 500),
        descriptionAr: inc.description.ar.slice(0, 500),
        descriptionEn: inc.description.en.slice(0, 500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    for (const anno of INITIAL_ANNOUNCEMENTS) {
      const docId = `${uid}_anno_${anno.id}`;
      batch.set(doc(db, 'announcements', docId), {
        ownerUid: uid,
        urgent: anno.urgent,
        date: anno.date.slice(0, 32),
        titleFr: anno.title.fr.slice(0, 200),
        titleAr: anno.title.ar.slice(0, 200),
        titleEn: anno.title.en.slice(0, 200),
        bodyFr: anno.body.fr.slice(0, 1000),
        bodyAr: anno.body.ar.slice(0, 1000),
        bodyEn: anno.body.en.slice(0, 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    for (const poll of INITIAL_POLLS) {
      const docId = `${uid}_poll_${poll.id}`;
      batch.set(doc(db, 'polls', docId), {
        ownerUid: uid,
        yesVotes: poll.yesVotes,
        noVotes: poll.noVotes,
        userVote: poll.userVote || 'none',
        cost: poll.cost.slice(0, 50),
        titleFr: poll.title.fr.slice(0, 250),
        titleAr: poll.title.ar.slice(0, 250),
        titleEn: poll.title.en.slice(0, 250),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch_seed_residence');
  }
}

export async function createApartmentInFirestore(
  uid: string,
  apt: Apartment
): Promise<void> {
  const docId = `${uid}_apt_${apt.id}`;
  DEFAULT_PHONE_BY_APT[apt.id] = apt.phone;
  try {
    await setDoc(doc(db, 'apartments', docId), {
      ownerUid: uid,
      aptId: apt.id,
      number: apt.number.slice(0, 16),
      floor: apt.floor,
      residentNameFr: apt.owner.fr.slice(0, 120),
      residentNameAr: apt.owner.ar.slice(0, 120),
      residentNameEn: apt.owner.en.slice(0, 120),
      paid: apt.paid,
      amount: apt.amount,
      method: apt.method || 'none',
      paidDate: (apt.paidDate || '').slice(0, 32),
      receiptNo: (apt.receiptNo || '').slice(0, 32),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `apartments/${docId}`);
  }
}

export async function updateApartmentPaymentInFirestore(
  uid: string,
  aptId: number,
  method: PaymentMethod,
  paidDate: string,
  receiptNo: string,
  amount = 250
): Promise<void> {
  const docPath = `apartments/${uid}_apt_${aptId}`;
  try {
    await updateDoc(doc(db, 'apartments', `${uid}_apt_${aptId}`), {
      paid: true,
      amount: amount > 0 ? amount : 250,
      method,
      paidDate: paidDate.slice(0, 32),
      receiptNo: receiptNo.slice(0, 32),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function createExpenseInFirestore(
  uid: string,
  exp: Expense
): Promise<void> {
  const docId = `${uid}_exp_${exp.id}`;
  try {
    await setDoc(doc(db, 'expenses', docId), {
      ownerUid: uid,
      category: exp.category,
      date: exp.date.slice(0, 32),
      amount: exp.amount,
      vendor: exp.vendor.slice(0, 120),
      titleFr: exp.title.fr.slice(0, 200),
      titleAr: exp.title.ar.slice(0, 200),
      titleEn: exp.title.en.slice(0, 200),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `expenses/${docId}`);
  }
}

export async function createIncidentInFirestore(
  uid: string,
  inc: Incident
): Promise<void> {
  const docId = `${uid}_inc_${inc.id}`;
  try {
    await setDoc(doc(db, 'incidents', docId), {
      ownerUid: uid,
      status: inc.status,
      date: inc.date.slice(0, 32),
      reporter: inc.reporter.slice(0, 100),
      locationFr: inc.location.fr.slice(0, 150),
      locationAr: inc.location.ar.slice(0, 150),
      locationEn: inc.location.en.slice(0, 150),
      descriptionFr: inc.description.fr.slice(0, 500),
      descriptionAr: inc.description.ar.slice(0, 500),
      descriptionEn: inc.description.en.slice(0, 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `incidents/${docId}`);
  }
}

export async function updateIncidentStatusInFirestore(
  uid: string,
  incId: number,
  status: IncidentStatus
): Promise<void> {
  const docId = `${uid}_inc_${incId}`;
  try {
    await updateDoc(doc(db, 'incidents', docId), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `incidents/${docId}`);
  }
}

export async function createAnnouncementInFirestore(
  uid: string,
  anno: Announcement
): Promise<void> {
  const docId = `${uid}_anno_${anno.id}`;
  try {
    await setDoc(doc(db, 'announcements', docId), {
      ownerUid: uid,
      urgent: anno.urgent,
      date: anno.date.slice(0, 32),
      titleFr: anno.title.fr.slice(0, 200),
      titleAr: anno.title.ar.slice(0, 200),
      titleEn: anno.title.en.slice(0, 200),
      bodyFr: anno.body.fr.slice(0, 1000),
      bodyAr: anno.body.ar.slice(0, 1000),
      bodyEn: anno.body.en.slice(0, 1000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `announcements/${docId}`);
  }
}

export async function updatePollVoteInFirestore(
  uid: string,
  poll: Poll
): Promise<void> {
  const docId = `${uid}_poll_${poll.id}`;
  try {
    await updateDoc(doc(db, 'polls', docId), {
      yesVotes: poll.yesVotes,
      noVotes: poll.noVotes,
      userVote: poll.userVote || 'none',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `polls/${docId}`);
  }
}

export async function deleteAllUserResidenceDataInFirestore(
  uid: string
): Promise<void> {
  const collectionsToDelete = [
    'apartments',
    'expenses',
    'incidents',
    'announcements',
    'polls'
  ] as const;

  try {
    const batch = writeBatch(db);
    for (const colName of collectionsToDelete) {
      const snap = await getDocs(
        query(collection(db, colName), where('ownerUid', '==', uid))
      );
      snap.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'reset_user_residence_data');
  }
}

export function subscribeToResidenceData(
  uid: string,
  callbacks: {
    onApartments: (apts: Apartment[], isEmpty: boolean) => void;
    onExpenses: (exps: Expense[]) => void;
    onIncidents: (incs: Incident[]) => void;
    onAnnouncements: (annos: Announcement[]) => void;
    onPolls: (polls: Poll[]) => void;
  }
): () => void {
  const unsubApts = onSnapshot(
    query(collection(db, 'apartments'), where('ownerUid', '==', uid)),
    (snap) => {
      if (snap.empty) {
        callbacks.onApartments([], true);
        return;
      }
      const list: Apartment[] = snap.docs
        .map((d) => {
          const data = d.data();
          const id = Number(data.aptId) || 1;
          return {
            id,
            number: String(data.number || id),
            floor: Number(data.floor) || 1,
            owner: {
              fr: String(data.residentNameFr || ''),
              ar: String(data.residentNameAr || ''),
              en: String(data.residentNameEn || '')
            },
            phone: DEFAULT_PHONE_BY_APT[id] || '+212600112233',
            paid: Boolean(data.paid),
            amount: Number(data.amount) || 250,
            method: data.method === 'none' ? null : (data.method as PaymentMethod),
            paidDate: data.paidDate || null,
            receiptNo: data.receiptNo || null
          };
        })
        .sort((a, b) => a.id - b.id);
      callbacks.onApartments(list, false);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'apartments')
  );

  const unsubExps = onSnapshot(
    query(collection(db, 'expenses'), where('ownerUid', '==', uid)),
    (snap) => {
      if (snap.empty) {
        callbacks.onExpenses([]);
        return;
      }
      const list: Expense[] = snap.docs
        .map((d) => {
          const data = d.data();
          const rawId = d.id.split('_exp_')[1];
          return {
            id: Number(rawId) || Date.now(),
            category: data.category,
            date: String(data.date || ''),
            amount: Number(data.amount) || 0,
            vendor: String(data.vendor || ''),
            title: {
              fr: String(data.titleFr || ''),
              ar: String(data.titleAr || ''),
              en: String(data.titleEn || '')
            }
          };
        })
        .sort((a, b) => b.id - a.id);
      callbacks.onExpenses(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'expenses')
  );

  const unsubIncs = onSnapshot(
    query(collection(db, 'incidents'), where('ownerUid', '==', uid)),
    (snap) => {
      if (snap.empty) {
        callbacks.onIncidents([]);
        return;
      }
      const list: Incident[] = snap.docs
        .map((d) => {
          const data = d.data();
          const rawId = d.id.split('_inc_')[1];
          return {
            id: Number(rawId) || Date.now(),
            status: data.status as IncidentStatus,
            date: String(data.date || ''),
            reporter: String(data.reporter || ''),
            location: {
              fr: String(data.locationFr || ''),
              ar: String(data.locationAr || ''),
              en: String(data.locationEn || '')
            },
            description: {
              fr: String(data.descriptionFr || ''),
              ar: String(data.descriptionAr || ''),
              en: String(data.descriptionEn || '')
            }
          };
        })
        .sort((a, b) => b.id - a.id);
      callbacks.onIncidents(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'incidents')
  );

  const unsubAnnos = onSnapshot(
    query(collection(db, 'announcements'), where('ownerUid', '==', uid)),
    (snap) => {
      if (snap.empty) {
        callbacks.onAnnouncements([]);
        return;
      }
      const list: Announcement[] = snap.docs
        .map((d) => {
          const data = d.data();
          const rawId = d.id.split('_anno_')[1];
          return {
            id: Number(rawId) || Date.now(),
            urgent: Boolean(data.urgent),
            date: String(data.date || ''),
            title: {
              fr: String(data.titleFr || ''),
              ar: String(data.titleAr || ''),
              en: String(data.titleEn || '')
            },
            body: {
              fr: String(data.bodyFr || ''),
              ar: String(data.bodyAr || ''),
              en: String(data.bodyEn || '')
            }
          };
        })
        .sort((a, b) => b.id - a.id);
      callbacks.onAnnouncements(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'announcements')
  );

  const unsubPolls = onSnapshot(
    query(collection(db, 'polls'), where('ownerUid', '==', uid)),
    (snap) => {
      if (snap.empty) {
        callbacks.onPolls([]);
        return;
      }
      const list: Poll[] = snap.docs
        .map((d) => {
          const data = d.data();
          const rawId = d.id.split('_poll_')[1];
          return {
            id: Number(rawId) || Date.now(),
            yesVotes: Number(data.yesVotes) || 0,
            noVotes: Number(data.noVotes) || 0,
            userVote:
              data.userVote === 'yes' || data.userVote === 'no'
                ? data.userVote
                : null,
            cost: String(data.cost || ''),
            title: {
              fr: String(data.titleFr || ''),
              ar: String(data.titleAr || ''),
              en: String(data.titleEn || '')
            }
          };
        })
        .sort((a, b) => a.id - b.id);
      callbacks.onPolls(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'polls')
  );

  return () => {
    unsubApts();
    unsubExps();
    unsubIncs();
    unsubAnnos();
    unsubPolls();
  };
}
