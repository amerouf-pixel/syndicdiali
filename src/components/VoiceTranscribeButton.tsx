import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Language } from '../types';

interface VoiceTranscribeButtonProps {
  lang: Language;
  onTranscribed: (text: string) => void;
  labelRecord?: string;
  labelStop?: string;
  labelTranscribing?: string;
}

export function VoiceTranscribeButton({
  lang,
  onTranscribed,
  labelRecord,
  labelStop,
  labelTranscribing
}: VoiceTranscribeButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const defaultLabels = {
    fr: {
      record: 'Dicter par la voix',
      stop: 'Arrêter & Transcrire',
      transcribing: 'Transcription vocale en cours...',
      micError: 'Microphone non disponible dans ce navigateur.'
    },
    ar: {
      record: 'إملاء صوتي بالمايكروفون',
      stop: 'إيقاف وتحويل إلى نص',
      transcribing: 'جاري تحويل الصوت إلى نص...',
      micError: 'الميكروفون غير متاح في هذا المتصفح.'
    },
    en: {
      record: 'Dictate by Voice',
      stop: 'Stop & Transcribe',
      transcribing: 'Transcribing audio...',
      micError: 'Microphone not available in this browser.'
    }
  }[lang];

  const startRecording = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg(defaultLabels.micError);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await sendAudioForTranscription(blob, mimeType);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setErrorMsg(defaultLabels.micError);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioForTranscription = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setErrorMsg(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const commaIdx = result.indexOf(',');
          resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType,
          lang
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Transcription error');
      }
      if (data.text) {
        onTranscribed(data.text);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur de transcription');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            type="button"
            disabled={isTranscribing}
            onClick={startRecording}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-extrabold transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 shrink-0" />
                <span>{labelTranscribing || defaultLabels.transcribing}</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>{labelRecord || defaultLabels.record}</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-colors whitespace-nowrap"
          >
            <Square className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>{labelStop || defaultLabels.stop}</span>
          </button>
        )}
      </div>
      {errorMsg && (
        <p className="text-xs font-semibold text-rose-600">{errorMsg}</p>
      )}
    </div>
  );
}
