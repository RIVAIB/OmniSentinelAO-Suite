'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';

export function NewSessionForm() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [projectType, setProjectType] = useState<'web' | 'mobile' | 'erp' | 'general'>('general');
    const [context, setContext] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handleCreate = async () => {
        if (!title) return;
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('sessions')
            .insert({
                user_id: user.id,
                title,
                project_type: projectType,
                project_context: context,
                status: 'active',
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating session:', error);
        } else {
            setOpen(false);
            router.push(`/room/${data.id}`);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                    <PlusCircle className="mr-2 h-4 w-4" /> Nueva Sesión
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-purple-500/20 bg-card">
                <DialogHeader>
                    <DialogTitle>Nueva Sesión de War Room</DialogTitle>
                    <DialogDescription>
                        Define el título y contexto del proyecto para que Claude y Gemini puedan debatir con precisión.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label htmlFor="title" className="text-sm font-medium">Título del Proyecto</label>
                        <Input
                            id="title"
                            placeholder="Ej: Refactorización ERP v2"
                            value={title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Tipo de Proyecto</label>
                        <Select value={projectType} onValueChange={(v: any) => setProjectType(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona el tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="web">Web App</SelectItem>
                                <SelectItem value="mobile">Mobile App</SelectItem>
                                <SelectItem value="erp">ERP System</SelectItem>
                                <SelectItem value="general">General / Consulting</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="context" className="text-sm font-medium">Contexto / Brief Inicial</label>
                        <textarea
                            id="context"
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Describe el reto técnico, stack actual o requerimientos..."
                            value={context}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContext(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={handleCreate}
                        disabled={loading || !title}
                    >
                        {loading ? 'Creando...' : 'Iniciar War Room'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
