import { MessageCircle } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eefaf5_100%)] text-center px-8">
      <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center mb-6 shadow-2xl shadow-emerald-100">
        <MessageCircle size={40} className="text-emerald-500" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-2">Your messages</h2>
      <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
        Select a conversation from the sidebar to start chatting, or search for someone new.
      </p>
    </div>
  );
}
