import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
      <input
        type="text"
        placeholder="Search conversations..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/85 text-slate-800 placeholder-slate-400 rounded-2xl py-2.5 pl-9 pr-8 text-sm outline-none border border-white shadow-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
