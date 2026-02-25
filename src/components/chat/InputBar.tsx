'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Zap, Target, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputBarProps {
    onSend: (message: string) => void;
    isLoading: boolean;
}

export function InputBar({ onSend, isLoading }: InputBarProps) {
    const [input, setInput] = useState('');
    const [activeSelector, setActiveSelector] = useState<'claude' | 'gemini' | 'both' | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (!input.trim() || isLoading) return;

        let prefix = '';
        if (activeSelector === 'claude') prefix = '@claude ';
        else if (activeSelector === 'gemini') prefix = '@gemini ';
        else if (activeSelector === 'both') prefix = '@both ';

        onSend(prefix + input);
        setInput('');
        setActiveSelector(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'inherit';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
        }
    }, [input]);

    return (
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 sticky bottom-0">
            <div className="container max-w-4xl space-y-3">
                <div className="flex gap-2 text-xs">
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-8 gap-1.5 transition-colors",
                            activeSelector === 'claude' && "bg-purple-900/30 border-purple-500/50 text-purple-300"
                        )}
                        onClick={() => setActiveSelector(activeSelector === 'claude' ? null : 'claude')}
                    >
                        <Zap className="h-3.5 w-3.5" /> @Claude
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-8 gap-1.5 transition-colors",
                            activeSelector === 'gemini' && "bg-blue-900/30 border-blue-500/50 text-blue-300"
                        )}
                        onClick={() => setActiveSelector(activeSelector === 'gemini' ? null : 'gemini')}
                    >
                        <Target className="h-3.5 w-3.5" /> @Gemini
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-8 gap-1.5 transition-colors",
                            activeSelector === 'both' && "bg-slate-800 border-slate-600 text-slate-300"
                        )}
                        onClick={() => setActiveSelector(activeSelector === 'both' ? null : 'both')}
                    >
                        <Users className="h-3.5 w-3.5" /> @Both
                    </Button>
                </div>

                <div className="relative flex items-end gap-2 bg-secondary/50 rounded-xl p-2 border focus-within:ring-2 ring-purple-500/20 transition-all">
                    <textarea
                        ref={textareaRef}
                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none px-3 py-2 text-sm leading-relaxed min-h-[44px] max-h-[200px]"
                        placeholder="Type your technical question or directive..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <Button
                        size="icon"
                        className="h-10 w-10 shrink-0 bg-purple-600 hover:bg-purple-700"
                        disabled={!input.trim() || isLoading}
                        onClick={handleSend}
                    >
                        <SendHorizontal className="h-5 w-5" />
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                    Shift + Enter for new line. Commands: @claude, @gemini, @both
                </p>
            </div>
        </div>
    );
}
