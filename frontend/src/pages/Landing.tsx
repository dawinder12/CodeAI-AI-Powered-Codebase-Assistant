import { motion } from 'framer-motion';
import { ArrowRight, Code2, Search, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import KineticGrid from '../components/ui/kinetic-grid';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export default function Landing() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <KineticGrid>
    <div className="min-h-screen flex flex-col items-center relative z-10 overflow-hidden">
      {/* Replaced by KineticGrid. */}
      <div className="hidden" 
           style={{ 
             backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
             transform: 'translate(calc((var(--mouse-x-norm, 0.5) - 0.5) * 40px), calc((var(--mouse-y-norm, 0.5) - 0.5) * 40px))'
           }}>
      </div>

      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${isScrolled ? 'bg-background/80 backdrop-blur-md border-border/50 py-4' : 'bg-transparent border-transparent py-6'}`}>
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer transition-transform hover:scale-[1.02]">
            <Code2 className="w-6 h-6 text-primary transition-transform group-hover:rotate-12" />
            <span className="font-semibold text-lg tracking-tight">CodeAI</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground font-medium">
            <button onClick={() => scrollToSection('features')} className="hover:text-primary transition-colors cursor-pointer">Features</button>
            <a href="https://github.com/dawinder12/CodeAI-AI-Powered-Codebase-Assistant" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
              <GithubIcon className="w-4 h-4" /> GitHub
            </a>
            <Button variant="default" size="sm" onClick={() => navigate('/workspace')} className="ml-2 font-semibold">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 flex flex-col items-center pt-40 pb-20 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-8 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> AI CODEBASE INTELLIGENCE
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl text-balance leading-tight">
            Understand any codebase. <br/>
            <span className="text-muted-foreground font-medium">Ask it anything.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 text-balance leading-relaxed">
            CodeAI turns repositories into an intelligent, searchable knowledge base so developers can understand unfamiliar code faster.
          </p>

          <div className="flex items-center gap-4 flex-col sm:flex-row w-full sm:w-auto">
            <Button size="lg" className="h-12 px-8 text-base w-full sm:w-auto group" onClick={() => navigate('/workspace')}>
              Analyze a Repository <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base w-full sm:w-auto group" onClick={() => window.open('https://github.com/dawinder12/CodeAI-AI-Powered-Codebase-Assistant', '_blank', 'noopener noreferrer')}>
              <GithubIcon className="mr-2 w-4 h-4 transition-transform group-hover:rotate-12" /> View on GitHub
            </Button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="w-full mt-24 glass rounded-2xl border border-border/50 p-2 md:p-3 shadow-[0_0_80px_-20px_rgba(255,255,255,0.05)]"
        >
          <div className="bg-[#0c0c0e] rounded-xl border border-border/50 aspect-[16/10] md:aspect-[16/9] w-full overflow-hidden flex flex-col relative">
            {/* Realistic Header */}
            <div className="h-12 border-b border-border/50 flex items-center px-4 justify-between bg-[#121214]">
              <div className="flex gap-1.5 w-20">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
              </div>
              <div className="text-xs text-muted-foreground/60 font-medium flex items-center gap-2">
                <Code2 className="w-3 h-3" /> dawinder12/CodeAI
              </div>
              <div className="w-20"></div>
            </div>
            
            {/* Realistic Mockup Content */}
            <div className="flex flex-1 overflow-hidden">
              <div className="w-64 border-r border-border/50 p-4 hidden md:block bg-[#09090b]">
                <div className="h-2 w-16 bg-muted/30 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500/20 rounded"></div><div className="h-2 w-24 bg-muted/50 rounded"></div></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500/20 rounded"></div><div className="h-2 w-20 bg-muted/50 rounded"></div></div>
                  <div className="flex items-center gap-2 ml-5"><div className="w-3 h-3 bg-green-500/20 rounded"></div><div className="h-2 w-16 bg-muted/50 rounded"></div></div>
                </div>
              </div>
              
              <div className="flex-1 p-4 md:p-8 flex flex-col justify-end bg-background gap-4 overflow-hidden relative">
                 <div className="max-w-[85%] self-end bg-primary text-primary-foreground p-3 md:p-4 rounded-xl rounded-br-sm text-sm font-medium shadow-sm">
                    How does the authentication flow work in this repository?
                 </div>
                 <div className="max-w-[90%] bg-secondary/50 border border-border p-4 md:p-5 rounded-xl rounded-bl-sm text-sm text-foreground/90 shadow-sm flex flex-col gap-3">
                    <div className="font-semibold text-white">Authentication Flow</div>
                    <p className="text-muted-foreground">The authentication relies on JWT tokens handled by the controller.</p>
                    <div className="bg-[#121214] border border-border/50 rounded-md p-3 font-mono text-xs text-muted-foreground mt-1">
                      <span className="text-blue-400">def</span> <span className="text-yellow-200">authenticate</span>(user):<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;token = jwt.encode(user.id)<br/>
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-pink-400">return</span> token
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        <section id="features" className="w-full mt-32 pt-20 border-t border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-left">
            <FeatureCard 
              icon={<Search className="w-6 h-6 text-primary" />}
              title="Semantic Search"
              description="Find code by its meaning, not just exact keyword matches using advanced embeddings."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-primary" />}
              title="Code-Aware RAG"
              description="Maintains structural context like line numbers and file paths for accurate answers."
            />
            <FeatureCard 
              icon={<Code2 className="w-6 h-6 text-primary" />}
              title="Agentic Reasoning"
              description="Deep analysis of dependencies, patterns, and architecture without manual searching."
            />
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-border/50 py-8 text-center text-sm text-muted-foreground bg-card/20 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">CodeAI</span>
          </div>
          <div className="text-muted-foreground/80">Built for Developers.</div>
        </div>
      </footer>
    </div>
    </KineticGrid>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group p-6 rounded-2xl bg-card/30 border border-border/50 hover:bg-card hover:border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-5 relative z-10 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 relative z-10 text-foreground group-hover:text-white transition-colors">{title}</h3>
      <p className="text-muted-foreground text-sm relative z-10 leading-relaxed group-hover:text-muted-foreground/90 transition-colors">{description}</p>
    </div>
  );
}
