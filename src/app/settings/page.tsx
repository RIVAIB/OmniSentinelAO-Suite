'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import AgentConfigEditor from '@/components/settings/AgentConfigEditor';
import { Globe, Shield, Zap, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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

const TABS = [
    { id: 'general', label: '⚙️ General' },
    { id: 'agents', label: '🤖 Agentes' },
    { id: 'integrations', label: '🔌 Integraciones' },
    { id: 'security', label: '🔒 Seguridad' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="text-sm font-medium w-48 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                {label}
            </label>
            <div className="flex-1">{children}</div>
        </div>
    );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'var(--text-primary)',
            }}
        />
    );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-primary)' }}
        >
            {options.map((o) => (
                <option key={o} value={o} style={{ background: '#0a0a0f' }}>{o}</option>
            ))}
        </select>
    );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
    return (
        <div className="flex items-center gap-2 text-sm" style={{ color: ok ? 'var(--accent-emerald)' : '#f87171' }}>
            {ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {label}
        </div>
    );
}

// ─── Tabs content ─────────────────────────────────────────────────────────────

function GeneralTab() {
    const [name, setName] = useState('RIVAIB Health Clinic');
    const [tz, setTz] = useState('America/Caracas');
    const [lang, setLang] = useState('es');
    const [autoStart, setAutoStart] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem('settings_general');
                if (raw) {
                    const parsed = JSON.parse(raw) as { name?: string; tz?: string; lang?: string; autoStart?: boolean };
                    if (parsed.name) setName(parsed.name);
                    if (parsed.tz) setTz(parsed.tz);
                    if (parsed.lang) setLang(parsed.lang);
                    if (parsed.autoStart !== undefined) setAutoStart(parsed.autoStart);
                }
            } catch { }
        }
    }, []);

    function save() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('settings_general', JSON.stringify({ name, tz, lang, autoStart }));
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    }

    return (
        <div className="glass-panel p-5 flex flex-col gap-0 max-w-2xl">
            <Row label="Nombre de la clínica">
                <TextInput value={name} onChange={setName} placeholder="RIVAIB Health Clinic" />
            </Row>
            <Row label="Zona horaria">
                <SelectInput
                    value={tz}
                    onChange={setTz}
                    options={['America/Caracas', 'America/Bogota', 'America/Santiago', 'America/Mexico_City', 'Europe/Madrid', 'UTC']}
                />
            </Row>
            <Row label="Idioma">
                <SelectInput value={lang} onChange={setLang} options={['es', 'en', 'pt']} />
            </Row>
            <Row label="Auto-iniciar Runtime">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setAutoStart(!autoStart)}
                        className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
                        style={{
                            background: autoStart ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.10)',
                            border: autoStart ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(255,255,255,0.15)',
                        }}
                    >
                        <span
                            className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                            style={{
                                left: autoStart ? '20px' : '2px',
                                background: autoStart ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.4)',
                            }}
                        />
                    </button>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {autoStart ? 'Activo — el runtime inicia al abrir el Dashboard' : 'Desactivado'}
                    </span>
                </div>
            </Row>
            <div className="pt-4">
                <button
                    onClick={save}
                    className="px-5 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                    style={{
                        background: saved ? 'rgba(52,211,153,0.15)' : 'rgba(34,211,238,0.10)',
                        border: saved ? '1px solid rgba(52,211,153,0.30)' : '1px solid rgba(34,211,238,0.22)',
                        color: saved ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
                    }}
                >
                    {saved ? '¡Guardado!' : 'Guardar cambios'}
                </button>
            </div>
        </div>
    );
}

function AgentsTab() {
    const [agents, setAgents] = useState<AgentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/agents')
            .then(r => r.json())
            .then((j: { data?: AgentRow[] }) => setAgents(j.data ?? []))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={14} className="animate-spin" /> Cargando agentes…
        </div>
    );

    return (
        <div className="flex flex-col gap-3 max-w-2xl">
            {agents.map((agent) => (
                <div key={agent.id}>
                    <button
                        onClick={() => setExpanded(expanded === agent.id ? null : agent.id)}
                        className="glass-panel w-full px-4 py-3 flex items-center gap-3 text-left transition-all hover:scale-[1.005]"
                    >
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: 'rgba(34,211,238,0.10)', color: 'var(--accent-cyan)', border: '1px solid rgba(34,211,238,0.18)' }}
                        >
                            {agent.name[0]}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.name}</p>
                            <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                {agent.config?.model ?? 'Sin modelo'} · temp. {agent.config?.temperature ?? '—'}
                            </p>
                        </div>
                        {expanded === agent.id
                            ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
                            : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                    {expanded === agent.id && (
                        <div className="mt-2 ml-2">
                            <AgentConfigEditor
                                agent={agent}
                                onSaved={(updated) => {
                                    setAgents((prev) => prev.map((a) => a.id === updated.id ? updated : a));
                                    setExpanded(null);
                                }}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function IntegrationsTab() {
    return (
        <div className="flex flex-col gap-4 max-w-2xl">
            {[
                { name: 'Anthropic (Claude AI)', icon: '🧠', ok: true, desc: 'API key configurada en .env.local' },
                { name: 'Supabase', icon: '🗄️', ok: true, desc: 'Base de datos + Realtime activo' },
                { name: 'WhatsApp Business', icon: '💬', ok: false, desc: 'Pendiente — configurar webhook' },
                { name: 'Notion', icon: '📝', ok: false, desc: 'Pendiente — integración futura' },
            ].map((int) => (
                <div
                    key={int.name}
                    className="glass-panel px-4 py-4 flex items-center gap-4"
                >
                    <span className="text-2xl">{int.icon}</span>
                    <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{int.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{int.desc}</p>
                    </div>
                    <StatusBadge ok={int.ok} label={int.ok ? 'Conectado' : 'Sin configurar'} />
                </div>
            ))}
        </div>
    );
}

function SecurityTab() {
    const [show, setShow] = useState(false);
    const sessionTimeout = 60;

    return (
        <div className="flex flex-col gap-4 max-w-2xl">
            <div className="glass-panel p-5 flex flex-col gap-0">
                <Row label="ANTHROPIC_API_KEY">
                    <div className="flex gap-2 items-center">
                        <input
                            type={show ? 'text' : 'password'}
                            value="sk-ant-••••••••••••••••••••••"
                            readOnly
                            className="flex-1 px-3 py-2 rounded-xl text-sm font-mono outline-none"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}
                        />
                        <button
                            onClick={() => setShow(!show)}
                            className="px-3 py-2 rounded-xl text-xs"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
                        >
                            {show ? 'Ocultar' : 'Mostrar'}
                        </button>
                    </div>
                </Row>
                <Row label="SUPABASE_URL">
                    <input
                        type="password"
                        value="https://••••••••.supabase.co"
                        readOnly
                        className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}
                    />
                </Row>
                <Row label="Sesión timeout">
                    <span className="text-sm font-mono px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
                        {sessionTimeout} min
                    </span>
                </Row>
            </div>

            <div className="glass-panel p-4">
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>AUDIT LOG (últimos eventos)</p>
                {[
                    { time: '02:10', event: 'Agente JESSY — mensaje procesado', user: 'API' },
                    { time: '01:47', event: 'Conversación creada (webchat)', user: 'API' },
                    { time: '00:30', event: 'Login exitoso', user: 'admin' },
                ].map((log, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 py-2"
                        style={{ borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                    >
                        <span className="text-[10px] font-mono w-10 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{log.time}</span>
                        <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>{log.event}</span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--accent-violet)' }}>{log.user}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main inner component (needs searchParams) ────────────────────────────────

function SettingsInner() {
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') ?? 'general';

    const CONTENT: Record<string, React.ReactNode> = {
        general: <GeneralTab />,
        agents: <AgentsTab />,
        integrations: <IntegrationsTab />,
        security: <SecurityTab />,
    };

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Ambient */}
            <div
                className="fixed inset-0 pointer-events-none"
                aria-hidden
                style={{ background: 'radial-gradient(ellipse at 50% 10%, rgba(34,211,238,0.03) 0%, transparent 60%)' }}
            />

            {/* Header */}
            <div>
                <h1
                    className="text-2xl font-bold"
                    style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-primary)' }}
                >
                    Configuración
                </h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Gestiona agentes, integraciones y preferencias del sistema
                </p>
            </div>

            {/* Tabs */}
            <SettingsTabs tabs={TABS} activeTab={activeTab}>
                {CONTENT[activeTab] ?? <GeneralTab />}
            </SettingsTabs>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="p-6">
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
            </div>
        }>
            <SettingsInner />
        </Suspense>
    );
}
