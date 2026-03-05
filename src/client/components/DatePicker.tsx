import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface DatePickerProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

export default function DatePicker({
  selectedDate,
  onSelect,
  onClose,
}: DatePickerProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language || "fr-FR";

  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Adjust for Monday as first day of week (0 = Sunday in JS, we want 0 = Monday)
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    // Previous month padding
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = offset - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDate - i,
        currentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDate - i),
      });
    }

    // Current month
    for (let i = 1; i <= lastDate; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        currentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return days;
  }, [viewDate]);

  const monthName = viewDate.toLocaleDateString(locale, { month: "long" });
  const year = viewDate.getFullYear();

  const changeMonth = (offset: number) => {
    setViewDate(
      new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1)
    );
  };

  const weekDayLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < 7; i++) {
      labels.push(
        new Date(2024, 0, 1 + i).toLocaleDateString(locale, {
          weekday: "short",
        })
      );
    }
    return labels;
  }, [locale]);

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-72 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-semibold text-gray-900 capitalize">
          {monthName} {year}
        </div>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDayLabels.map((label) => (
          <div
            key={label}
            className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-tighter"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((dayObj) => {
          const isSelected =
            dayObj.date.toDateString() === selectedDate.toDateString();
          const isToday =
            dayObj.date.toDateString() === new Date().toDateString();
          const key = dayObj.date.toISOString();

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                onSelect(dayObj.date);
                onClose();
              }}
              className={`
                h-8 w-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all
                ${!dayObj.currentMonth ? "text-gray-300" : "text-gray-700 hover:bg-gray-100"}
                ${isSelected ? "bg-[#37B7D5] text-white hover:bg-[#37B7D5] shadow-lg shadow-[#37B7D5]/20" : ""}
                ${isToday && !isSelected ? "text-[#37B7D5] font-bold ring-1 ring-[#37B7D5]/30" : ""}
              `}
            >
              {dayObj.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
