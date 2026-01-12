import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen gradient-hero overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse-slow delay-500" />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 container mx-auto px-6 py-20 lg:py-32">
        <nav className="flex justify-between items-center mb-16 animate-fade-in">
          <div className="flex items-center gap-3">
            <img 
              src="/exam-ace-logo.jpeg" 
              alt="Exam Ace Logo" 
              className="w-10 h-10 rounded-lg shadow-glow"
            />
            <span className="text-xl font-display font-bold text-primary-foreground">
              Exam Ace
            </span>
          </div>
          <div className="flex gap-4">
            <Link to="/auth">
              <Button variant="hero-outline" size="lg">
                Login
              </Button>
            </Link>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto text-center space-y-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 text-primary-foreground/90 text-sm font-medium">
            <Zap className="w-4 h-4 text-secondary" />
            Trusted by 500+ Coaching Institutes
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground leading-tight">
            Ace Your
            <span className="block text-gradient-primary bg-clip-text" style={{ 
              background: 'linear-gradient(135deg, hsl(190, 90%, 60%) 0%, hsl(25, 95%, 60%) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              JEE & NEET
            </span>
            Preparation
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto leading-relaxed">
            A comprehensive exam management platform designed for coaching institutes. 
            Create, manage, and analyze exams with powerful tools for both admins and students.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/auth">
              <Button variant="hero" size="xl" className="w-full sm:w-auto">
                <GraduationCap className="w-5 h-5" />
                Get Started
              </Button>
            </Link>
            <Button variant="hero-outline" size="xl">
              <BookOpen className="w-5 h-5" />
              Learn More
            </Button>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {[
            {
              icon: Shield,
              title: "Secure Exam Engine",
              description: "Anti-cheating measures with tab tracking and fullscreen mode"
            },
            {
              icon: Zap,
              title: "Real-time Analytics",
              description: "Instant results with detailed performance insights"
            },
            {
              icon: BookOpen,
              title: "Question Bank",
              description: "Organized by subject, chapter, and difficulty level"
            }
          ].map((feature, index) => (
            <div 
              key={index}
              className="group p-6 rounded-2xl bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 hover:bg-primary-foreground/10 transition-all duration-300"
            >
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-primary-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-primary-foreground/60 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
