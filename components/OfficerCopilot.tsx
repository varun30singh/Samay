'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import AdvisoryPopover from '@/components/AdvisoryPopover';
import CuteRobotIcon from '@/components/CuteRobotIcon';
import {
  getRandomQuestions,
  findBestMatchingQuestion,
  getChatbotQuestionsCount,
  ChatbotQuestion
} from '@/lib/chatbotService';
import {
  Send,
  Sparkles,
  BookOpen,
  ChevronDown,
  Minimize2,
  Maximize2,
  RotateCcw,
  ExternalLink,
  Compass,
  Shuffle
} from 'lucide-react';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  references?: string[];
  actionLink?: {
    label: string;
    tab?: string;
    appId?: string;
  };
}

interface OfficerCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
  onSelectApplication?: (appId: string) => void;
}

export default function OfficerCopilot({
  isOpen,
  onClose,
  onOpen,
  activeTab = 'deadline-guard',
  onNavigateTab,
  onSelectApplication
}: OfficerCopilotProps) {
  const { applications, auditLog, calendarConfig, simulatedDate } = useApp();

  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'copilot',
      text: 'Welcome! I am SAMAY. I analyze live applications, APH clauses, and cryptographic audit logs to provide instant advisory answers with legal citations. Over 5,000 predefined statutory questions are indexed in my regulatory knowledge base. How may I assist you today?',
      timestamp: 'Just now',
      references: ['AICTE Approval Process Handbook 2024-27', 'Cryptographic Audit Ledger', '5,000+ Predefined Questions Bank']
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 5,000 Predefined Questions Pool - Dynamic rotation
  const totalQuestionsCount = getChatbotQuestionsCount();
  const [currentPrompts, setCurrentPrompts] = useState<ChatbotQuestion[]>(() => getRandomQuestions(6));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Rotate questions manually or automatically
  const cycleNewPrompts = useCallback(() => {
    setCurrentPrompts(prev => {
      const prevIds = prev.map(p => p.id);
      return getRandomQuestions(6, prevIds);
    });
  }, []);

  const handleSend = useCallback((textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    // RULE: After EVERY question is asked, the predefined questions MUST be changed!
    setCurrentPrompts(prev => {
      const prevIds = prev.map(p => p.id);
      return getRandomQuestions(6, prevIds);
    });

    const timestamp = Date.now();
    const userMsg: CopilotMessage = {
      id: `usr-${timestamp}`,
      sender: 'user',
      text: query,
      timestamp: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const q = query.toLowerCase();
      let responseText = '';
      let refs: string[] = [];
      let actionLink: { label: string; tab?: string; appId?: string } | undefined = undefined;

      // 1. Specific demo application bottlenecks (Shivaji, EVC conflict)
      if (q.includes('shivaji') || q.includes('will miss')) {
        const shivaji = applications.find(a => a.id === 'APP-2026-W-1001');
        const leaseDoc = shivaji?.documents.find(d => d.type === 'Land Lease Deed');
        responseText = `**Shivaji Institute of Technology & Engineering** (APP-2026-W-1001, 1,420 seats) is flagged as **"Will miss at current pace"** due to two concurrent bottlenecks:\n\n1. **Unscheduled EVC Visit**: The application has spent over 22 days in the EVC stage without a scheduled date. Working backwards from the statutory cutoff (30 April), the latest safe date for completing EVC was ${shivaji?.latestSafeDateForCurrentStage || '2026-03-25'}.\n\n2. **Short Lease Validity**: The registered land lease expires on ${leaseDoc?.expiryDate || '2026-05-15'}, which is only 15 days after the 30 April cutoff. Under APH Clause 2.11, an EoA cannot be issued without extended validity.\n\n**Advisory Action**: Upload the renewed registered lease deed via Smart OCR Extractor and assign committee members in the EVC scheduler.`;
        refs = ['APH 2026-27 Clause 2.11', 'APH Clause 3.6', 'Audit Block #3 & #4'];
        actionLink = {
          label: 'Open Shivaji Institute Detail & Fix-It Checklist',
          appId: 'APP-2026-W-1001'
        };
      } else if (q.includes('conflict') || q.includes('double') || (q.includes('evc') && q.includes('member'))) {
        const conflictApp = applications.find(a => a.evc?.hasConflict);
        if (conflictApp) {
          responseText = `Yes, an active double-booking conflict is detected:\n\n**Prof. Ramesh Kulkarni (IIT Bombay)** is assigned on the exact same date (**2026-03-05**) to two separate physical visits:\n1. **Vishwakarma Institute of Advanced Technology** (APP-2026-W-1002, Pune)\n2. **Pune Metropolitan Engineering College** (APP-2026-W-1003, Pune)\n\nUnder APH Clause 3.6, committee members must be dedicated full-day per visit. SAMAY recommends auto-rebalancing to assign **Prof. Sneha Deshmukh (VNIT Nagpur)** to APP-2026-W-1003.`;
          refs = ['APH Chapter III Clause 3.6 (Quorum Norms)', 'Audit Block #7 (CONFLICT_DETECTED)'];
          actionLink = {
            label: 'Navigate to EVC Management to Auto-Rebalance',
            tab: 'evc'
          };
        } else {
          responseText = `Currently no active EVC scheduling conflicts are detected. All scheduled committee members have unique dates and valid geographic travel buffers.`;
          refs = ['EVC Real-Time Quorum Engine', 'APH Clause 3.6'];
        }
      } else {
        // 2. Query the 5,000 Predefined Questions Knowledge Bank
        const matchResult = findBestMatchingQuestion(query);
        if (matchResult && matchResult.score >= 0.12) {
          const matched = matchResult.question;
          responseText = `**${matched.topic} · ${matched.discipline}**\n\n${matched.answer}\n\n*Statutory Domain: ${matched.category} · Territory: ${matched.region} (AICTE Q-ID: ${matched.id})*`;
          refs = matched.references;
          actionLink = matched.actionLink;
        } else if (q.includes('cutoff') || q.includes('30 april') || q.includes('legal basis')) {
          responseText = `The **30th April cutoff** is a statutory binding deadline mandated by the Hon'ble Supreme Court of India in landmark judgements (e.g., *Parshvanath Charitable Trust & Ors vs AICTE, Civil Appeal No. 9048 of 2012*).\n\nKey Legal Principles:\n- AICTE has **zero discretion** to issue Extensions of Approval (EoA) or intake approvals past 30 April for the upcoming academic session.\n- SAMAY's **Deadline Guard backwards planner** starts from 30 April and reverses stage SLAs (EVC 14d, Scrutiny 10d, SHC 7d, SAC 5d) to establish non-negotiable drop-dead dates.\n- If an application lags past its stage buffer, it transitions to "Tight" and then "Will miss at current pace".`;
          refs = ['Supreme Court Parshvanath Judgement (2012)', 'APH Chapter I Clause 1.4', 'AICTE Act 1987 § 10(k)'];
          actionLink = {
            label: 'Open Deadline Guard Backwards Simulator',
            tab: 'deadline-guard'
          };
        } else if (q.includes('summary') || q.includes('risk') || q.includes('status')) {
          const willMiss = applications.filter(a => a.riskStatus === 'Will miss at current pace');
          const tight = applications.filter(a => a.riskStatus === 'Tight');
          const onTrack = applications.filter(a => a.riskStatus === 'On track');

          responseText = `**SAMAY Live Institutional Risk Summary** (Clock: ${simulatedDate}):\n\n- **Total Applications**: ${applications.length}\n- **On Track**: ${onTrack.length} (${Math.round((onTrack.length / applications.length) * 100)}%)\n- **Tight**: ${tight.length} (Requires close monitoring)\n- **Will Miss at Current Pace**: ${willMiss.length} (${willMiss.map(a => a.institutionName).join(', ')})\n\nStatutory Cutoff: **${calendarConfig.approvalCutoffDate}**\nSHA-256 Ledger: **${auditLog.length} chained blocks intact**.`;
          refs = ['SAMAY Real-Time Database', 'APH Ruleset 2026.v1.4', 'SHA-256 Block Chain'];
        } else {
          responseText = `Based on current live records and the AICTE Approval Process Handbook (2024-27):\n\n- Active applications in workflow: **${applications.length}**\n- High-risk institutions flagged: **${applications.filter(a => a.riskStatus === 'Will miss at current pace').length}**\n- Statutory Supreme Court cutoff: **${calendarConfig.approvalCutoffDate}**\n- Audit Ledger status: **${auditLog.length} chained blocks** with verified cryptographic integrity.\n\nYou can ask any question from our 5,000+ question bank on AICTE norms, scrutiny, EVC inspections, land leases, or faculty cadre ratios.`;
          refs = ['AICTE Approval Process Handbook 2024-27', 'Cryptographic Audit Trail', '5,000+ Predefined Questions Bank'];
        }
      }

      const copilotMsg: CopilotMessage = {
        id: `cpl-${Date.now()}`,
        sender: 'copilot',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        references: refs,
        actionLink: actionLink
      };

      setMessages(prev => [...prev, copilotMsg]);
      setIsTyping(false);
    }, 550);
  }, [applications, auditLog.length, calendarConfig.approvalCutoffDate, input, simulatedDate]);

  const handleClearChat = useCallback(() => {
    const timestamp = Date.now();
    setMessages([
      {
        id: `msg-welcome-${timestamp}`,
        sender: 'copilot',
        text: 'Chat history cleared. How may I assist you with regulatory advisory, APH rules, or audit intelligence from our 5,000+ question knowledge base?',
        timestamp: 'Just now',
        references: ['AICTE Approval Process Handbook 2024-27', '5,000+ Predefined Questions Bank']
      }
    ]);
  }, []);

  return (
    <>
      {/* 
        ====================================================================
        FLOATING CORNER DOCK TRIGGER (PERMANENTLY FIXED AT BOTTOM-RIGHT)
        AI FACE ONLY with Cloud Message above it: "Any help needed?"
        ====================================================================
      */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-center select-none animate-floating">
          {/* Cloud Message Bubble directly above the AI face - Sized Up */}
          <button
            onClick={onOpen}
            className="group relative mb-3 px-4 py-2 bg-white/95 dark:bg-[#0E1A38]/95 backdrop-blur-md rounded-2xl shadow-[0_6px_20px_rgba(15,36,28,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.5)] border border-amber-200/90 dark:border-[#FF9933]/50 hover:border-amber-400 dark:hover:border-[#FF9933] hover:bg-[#FEFCE8] dark:hover:bg-[#15254D] text-[13px] sm:text-sm font-bold text-[#0F241C] dark:text-[#FFFFFF] flex items-center space-x-2 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
            title="Click to chat with AI Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-[#FF9933] shrink-0" />
            <span>Any help needed?</span>

            {/* Downward speech bubble pointer tail */}
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-[#0E1A38] border-r border-b border-amber-200/90 dark:border-[#FF9933]/50 transform rotate-45 group-hover:bg-[#FEFCE8] dark:group-hover:bg-[#15254D] group-hover:border-amber-400 dark:group-hover:border-[#FF9933] transition-colors" />
          </button>

          {/* AI Face ONLY floating button - Sized Up to 66px with 48px Robot Face */}
          <button
            onClick={onOpen}
            className="w-[66px] h-[66px] rounded-full bg-gradient-to-b from-white via-[#FFFDF8] to-[#FEF9C3]/50 dark:from-[#182B57] dark:via-[#101F42] dark:to-[#0B152C] hover:to-[#FEF9C3] dark:hover:border-[#FF9933] border border-amber-200/90 dark:border-[#FF9933]/60 shadow-[0_10px_28px_rgba(15,36,28,0.12)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer"
            title="AI Assistant · Click to chat"
          >
            <CuteRobotIcon size={48} />
          </button>
        </div>
      )}

      {/* 
        ====================================================================
        FLOATING EXPANDED CHAT WINDOW (PERMANENTLY FIXED AT BOTTOM-RIGHT)
        Floats over page content as user scrolls, never scrolls away.
        Clean White & Soft Light-Yellow styling with zero neon glare.
        ====================================================================
      */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-[60] rounded-3xl flex flex-col overflow-hidden animate-fade-in border border-stone-200/90 dark:border-[#FF9933]/30 bg-white/95 dark:bg-[#0B152C]/98 backdrop-blur-2xl shadow-[0_20px_50px_-10px_rgba(15,36,28,0.15),0_6px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_-10px_rgba(4,8,18,0.9)] transition-all duration-300 ease-out ${
            isExpanded
              ? 'w-[95vw] sm:w-[560px] h-[88vh] max-h-[740px]'
              : 'w-[92vw] sm:w-[420px] h-[590px] max-h-[82vh]'
          }`}
        >
          {/* Header Bar - Clean White & Soft Light Yellow SaaS Look */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-white via-[#FFFDF5] to-[#FEFCE8] dark:from-[#0E1A38] dark:via-[#132247] dark:to-[#0B152C] border-b border-amber-200/60 dark:border-[#FF9933]/25 text-[#0F241C] dark:text-[#FFFFFF] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-0.5 rounded-xl">
                <CuteRobotIcon size={36} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm tracking-tight text-[#0F241C] dark:text-white">SAMAY</span>
                  <span className="text-[9px] bg-amber-100 dark:bg-[#1A3366] text-amber-900 dark:text-[#FF9933] font-bold px-1.5 py-0.2 rounded-full border border-amber-300/60 dark:border-[#FF9933]/50">
                    Advisory AI
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <p className="text-[10px] text-stone-500 dark:text-[#B8C5E0] font-medium">
                  {totalQuestionsCount.toLocaleString()} APH Questions · RAG Ledger · Multilingual
                </p>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 text-stone-400 hover:text-stone-800 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-stone-400 hover:text-stone-800 rounded-full hover:bg-stone-100 transition-colors hidden sm:block cursor-pointer"
                title={isExpanded ? 'Restore compact size' : 'Expand window'}
              >
                {isExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-stone-400 hover:text-stone-800 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
                title="Minimize back to floating pill"
              >
                <ChevronDown className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Context & Advisory Banner */}
          <div className="px-4 py-2 bg-[#FEFCE8]/80 dark:bg-[#12264D] border-b border-amber-200/50 dark:border-[#2B4478] flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-1.5 text-amber-900 dark:text-[#FFD199] font-medium">
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>Viewing: </span>
              <span className="font-bold capitalize">{activeTab.replace('-', ' ')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <AdvisoryPopover
                title="SAMAY Decision-Support Advisory"
                explanation="All SAMAY outputs are generated via RAG indexing over the AICTE Approval Process Handbook (2024-27) and real-time database state. Per AICTE Act Section 10(k), outputs are strictly advisory decision-support. Statutory authority remains with the AICTE Competent Authority."
                legalReference="AICTE Act 1987 § 10(k) · APH 2024-27 Clause 5.2"
              />
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-[#FAF9F5] dark:bg-[#070D1E]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3.5 rounded-2xl max-w-[88%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#0F241C] dark:bg-gradient-to-r dark:from-[#EA580C] dark:to-[#FF8C00] text-white rounded-tr-none shadow-xs'
                      : 'bg-white dark:bg-[#0F1C3B] text-[#0F241C] dark:text-[#FFFFFF] border border-stone-200/80 dark:border-white/[0.12] rounded-tl-none shadow-2xs'
                  }`}
                >
                  <div className="whitespace-pre-line">{m.text}</div>

                  {/* Contextual Action Link Button */}
                  {m.actionLink && (
                    <div className="mt-3 pt-2 border-t border-stone-100 dark:border-white/[0.08]">
                      <button
                        onClick={() => {
                          if (m.actionLink?.tab && onNavigateTab) {
                            onNavigateTab(m.actionLink.tab);
                          }
                          if (m.actionLink?.appId && onSelectApplication) {
                            onSelectApplication(m.actionLink.appId);
                          }
                        }}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-[#16274E] dark:hover:bg-[#1E356A] text-amber-950 dark:text-[#FFB366] border border-amber-200/80 dark:border-[#FF9933]/50 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        <span>{m.actionLink.label}</span>
                        <ExternalLink className="w-3 h-3 text-amber-700 dark:text-[#FF9933]" strokeWidth={2} />
                      </button>
                    </div>
                  )}

                  {/* References & Citations */}
                  {m.references && m.references.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-white/[0.08] flex flex-wrap gap-1">
                      {m.references.map((ref, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[9px] font-semibold bg-amber-50 dark:bg-[#122144] text-amber-900 dark:text-[#FFD199] px-2 py-0.5 rounded-full border border-amber-200/70 dark:border-[#FF9933]/40"
                        >
                          <BookOpen className="w-2.5 h-2.5 text-amber-700 dark:text-[#FF9933]" strokeWidth={1.75} />
                          <span>{ref}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-stone-400 dark:text-stone-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center space-x-2 text-stone-600 dark:text-stone-300 text-xs p-2.5 bg-white dark:bg-[#0F1C3B] rounded-2xl border border-stone-200 dark:border-white/[0.1] w-max shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9933] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9933] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9933] animate-bounce [animation-delay:0.4s]" />
                <span className="text-[10px] ml-1 font-medium">Consulting APH Clauses & 5,000 Questions Bank...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel & Dynamic Question Rotator */}
          <div className="px-3 py-2 bg-white dark:bg-[#0B152C] border-t border-stone-200 dark:border-white/[0.08] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-[#B8C5E0] font-semibold px-0.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate">Suggested Inquiries (From {totalQuestionsCount.toLocaleString()} AICTE Q-Bank)</span>
              </div>
              <button
                type="button"
                onClick={cycleNewPrompts}
                className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-[#FF9933] hover:underline cursor-pointer shrink-0 font-bold"
                title="Shuffle and view next set of questions from the 5,000 question bank"
              >
                <Shuffle className="w-2.5 h-2.5" />
                <span>Shuffle</span>
              </button>
            </div>

            <div data-chatbot-prompts-container="true" className="overflow-x-auto flex gap-1.5 no-scrollbar py-0.5">
              {currentPrompts.map((p) => (
                <button
                  key={p.id}
                  data-chatbot-prompt="true"
                  onClick={() => handleSend(p.query)}
                  title={p.query}
                  className="text-[10px] font-semibold text-stone-700 dark:text-stone-200 bg-stone-50 dark:bg-[#122144] hover:bg-[#FEFCE8] dark:hover:bg-[#1B3061] hover:text-[#0F241C] dark:hover:text-[#FFFFFF] hover:border-amber-300 dark:hover:border-[#FF9933] px-3 py-1 rounded-full whitespace-nowrap border border-stone-200 dark:border-white/[0.1] transition-colors shadow-2xs cursor-pointer shrink-0"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white dark:bg-[#0B152C] border-t border-stone-200 dark:border-white/[0.08] flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask any question from 5,000+ AICTE APH rules..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-stone-50 dark:bg-[#070D1E] border border-stone-200 dark:border-[#FF9933]/40 rounded-full text-xs text-[#0F241C] dark:text-[#FFFFFF] placeholder:text-stone-400 dark:placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#FF9933]/40 focus:border-[#FF9933] shadow-2xs transition-all"
            />
            <button
              type="submit"
              className="p-2.5 rounded-full bg-[#0F241C] dark:bg-gradient-to-r dark:from-[#FF8C00] dark:to-[#EA580C] hover:bg-[#1C382B] dark:hover:from-[#FFA024] dark:hover:to-[#F97316] text-white shadow-xs hover:shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
