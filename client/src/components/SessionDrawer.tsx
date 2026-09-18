import React from 'react';
import { ConversationSession } from '../types';
import { Plus, Trash2, X, MessageSquare, Clock } from 'lucide-react';

interface SessionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ConversationSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

export const SessionDrawer: React.FC<SessionDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession
}) => {
  if (!isOpen) return null;

  return (
    <div className="session-drawer-overlay">
      <div className="session-drawer-panel">
        {/* Drawer Header */}
        <div className="session-header">
          <div className="session-title-group">
            <Clock size={20} />
            <h2 className="session-heading">Conversation History</h2>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close history">
            <X size={20} />
          </button>
        </div>

        {/* New Session Button */}
        <button className="new-session-btn" onClick={onNewSession}>
          <Plus size={18} /> New Conversation
        </button>

        {/* Sessions List */}
        <div className="sessions-list">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const messageCount = session.messages.length;
            const dateFormatted = new Date(session.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric'
            });

            // Find snippet of last message
            const lastMsg = session.messages[session.messages.length - 1]?.text || 'No messages';
            const snippet = lastMsg.length > 55 ? lastMsg.substring(0, 55) + '...' : lastMsg;

            return (
              <div
                key={session.id}
                className={`session-card ${isActive ? 'active-session' : ''}`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="session-card-body">
                  <div className="session-top-row">
                    <span className="session-name">
                      <MessageSquare size={14} /> {session.title}
                    </span>
                    <span className="session-date">{dateFormatted}</span>
                  </div>
                  <p className="session-snippet">{snippet}</p>
                  <span className="session-msg-badge">{messageCount} messages</span>
                </div>

                {sessions.length > 1 && (
                  <button
                    className="session-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    title="Delete conversation"
                    aria-label="Delete conversation"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
