'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { MessageSquare, X, Paperclip, Send, Download, Users, Search, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  created_at: string;
  user_id: string;
  receiver_id: string | null;
  text: string;
  file_url: string | null;
  file_name: string | null;
  file_size: string | null;
  employees?: {
    name: string;
    avatar_url?: string | null;
  };
}

interface Contact {
  id: string;
  name: string;
  position: string;
  avatar_url?: string | null;
}

export default function ChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'contacts' | 'chat'>('contacts');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null); // null means Team Chat
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();
  
  // Fetch contacts initially
  useEffect(() => {
    if (isOpen && contacts.length === 0) {
      fetchContacts();
    }
  }, [isOpen]);

  // Fetch messages whenever the view enters 'chat' or the selected contact changes
  useEffect(() => {
    if (isOpen && view === 'chat') {
      fetchMessages();
    }
  }, [isOpen, view, selectedContact]);

  // Subscribe to real-time additions
  useEffect(() => {
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new as Message;
        
        // Discard if not relevant to the current active chat context
        if (view === 'chat') {
          if (selectedContact) {
            // Must be between me and selectedContact
            const isRelevantDM = 
              (newMsg.user_id === user?.id && newMsg.receiver_id === selectedContact.id) ||
              (newMsg.user_id === selectedContact.id && newMsg.receiver_id === user?.id);
            if (!isRelevantDM) return;
          } else {
            // Must be a team chat message
            if (newMsg.receiver_id !== null) return;
          }
        }

        // Fetch sender details to populate name
        const { data: employeeData } = await supabase
          .from('employees')
          .select('name, avatar_url')
          .eq('id', newMsg.user_id)
          .single();
          
        if (employeeData) {
          newMsg.employees = employeeData;
        }

        setMessages((prev) => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view, selectedContact, user?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, position, avatar_url')
      .neq('id', user?.id || '') // exclude self
      .order('name', { ascending: true });
      
    if (error) {
      console.error('Error fetching contacts:', error.message || error);
      return;
    }
    setContacts(data || []);
  };

  const fetchMessages = async () => {
    let query = supabase
      .from('messages')
      // Note: we use !inner or explicitly name the FK if there are ambiguities. 
      // Typically `employees!messages_user_id_fkey(name)` is safest when multiple FKs exist.
      .select('*, employees!messages_user_id_fkey(name, avatar_url)')
      .order('created_at', { ascending: true })
      .limit(50);
      
    if (selectedContact) {
      // Direct message logic
      query = query.or(`and(user_id.eq.${user?.id},receiver_id.eq.${selectedContact.id}),and(user_id.eq.${selectedContact.id},receiver_id.eq.${user?.id})`);
    } else {
      // Team chat logic
      query = query.is('receiver_id', null);
    }

    const { data, error } = await query;
      
    if (error) {
      console.error('Error fetching messages:', error.message || error);
      return;
    }
    setMessages(data || []);
    scrollToBottom();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user) return;

    setIsUploading(true);
    let fileUrl = null;
    let fileName = null;
    let fileSize = null;

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, selectedFile);
          
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = selectedFile.name;
        fileSize = formatFileSize(selectedFile.size);
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          receiver_id: selectedContact ? selectedContact.id : null,
          text: newMessage.trim(),
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize
        });

      if (error) throw error;

      setNewMessage('');
      handleRemoveFile();
      scrollToBottom();
      
    } catch (error: any) {
      console.error('Error sending message:', error.message || error);
      alert('Failed to send message: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  };

  const openContact = (contact: Contact | null) => {
    setSelectedContact(contact);
    setView('chat');
  };

  const backToContacts = () => {
    setView('contacts');
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <>
      {/* Chat Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition z-40 group flex items-center justify-center transform hover:scale-105"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Floating Window */}
      <div 
        className={`fixed sm:bottom-24 sm:right-6 bottom-0 right-0 w-full sm:w-[380px] h-[100dvh] sm:h-[600px] sm:max-h-[calc(100vh-120px)] bg-white dark:bg-slate-900 shadow-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out z-50 flex flex-col overflow-hidden ${
          isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 sm:scale-95 pointer-events-none'
        }`}
      >
        
        {/* -- VIEW: CONTACTS -- */}
        {view === 'contacts' && (
          <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Messages
              </h2>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search team..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Team Chat Main Button */}
              <div className="p-2">
                <button 
                  onClick={() => openContact(null)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Team Chat</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Company-wide public channel</p>
                  </div>
                </button>
              </div>

              <div className="px-4 py-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Direct Messages</h3>
              </div>

              <div className="px-2 space-y-1 pb-4">
                {filteredContacts.map(contact => (
                  <button 
                    key={contact.id}
                    onClick={() => openContact(contact)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-sm font-bold border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden">
                      {contact.avatar_url ? (
                        <img src={contact.avatar_url} alt={contact.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(contact.name)
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">{contact.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{contact.position}</p>
                    </div>
                  </button>
                ))}
                {filteredContacts.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-sm">No team members found.</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* -- VIEW: CHAT -- */}
        {view === 'chat' && (
          <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/50">
              <button 
                onClick={backToContacts} 
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 overflow-hidden flex items-center gap-2">
                {selectedContact ? (
                 <>
                   <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                     {selectedContact.avatar_url ? (
                       <img src={selectedContact.avatar_url} alt={selectedContact.name} className="w-full h-full object-cover" />
                     ) : (
                       getInitials(selectedContact.name)
                     )}
                   </div>
                   <div className="truncate">
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-white truncate">{selectedContact.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedContact.position}</p>
                   </div>
                 </>
                ) : (
                  <>
                   <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                     <Users className="w-4 h-4" />
                   </div>
                   <div>
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Team Chat</h2>
                   </div>
                  </>
                )}
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900 space-y-6 flex flex-col custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center flex-col text-slate-400 dark:text-slate-500">
                  <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.user_id === user.id;
                  const senderName = isMine ? 'You' : (msg.employees?.name || 'Unknown');
                  
                  return (
                    <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col gap-1 max-w-[85%] ${isMine ? 'items-end' : 'items-start'}`}>
                        
                        <div className={`flex items-center gap-2 mb-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isMine && (
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold border border-blue-200 shrink-0 overflow-hidden">
                              {msg.employees?.avatar_url ? (
                                <img src={msg.employees.avatar_url} alt={senderName} className="w-full h-full object-cover" />
                              ) : (
                                getInitials(senderName)
                              )}
                            </div>
                          )}
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {senderName} • {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>

                        <div 
                          className={`p-3 text-sm shadow-sm border ${
                            isMine 
                              ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm border-blue-700' 
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {msg.text && <p className="mb-2 whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                          
                          {/* File Attachment Card */}
                          {msg.file_url && (
                            <div className={`flex items-center gap-3 p-2 rounded-xl border ${
                                isMine 
                                  ? 'bg-blue-700/50 border-blue-500/30' 
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className={`p-2 rounded-lg ${isMine ? 'bg-blue-500/50 text-white' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                <Paperclip className="w-5 h-5" />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="font-medium truncate text-[13px]">{msg.file_name}</p>
                                <p className={`text-[11px] ${isMine ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {msg.file_size}
                                </p>
                              </div>
                              <a 
                                href={msg.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`p-1.5 rounded-lg transition ${
                                  isMine 
                                    ? 'hover:bg-blue-500/50 text-blue-100 hover:text-white' 
                                    : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                                title="Download/Preview"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              {selectedFile && (
                <div className="flex items-center gap-2 mb-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent w-16" />
                  <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-300 truncate flex-1 leading-none">
                    {selectedFile.name}
                  </span>
                  <button 
                    onClick={handleRemoveFile} 
                    className="text-blue-400 hover:text-red-500 p-1 rounded-md hover:bg-blue-100/50 transition flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex flex-col gap-2 relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                
                <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-xl transition flex-shrink-0 ${
                      selectedFile 
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' 
                        : 'text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                    title="Add attachment"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <textarea 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={`Message ${selectedContact ? selectedContact.name : 'Team Chat'}...`}
                    className="flex-1 max-h-32 min-h-[40px] px-2 py-2.5 bg-transparent focus:outline-none text-sm resize-none dark:text-white"
                    rows={1}
                  />
                  
                  <button 
                    type="submit" 
                    disabled={isUploading || (!newMessage.trim() && !selectedFile)}
                    className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed mb-0.5 mr-0.5"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 pointer-events-none" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  );
}
