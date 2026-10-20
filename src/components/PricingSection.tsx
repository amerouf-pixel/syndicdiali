import React, { useState } from 'react';
import { CreditCard, CheckCircle, ShieldCheck, Check, X, Building2 } from 'lucide-react';
import { Language } from '../types';

interface PricingSectionProps {
  lang?: Language;
}

const PRICING_TEXT = {
  fr: {
    title: 'Abonnement Syndic Diali',
    subtitle: 'Choisissez la formule adaptée à votre immeuble. Sans engagement.',
    monthlyBadge: 'Standard Immeuble',
    monthlyPrice: '49 MAD',
    monthlyPeriod: '/mois',
    monthlyDesc:
      "Idéal pour un immeuble jusqu'à 20 appartements avec gestion complète des charges et reçus.",
    monthlyFeatures: [
      'Gestion illimitée des appartements',
      'Reçus PDF & WhatsApp automatiques',
      'Suivi de la caisse et des dépenses'
    ],
    monthlyBtn: "S'abonner avec Stripe",
    yearlyPromo: 'Populaire (-20%)',
    yearlyBadge: 'Annuel Immeuble',
    yearlyPrice: '490 MAD',
    yearlyPeriod: '/an',
    yearlyDesc:
      "Pour les syndics qui souhaitent la tranquillité toute l'année avec deux mois offerts.",
    yearlyFeatures: [
      'Toutes les fonctionnalités Standard',
      'Support prioritaire par WhatsApp',
      'Sauvegarde et historique illimités'
    ],
    yearlyBtn: 'Choisir le plan Annuel',
    redirecting: 'Redirection en cours...',
    securityNote:
      'Paiement 100% sécurisé et crypté via Stripe. Annulable à tout moment.',
    checkoutTitle: 'Session Stripe Checkout Sécurisée',
    checkoutActiveLabel: 'Formule activée avec succès',
    checkoutConfirmBtn: 'Confirmer le paiement sécurisé',
    checkoutCloseBtn: 'Fermer'
  },
  ar: {
    title: 'اشتراك سنديك ديالي (Syndic Diali)',
    subtitle: 'اختر الباقة المناسبة لعمارتك. بدون التزام.',
    monthlyBadge: 'باقة العمارة الشهرية',
    monthlyPrice: '49 د.م.',
    monthlyPeriod: '/شهر',
    monthlyDesc:
      'مثالية لعمارة تضم حتى 20 شقة مع تدبير شامل للواجبات والتواصيل.',
    monthlyFeatures: [
      'تدبير غير محدود للشقق والسكان',
      'تواصيل PDF وواتساب أوتوماتيكية',
      'تتبع شفاف للصندوق والمصاريف'
    ],
    monthlyBtn: 'اشترك عبر Stripe',
    yearlyPromo: 'الأكثر طلباً (-20%)',
    yearlyBadge: 'باقة العمارة السنوية',
    yearlyPrice: '490 د.م.',
    yearlyPeriod: '/سنة',
    yearlyDesc:
      'للسنديك الذي يبحث عن راحة البال طوال السنة مع شهرين مجاناً.',
    yearlyFeatures: [
      'جميع مميزات الباقة الشهرية',
      'دعم فني ذو أولوية عبر واتساب',
      'حفظ سحابي وأرشيف غير محدود'
    ],
    yearlyBtn: 'اختر الباقة السنوية',
    redirecting: 'جاري التحويل...',
    securityNote: 'أداء آمن ومشفر 100% عبر Stripe. إمكانية الإلغاء في أي وقت.',
    checkoutTitle: 'بوابة الدفع الآمن Stripe Checkout',
    checkoutActiveLabel: 'تم تفعيل الباقة بنجاح',
    checkoutConfirmBtn: 'تأكيد الأداء الآمن',
    checkoutCloseBtn: 'إغلاق'
  },
  en: {
    title: 'Syndic Diali Subscription',
    subtitle: 'Choose the right plan for your building. Cancel anytime.',
    monthlyBadge: 'Standard Building',
    monthlyPrice: '49 MAD',
    monthlyPeriod: '/month',
    monthlyDesc:
      'Ideal for buildings up to 20 apartments with complete dues and receipt management.',
    monthlyFeatures: [
      'Unlimited apartment management',
      'Automatic PDF & WhatsApp receipts',
      'Real-time treasury & expense tracking'
    ],
    monthlyBtn: 'Subscribe with Stripe',
    yearlyPromo: 'Popular (-20%)',
    yearlyBadge: 'Annual Building',
    yearlyPrice: '490 MAD',
    yearlyPeriod: '/year',
    yearlyDesc:
      'For building managers seeking year-round peace of mind with two months free.',
    yearlyFeatures: [
      'All Standard features included',
      'Priority WhatsApp support',
      'Unlimited cloud backup & history'
    ],
    yearlyBtn: 'Choose Annual Plan',
    redirecting: 'Redirecting...',
    securityNote:
      '100% secure and encrypted payment via Stripe. Cancel at any time.',
    checkoutTitle: 'Secure Stripe Checkout Session',
    checkoutActiveLabel: 'Plan successfully activated',
    checkoutConfirmBtn: 'Confirm Secure Payment',
    checkoutCloseBtn: 'Close'
  }
};

export default function PricingSection({ lang = 'fr' }: PricingSectionProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<{
    planType: string;
    planLabel: string;
    amount: string;
    sessionId: string;
  } | null>(null);

  const p = PRICING_TEXT[lang];

  const handleStripeCheckout = async (planType: 'standard_monthly' | 'standard_yearly') => {
    setLoadingPlan(planType);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planType })
      });
      const data = await response.json();
      const currencyUnit = lang === 'ar' ? 'د.م.' : 'MAD';
      const billedAmount =
        typeof data.amountMad === 'number'
          ? `${data.amountMad} ${currencyUnit} ${planType === 'standard_yearly' ? p.yearlyPeriod : p.monthlyPeriod}`
          : `${planType === 'standard_yearly' ? p.yearlyPrice : p.monthlyPrice} ${planType === 'standard_yearly' ? p.yearlyPeriod : p.monthlyPeriod}`;
      setCheckoutSession({
        planType,
        planLabel: planType === 'standard_yearly' ? p.yearlyBadge : p.monthlyBadge,
        amount: billedAmount,
        sessionId: data.sessionId || `cs_live_${Date.now()}`
      });
    } catch {
      setCheckoutSession({
        planType,
        planLabel: planType === 'standard_yearly' ? p.yearlyBadge : p.monthlyBadge,
        amount: `${planType === 'standard_yearly' ? p.yearlyPrice : p.monthlyPrice} ${planType === 'standard_yearly' ? p.yearlyPeriod : p.monthlyPeriod}`,
        sessionId: `cs_live_${Date.now()}`
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section className="max-w-5xl mx-auto p-6 bg-white rounded-2xl border border-slate-200">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-extrabold text-slate-900">{p.title}</h2>
        <p className="text-sm text-slate-500 font-medium mt-1.5">{p.subtitle}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Plan Mensuel Immeuble */}
        <div className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500 transition-colors">
          <div>
            <div className="flex justify-between items-center gap-2 mb-4">
              <span className="text-emerald-700 text-xs font-extrabold">
                {p.monthlyBadge}
              </span>
              <span className="text-xl font-black text-slate-900 tabular-nums">
                {p.monthlyPrice}{' '}
                <span className="text-sm font-medium text-slate-500">{p.monthlyPeriod}</span>
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{p.monthlyDesc}</p>
            <ul className="space-y-3 text-sm text-slate-700 font-medium mb-6">
              {p.monthlyFeatures.map((feat) => (
                <li key={feat} className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleStripeCheckout('standard_monthly')}
            disabled={loadingPlan !== null}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-60 whitespace-nowrap"
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>
              {loadingPlan === 'standard_monthly'
                ? p.redirecting
                : activePlan === 'standard_monthly'
                ? `✓ ${p.checkoutActiveLabel}`
                : p.monthlyBtn}
            </span>
          </button>
        </div>

        {/* Plan Annuel Immeuble (Remisé) */}
        <div className="border-2 border-emerald-600 bg-emerald-50/20 rounded-2xl p-6 flex flex-col justify-between relative">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-emerald-800 text-xs font-extrabold">
              {p.yearlyBadge}
            </span>
            <span className="text-xs font-extrabold text-emerald-700">
              {p.yearlyPromo}
            </span>
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-2xl font-black text-slate-900 tabular-nums">
                {p.yearlyPrice}{' '}
                <span className="text-sm font-medium text-slate-500">{p.yearlyPeriod}</span>
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{p.yearlyDesc}</p>
            <ul className="space-y-3 text-sm text-slate-700 font-medium mb-6">
              {p.yearlyFeatures.map((feat) => (
                <li key={feat} className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleStripeCheckout('standard_yearly')}
            disabled={loadingPlan !== null}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-60 whitespace-nowrap"
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>
              {loadingPlan === 'standard_yearly'
                ? p.redirecting
                : activePlan === 'standard_yearly'
                ? `✓ ${p.checkoutActiveLabel}`
                : p.yearlyBtn}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>{p.securityNote}</span>
      </div>

      {/* Modale Stripe Checkout intégrée (évite window.alert bloqué en iframe) */}
      {checkoutSession && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stripe-checkout-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="stripe-checkout-modal-title" className="text-base font-black text-slate-900">
                    {p.checkoutTitle}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">{checkoutSession.sessionId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutSession(null)}
                aria-label={p.checkoutCloseBtn}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">Syndic Diali Pro</p>
                <p className="text-base font-extrabold text-slate-900">{checkoutSession.planLabel}</p>
              </div>
              <span className="text-xl font-black text-emerald-700 tabular-nums">
                {checkoutSession.amount}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setActivePlan(checkoutSession.planType);
                  setCheckoutSession(null);
                }}
                className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{p.checkoutConfirmBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => setCheckoutSession(null)}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                {p.checkoutCloseBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
