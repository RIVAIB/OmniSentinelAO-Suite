'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';

interface AgentRow {
    id: string;
    name: string;
    status: string;
    config?: {
        systemPrompt?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        [key: string]: unknown;
    };
}

interface AgentConfigEditorProps {
    agent: AgentRow;
    onSaved?: (updated: AgentRow) => void;
}

const MODELS = [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
];

export default function AgentConfigEditor({ agent, onSaved }: AgentConfigEditorProps) {
    const cfg = agent.config ?? {};
    const [systemPrompt, setSystemPrompt] = useState(cfg.systemPrompt ?? '');
    const [model, setModel] = useState(cfg.model ?? MODELS[0]);
    const [temperature, setTemperature] = useState(cfg.temperature ?? 0.7);
    const [maxTokens, setMaxTokens] = useState(cfg.maxTokens ?? 1024);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/agents/${agent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: { ...cfg, systemPrompt, model, temperature, maxTokens },
                }),
            });
            const json = await res.json() as { data?: AgentRow; error?: string };
            if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            if (json.data && onSaved) onSaved(json.data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al guardar');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="glass-panel p-5 flex flex-col gap-5">
            {/* Agent header */}
            <div>
                <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--accent-cyan)' }}>
                    {agent.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Configuración del agente
                </p>
            </div>

            {/* Model */}
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Modelo</label>
                <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: 'var(--text-primary)',
                    }}
                >
                    {MODELS.map((m) => (
                        <option key={m} value={m} style={{ background: '#0a0a0f' }}>{m}</option>
                    ))}
                </select>
            </div>

            {/* Temperature slider */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Temperatura</label>
                    <span className="text-xs font-mono" style={{ color: 'var(--accent-cyan)' }}>{temperature.toFixed(2)}</span>
                </div>
                <input
                    type="range"
                    min={0} max={1} step={0.05}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                    style={{ accentColor: 'var(--accent-cyan)' }}
                />
                <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <span>Preciso (0)</span><span>Creativo (1)</span>
                </div>
            </div>

            {/* Max tokens */}
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Max Tokens</label>
                <input
                    type="number"
                    min={256} max={8192} step={256}
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-primary)' }}
                />
            </div>

            {/* System prompt */}
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>System Prompt</label>
                <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={6}
                    className="px-3 py-2.5 rounded-xl text-sm outline-none resize-none font-mono leading-relaxed"
                    placeholder="Eres un asistente de IA para RIVAIB Health Clinic…"
                    style={{
                        background: 'rgba(0,0,0,0.30)',
                        border: `1px solid ${systemPrompt ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.08)'}`,
                        color: 'var(--text-primary)',
                    }}
                />
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {systemPrompt.length} chars
                </p>
            </div>

            {/* Error */}
            {error && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                    ⚠️ {error}
                </p>
            )}

            {/* Save */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
                style={{
                    background: saved ? 'rgba(52,211,153,0.15)' : 'rgba(34,211,238,0.12)',
                    border: saved ? '1px solid rgba(52,211,153,0.30)' : '1px solid rgba(34,211,238,0.22)',
                    color: saved ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
                }}
            >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saved ? '¡Guardado!' : saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
        </div>
    );
}
