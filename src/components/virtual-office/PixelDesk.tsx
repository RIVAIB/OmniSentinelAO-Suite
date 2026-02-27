'use client';

import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentActivity = 'idle' | 'active' | 'working' | 'thinking' | 'error';

export interface DeskConfig {
    id: string;
    name: string;
    role: string;
    emoji: string;
    accent: string;       // hex accent for glow / ring
    deskColor: string;    // fallback desk color (not used with sprites)
    chairColor: string;   // CSS hue-rotate target color (legacy kept)
    screenColor: string;  // monitor screen tint (legacy kept)
    plantColor: string;   // desk succulent color (legacy kept)
    hueRotate?: number;   // degrees of hue rotation to tint the gaming chair sprite
}

interface PixelDeskProps {
    desk: DeskConfig;
    activity: AgentActivity;
    currentTask?: string;
    bubbleMsg?: string | null;
    selected?: boolean;
    glowClass?: string;
    onClick?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function usePrevious<T>(value: T): T | undefined {
    const [prev, setPrev] = useState<T | undefined>(undefined);
    useEffect(() => { setPrev(value); }, [value]);
    return prev;
}

// MacBook animation: 11 frames
const MACBOOK_FRAMES = Array.from({ length: 11 }, (_, i) =>
    `/sprites/macbook/Macbook_1_Tile_Ani_${i + 1}.png`
);
const MACBOOK_OPEN = '/sprites/macbook/Macbook_1_Open_Tile.png';
const MACBOOK_CLOSED = '/sprites/macbook/Macbook_1_Closed_Tile.png';

// ── Animated MacBook ──────────────────────────────────────────────────────────

function AnimatedMacBook({
    working,
    thinking,
    idle,
    screenColor,
}: {
    working: boolean;
    thinking: boolean;
    idle: boolean;
    screenColor: string;
}) {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        if (!working && !thinking) { setFrame(0); return; }
        const speed = working ? 120 : 340;
        const id = setInterval(() => setFrame(f => (f + 1) % MACBOOK_FRAMES.length), speed);
        return () => clearInterval(id);
    }, [working, thinking]);

    const src = idle ? MACBOOK_CLOSED : working || thinking ? MACBOOK_FRAMES[frame] : MACBOOK_OPEN;

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
                src={src}
                alt="MacBook"
                className="sprite-img"
                style={{
                    width: 72,
                    height: 'auto',
                    display: 'block',
                    imageRendering: 'pixelated',
                    filter: (working || thinking)
                        ? `drop-shadow(0 0 6px ${screenColor}cc) brightness(1.05)`
                        : 'none',
                    transition: 'filter 0.3s ease',
                }}
            />
        </div>
    );
}

// ── Think Bubble ──────────────────────────────────────────────────────────────

function ThinkBubble() {
    return (
        <div className="think-bubble">
            <div className="think-dot" />
            <div className="think-dot" />
            <div className="think-dot" />
        </div>
    );
}

// ── Floating Avatar Badge ─────────────────────────────────────────────────────

function AvatarBadge({
    desk,
    activity,
}: {
    desk: DeskConfig;
    activity: AgentActivity;
}) {
    return (
        <div className={`agent-avatar ${activity}`}>
            {/* Name label */}
            <div className="avatar-name" style={{ borderColor: `${desk.accent}40`, color: desk.accent }}>
                {desk.name}
            </div>
            {/* Connector line */}
            <div className="avatar-connector" />
            {/* Circle with emoji */}
            <div
                className={`avatar-ring ${activity}`}
                style={{
                    background: `linear-gradient(145deg, ${desk.accent}30, ${desk.accent}18)`,
                    border: `2.5px solid ${desk.accent}`,
                    color: desk.accent,
                }}
            >
                <span className="avatar-emoji">{desk.emoji}</span>
                <div className={`avatar-status-dot ${activity}`} />
            </div>
        </div>
    );
}

// ── PixelDesk (sprite-based) ──────────────────────────────────────────────────

export default function PixelDesk({
    desk,
    activity,
    currentTask,
    bubbleMsg,
    selected,
    glowClass = '',
    onClick,
}: PixelDeskProps) {
    const isWorking = activity === 'working';
    const isThinking = activity === 'thinking';
    const isIdle = activity === 'idle';
    const isError = activity === 'error';

    const [flash, setFlash] = useState(false);
    const [shake, setShake] = useState(false);
    const prevActivity = usePrevious(activity);

    // Step completed → green flash
    useEffect(() => {
        if (prevActivity === 'working' && (activity === 'active' || activity === 'idle')) {
            setFlash(true);
            const t = setTimeout(() => setFlash(false), 1400);
            return () => clearTimeout(t);
        }
    }, [activity, prevActivity]);

    // Error → shake
    useEffect(() => {
        if (activity === 'error') {
            setShake(true);
            const t = setTimeout(() => setShake(false), 600);
            return () => clearTimeout(t);
        }
    }, [activity]);

    // Agent-specific glow
    const glowShadow =
        isWorking ? `0 0 30px ${desk.accent}66, 0 8px 28px rgba(0,0,0,0.5)` :
            activity === 'active' ? `0 0 22px ${desk.accent}44, 0 6px 20px rgba(0,0,0,0.44)` :
                isThinking ? `0 0 22px rgba(167,139,250,0.5), 0 6px 20px rgba(0,0,0,0.44)` :
                    isError ? `0 0 22px rgba(248,113,113,0.52), 0 6px 20px rgba(0,0,0,0.44)` :
                        '0 4px 18px rgba(0,0,0,0.38)';

    const chairFilter = buildChairFilter(desk.accent, isIdle);

    return (
        <div
            className={[
                'pixel-desk',
                selected ? 'desk-selected' : '',
                flash ? 'flash-success' : '',
                shake ? 'shake-error' : '',
                glowClass,
            ].filter(Boolean).join(' ')}
            onClick={onClick}
            style={{
                boxShadow: glowShadow,
                ['--desk-glow' as string]: desk.accent,
                cursor: 'pointer',
            }}
        >
            {/* Floating avatar badge */}
            <AvatarBadge desk={desk} activity={activity} />

            {/* Chat bubble */}
            {bubbleMsg && (
                <div className="chat-bubble">
                    {bubbleMsg.slice(0, 65)}{bubbleMsg.length > 65 ? '…' : ''}
                </div>
            )}

            {/* ── Workstation container ── */}
            <div
                className={`desk-surface${isIdle ? ' idle-breathe' : ''}`}
                style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0,
                    position: 'relative',
                }}
            >
                {/* MacBook on desk */}
                <div style={{ position: 'relative', zIndex: 3 }}>
                    <AnimatedMacBook
                        working={isWorking}
                        thinking={isThinking}
                        idle={isIdle}
                        screenColor={desk.screenColor}
                    />
                    {/* Think bubble when thinking */}
                    {isThinking && <ThinkBubble />}
                </div>

                {/* Desk sprite */}
                <img
                    src="/sprites/desk/Desk_1_Tile.png"
                    alt="desk"
                    className="sprite-img"
                    style={{
                        width: 96,
                        height: 'auto',
                        imageRendering: 'pixelated',
                        marginTop: -8,
                        position: 'relative',
                        zIndex: 2,
                        filter: isError ? 'brightness(0.8) saturate(1.4) hue-rotate(340deg)' : 'none',
                        transition: 'filter 0.3s ease',
                    }}
                />

                {/* Gaming Chair sprite (tinted per agent) */}
                <img
                    src="/sprites/chair/GChair_9_A.png"
                    alt="gaming chair"
                    className="sprite-img"
                    style={{
                        width: 80,
                        height: 'auto',
                        imageRendering: 'pixelated',
                        marginTop: -4,
                        position: 'relative',
                        zIndex: 1,
                        filter: chairFilter,
                        opacity: isIdle ? 0.6 : 1,
                        transition: 'filter 0.4s ease, opacity 0.4s ease',
                    }}
                />
            </div>

            {/* Role label + status dot */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingInline: 6,
                    marginTop: 4,
                }}
            >
                <span style={{ fontSize: 8, color: 'rgba(200,180,160,0.55)', fontFamily: 'monospace' }}>
                    {desk.role}
                </span>
                <div className={`status-dot ${activity}`} />
            </div>

            {/* Current task micro-text */}
            {currentTask && !isIdle && (
                <div
                    style={{
                        marginTop: 2,
                        paddingInline: 4,
                        paddingBottom: 2,
                        fontSize: 8,
                        color: 'rgba(200,180,160,0.5)',
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {currentTask.slice(0, 28)}
                </div>
            )}
        </div>
    );
}

// ── Chair tint helper ─────────────────────────────────────────────────────────

function buildChairFilter(accent: string, idle: boolean): string {
    const hue = hexToHue(accent);
    const rotate = hue - 220;
    const brightness = idle ? 0.7 : 1.0;
    return `hue-rotate(${rotate}deg) saturate(1.6) brightness(${brightness})`;
}

function hexToHue(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
        const d = max - min;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return Math.round(h * 360);
}
