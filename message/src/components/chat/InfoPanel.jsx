import { X, Users, Bell, Trash2, UserPlus } from 'lucide-react';
import Avatar from '../common/Avatar';

const statusLabel = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
};

export default function InfoPanel({ conversation, members, onClose }) {
  const { type, username, description, memberCount } = conversation;

  return (
    <div className="w-72 flex-shrink-0 bg-white border-l border-slate-100 flex flex-col h-full">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
        <h3 className="font-semibold text-slate-700 text-sm">
          {type === 'group' ? 'Group Info' : 'Profile'}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-6 py-8 border-b border-slate-100">
          {type === 'group' ? (
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Users size={36} className="text-blue-500" />
            </div>
          ) : (
            <div className="mb-4">
              <Avatar
                username={username}
                size="lg"
                status={conversation.status}
                showStatus
              />
            </div>
          )}
          <h2 className="font-bold text-slate-800 text-lg text-center">{username}</h2>
          {description && (
            <p className="text-sm text-slate-500 text-center mt-1">{description}</p>
          )}
          {type === 'dm' && conversation.status && (
            <span className={`text-xs mt-2 font-medium ${
              conversation.status === 'online' ? 'text-emerald-500' :
              conversation.status === 'away' ? 'text-amber-500' :
              conversation.status === 'busy' ? 'text-rose-500' :
              'text-slate-400'
            }`}>
              {statusLabel[conversation.status]}
            </span>
          )}
          {type === 'group' && (
            <p className="text-xs text-slate-400 mt-1">{memberCount} members</p>
          )}
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition text-sm font-medium">
              <Bell size={15} />
              Mute
            </button>
            {type === 'group' && (
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition text-sm font-medium">
                <UserPlus size={15} />
                Add
              </button>
            )}
          </div>
        </div>

        {type === 'group' && members && members.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Members</p>
            <div className="flex flex-col gap-1">
              {members.map((member) => (
                <div key={member._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition">
                  <Avatar username={member.username} size="sm" status={member.status} showStatus />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {member._id === 'me' ? `${member.username} (You)` : member.username }
                    </p>
                    <p className={`text-xs capitalize ${
                      member.status === 'online' ? 'text-emerald-500' :
                      member.status === 'away' ? 'text-amber-500' :
                      member.status === 'busy' ? 'text-rose-500' :
                      'text-slate-400'
                    }`}>
                      {member.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-3 mt-2">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition text-sm font-medium border border-rose-100">
            <Trash2 size={15} />
            {type === 'group' ? 'Leave group' : 'Delete conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}
