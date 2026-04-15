import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  X,
  FileText,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import DatePicker from "./DatePicker";

export interface PreviewCourse {
  id: string;
  subject: string;
  start: string | Date;
  end: string | Date;
  location?: string | null;
  teacher?: string | null;
  color?: string | null;
  hash?: string | null;
  description?: string | null;
}

interface TimetablePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: PreviewCourse[];
  title?: string;
}

// --- Fonctions utilitaires pour les dates ---
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour que Lundi soit le premier jour
  return new Date(d.setDate(diff));
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const formatTime = (date: Date, locale: string = "fr-FR") => {
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const parseUTCAsLocal = (dateValue: string | Date) => {
  const d = new Date(dateValue);
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes()
  );
};

const COURSE_COLORS = [
  "#38bdf8", // Sky 400
  "#fb7185", // Rose 400
  "#34d399", // Emerald 400
  "#a78bfa", // Violet 400
  "#fbbf24", // Amber 400
  "#818cf8", // Indigo 400
  "#22d3ee", // Cyan 400
  "#f472b6", // Pink 400
  "#fb923c", // Orange 400
  "#2dd4bf", // Teal 400
];

const getCourseColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_COLORS.length;
  return COURSE_COLORS[index];
};

const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={part}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#37B7D5] hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export default function TimetablePreviewModal({
  isOpen,
  onClose,
  courses,
  title,
}: TimetablePreviewModalProps) {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCourse, setSelectedCourse] = useState<PreviewCourse | null>(
    null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const locale = i18n.language || "fr-FR";

  // Calculer les jours de la semaine courante (Lundi à Samedi)
  const weekDays = useMemo(() => {
    const start = getStartOfWeek(currentDate);
    return Array.from({ length: 6 }).map((_, i) => addDays(start, i)); // 6 jours (Lundi -> Samedi)
  }, [currentDate]);

  const startOfWeek = weekDays[0];
  const endOfWeek = weekDays[weekDays.length - 1];

  // Heures affichées dans la grille (0h à 23h)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const HOUR_HEIGHT = 60; // 60px par heure

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      // Scroll to 8am (8 * 60px)
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, [isOpen]);

  // Navigation
  const goToPreviousWeek = () => setCurrentDate(addDays(currentDate, -7));
  const goToNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToToday = () => setCurrentDate(new Date());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm">
      {/* Conteneur principal de la modale (fullscreen) */}
      <div className="bg-white w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-sm sm:text-md font-semibold text-gray-800 truncate max-w-[200px] sm:max-w-none">
              {title || t("preview_modal.title")}
            </h2>
            <p className="text-xs text-[#37B7D5] font-bold mt-1">
              {courses.length} {t("preview_modal.courses_fetched")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t("preview_modal.week_of", {
                start: startOfWeek.toLocaleDateString(locale, {
                  day: "numeric",
                  month: "long",
                }),
                end: endOfWeek.toLocaleDateString(locale, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Toolbar (Navigation & Actions) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-3 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t("preview_modal.today")}
            </button>
            <div className="flex items-center bg-white border border-gray-300 rounded-lg sm:ml-2 flex-1 sm:flex-initial justify-between sm:justify-start">
              <button
                type="button"
                onClick={goToPreviousWeek}
                className="p-2 hover:bg-gray-50 text-gray-600 border-r border-gray-300 rounded-l-[7px] flex-1 sm:flex-none flex justify-center"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="relative flex-1 sm:flex-none">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDatePicker(!showDatePicker);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <CalendarIcon
                    size={16}
                    className="text-gray-400 group-hover:text-[#37B7D5] transition-colors"
                  />
                  <span className="group-hover:text-[#37B7D5] transition-colors whitespace-nowrap">
                    {t("preview_modal.week")}
                  </span>
                </button>
                {showDatePicker && (
                  <DatePicker
                    selectedDate={currentDate}
                    onSelect={(date) => {
                      setCurrentDate(date);
                      setShowDatePicker(false);
                    }}
                    onClose={() => setShowDatePicker(false)}
                  />
                )}
              </div>
              <button
                type="button"
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-50 text-gray-600 border-l border-gray-300 rounded-r-[7px] flex-1 sm:flex-none flex justify-center"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Grille de l'emploi du temps */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white">
          <div className="min-w-[800px] flex flex-col">
            {/* En-têtes des jours */}
            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20">
              <div className="w-16 shrink-0 bg-gray-50 border-r border-gray-200"></div>
              {weekDays.map((day, _index) => {
                const isToday =
                  day.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={day.toISOString()}
                    className={`flex-1 py-3 text-center border-r border-gray-200 ${isToday ? "bg-[#37B7D5]/10" : ""}`}
                  >
                    <div
                      className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-[#37B7D5]" : "text-gray-500"}`}
                    >
                      {day.toLocaleDateString(locale, { weekday: "short" })}
                    </div>
                    <div
                      className={`text-lg mt-1 ${isToday ? "text-[#37B7D5] font-bold" : "text-gray-900"}`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Corps de la grille */}
            <div className="flex relative">
              {/* Colonne des heures */}
              <div className="pt-6 w-16 shrink-0 bg-gray-50 border-r border-gray-200 relative z-10">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="relative text-right pr-2 text-xs text-gray-500 font-medium"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    <span className="absolute -top-2.5 right-2 bg-gray-50 px-1">
                      {hour.toString().padStart(2, "0")}h00
                    </span>
                  </div>
                ))}
              </div>

              {/* Colonnes des jours avec les événements */}
              {weekDays.map((day, _dayIndex) => {
                // Filtrer les événements pour ce jour spécifique
                const dayEvents = courses.filter((course) => {
                  const courseStart = parseUTCAsLocal(course.start);
                  return courseStart.toDateString() === day.toDateString();
                });

                return (
                  <div
                    key={day.toISOString()}
                    className="flex-1 border-r border-gray-200 pt-6"
                  >
                    <div className="relative w-full h-full">
                      {/* Lignes horizontales pour chaque heure */}
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="border-t border-gray-100"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                        ></div>
                      ))}

                      {/* Rendu des cartes de cours */}
                      {dayEvents.map((course) => {
                        const startDate = parseUTCAsLocal(course.start);
                        const endDate = parseUTCAsLocal(course.end);

                        const startHour =
                          startDate.getHours() + startDate.getMinutes() / 60;
                        const duration =
                          (endDate.getTime() - startDate.getTime()) /
                          (1000 * 60 * 60);

                        // Calcul de la position (top) et de la hauteur (height)
                        const top = Math.max(
                          0,
                          (startHour - hours[0]) * HOUR_HEIGHT
                        );
                        const height = duration * HOUR_HEIGHT;

                        // Si le cours commence après la fin de la grille, on l'ignore
                        if (startHour > hours[hours.length - 1] + 1)
                          return null;

                        const cardColor = getCourseColor(
                          course.hash || course.subject || course.id
                        );

                        return (
                          // biome-ignore lint/a11y/useSemanticElements: styling constraints
                          <div
                            key={course.id}
                            onClick={() => setSelectedCourse(course)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                setSelectedCourse(course);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            className="absolute left-0.5 right-0.5 p-1 sm:p-2 text-[10px] sm:text-sm overflow-hidden border-l-4 rounded-md transition-all z-10 hover:brightness-95 cursor-pointer shadow-sm"
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              backgroundColor: `${cardColor}70`, // ~44% opacity
                              borderLeftColor: cardColor,
                              borderColor: `${cardColor}C0`,
                              color: "#111827", // Dark text
                            }}
                          >
                            <div
                              className="font-bold truncate text-[13px]"
                              style={{ color: "#111827" }}
                              title={course.subject}
                            >
                              {course.subject}
                            </div>
                            <div
                              className="text-[10px] font-medium mt-1 flex items-center gap-1 truncate"
                              style={{ color: "rgba(0, 0, 0, 0.7)" }}
                            >
                              <Clock size={11} className="shrink-0" />{" "}
                              {formatTime(startDate, locale)} -{" "}
                              {formatTime(endDate, locale)}
                            </div>
                            {height >= 60 && ( // N'afficher ces infos que si la carte est assez grande (> 1h)
                              <>
                                {course.location && (
                                  <div
                                    className="text-[10px] mt-1 flex items-center gap-1 truncate"
                                    style={{ color: "rgba(0, 0, 0, 0.7)" }}
                                    title={course.location}
                                  >
                                    <MapPin size={10} className="shrink-0" />{" "}
                                    {course.location}
                                  </div>
                                )}
                                {course.teacher && (
                                  <div
                                    className="text-[10px] mt-1 flex items-center gap-1 truncate"
                                    style={{ color: "rgba(0, 0, 0, 0.7)" }}
                                    title={course.teacher}
                                  >
                                    <User size={10} className="shrink-0" />{" "}
                                    {course.teacher}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Course Details Modal */}
      {selectedCourse && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedCourse(null)}
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: prevent close on click inside */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: prevent close on click inside */}
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {t("course_details.title")}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">
                  {t("course_details.subject")}
                </div>
                <div className="text-base font-bold text-gray-900">
                  {selectedCourse.subject}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-gray-400">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    {t("course_details.time")}
                  </div>
                  <div className="text-base text-gray-900 capitalize">
                    {parseUTCAsLocal(selectedCourse.start).toLocaleDateString(
                      locale,
                      {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      }
                    )}
                    <br />
                    {formatTime(parseUTCAsLocal(selectedCourse.start), locale)}{" "}
                    - {formatTime(parseUTCAsLocal(selectedCourse.end), locale)}
                  </div>
                </div>
              </div>

              {selectedCourse.location && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-gray-400">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">
                      {t("course_details.location")}
                    </div>
                    <div className="text-base text-gray-900">
                      {selectedCourse.location}
                    </div>
                  </div>
                </div>
              )}

              {selectedCourse.teacher && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-gray-400">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">
                      {t("course_details.teacher")}
                    </div>
                    <div className="text-base text-gray-900">
                      {selectedCourse.teacher}
                    </div>
                  </div>
                </div>
              )}

              {selectedCourse.description && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-gray-400">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">
                      {t("course_details.description")}
                    </div>
                    <div className="text-base text-gray-900 whitespace-pre-wrap">
                      {renderTextWithLinks(selectedCourse.description.trim())}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t("course_details.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
