'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Loader2, Zap } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepDraft {
    title: string;
    description: string;
    agent_id: string;
}

interface Agent { id: string; name: string; }

interface CreateMissionModalProps {
    agents: Agent[];
    onClose: () => void;
    onCreated: (missionId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateMissionModal({ agents, onClose, onCreated }: CreateMissionModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDesc] = useState('');
    const [priority, setPriority] = useState(5);
    const [agentId, setAgentId] = useState(agents[0]?.id ?? '');
    const [executeNow, setExecuteNow] = useState(false);
    const [steps, setSteps] = useState<StepDraft[]>([
        { title: '', description: '', agent_id: '' },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function addStep() {
        setSteps((prev) => [...prev, { title: '', description: '', agent_id: '' }]);
    }

    function removeStep(i: number) {
        setSteps((prev) => prev.filter((_, idx) => idx !== i));
    }

    function updateStep(i: number, field: keyof StepDraft, value: string) {
        setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
    }

    async function handleSubmit() {
        if (!title.trim()) { setError('El título es obligatorio.'); return; }
        if (steps.some((s) => !s.title.trim())) { setError('Todos los pasos deben tener título.'); return; }

        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/missions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title, description, priority, agent_id: agentId || undefined,
                    executeNow,
                    steps: steps.map((s, i) => ({
                        title: s.title,
                        description: s.description || undefined,
                        agent_id: s.agent_id || agentId || undefined,
                        order: i + 1,
                    })),
                }),
            });
            const json = await res.json() as { data?: { missionId: string }; error?: string };
            if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
            onCreated(json.data?.missionId ?? '');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al crear misión');
        } finally {
            setSubmitting(false);
        }
    }

    const PRIORITY_COLOR = priority >= 8 ? '#f87171' : priority >= 5 ? '#fb923c' : 'var(--accent-emerald)';

    const modal = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
                style={{
                    background: 'rgba(20,20,30,0.95)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.60)',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <Zap size={18} style={{ color: 'var(--accent-cyan)' }} />
                    <h2
                        className="flex-1 text-base font-bold"
                        style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-primary)' }}
                    >
                        Nueva Misión
                    </h2>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body (scrollable) */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {/* Title */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Título *</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Campaña WhatsApp semana 8"
                            className="px-3 py-2 rounded-xl text-sm outline-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Descripción</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Objetivo, contexto, resultado esperado…"
                            rows={2}
                            className="px-3 py-2 rounded-xl text-sm outline-none resize-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    {/* Priority + Agent row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Prioridad</label>
                                <span className="text-xs font-bold" style={{ color: PRIORITY_COLOR }}>{priority}</span>
                            </div>
                            <input
                                type="range" min={1} max={10}
                                value={priority}
                                onChange={(e) => setPriority(parseInt(e.target.value))}
                                className="w-full"
                                style={{ accentColor: PRIORITY_COLOR }}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Agente principal</label>
                            <select
                                value={agentId}
                                onChange={(e) => setAgentId(e.target.value)}
                                className="px-3 py-2 rounded-xl text-sm outline-none"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-primary)' }}
                            >
                                <option value="">Sin asignar</option>
                                {agents.map((a) => (
                                    <option key={a.id} value={a.id} style={{ background: '#0a0a0f' }}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                Pasos ({steps.length})
                            </label>
                            <button
                                onClick={addStep}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                                style={{ background: 'rgba(34,211,238,0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(34,211,238,0.15)' }}
                            >
                                <Plus size={11} /> Agregar
                            </button>
                        </div>
                        {steps.map((step, i) => (
                            <div
                                key={i}
                                className="rounded-xl p-3 space-y-2"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                            >
                                <div className="flex gap-2 items-center">
                                    <span
                                        className="w-5 h-5 text-[10px] font-bold rounded-md flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent-violet)' }}
                                    >
                                        {i + 1}
                                    </span>
                                    <input
                                        value={step.title}
                                        onChange={(e) => updateStep(i, 'title', e.target.value)}
                                        placeholder={`Paso ${i + 1} — título`}
                                        className="flex-1 px-2 py-1 rounded-lg text-xs outline-none"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
                                    />
                                    {steps.length > 1 && (
                                        <button onClick={() => removeStep(i)} style={{ color: '#f87171' }}>
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={step.description}
                                    onChange={(e) => updateStep(i, 'description', e.target.value)}
                                    placeholder="Instrucción para el agente…"
                                    rows={2}
                                    className="w-full px-2 py-1.5 rounded-lg text-xs outline-none resize-none font-mono"
                                    style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
                                />
                                <select
                                    value={step.agent_id}
                                    onChange={(e) => updateStep(i, 'agent_id', e.target.value)}
                                    className="px-2 py-1 rounded-lg text-xs outline-none"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}
                                >
                                    <option value="">Agente del padre</option>
                                    {agents.map((a) => (
                                        <option key={a.id} value={a.id} style={{ background: '#0a0a0f' }}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Execute now toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <div
                            onClick={() => setExecuteNow((v) => !v)}
                            className="relative w-10 h-5 rounded-full transition-colors"
                            style={{ background: executeNow ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.12)' }}
                        >
                            <div
                                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow"
                                style={{ transform: executeNow ? 'translateX(20px)' : 'none' }}
                            />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Ejecutar automáticamente (requiere runtime activo)
                        </span>
                    </label>

                    {error && (
                        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                            ⚠️ {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="flex gap-3 px-5 py-4 flex-shrink-0"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                        style={{ background: 'rgba(34,211,238,0.12)', color: 'var(--accent-cyan)', border: '1px solid rgba(34,211,238,0.25)' }}
                    >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        {submitting ? 'Creando…' : 'Crear Misión'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof window === 'undefined') return null;
    return createPortal(modal, document.body);
}
