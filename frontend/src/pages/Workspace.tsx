import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Code2,
  ExternalLink,
  FileCode2,
  FolderGit2,
  Loader2,
  Menu,
  Play,
  Search,
  Send,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'complete' | 'error';
  retryQuery?: string;
};

export default function Workspace() {
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [repoId, setRepoId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [fileQuery, setFileQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);

  // Keep the existing message-scroll architecture: this is the only conversation scroller.
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShowJumpToLatest(!isNearBottom && messages.length > 0);
  };

  const jumpToLatest = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputQuery]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const repositoryName = useMemo(() => {
    if (repoUrl) return repoUrl.replace(/\/$/, '').replace(/\.git$/, '').split('/').pop() || repoId || 'Repository';
    return repoId || 'Repository';
  }, [repoId, repoUrl]);
  const filteredFiles = useMemo(() => {
    const query = fileQuery.trim().toLowerCase();
    return query ? files.filter((file) => file.toLowerCase().includes(query)) : files;
  }, [fileQuery, files]);

  const formatStatus = (value: string) => {
    const labels: Record<string, string> = {
      connecting: 'Connecting to GitHub...',
      fetching_files: 'Fetching repository tree...',
      processing_code: 'Reading and chunking code...',
      generating_embeddings: 'Generating vector embeddings...',
      ready: 'Finalizing knowledge base...',
    };
    return labels[value] || 'Processing...';
  };

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) return;
    setIsAnalyzing(true);
    setStatus('connecting');
    setErrorMsg(null);

    try {
      const payload = githubToken ? { url: repoUrl, github_token: githubToken } : { url: repoUrl };
      const res = await axios.post(`${API_URL}/api/repositories/analyze`, payload);
      const rId = res.data.repo_id;
      setRepoId(rId);

      const interval = window.setInterval(async () => {
        try {
          const statusRes = await axios.get(`${API_URL}/api/repositories/${rId}`);
          setStatus(statusRes.data.status);
          if (statusRes.data.status === 'ready') {
            window.clearInterval(interval);
            setFiles(statusRes.data.files || []);
            setAnalyzed(true);
            setIsAnalyzing(false);
          } else if (statusRes.data.status === 'error') {
            window.clearInterval(interval);
            setErrorMsg(statusRes.data.error || "CodeAI couldn't access this repository. Check the URL or repository permissions.");
            setIsAnalyzing(false);
          }
        } catch {
          window.clearInterval(interval);
          setErrorMsg('Failed to check repository status. Please try again.');
          setIsAnalyzing(false);
        }
      }, 2000);
    } catch (error: any) {
      setErrorMsg(error.response?.data?.detail || 'Failed to analyze repository. Check backend connection.');
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleChat();
    }
  };

  const handleChat = async (overrideQuery?: string) => {
    const queryToUse = (overrideQuery || inputQuery).trim();
    if (!queryToUse || !repoId || isQuerying) return;

    setInputQuery('');
    const userId = crypto.randomUUID();
    setMessages((previous) => [...previous, { id: userId, role: 'user', content: queryToUse, status: 'complete' }]);
    setIsQuerying(true);

    // Preserve the current intentional scroll behavior for newly submitted messages.
    window.setTimeout(() => {
      messageRefs.current.get(userId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    try {
      const res = await axios.post(`${API_URL}/api/chat/`, { query: queryToUse, repo_id: repoId });
      const assistantId = crypto.randomUUID();
      setMessages((previous) => [...previous, {
        id: assistantId,
        role: 'assistant',
        content: res.data.response,
        status: 'complete',
      }]);
      window.setTimeout(() => {
        messageRefs.current.get(assistantId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error: any) {
      const assistantId = crypto.randomUUID();
      setMessages((previous) => [...previous, {
        id: assistantId,
        role: 'assistant',
        content: error?.response?.data?.detail || "CodeAI couldn't generate a response right now.",
        status: 'error',
        retryQuery: queryToUse,
      }]);
      window.setTimeout(() => {
        messageRefs.current.get(assistantId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } finally {
      setIsQuerying(false);
    }
  };

  if (!analyzed) {
    return <RepositoryConnect
      repoUrl={repoUrl} githubToken={githubToken} isAnalyzing={isAnalyzing} status={status} errorMsg={errorMsg}
      onRepoUrlChange={setRepoUrl} onTokenChange={setGithubToken} onAnalyze={handleAnalyze} formatStatus={formatStatus}
    />;
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <RepositorySidebar files={filteredFiles} fileQuery={fileQuery} onFileQueryChange={setFileQuery} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-14 border-b border-border/50 flex items-center px-4 md:px-6 justify-between bg-[#0c0c0e] shrink-0">
          <div className="flex items-center min-w-0 gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="md:hidden shrink-0" aria-label="Open repository files">
              <Menu className="w-4 h-4" />
            </Button>
            <Link to="/" className="hidden sm:flex items-center gap-2 shrink-0 text-foreground hover:text-primary transition-colors">
              <Code2 className="w-5 h-5" />
              <span className="font-semibold text-sm tracking-tight">CodeAI</span>
            </Link>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="min-w-0 flex items-center gap-2 text-sm">
              <FolderGit2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{repositoryName}</span>
              <span className="hidden md:inline text-xs text-muted-foreground">{repoId}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Indexed
            </span>
            <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border border-border bg-transparent hover:bg-secondary transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View on GitHub</span>
            </a>
          </div>
        </header>

        <main className="h-0 flex-grow flex flex-col bg-card/20 w-full">
          <div ref={scrollContainerRef} onScroll={handleScroll} className="h-0 flex-grow overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-8 p-5 md:p-8 min-h-full">
              {messages.length === 0 && <EmptyConversation onQuestionSelect={setInputQuery} />}

              {messages.map((message) => (
                <article key={message.id} ref={(element) => { if (element) messageRefs.current.set(message.id, element); }} className="max-w-4xl mx-auto w-full">
                  {message.role === 'user' ? (
                    <UserMessage content={message.content} />
                  ) : (
                    <AssistantMessage message={message} isQuerying={isQuerying} onRetry={() => message.retryQuery && handleChat(message.retryQuery)} />
                  )}
                </article>
              ))}

              {isQuerying && <PendingMessage />}
              <div ref={messagesEndRef} className="h-4 shrink-0" />
            </div>
          </div>

          <div className="flex-shrink-0 px-4 md:px-6 pb-6 pt-2 flex flex-col items-center relative">
            <AnimatePresence>
              {showJumpToLatest && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute -top-12 z-10">
                  <Button variant="outline" size="sm" onClick={jumpToLatest} className="rounded-full shadow-lg border-border/60 bg-background/90 backdrop-blur-md">
                    <ChevronDown className="w-3.5 h-3.5 mr-1" /> Jump to latest
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <ChatComposer inputQuery={inputQuery} isQuerying={isQuerying} textareaRef={textareaRef} onChange={setInputQuery} onKeyDown={handleKeyDown} onSend={() => handleChat()} />
          </div>
        </main>
      </div>
    </div>
  );
}

function RepositoryConnect({ repoUrl, githubToken, isAnalyzing, status, errorMsg, onRepoUrlChange, onTokenChange, onAnalyze, formatStatus }: {
  repoUrl: string; githubToken: string; isAnalyzing: boolean; status: string; errorMsg: string | null;
  onRepoUrlChange: (value: string) => void; onTokenChange: (value: string) => void; onAnalyze: () => void; formatStatus: (value: string) => string;
}) {
  return <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
    <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium"><ArrowLeft className="w-4 h-4" /> Back to Home</Link>
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md p-8 rounded-2xl bg-card border border-border/50 shadow-[0_0_80px_-20px_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-3 mb-8"><div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20"><Code2 className="w-6 h-6 text-primary" /></div><div><h1 className="text-xl font-semibold tracking-tight">Connect repository</h1><p className="text-xs text-muted-foreground mt-0.5">Enter a GitHub URL to build a codebase workspace.</p></div></div>
      <div className="space-y-5">
        <label className="block text-sm font-medium text-foreground">GitHub repository URL<Input placeholder="https://github.com/facebook/react" value={repoUrl} onChange={(event) => onRepoUrlChange(event.target.value)} disabled={isAnalyzing} className="bg-secondary/30 h-11 mt-2" /></label>
        <label className="block text-sm font-medium text-foreground">GitHub token <span className="opacity-60 font-normal text-xs">(optional, for private repositories)</span><Input type="password" placeholder="ghp_..." value={githubToken} onChange={(event) => onTokenChange(event.target.value)} disabled={isAnalyzing} className="bg-secondary/30 h-11 mt-2" /></label>
        <AnimatePresence>{status && !errorMsg && isAnalyzing && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-primary flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />{formatStatus(status)}</motion.div>}{errorMsg && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 flex gap-3 text-left"><AlertCircle className="w-5 h-5 shrink-0" />{errorMsg}</motion.div>}</AnimatePresence>
        <Button className="w-full h-11 text-sm font-medium" onClick={onAnalyze} disabled={isAnalyzing || !repoUrl.trim()}>{isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analyzing...</> : <><Play className="w-4 h-4 mr-2" />Analyze repository</>}</Button>
      </div>
    </motion.div>
  </div>;
}

function RepositorySidebar({ files, fileQuery, onFileQueryChange, isOpen, onClose }: { files: string[]; fileQuery: string; onFileQueryChange: (value: string) => void; isOpen: boolean; onClose: () => void }) {
  const content = <><div className="p-4 border-b border-border/50 flex items-center justify-between"><Link to="/" className="flex items-center gap-2 text-foreground"><Code2 className="w-5 h-5" /><span className="font-semibold text-sm tracking-tight">CodeAI</span></Link><Button variant="ghost" size="icon" onClick={onClose} className="md:hidden" aria-label="Close repository files"><X className="w-4 h-4" /></Button></div><div className="p-3 border-b border-border/50"><div className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground mb-3 px-1">REPOSITORY</div><label className="relative block"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><input value={fileQuery} onChange={(event) => onFileQueryChange(event.target.value)} placeholder="Search files" className="w-full h-9 rounded-md border border-border/70 bg-secondary/20 pl-8 pr-3 text-xs outline-none focus:border-primary/50 placeholder:text-muted-foreground" /></label></div><div className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar"><div className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground mb-2 px-1">FILES <span className="normal-case tracking-normal">({files.length})</span></div>{files.length ? <div className="space-y-0.5">{files.map((file) => <div key={file} title={file} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"><FileCode2 className="w-3.5 h-3.5 shrink-0 text-primary/70" /><span className="truncate">{file}</span></div>)}</div> : <p className="px-2 py-4 text-xs text-muted-foreground">No matching indexed files.</p>}</div></>;
  return <><aside className="w-64 lg:w-72 border-r border-border/50 bg-[#0c0c0e] flex-col hidden md:flex shrink-0">{content}</aside><AnimatePresence>{isOpen && <><motion.button aria-label="Close repository files" className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'tween', duration: 0.2 }} className="fixed inset-y-0 left-0 z-50 w-72 bg-[#0c0c0e] border-r border-border/50 flex flex-col md:hidden">{content}</motion.aside></>}</AnimatePresence></>;
}

function EmptyConversation({ onQuestionSelect }: { onQuestionSelect: (question: string) => void }) {
  const suggestions = ['How does authentication work?', 'Where is the database connection initialized?', 'Explain the project architecture.', 'What are the main API endpoints?'];
  return <div className="m-auto flex flex-col max-w-2xl w-full text-center pt-10"><div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 mx-auto"><Code2 className="w-5 h-5 text-primary" /></div><p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground mb-3">CODEBASE CONVERSATION</p><h2 className="text-xl font-semibold text-foreground mb-3">Understand this repository.</h2><p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto mb-8">Ask CodeAI about architecture, APIs, authentication, database logic, or a specific implementation.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">{suggestions.map((question) => <button key={question} onClick={() => onQuestionSelect(question)} className="p-3.5 rounded-lg border border-border/60 bg-background/40 hover:bg-secondary/40 hover:border-primary/30 text-sm text-foreground/80 transition-all"><span className="font-medium">{question}</span><span className="block text-xs text-muted-foreground mt-1">Use as a starting question</span></button>)}</div></div>;
}

function UserMessage({ content }: { content: string }) {
  return <div className="ml-auto max-w-3xl border-l-2 border-primary pl-4 py-1"><div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground mb-2">YOU</div><p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{content}</p></div>;
}

function AssistantMessage({ message, isQuerying, onRetry }: { message: Message; isQuerying: boolean; onRetry: () => void }) {
  if (message.status === 'error') return <div className="max-w-3xl border-l-2 border-red-400 pl-4 py-1"><div className="text-[11px] font-semibold tracking-[0.14em] text-red-300 mb-2">CODEAI · ERROR</div><p className="text-sm text-red-200 leading-relaxed">{message.content}</p><Button variant="outline" size="sm" className="mt-4" disabled={isQuerying} onClick={onRetry}>Retry request</Button></div>;
  return <div className="max-w-3xl"><div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground mb-3"><span className="w-5 h-5 rounded-md border border-border bg-secondary/50 grid place-items-center"><Code2 className="w-3 h-3 text-primary" /></span>CODEAI</div><div className="markdown-body text-sm leading-relaxed"><MarkdownContent content={message.content} /></div></div>;
}

function PendingMessage() {
  return <div className="max-w-4xl mx-auto w-full"><div className="max-w-3xl flex items-center gap-2 text-sm text-muted-foreground"><span className="w-5 h-5 rounded-md border border-border bg-secondary/50 grid place-items-center"><Code2 className="w-3 h-3 text-primary" /></span><span className="font-medium">CODEAI</span><span className="flex gap-1 ml-1"><span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" /><span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" /><span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" /></span><span>Analyzing repository...</span></div></div>;
}

function ChatComposer({ inputQuery, isQuerying, textareaRef, onChange, onKeyDown, onSend }: { inputQuery: string; isQuerying: boolean; textareaRef: React.RefObject<HTMLTextAreaElement | null>; onChange: (value: string) => void; onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void; onSend: () => void }) {
  return <div className="max-w-4xl w-full mx-auto"><div className="relative flex items-end bg-[#121214] border border-border/70 rounded-xl shadow-lg focus-within:border-primary/50 transition-colors"><textarea ref={textareaRef} placeholder="Ask a question about this repository..." className="w-full bg-transparent outline-none resize-none py-4 pl-4 pr-14 min-h-[56px] max-h-[200px] text-sm text-foreground custom-scrollbar placeholder:text-muted-foreground/60 leading-relaxed" value={inputQuery} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} disabled={isQuerying} rows={1} /><Button size="icon" onClick={onSend} disabled={isQuerying || !inputQuery.trim()} className="absolute right-2 bottom-2 h-9 w-9 rounded-lg"><Send className="w-4 h-4" /></Button></div><p className="mt-2 px-1 text-[11px] text-muted-foreground/70">Enter to send · Shift + Enter for a new line</p></div>;
}

function MarkdownContent({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    code({ inline, className, children, ...props }: any) {
      const match = /language-([\w+-]+)/.exec(className || '');
      const code = String(children).replace(/\n$/, '');
      if (!inline) return <CodeBlock code={code} language={match?.[1] || 'text'} />;
      return <code {...props} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono text-[13px] border border-primary/20">{children}</code>;
    },
    h1: ({ ...props }) => <h1 className="text-xl font-bold mt-7 mb-4 text-foreground" {...props} />,
    h2: ({ ...props }) => <h2 className="text-lg font-semibold mt-6 mb-3 text-foreground" {...props} />,
    h3: ({ ...props }) => <h3 className="text-base font-semibold mt-5 mb-2 text-foreground" {...props} />,
    ul: ({ ...props }) => <ul className="list-disc list-outside ml-5 my-4 space-y-1.5 text-foreground/90" {...props} />,
    ol: ({ ...props }) => <ol className="list-decimal list-outside ml-5 my-4 space-y-1.5 text-foreground/90" {...props} />,
    p: ({ ...props }) => <p className="my-3 text-foreground/90 leading-7" {...props} />,
    a: ({ ...props }) => <a className="text-primary underline underline-offset-2 hover:text-white" target="_blank" rel="noopener noreferrer" {...props} />,
  }}>{content}</ReactMarkdown>;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } };
  return <div className="rounded-lg overflow-hidden my-5 border border-border/70"><div className="bg-[#18181b] px-3 py-2 text-xs text-muted-foreground border-b border-border/50 flex justify-between items-center font-mono"><span className="text-primary/80">{language}</span><button onClick={copy} className="hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-white/10">{copied ? 'Copied' : 'Copy'}</button></div><SyntaxHighlighter style={vscDarkPlus as any} language={language} PreTag="div" className="!my-0 !bg-[#0c0c0e] text-sm !py-4 custom-scrollbar" showLineNumbers>{code}</SyntaxHighlighter></div>;
}
