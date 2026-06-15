import ConversationItem from './ConversationItem';
import { useAppSelector } from '../../store/hooks'; // Need this to identify the logged-in user

export default function ConversationList({ conversations, activeId, onSelect, searchQuery }) {
  // Grab the logged-in user to calculate who the "other" person is in 1:1 chats
  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = String(currentUser?._id || currentUser?.id || '');

  // Helper function to safely get the display name for ANY chat
  const getChatName = (chat) => {
    if (chat.type === 'group') return chat.chatName || 'Group Chat';
    
    // For 1:1 chats, find the participant that is NOT the current user
    const otherUser = chat.participants?.find((p) => String(p?._id || p?.id || '') !== currentUserId);
    const safeUser = otherUser || chat.participants?.[0];
    return safeUser?.username || 'Unknown User';
  };

  // 1. Update 'dm' to '1:1' to match your MongoDB schema
  const dms = conversations.filter((c) => c.type === '1:1');
  const groups = conversations.filter((c) => c.type === 'group');

  // 2. Update the filter to use the dynamic chat name
  const filterConversations = (list) =>
    list.filter((c) => {
      const displayName = getChatName(c);
      return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });

  const filteredDMs = filterConversations(dms);
  const filteredGroups = filterConversations(groups);

  if (filteredDMs.length === 0 && filteredGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
        <p>No conversations found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto flex-1 px-2 pb-4 scrollbar-thin">
      {filteredDMs.length > 0 && (
        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-3 py-2 mt-1">
            Direct Messages
          </p>
          <div className="flex flex-col gap-0.5">
            {filteredDMs.map((conv) => (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                isActive={activeId === conv._id}
                onClick={() => onSelect(conv)}
                // Optional: You might need to pass the calculated name down here 
                // if ConversationItem is also still trying to read `conv.name`
                // displayName={getChatName(conv)} 
              />
            ))}
          </div>
        </div>
      )}

      {filteredGroups.length > 0 && (
        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-3 py-2 mt-3">
            Groups
          </p>
          <div className="flex flex-col gap-0.5">
            {filteredGroups.map((conv) => (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                isActive={activeId === conv._id}
                onClick={() => onSelect(conv)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
