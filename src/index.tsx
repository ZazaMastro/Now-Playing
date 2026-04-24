import { definePlugin } from "@decky/api";
import { DialogButton, Focusable, PanelSection, PanelSectionRow } from "@decky/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import { FaAmazon, FaArrowLeft, FaCheck, FaCog, FaDeezer, FaMusic, FaPause, FaPlay, FaRandom, FaRedoAlt, FaStepBackward, FaStepForward } from "react-icons/fa";
import { SiApplemusic, SiSoundcloud, SiSpotify, SiTidal } from "react-icons/si";
import * as python from "./python";
import type { PlayerSnapshot, Snapshot } from "./python";

const emptySnapshot: Snapshot = {
  selectedPlayer: "",
  currentPlayer: "",
  selected: null,
  players: [],
};

const BLOCK_WIDTH = 188;
const CONTROL_GAP = 8;
const BUTTON_HEIGHT = 28;
const APP_SETTINGS_KEY = "nowPlaying.enabledApps";

const qamCenterRowStyle: CSSProperties = {
  width: "calc(100% - 28px)",
  margin: "0 auto",
  boxSizing: "border-box",
  display: "flex",
  justifyContent: "center",
};

const centeredColumnStyle: CSSProperties = {
  width: `${BLOCK_WIDTH}px`,
  minWidth: `${BLOCK_WIDTH}px`,
  maxWidth: `${BLOCK_WIDTH}px`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  overflow: "hidden",
};

const controlsWrapStyle: CSSProperties = {
  width: `${BLOCK_WIDTH}px`,
  minWidth: `${BLOCK_WIDTH}px`,
  maxWidth: `${BLOCK_WIDTH}px`,
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: `${CONTROL_GAP}px`,
};

const compactButtonStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: `${BUTTON_HEIGHT}px`,
  minHeight: `${BUTTON_HEIGHT}px`,
  padding: 0,
  lineHeight: 1,
};

const wideButtonStyle: CSSProperties = {
  width: `${BLOCK_WIDTH}px`,
  minWidth: `${BLOCK_WIDTH}px`,
  maxWidth: `${BLOCK_WIDTH}px`,
  height: `${BUTTON_HEIGHT}px`,
  minHeight: `${BUTTON_HEIGHT}px`,
  padding: 0,
  lineHeight: 1,
};

const iconButtonStyle: CSSProperties = {
  width: `${BUTTON_HEIGHT}px`,
  minWidth: `${BUTTON_HEIGHT}px`,
  maxWidth: `${BUTTON_HEIGHT}px`,
  height: `${BUTTON_HEIGHT}px`,
  minHeight: `${BUTTON_HEIGHT}px`,
  padding: 0,
  lineHeight: 1,
};

const headerRowStyle: CSSProperties = {
  width: `${BLOCK_WIDTH}px`,
  minWidth: `${BLOCK_WIDTH}px`,
  maxWidth: `${BLOCK_WIDTH}px`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "10px",
};

const buttonContentStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontSize: "0.86em",
  lineHeight: 1,
};

const settingsButtonContentStyle: CSSProperties = {
  ...buttonContentStyle,
  width: "100%",
  justifyContent: "flex-start",
  padding: "0 10px",
  boxSizing: "border-box",
};

const settingsCheckStyle: CSSProperties = {
  marginLeft: "auto",
  width: "16px",
  display: "inline-flex",
  justifyContent: "center",
};

const subtleRowTextStyle: CSSProperties = {
  width: `${BLOCK_WIDTH}px`,
  display: "flex",
  justifyContent: "space-between",
  fontSize: "0.72em",
  opacity: 0.66,
  marginTop: "3px",
};

const meterBoxStyle: CSSProperties = {
  width: `${BLOCK_WIDTH}px`,
  minWidth: `${BLOCK_WIDTH}px`,
  maxWidth: `${BLOCK_WIDTH}px`,
  boxSizing: "border-box",
  overflow: "hidden",
};

const meterTrackStyle: CSSProperties = {
  width: `${BLOCK_WIDTH}px`,
  minWidth: `${BLOCK_WIDTH}px`,
  maxWidth: `${BLOCK_WIDTH}px`,
  height: "6px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.18)",
  overflow: "hidden",
  boxSizing: "border-box",
};

const meterFillBaseStyle: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
  background: "#66c0f4",
  transition: "width 160ms linear",
};

const marqueeShellStyle: CSSProperties = {
  width: `${BLOCK_WIDTH}px`,
  maxWidth: `${BLOCK_WIDTH}px`,
  overflow: "hidden",
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};

type Translation = {
  notPlaying: string;
  unknownArtist: string;
  unknownAlbum: string;
  openApp: string;
  refreshFailed: string;
  coverFailed: string;
};

const translations: Record<string, Translation> = {
  en: {
    notPlaying: "Not playing",
    unknownArtist: "Unknown artist",
    unknownAlbum: "Unknown album",
    openApp: "Open {app}",
    refreshFailed: "Now playing refresh failed",
    coverFailed: "cover fetch failed",
  },
  it: {
    notPlaying: "Non in riproduzione",
    unknownArtist: "Artista sconosciuto",
    unknownAlbum: "Album sconosciuto",
    openApp: "Apri {app}",
    refreshFailed: "Aggiornamento Now playing non riuscito",
    coverFailed: "recupero copertina non riuscito",
  },
  es: {
    notPlaying: "No se esta reproduciendo",
    unknownArtist: "Artista desconocido",
    unknownAlbum: "Album desconocido",
    openApp: "Abrir {app}",
    refreshFailed: "No se pudo actualizar Now playing",
    coverFailed: "no se pudo cargar la caratula",
  },
  fr: {
    notPlaying: "Aucune lecture",
    unknownArtist: "Artiste inconnu",
    unknownAlbum: "Album inconnu",
    openApp: "Ouvrir {app}",
    refreshFailed: "Echec de l'actualisation de Now playing",
    coverFailed: "echec du chargement de la pochette",
  },
  de: {
    notPlaying: "Keine Wiedergabe",
    unknownArtist: "Unbekannter Kunstler",
    unknownAlbum: "Unbekanntes Album",
    openApp: "{app} offnen",
    refreshFailed: "Now playing konnte nicht aktualisiert werden",
    coverFailed: "Cover konnte nicht geladen werden",
  },
  pt: {
    notPlaying: "Nada em reproducao",
    unknownArtist: "Artista desconhecido",
    unknownAlbum: "Album desconhecido",
    openApp: "Abrir {app}",
    refreshFailed: "Falha ao atualizar Now playing",
    coverFailed: "falha ao carregar a capa",
  },
  nl: {
    notPlaying: "Niets wordt afgespeeld",
    unknownArtist: "Onbekende artiest",
    unknownAlbum: "Onbekend album",
    openApp: "{app} openen",
    refreshFailed: "Now playing vernieuwen mislukt",
    coverFailed: "hoes laden mislukt",
  },
  sv: {
    notPlaying: "Spelar inget",
    unknownArtist: "Okand artist",
    unknownAlbum: "Okant album",
    openApp: "Oppna {app}",
    refreshFailed: "Now playing kunde inte uppdateras",
    coverFailed: "kunde inte hamta omslag",
  },
  no: {
    notPlaying: "Spiller ikke",
    unknownArtist: "Ukjent artist",
    unknownAlbum: "Ukjent album",
    openApp: "Apne {app}",
    refreshFailed: "Now playing kunne ikke oppdateres",
    coverFailed: "kunne ikke hente omslag",
  },
  da: {
    notPlaying: "Afspiller ikke",
    unknownArtist: "Ukendt kunstner",
    unknownAlbum: "Ukendt album",
    openApp: "Abn {app}",
    refreshFailed: "Now playing kunne ikke opdateres",
    coverFailed: "kunne ikke hente cover",
  },
  fi: {
    notPlaying: "Ei toistoa",
    unknownArtist: "Tuntematon artisti",
    unknownAlbum: "Tuntematon albumi",
    openApp: "Avaa {app}",
    refreshFailed: "Now playing -paivitys epaonnistui",
    coverFailed: "kannen haku epaonnistui",
  },
  pl: {
    notPlaying: "Nic nie jest odtwarzane",
    unknownArtist: "Nieznany wykonawca",
    unknownAlbum: "Nieznany album",
    openApp: "Otworz {app}",
    refreshFailed: "Nie udalo sie odswiezyc Now playing",
    coverFailed: "nie udalo sie pobrac okladki",
  },
  cs: {
    notPlaying: "Nic se neprehrava",
    unknownArtist: "Neznamy interpret",
    unknownAlbum: "Nezname album",
    openApp: "Otevrit {app}",
    refreshFailed: "Now playing se nepodarilo obnovit",
    coverFailed: "nepodarilo se nacist obal",
  },
  sk: {
    notPlaying: "Nic sa neprehrava",
    unknownArtist: "Neznamy interpret",
    unknownAlbum: "Neznamy album",
    openApp: "Otvorit {app}",
    refreshFailed: "Now playing sa nepodarilo obnovit",
    coverFailed: "nepodarilo sa nacitat obal",
  },
  hu: {
    notPlaying: "Nincs lejatszas",
    unknownArtist: "Ismeretlen eloado",
    unknownAlbum: "Ismeretlen album",
    openApp: "{app} megnyitasa",
    refreshFailed: "A Now playing frissitese sikertelen",
    coverFailed: "a borito betoltese sikertelen",
  },
  ro: {
    notPlaying: "Nu se reda nimic",
    unknownArtist: "Artist necunoscut",
    unknownAlbum: "Album necunoscut",
    openApp: "Deschide {app}",
    refreshFailed: "Actualizarea Now playing a esuat",
    coverFailed: "incarcarea copertii a esuat",
  },
  tr: {
    notPlaying: "Calmiyor",
    unknownArtist: "Bilinmeyen sanatci",
    unknownAlbum: "Bilinmeyen album",
    openApp: "{app} ac",
    refreshFailed: "Now playing yenilenemedi",
    coverFailed: "kapak yuklenemedi",
  },
  el: {
    notPlaying: "Δεν αναπαραγεται",
    unknownArtist: "Αγνωστος καλλιτεχνης",
    unknownAlbum: "Αγνωστο αλμπουμ",
    openApp: "Ανοιγμα {app}",
    refreshFailed: "Αποτυχια ανανεωσης Now playing",
    coverFailed: "αποτυχια φορτωσης εξωφυλλου",
  },
  ru: {
    notPlaying: "Не воспроизводится",
    unknownArtist: "Неизвестный исполнитель",
    unknownAlbum: "Неизвестный альбом",
    openApp: "Открыть {app}",
    refreshFailed: "Не удалось обновить Now playing",
    coverFailed: "не удалось загрузить обложку",
  },
  uk: {
    notPlaying: "Не відтворюється",
    unknownArtist: "Невідомий виконавець",
    unknownAlbum: "Невідомий альбом",
    openApp: "Відкрити {app}",
    refreshFailed: "Не вдалося оновити Now playing",
    coverFailed: "не вдалося завантажити обкладинку",
  },
  ja: {
    notPlaying: "再生していません",
    unknownArtist: "不明なアーティスト",
    unknownAlbum: "不明なアルバム",
    openApp: "{app}を開く",
    refreshFailed: "Now playing の更新に失敗しました",
    coverFailed: "カバーの取得に失敗しました",
  },
  ko: {
    notPlaying: "재생 중 아님",
    unknownArtist: "알 수 없는 아티스트",
    unknownAlbum: "알 수 없는 앨범",
    openApp: "{app} 열기",
    refreshFailed: "Now playing 새로 고침 실패",
    coverFailed: "앨범 아트 불러오기 실패",
  },
  zh: {
    notPlaying: "未在播放",
    unknownArtist: "未知艺人",
    unknownAlbum: "未知专辑",
    openApp: "打开 {app}",
    refreshFailed: "Now playing 刷新失败",
    coverFailed: "封面加载失败",
  },
  "zh-tw": {
    notPlaying: "未在播放",
    unknownArtist: "未知演出者",
    unknownAlbum: "未知專輯",
    openApp: "開啟 {app}",
    refreshFailed: "Now playing 重新整理失敗",
    coverFailed: "封面載入失敗",
  },
  ar: {
    notPlaying: "لا يتم التشغيل",
    unknownArtist: "فنان غير معروف",
    unknownAlbum: "البوم غير معروف",
    openApp: "فتح {app}",
    refreshFailed: "فشل تحديث Now playing",
    coverFailed: "فشل تحميل الغلاف",
  },
  he: {
    notPlaying: "לא מתנגן",
    unknownArtist: "אמן לא ידוע",
    unknownAlbum: "אלבום לא ידוע",
    openApp: "פתח את {app}",
    refreshFailed: "רענון Now playing נכשל",
    coverFailed: "טעינת העטיפה נכשלה",
  },
  hi: {
    notPlaying: "चल नहीं रहा",
    unknownArtist: "अज्ञात कलाकार",
    unknownAlbum: "अज्ञात एल्बम",
    openApp: "{app} खोलें",
    refreshFailed: "Now playing रीफ्रेश विफल",
    coverFailed: "कवर लोड नहीं हुआ",
  },
  id: {
    notPlaying: "Tidak diputar",
    unknownArtist: "Artis tidak dikenal",
    unknownAlbum: "Album tidak dikenal",
    openApp: "Buka {app}",
    refreshFailed: "Gagal memuat ulang Now playing",
    coverFailed: "gagal memuat sampul",
  },
  th: {
    notPlaying: "ไม่ได้เล่น",
    unknownArtist: "ศิลปินไม่ทราบชื่อ",
    unknownAlbum: "อัลบั้มไม่ทราบชื่อ",
    openApp: "เปิด {app}",
    refreshFailed: "รีเฟรช Now playing ไม่สำเร็จ",
    coverFailed: "โหลดปกไม่สำเร็จ",
  },
  vi: {
    notPlaying: "Khong phat",
    unknownArtist: "Nghe si khong xac dinh",
    unknownAlbum: "Album khong xac dinh",
    openApp: "Mo {app}",
    refreshFailed: "Khong the lam moi Now playing",
    coverFailed: "khong the tai bia",
  },
};

const languageAliases: Record<string, string> = {
  "pt-br": "pt",
  "pt-pt": "pt",
  "zh-cn": "zh",
  "zh-sg": "zh",
  "zh-hans": "zh",
  "zh-hant": "zh-tw",
  "zh-hk": "zh-tw",
  "zh-mo": "zh-tw",
  nb: "no",
  nn: "no",
};

function resolveTranslations(): Translation {
  const candidates: string[] =
    typeof navigator !== "undefined"
      ? [...Array.from(navigator.languages ?? []), navigator.language].filter(
          (value): value is string => Boolean(value)
        )
      : [];

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    const alias = languageAliases[normalized] ?? normalized;
    const base = alias.split("-")[0];
    const match = translations[alias] ?? translations[base];
    if (match) return match;
  }

  return translations.en;
}

function useTranslations() {
  return useMemo(resolveTranslations, []);
}

function formatOpenAppLabel(template: string, app: string) {
  return template.replace("{app}", app);
}

type MusicAppButton = {
  key: MusicAppKey;
  label: string;
  Icon: IconType;
  open: () => Promise<string>;
};

type MusicAppKey =
  | "spotify"
  | "tidal"
  | "appleMusic"
  | "deezer"
  | "amazonMusic"
  | "soundCloud";

const musicApps: MusicAppButton[] = [
  { key: "spotify", label: "Spotify", Icon: SiSpotify, open: python.openSpotify },
  { key: "tidal", label: "Tidal", Icon: SiTidal, open: python.openTidal },
  { key: "appleMusic", label: "Apple Music", Icon: SiApplemusic, open: python.openAppleMusic },
  { key: "deezer", label: "Deezer", Icon: FaDeezer, open: python.openDeezer },
  { key: "amazonMusic", label: "Amazon Music", Icon: FaAmazon, open: python.openAmazonMusic },
  { key: "soundCloud", label: "SoundCloud", Icon: SiSoundcloud, open: python.openSoundCloud },
];

const defaultEnabledAppKeys: MusicAppKey[] = ["spotify"];

function normalizeEnabledAppKeys(keys: unknown): MusicAppKey[] {
  if (!Array.isArray(keys)) return defaultEnabledAppKeys;

  const knownKeys = new Set(musicApps.map((app) => app.key));
  const normalized = keys.filter((key): key is MusicAppKey => typeof key === "string" && knownKeys.has(key as MusicAppKey));

  return normalized.length > 0 ? normalized : defaultEnabledAppKeys;
}

function loadEnabledAppKeys(): MusicAppKey[] {
  if (typeof window === "undefined") return defaultEnabledAppKeys;

  try {
    const stored = window.localStorage.getItem(APP_SETTINGS_KEY);
    if (!stored) return defaultEnabledAppKeys;
    return normalizeEnabledAppKeys(JSON.parse(stored));
  } catch {
    return defaultEnabledAppKeys;
  }
}

function saveEnabledAppKeys(keys: MusicAppKey[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(keys));
  } catch {
    // Local storage can be unavailable in some embedded contexts; the session state still works.
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function MeterBar(props: { value: number; dimmed?: boolean }) {
  const value = clamp(props.value, 0, 1);

  return (
    <div style={meterTrackStyle}>
      <div
        style={{
          ...meterFillBaseStyle,
          width: `${value * 100}%`,
          opacity: props.dimmed ? 0.5 : 1,
        }}
      />
    </div>
  );
}

function ScrollingText(props: { text: string; style?: CSSProperties }) {
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const measure = () => {
      const element = textRef.current;
      const parent = element?.parentElement;
      if (!element || !parent) return;
      setShouldScroll(element.scrollWidth > parent.clientWidth + 2);
    };

    measure();
    const timer = window.setTimeout(measure, 120);
    window.addEventListener("resize", measure);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [props.text]);

  const duration = `${clamp(5 + props.text.length * 0.08, 7, 14)}s`;

  return (
    <div
      style={{
        ...marqueeShellStyle,
        WebkitMaskImage: shouldScroll
          ? "linear-gradient(90deg, transparent 0, black 14px, black calc(100% - 14px), transparent 100%)"
          : undefined,
        maskImage: shouldScroll
          ? "linear-gradient(90deg, transparent 0, black 14px, black calc(100% - 14px), transparent 100%)"
          : undefined,
      }}
      title={props.text}
    >
      <div
        ref={textRef}
        style={{
          ...props.style,
          display: "inline-block",
          whiteSpace: "nowrap",
          animation: shouldScroll ? `inRiproduzioneMarquee ${duration} ease-in-out infinite alternate` : undefined,
          willChange: shouldScroll ? "transform" : undefined,
        }}
      >
        {props.text}
      </div>
    </div>
  );
}

function CoverBox(props: { artUrl?: string }) {
  const { artUrl } = props;

  if (artUrl && artUrl.trim()) {
    return (
      <img
        src={artUrl}
        style={{
          width: `${BLOCK_WIDTH}px`,
          height: `${BLOCK_WIDTH}px`,
          objectFit: "cover",
          borderRadius: "18px",
          display: "block",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: `${BLOCK_WIDTH}px`,
        height: `${BLOCK_WIDTH}px`,
        borderRadius: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <FaMusic size={72} />
    </div>
  );
}

function ProgressView(props: { current: PlayerSnapshot | null; clock: number; snapshotAt: number }) {
  const { current, clock, snapshotAt } = props;
  const length = Math.max(1, current?.length ?? 1);
  const basePosition = current?.position ?? 0;
  const livePosition = current?.status === "Playing" ? basePosition + Math.max(0, clock - snapshotAt) : basePosition;
  const position = clamp(livePosition, 0, length);
  const progress = length > 1 ? position / length : 0;

  return (
    <div style={{ ...meterBoxStyle, marginTop: "12px" }}>
      <MeterBar value={progress} />
      <div style={subtleRowTextStyle}>
        <span>{formatTime(position)}</span>
        <span>{formatTime(length)}</span>
      </div>
    </div>
  );
}

function RepeatIcon(props: { repeatMode?: string }) {
  const isTrack = props.repeatMode === "Track";

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <FaRedoAlt />
      {isTrack ? (
        <span
          style={{
            position: "absolute",
            right: "-6px",
            bottom: "-6px",
            fontSize: "0.64em",
            fontWeight: 700,
          }}
        >
          1
        </span>
      ) : null}
    </span>
  );
}

function SettingsView(props: {
  enabledAppKeys: MusicAppKey[];
  onBack: () => void;
  onToggleApp: (key: MusicAppKey) => void;
}) {
  const enabled = new Set(props.enabledAppKeys);

  return (
    <PanelSection>
      <PanelSectionRow>
        <div style={qamCenterRowStyle}>
          <div style={centeredColumnStyle}>
            <div style={headerRowStyle}>
              <DialogButton style={iconButtonStyle} onClick={props.onBack}>
                <FaArrowLeft />
              </DialogButton>
              <span />
            </div>

            <Focusable style={{ ...centeredColumnStyle, gap: "6px" }} flow-children="vertical">
              {musicApps.map((app) => {
                const Icon = app.Icon;
                const isEnabled = enabled.has(app.key);

                return (
                  <DialogButton
                    key={app.key}
                    style={{ ...wideButtonStyle, opacity: isEnabled ? 1 : 0.58 }}
                    onClick={() => props.onToggleApp(app.key)}
                  >
                    <span style={settingsButtonContentStyle}>
                      <Icon />
                      <span>{app.label}</span>
                      <span style={settingsCheckStyle}>{isEnabled ? <FaCheck /> : null}</span>
                    </span>
                  </DialogButton>
                );
              })}
            </Focusable>
          </div>
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}

function Content() {
  const t = useTranslations();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [enabledAppKeys, setEnabledAppKeys] = useState<MusicAppKey[]>(loadEnabledAppKeys);
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [snapshotAt, setSnapshotAt] = useState<number>(Date.now());
  const [clock, setClock] = useState<number>(Date.now());
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [mediaVisible, setMediaVisible] = useState<boolean>(true);
  const refreshingRef = useRef<boolean>(false);
  const mediaKeyRef = useRef<string>("");

  const current: PlayerSnapshot | null = useMemo(
    () => snapshot.selected ?? snapshot.players[0] ?? null,
    [snapshot]
  );
  const enabledApps = useMemo(
    () => musicApps.filter((app) => enabledAppKeys.includes(app.key)),
    [enabledAppKeys]
  );

  const mediaKey = `${current?.id ?? ""}|${current?.title ?? ""}|${current?.artist ?? ""}|${current?.album ?? ""}`;

  async function refresh(force = false) {
    if (refreshingRef.current && !force) return;

    refreshingRef.current = true;
    try {
      const next = await python.getSnapshot();
      setSnapshot(next);
      setSnapshotAt(Date.now());
    } catch (error) {
      console.warn(t.refreshFailed, error);
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }
  async function runAction(action: () => Promise<unknown>) {
    try {
      setBusy(true);
      await action();
    } finally {
      window.setTimeout(() => {
        setBusy(false);
      }, 180);
    }

    void refresh(true);
    window.setTimeout(() => void refresh(true), 60);
    window.setTimeout(() => void refresh(true), 180);
  }

  function toggleEnabledApp(key: MusicAppKey) {
    setEnabledAppKeys((previous) => {
      const isEnabled = previous.includes(key);
      if (isEnabled && previous.length === 1) return previous;

      const next = isEnabled ? previous.filter((enabledKey) => enabledKey !== key) : [...previous, key];
      const normalized = normalizeEnabledAppKeys(next);
      saveEnabledAppKeys(normalized);
      return normalized;
    });
  }

  useEffect(() => {
    void refresh(true);

    const timer = window.setInterval(() => {
      void refresh(false);
    }, 400);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 250);

    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!mediaKeyRef.current) {
      mediaKeyRef.current = mediaKey;
      return;
    }

    if (mediaKeyRef.current === mediaKey) return;

    setMediaVisible(false);
    const timer = window.setTimeout(() => {
      mediaKeyRef.current = mediaKey;
      setMediaVisible(true);
    }, 90);

    return () => window.clearTimeout(timer);
  }, [mediaKey]);

  useEffect(() => {
    const title = current?.title?.trim() ?? "";
    const artist = current?.artist?.trim() ?? "";
    const album = current?.album?.trim() ?? "";

    if (!title) {
      setCoverUrl("");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const url = await python.getCover(title, artist, album);
        if (cancelled) return;

        if (!url) {
          setCoverUrl("");
          return;
        }

        const image = new Image();
        image.onload = () => {
          if (!cancelled) setCoverUrl(url);
        };
        image.onerror = () => {
          if (!cancelled) setCoverUrl(url);
        };
        image.src = url;
      } catch (error) {
        if (!cancelled) {
          console.warn(t.coverFailed, error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [current?.title, current?.artist, current?.album, t.coverFailed]);

  const title = current?.title?.trim() ? current.title : t.notPlaying;
  const artist = current?.artist?.trim() ? current.artist : t.unknownArtist;
  const album = current?.album?.trim() ? current.album : t.unknownAlbum;
  const isPlaying = current?.status === "Playing";
  const isShuffleActive = current?.shuffleActive === true;
  const repeatMode = current?.repeatMode || "None";
  const repeatActive = repeatMode !== "None";
  const controlsDisabled = busy || loading;
  const mediaTransitionStyle: CSSProperties = {
    opacity: mediaVisible ? 1 : 0.28,
    transform: mediaVisible ? "translateY(0)" : "translateY(2px)",
    transition: "opacity 160ms ease, transform 160ms ease",
  };

  if (showSettings) {
    return (
      <SettingsView
        enabledAppKeys={enabledAppKeys}
        onBack={() => setShowSettings(false)}
        onToggleApp={toggleEnabledApp}
      />
    );
  }

  return (
    <PanelSection>
      <style>{`
        @keyframes inRiproduzioneMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-100% + ${BLOCK_WIDTH}px)); }
        }
      `}</style>
      <PanelSectionRow>
        <div style={qamCenterRowStyle}>
          <div style={centeredColumnStyle}>
            <div style={mediaTransitionStyle}>
              <CoverBox artUrl={coverUrl} />

              <div
                style={{
                  width: `${BLOCK_WIDTH}px`,
                  textAlign: "center",
                  marginTop: "14px",
                }}
              >
                <ScrollingText
                  text={title}
                  style={{
                    fontSize: "1.08em",
                    fontWeight: 700,
                    lineHeight: 1.2,
                    marginBottom: "6px",
                  }}
                />

                <ScrollingText
                  text={artist}
                  style={{
                    opacity: 0.84,
                    lineHeight: 1.2,
                    marginBottom: "4px",
                  }}
                />

                <ScrollingText
                  text={album}
                  style={{
                    opacity: 0.62,
                    fontSize: "0.9em",
                    lineHeight: 1.2,
                  }}
                />
              </div>
            </div>

            <ProgressView current={current} clock={clock} snapshotAt={snapshotAt} />

            <div style={{ height: "14px" }} />

            <Focusable style={controlsWrapStyle} flow-children="horizontal">
              <DialogButton
                style={compactButtonStyle}
                disabled={controlsDisabled || !current?.canPrevious}
                onClick={() => void runAction(() => python.previousTrack())}
              >
                <FaStepBackward />
              </DialogButton>

              <DialogButton
                style={compactButtonStyle}
                disabled={controlsDisabled || !current}
                onClick={() => void runAction(() => python.playPause())}
              >
                {isPlaying ? <FaPause /> : <FaPlay />}
              </DialogButton>

              <DialogButton
                style={compactButtonStyle}
                disabled={controlsDisabled || !current?.canNext}
                onClick={() => void runAction(() => python.nextTrack())}
              >
                <FaStepForward />
              </DialogButton>
            </Focusable>

            <div style={{ height: "8px" }} />

            <Focusable style={controlsWrapStyle} flow-children="horizontal">
              <DialogButton
                style={{ ...compactButtonStyle, opacity: isShuffleActive ? 1 : 0.58 }}
                disabled={controlsDisabled || !current?.canShuffle}
                onClick={() => void runAction(() => python.shuffle())}
              >
                <FaRandom />
              </DialogButton>

              <DialogButton
                style={{ ...compactButtonStyle, opacity: repeatActive ? 1 : 0.58 }}
                disabled={controlsDisabled || !current?.canRepeat}
                onClick={() => void runAction(() => python.repeat())}
              >
                <RepeatIcon repeatMode={repeatMode} />
              </DialogButton>
            </Focusable>

            {snapshot.players.length > 1 ? (
              <>
                <div style={{ height: "14px" }} />
                {snapshot.players.map((player) => (
                  <DialogButton
                    key={player.id}
                    style={wideButtonStyle}
                    disabled={busy}
                    onClick={() =>
                      void runAction(async () => {
                        await python.setMediaPlayer(player.id);
                      })
                    }
                  >
                    <span style={buttonContentStyle}>
                      {(player.id === snapshot.selectedPlayer ? "\u2022 " : "") + player.name}
                    </span>
                  </DialogButton>
                ))}
              </>
            ) : null}
            {enabledApps.length > 0 ? (
              <>
                <div style={{ height: "10px" }} />

                <Focusable style={{ ...centeredColumnStyle, gap: "6px" }} flow-children="vertical">
                  {enabledApps.map((app) => {
                    const Icon = app.Icon;

                    return (
                      <DialogButton
                        key={app.key}
                        style={wideButtonStyle}
                        disabled={busy}
                        onClick={() => void runAction(app.open)}
                      >
                        <span style={buttonContentStyle}>
                          <Icon />
                          {formatOpenAppLabel(t.openApp, app.label)}
                        </span>
                      </DialogButton>
                    );
                  })}

                  <DialogButton
                    style={wideButtonStyle}
                    onClick={() => setShowSettings(true)}
                  >
                    <FaCog />
                  </DialogButton>
                </Focusable>
              </>
            ) : null}
          </div>
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  return {
    name: "Now playing",
    titleView: <div>Now playing</div>,
    content: <Content />,
    icon: <FaMusic />,
  };
});
