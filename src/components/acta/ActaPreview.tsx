'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileText, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface ActaPreviewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    actaContent: string;
}

export function ActaPreview({ open, onOpenChange, actaContent }: ActaPreviewProps) {
    const handleDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([actaContent], { type: 'text/markdown' });
        element.href = URL.createObjectURL(file);
        element.download = "acta-acuerdo-tecnico.md";
        document.body.appendChild(element);
        element.click();
        toast.success("Acta descargada correctamente");
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(actaContent);
        toast.success("Copiado al portapapeles");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 border-purple-500/20 bg-background overflow-hidden">
                <DialogHeader className="p-6 border-b bg-card/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-600/20 p-2 rounded-lg">
                                <FileText className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">ACTA DE ACUERDO TÉCNICO</DialogTitle>
                                <DialogDescription className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                                    Documento Estratégico Consolidado
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleCopy} className="h-9">
                                <Share2 className="mr-2 h-4 w-4" /> COMPARTIR
                            </Button>
                            <Button onClick={handleDownload} size="sm" className="bg-purple-600 hover:bg-purple-700 h-9">
                                <Download className="mr-2 h-4 w-4" /> DESCARGAR .MD
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-8">
                    <div className="prose prose-sm dark:prose-invert max-w-none pb-12">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {actaContent}
                        </ReactMarkdown>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
