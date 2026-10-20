import React, { useState, useRef } from 'react';
import {
  Building2,
  CheckCircle2,
  MessageCircle,
  FileText,
  Camera,
  Printer,
  Check,
  X,
  CreditCard,
  Banknote,
  Copy,
  ExternalLink,
  Upload,
  Sparkles,
  Loader2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import {
  Apartment,
  Expense,
  ExpenseCategory,
  Language,
  PaymentMethod
} from '../types';
import { normalizeExtractedReceipt } from '../utils/syndicLogic';
import { VoiceTranscribeButton } from './VoiceTranscribeButton';

interface PaymentModalProps {
  apt: Apartment | null;
  lang: Language;
  t: Record<string, string>;
  selectedPayMethod: PaymentMethod;
  setSelectedPayMethod: (m: PaymentMethod) => void;
  onConfirm: () => void;
  onClose: () => void;
  formatMoney: (amount: number) => string;
}

export function PaymentModal({
  apt,
  lang,
  t,
  selectedPayMethod,
  setSelectedPayMethod,
  onConfirm,
  onClose,
  formatMoney
}: PaymentModalProps) {
  if (!apt) return null;

  const methods: { key: PaymentMethod; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'methodCash', icon: Banknote },
    { key: 'methodTransfer', icon: CreditCard },
    { key: 'methodCheck', icon: FileText }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="collect-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-extrabold text-emerald-700">
              {t.apt} {apt.number}
            </span>
            <h3 id="collect-modal-title" className="text-xl font-black text-slate-900">
              {t.collectModalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">{t.receiptResident}</p>
            <p className="text-base font-extrabold text-slate-900">{apt.owner[lang]}</p>
          </div>
          <div className="text-end">
            <p className="text-xs font-bold text-slate-500">{t.dueAmount}</p>
            <p className="text-xl font-black text-emerald-700 tabular-nums">
              {formatMoney(apt.amount)}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="block text-sm font-extrabold text-slate-700">
            {t.choosePaymentMethod}
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {methods.map((m) => {
              const Icon = m.icon;
              const active = selectedPayMethod === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedPayMethod(m.key)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border-2 font-bold text-sm transition-colors ${
                    active
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-emerald-600" />
                    <span>{t[m.key]}</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-sm transition-colors"
          >
            {t.confirmPaymentBtn}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {t.cancelBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReceiptModalProps {
  apt: Apartment | null;
  lang: Language;
  t: Record<string, string>;
  onClose: () => void;
  onOpenWhatsApp: (apt: Apartment, isReceipt: boolean) => void;
  formatMoney: (amount: number) => string;
}

export function ReceiptModal({
  apt,
  lang,
  t,
  onClose,
  onOpenWhatsApp,
  formatMoney
}: ReceiptModalProps) {
  if (!apt) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div
          id="printable-receipt"
          className="border-2 border-dashed border-emerald-500 rounded-2xl p-5 bg-emerald-50/30 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="receipt-modal-title" className="text-sm font-black text-slate-900">
                  {t.receiptTitle}
                </h3>
                <p className="text-xs font-bold text-slate-500">{t.appSubtitle}</p>
              </div>
            </div>
            <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 font-semibold">{t.receiptNo} :</span>
              <span className="font-black text-slate-900 font-mono tabular-nums">
                {apt.receiptNo}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 font-semibold">{t.receiptDate} :</span>
              <span className="font-bold text-slate-900 tabular-nums">{apt.paidDate}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 font-semibold">{t.receiptResident} :</span>
              <span className="font-bold text-slate-900">{apt.owner[lang]}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 font-semibold">{t.receiptApartment} :</span>
              <span className="font-bold text-slate-900">
                {t.apt} {apt.number} ({t.floor} {apt.floor})
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 font-semibold">{t.receiptPeriod} :</span>
              <span className="font-bold text-slate-900">{t.receiptPeriodVal}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 font-semibold">{t.receiptMethod} :</span>
              <span className="font-bold text-slate-900">
                {t[apt.method || 'methodCash']}
              </span>
            </div>

            <div className="pt-3 border-t border-emerald-200 flex items-center justify-between">
              <span className="text-base font-extrabold text-slate-900">{t.receiptTotal}</span>
              <span className="text-2xl font-black text-emerald-700 tabular-nums">
                {formatMoney(apt.amount)}
              </span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <span className="inline-block px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black tracking-wide">
              ✓ {t.receiptStamp}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => onOpenWhatsApp(apt, true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t.whatsappSendReceipt}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printReceiptBtn}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          {t.closeBtn}
        </button>
      </div>
    </div>
  );
}

interface ExpenseModalProps {
  isOpen: boolean;
  lang: Language;
  t: Record<string, string>;
  newExpenseTitle: string;
  setNewExpenseTitle: (v: string) => void;
  newExpenseVendor: string;
  setNewExpenseVendor: (v: string) => void;
  newExpenseDate: string;
  setNewExpenseDate: (v: string) => void;
  newExpenseAmount: string;
  setNewExpenseAmount: (v: string) => void;
  newExpenseCategory: ExpenseCategory;
  setNewExpenseCategory: (c: ExpenseCategory) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ExpenseModal({
  isOpen,
  lang,
  t,
  newExpenseTitle,
  setNewExpenseTitle,
  newExpenseVendor,
  setNewExpenseVendor,
  newExpenseDate,
  setNewExpenseDate,
  newExpenseAmount,
  setNewExpenseAmount,
  newExpenseCategory,
  setNewExpenseCategory,
  onSubmit,
  onClose
}: ExpenseModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const applyExtractedFields = (raw: {
    amount?: unknown;
    vendor?: unknown;
    date?: unknown;
    category?: unknown;
    title?: unknown;
  }) => {
    const normalized = normalizeExtractedReceipt(
      raw,
      new Date().toLocaleDateString('fr-FR')
    );
    setNewExpenseAmount(String(normalized.amount));
    setNewExpenseVendor(normalized.vendor);
    setNewExpenseDate(normalized.date);
    setNewExpenseCategory(normalized.category);
    setNewExpenseTitle(normalized.title);
    setScanSuccess(true);
    setScanError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFileName(file.name);
    setIsScanning(true);
    setScanSuccess(false);
    setScanError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const idx = res.indexOf(',');
          resolve(idx >= 0 ? res.slice(idx + 1) : res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: file.type || 'image/jpeg',
          fileName: file.name,
          lang
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la lecture de la facture');
      }
      applyExtractedFields(data);
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : 'Erreur lors de l’analyse du reçu'
      );
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSampleScan = (sampleType: 'srm' | 'otis') => {
    setIsScanning(true);
    setScanSuccess(false);
    setScanError(null);

    setTimeout(() => {
      if (sampleType === 'srm') {
        setAttachedFileName('Facture_SRM_Lydec_Oct2026.pdf');
        applyExtractedFields({
          amount: 420,
          vendor: 'SRM Casablanca / Lydec',
          date: '18/10/2026',
          category: 'catUtilities',
          title:
            lang === 'ar'
              ? 'فاتورة الماء والكهرباء للأجزاء المشتركة (أكتوبر)'
              : lang === 'en'
              ? 'Common areas water & electricity bill (October)'
              : 'Facture eau et électricité parties communes (Octobre)'
        });
      } else {
        setAttachedFileName('Facture_Otis_Maintenance_1026.jpg');
        applyExtractedFields({
          amount: 550,
          vendor: 'Otis / Ascenseurs Maroc',
          date: '19/10/2026',
          category: 'catElevator',
          title:
            lang === 'ar'
              ? 'صيانة المصعد وفحص كابلات الأمان'
              : lang === 'en'
              ? 'Elevator maintenance & safety cable inspection'
              : 'Révision mensuelle ascenseur & graissage câbles'
        });
      }
      setIsScanning(false);
    }, 300);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 id="expense-modal-title" className="text-lg font-black text-slate-900">
            {t.expenseModalTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reconnaissance intelligente de reçu / facture */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-dashed border-emerald-300 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                {t.smartScanTitle}
              </h4>
              <p className="text-xs text-emerald-800/80 font-medium mt-0.5 leading-relaxed">
                {t.smartScanSubtitle}
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
            aria-label={t.smartScanUploadBtn}
          />

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isScanning}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-60"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{t.smartScanAnalyzing}</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>{t.smartScanUploadBtn}</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={isScanning}
                onClick={() => handleSampleScan('srm')}
                className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold transition-colors truncate"
              >
                {t.smartScanSampleSrm}
              </button>
              <button
                type="button"
                disabled={isScanning}
                onClick={() => handleSampleScan('otis')}
                className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold transition-colors truncate"
              >
                {t.smartScanSampleOtis}
              </button>
            </div>
          </div>

          {scanSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t.smartScanSuccess}</span>
            </div>
          )}

          {scanError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {scanError}
            </div>
          )}
        </div>

        {/* Séparateur Saisie Manuelle */}
        <div className="flex items-center gap-2 pt-1">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            {t.manualEntryDivider}
          </span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="expense-category-select"
              className="block text-xs font-extrabold text-slate-700 mb-1"
            >
              {t.expenseCategory}
            </label>
            <select
              id="expense-category-select"
              value={newExpenseCategory}
              onChange={(e) => setNewExpenseCategory(e.target.value as ExpenseCategory)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
            >
              <option value="catCleaning">{t.catCleaning}</option>
              <option value="catElevator">{t.catElevator}</option>
              <option value="catSecurity">{t.catSecurity}</option>
              <option value="catUtilities">{t.catUtilities}</option>
              <option value="catPlumbing">{t.catPlumbing}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="expense-amount-input"
              className="block text-xs font-extrabold text-slate-700 mb-1"
            >
              {t.expenseAmount}
            </label>
            <input
              id="expense-amount-input"
              type="number"
              step="any"
              required
              min="1"
              value={newExpenseAmount}
              onChange={(e) => setNewExpenseAmount(e.target.value)}
              placeholder="Ex: 350"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-base font-extrabold tabular-nums focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="expense-vendor-input"
              className="block text-xs font-extrabold text-slate-700 mb-1"
            >
              {t.expenseVendor}
            </label>
            <input
              id="expense-vendor-input"
              type="text"
              value={newExpenseVendor}
              onChange={(e) => setNewExpenseVendor(e.target.value)}
              placeholder={t.expenseVendorPlaceholder}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label
              htmlFor="expense-date-input"
              className="block text-xs font-extrabold text-slate-700 mb-1"
            >
              {t.expenseDate}
            </label>
            <input
              id="expense-date-input"
              type="text"
              value={newExpenseDate}
              onChange={(e) => setNewExpenseDate(e.target.value)}
              placeholder={t.expenseDatePlaceholder}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold tabular-nums focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="expense-title-input"
            className="block text-xs font-extrabold text-slate-700"
          >
            {t.expenseLabel}
          </label>
          <input
            id="expense-title-input"
            type="text"
            required
            value={newExpenseTitle}
            onChange={(e) => setNewExpenseTitle(e.target.value)}
            placeholder={t.expenseLabelPlaceholder}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-emerald-600"
          />
          <VoiceTranscribeButton
            lang={lang}
            onTranscribed={(txt) => setNewExpenseTitle(txt)}
          />
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <Camera className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 truncate">
            {attachedFileName ? `${attachedFileName}` : t.expenseProofSimulated}
          </span>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm transition-colors"
          >
            {t.saveExpenseBtn}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {t.cancelBtn}
          </button>
        </div>
      </form>
    </div>
  );
}

interface IncidentModalProps {
  isOpen: boolean;
  lang: Language;
  t: Record<string, string>;
  newIncidentLoc: string;
  setNewIncidentLoc: (v: string) => void;
  newIncidentDesc: string;
  setNewIncidentDesc: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function IncidentModal({
  isOpen,
  lang,
  t,
  newIncidentLoc,
  setNewIncidentLoc,
  newIncidentDesc,
  setNewIncidentDesc,
  onSubmit,
  onClose
}: IncidentModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 id="incident-modal-title" className="text-lg font-black text-slate-900">
            {t.newIncidentTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label
            htmlFor="incident-location-input"
            className="block text-xs font-extrabold text-slate-700 mb-1"
          >
            {t.incidentLocation}
          </label>
          <input
            id="incident-location-input"
            type="text"
            required
            value={newIncidentLoc}
            onChange={(e) => setNewIncidentLoc(e.target.value)}
            placeholder={t.incidentLocationPlaceholder}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-rose-600"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="incident-desc-input"
            className="block text-xs font-extrabold text-slate-700"
          >
            {t.incidentDesc}
          </label>
          <textarea
            id="incident-desc-input"
            rows={3}
            required
            value={newIncidentDesc}
            onChange={(e) => setNewIncidentDesc(e.target.value)}
            placeholder={t.incidentDescPlaceholder}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-rose-600"
          />
          <VoiceTranscribeButton
            lang={lang}
            onTranscribed={(txt) =>
              setNewIncidentDesc(newIncidentDesc ? `${newIncidentDesc} ${txt}` : txt)
            }
          />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm transition-colors"
          >
            {t.submitIncidentBtn}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {t.cancelBtn}
          </button>
        </div>
      </form>
    </div>
  );
}

interface AnnouncementModalProps {
  isOpen: boolean;
  lang: Language;
  t: Record<string, string>;
  newAnnoTitle: string;
  setNewAnnoTitle: (v: string) => void;
  newAnnoBody: string;
  setNewAnnoBody: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function AnnouncementModal({
  isOpen,
  lang,
  t,
  newAnnoTitle,
  setNewAnnoTitle,
  newAnnoBody,
  setNewAnnoBody,
  onSubmit,
  onClose
}: AnnouncementModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="anno-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 id="anno-modal-title" className="text-lg font-black text-slate-900">
            {t.newAnnoModalTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label
            htmlFor="anno-title-input"
            className="block text-xs font-extrabold text-slate-700 mb-1"
          >
            {t.annoTitleLabel}
          </label>
          <input
            id="anno-title-input"
            type="text"
            required
            value={newAnnoTitle}
            onChange={(e) => setNewAnnoTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="anno-body-input"
            className="block text-xs font-extrabold text-slate-700"
          >
            {t.annoDescLabel}
          </label>
          <textarea
            id="anno-body-input"
            rows={3}
            required
            value={newAnnoBody}
            onChange={(e) => setNewAnnoBody(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-emerald-600"
          />
          <VoiceTranscribeButton
            lang={lang}
            onTranscribed={(txt) =>
              setNewAnnoBody(newAnnoBody ? `${newAnnoBody} ${txt}` : txt)
            }
          />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition-colors"
          >
            {t.publishBtn}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {t.cancelBtn}
          </button>
        </div>
      </form>
    </div>
  );
}

interface ProofModalProps {
  expense: Expense | null;
  lang: Language;
  t: Record<string, string>;
  onClose: () => void;
  formatMoney: (amount: number) => string;
}

export function ProofModal({
  expense,
  lang,
  t,
  onClose,
  formatMoney
}: ProofModalProps) {
  if (!expense) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 id="proof-modal-title" className="text-base font-black text-slate-900">
            {t.proofModalTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 font-mono tabular-nums">
            <span>FACTURE N° INV-{expense.id}</span>
            <span>{expense.date}</span>
          </div>
          <h4 className="text-base font-extrabold text-slate-900">
            {expense.title[lang]}
          </h4>
          <p className="text-xs font-bold text-slate-600">{expense.vendor}</p>
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total TTC Payé</span>
            <span className="text-xl font-black text-slate-900 tabular-nums">
              {formatMoney(expense.amount)}
            </span>
          </div>
          <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t.verifiedBySyndic}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors"
        >
          {t.closeBtn}
        </button>
      </div>
    </div>
  );
}

interface WhatsAppPreviewModalProps {
  data: { apt: Apartment; message: string; url: string } | null;
  lang: Language;
  t: Record<string, string>;
  onClose: () => void;
}

export function WhatsAppPreviewModal({
  data,
  lang,
  t,
  onClose
}: WhatsAppPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <h3 id="whatsapp-modal-title" className="text-base font-black text-slate-900">
              {t.whatsappModalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
          <span>
            {data.apt.owner[lang]} ({t.apt} {data.apt.number})
          </span>
          <span dir="ltr" className="font-mono text-slate-700">
            {data.apt.phone}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-sm text-slate-800 font-medium leading-relaxed">
          {data.message}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? t.copiedSuccess : t.copyMessageBtn}</span>
          </button>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{t.openWhatsAppAppBtn}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

interface ResetConfirmModalProps {
  isOpen: boolean;
  t: Record<string, string>;
  isResetting: boolean;
  onConfirmReset: () => void;
  onClose: () => void;
}

export function ResetConfirmModal({
  isOpen,
  t,
  isResetting,
  onConfirmReset,
  onClose
}: ResetConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-confirm-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border-2 border-rose-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="reset-confirm-modal-title" className="text-base font-black text-slate-900">
              {t.resetModalTitle}
            </h3>
          </div>
          <button
            type="button"
            disabled={isResetting}
            onClick={onClose}
            aria-label={t.resetCancelBtn}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors disabled:opacity-60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-950 font-bold leading-relaxed">
          {t.resetConfirmWarning}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            disabled={isResetting}
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm transition-colors disabled:opacity-60"
          >
            {t.resetCancelBtn}
          </button>
          <button
            type="button"
            disabled={isResetting}
            onClick={onConfirmReset}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm transition-colors shadow-xs disabled:opacity-60 whitespace-nowrap"
          >
            {isResetting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{t.resettingInProgress}</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>{t.resetConfirmBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

