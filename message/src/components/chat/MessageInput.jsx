import { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Mic, X, File as FileIcon, Image as ImageIcon, Square, SendHorizontal } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: '😀',
    emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷']
  },
  {
    name: 'Hands',
    icon: '👍',
    emojis: ['👋','🤚','🖐️','✋','🖖','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪']
  },
  {
    name: 'Hearts',
    icon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟']
  },
  {
    name: 'Items',
    icon: '🌟',
    emojis: ['🐶','🐱','🦁','🐮','🐷','🐸','🐔','🐧','🐦','🐝','🐛','🦋','🐌','🍎','🍌','🍇','🍓','🍒','🍑','🍍','🥥','🥝','🍔','🍟','🍕','🌭','🥪','🌮','🍺','🍻','🍷','🍹','🌟','⭐','✨','⚡','💥','🔥']
  }
];

export default function MessageInput({ onSend, placeholder = 'Type a message...', isUploading = false }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  
  // 2. NEW STATES: For holding the file and its preview URL
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for the hidden file input
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const handleSend = () => {
    const trimmed = text.trim();
    // 3. UPDATED: Allow send if there is text OR a file
    if (!trimmed && !selectedFile) return;
    
    // Pass both to the parent component
    onSend(trimmed, selectedFile);
    
    // Reset everything
    setText('');
    removeFile();
    setShowEmoji(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  };

  const insertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // --- NEW FILE HANDLING FUNCTIONS ---
  const handlePaperclipClick = () => {
    fileInputRef.current?.click(); // Simulates a click on the hidden file input
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: Check file size (15MB limit matching backend)
    if (file.size > 15 * 1024 * 1024) {
      alert("File is too large. Maximum size is 15MB.");
      return;
    }

    setSelectedFile(file);

    // If it's an image, create a preview URL so we can show a thumbnail
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null); // Not an image, we'll just show the file name
    }

    // Reset the input value so the user can select the same file again if they remove it
    e.target.value = '';
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showEmoji) return;
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmoji]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordingChunksRef.current.length === 0) return;

        const audioBlob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        onSend('', audioFile);
      };

      recorder.start();
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      window.alert('Microphone permission is required to send a voice message.');
    }
  };

  const handleMicClick = () => {
    if (isUploading) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    startRecording();
  };

  return (
    <div className="px-4 py-3 bg-white/80 dark:bg-slate-900/90 border-t border-white/80 dark:border-slate-800 relative backdrop-blur-xl">
      
      {/* --- NEW: FILE PREVIEW STRIP --- */}
      {selectedFile && (
        <div className="mb-3 px-3 py-2 bg-white border border-emerald-100 rounded-2xl flex items-center justify-between gap-3 w-fit max-w-full shadow-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                {selectedFile.type.startsWith('video/') ? <ImageIcon size={20} /> : <FileIcon size={20} />}
              </div>
            )}
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</span>
              <span className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
          <button onClick={removeFile} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="mb-2 p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl w-72 h-64 absolute bottom-16 shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Tabs header */}
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
            {EMOJI_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(idx)}
                className={`p-1.5 rounded-xl text-sm transition-colors ${
                  activeCategory === idx 
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title={cat.name}
              >
                <span>{cat.icon}</span>
              </button>
            ))}
          </div>
          {/* Grid content */}
          <div className="flex-1 overflow-y-auto grid grid-cols-6 gap-2 pr-1">
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertEmoji(emoji);
                }}
                className="text-2xl hover:scale-125 transition-transform flex items-center justify-center p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* --- NEW: HIDDEN FILE INPUT --- */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*,video/*,.pdf,.doc,.docx" // Restrict allowed types
        />

        <button 
          type="button"
          onClick={handlePaperclipClick}
          disabled={isUploading}
          className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition flex-shrink-0 disabled:opacity-50" 
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>

        <div ref={emojiPickerRef} className="flex-1 flex items-end bg-white dark:bg-slate-800 rounded-3xl px-4 py-2.5 gap-2 border border-slate-100 dark:border-slate-700 shadow-inner shadow-slate-100 dark:shadow-slate-900/30">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={isUploading}
            rows={1}
            className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm outline-none resize-none leading-relaxed max-h-28 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            disabled={isUploading}
            className={`p-1 rounded-lg transition flex-shrink-0 self-end disabled:opacity-50 ${showEmoji ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Smile size={18} />
          </button>
        </div>

        {/* --- UPDATED: SEND BUTTON LOGIC --- */}
        {(text.trim() || selectedFile) ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={isUploading}
            className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-2xl transition shadow-lg shadow-emerald-200 flex-shrink-0 disabled:opacity-50 flex items-center justify-center"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : <SendHorizontal size={18} />}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isUploading}
            title={isRecording ? `Stop recording (${recordingTime}s)` : 'Record voice message'}
            className={`p-2 rounded-lg transition flex-shrink-0 disabled:opacity-50 ${
              isRecording
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
            }`}
          >
            {isRecording ? <Square size={18} /> : <Mic size={18} />}
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center mt-1.5">
        Press <kbd className="text-xs bg-slate-100 px-1 py-0.5 rounded">Enter</kbd> to send &middot; <kbd className="text-xs bg-slate-100 px-1 py-0.5 rounded">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
