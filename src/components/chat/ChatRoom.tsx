'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { InputBar } from './InputBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Settings, Loader2 } from 'lucide-react';
import { ActaPreview } from '../acta/ActaPreview';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Edit2, Archive } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ToolExecution } from './ToolExecution';

interface ChatRoomProps {
    sessionId: string;
    initialMessages?: any[];
    sessionTitle: string;
    projectType: string;
}

export function ChatRoom({ sessionId, initialMessages, sessionTitle, projectType }: ChatRoomProps) {
    const router = useRouter();
    const { messages, setMessages, isLoading, sendMessage, activeAgent, toolCalls } = useChat(sessionId);
    const [showActa, setShowActa] = useState(false);
    const [actaContent, setActaContent] = useState('');
    const [isGeneratingActa, setIsGeneratingActa] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleGenerateActa = async () => {
        setIsGeneratingActa(true);
        try {
            const res = await fetch('/api/acta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
            const data = await res.json();
            if (data.raw_markdown) {
                setActaContent(data.raw_markdown);
                setShowActa(true);
                toast.success('Acta generada con éxito');
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        } catch (error: any) {
            toast.error('Error al generar acta: ' + error.message);
        } finally {
            setIsGeneratingActa(false);
        }
    };

    useEffect(() => {
        if (initialMessages) {
            setMessages(initialMessages);
        }
    }, [initialMessages, setMessages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleDeleteSession = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta sesión y todo su historial?')) return;

        try {
            const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Sesión eliminada');
                router.push('/');
            } else {
                throw new Error('No se pudo eliminar la sesión');
            }
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        }
    };

    return (
        <div className="flex flex-col h-screen max-h-screen bg-background overflow-hidden">
            {/* Header */}
            <header className="border-b bg-card/50 backdrop-blur-sm z-10">
                <div className="container max-w-6xl h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-600/20 p-2 rounded-lg">
                            <FileText className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold uppercase tracking-tight">{sessionTitle}</h1>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] h-4 border-purple-500/30 text-purple-300">
                                    {projectType}
                                </Badge>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Active Session</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem disabled>
                                    <Edit2 className="mr-2 h-4 w-4" /> Renombrar
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled>
                                    <Archive className="mr-2 h-4 w-4" /> Archivar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={handleDeleteSession}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Sesión
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 h-9 font-semibold"
                            onClick={handleGenerateActa}
                            disabled={isGeneratingActa || messages.length === 0}
                        >
                            {isGeneratingActa ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileText className="mr-2 h-4 w-4" />
                            )}
                            {isGeneratingActa ? 'GENERANDO...' : 'GENERAR ACTA'}
                        </Button>
                    </div>
                </div>
            </header>

            <ActaPreview
                open={showActa}
                onOpenChange={setShowActa}
                actaContent={actaContent}
            />

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-8">
                <div className="container max-w-4xl">
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}

                    {toolCalls.map((tc: any) => (
                        <ToolExecution
                            key={tc.id}
                            toolName={tc.toolName}
                            args={tc.args}
                            status={tc.status}
                            result={tc.result}
                        />
                    ))}

                    {activeAgent && (
                        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground animate-pulse mb-8">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>{activeAgent === 'claude' ? 'Claude' : 'Gemini'} is thinking...</span>
                        </div>
                    )}

                    <div ref={scrollRef} className="h-px" />
                </div>
            </div>

            {/* Input */}
            <InputBar onSend={sendMessage} isLoading={isLoading} />
        </div>
    );
}
