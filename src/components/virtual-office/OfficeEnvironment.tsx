'use client';

/* ────────────────────────────────────────────────────────────────
   OfficeEnvironment v2 — TinyHouse 0.14 sprite-based background:
   wood floor tiles, wall tiles, real window sprite, real plants,
   carpet, string lights, clock, RIVAIB logo
   ──────────────────────────────────────────────────────────────── */

// ── String Lights ─────────────────────────────────────────────────

const BULB_COLORS = ['#ffe566', '#ff9f68', '#ff7eb3', '#a3e4ff', '#b4ff8c', '#ffe566', '#ff9f68', '#a3e4ff'];

function StringLights() {
    return (
        <div className="string-lights">
            <div className="string-wire" />
            {BULB_COLORS.map((color, i) => (
                <div
                    key={i}
                    className="light-bulb"
                    style={{
                        left: `${8 + i * 12}%`,
                        background: color,
                        color,
                        animationDelay: `${i * 0.38}s`,
                        boxShadow: `0 0 8px ${color}cc`,
                    }}
                />
            ))}
        </div>
    );
}

// ── Clock on wall ──────────────────────────────────────────────────

function WallClock({ x, y }: { x: number; y: number }) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');

    return (
        <div style={{
            position: 'absolute', left: x, top: y, zIndex: 5, pointerEvents: 'none',
            width: 36, height: 36, borderRadius: '50%',
            background: '#f5e6d3', border: '3px solid #b8946e',
            boxShadow: '1px 3px 8px rgba(0,0,0,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <span style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 700, color: '#5c3d1e', letterSpacing: '-0.02em' }}>{h}:{m}</span>
        </div>
    );
}

// ── RIVAIB Logo on wall ────────────────────────────────────────────

function WallLogo({ x, y }: { x: number; y: number }) {
    return (
        <div style={{
            position: 'absolute', left: x, top: y, zIndex: 5, pointerEvents: 'none',
            fontFamily: 'var(--font-space-grotesk)',
            fontSize: 10, fontWeight: 800,
            letterSpacing: '0.22em',
            color: 'rgba(139,110,72,0.55)',
            textTransform: 'uppercase',
            userSelect: 'none',
        }}>
            RIVAIB HQ
        </div>
    );
}

// ── Sprite Window ──────────────────────────────────────────────────

function SpriteWindow({ x, y }: { x: number; y: number }) {
    return (
        <img
            src="/sprites/windows/Window_7_A_Tile.png"
            alt="window"
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: 80,
                height: 'auto',
                imageRendering: 'pixelated',
                zIndex: 4,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))',
            }}
        />
    );
}

// ── Corner Plant (sprite) ──────────────────────────────────────────

function CornerPlant({ x, y, flip = false, type = 'monstera' }: {
    x: number | string;
    y: number;
    flip?: boolean;
    type?: 'monstera' | 'cactus' | 'sunflower';
}) {
    const src =
        type === 'cactus' ? '/sprites/plants/Cactus_2.png' :
            type === 'sunflower' ? '/sprites/plants/Sun_Flower.png' :
                '/sprites/plants/Plant_2.png';

    const size = type === 'cactus' ? 52 : type === 'sunflower' ? 44 : 72;

    return (
        <img
            src={src}
            alt={type}
            style={{
                position: 'absolute',
                left: typeof x === 'string' ? undefined : x,
                right: typeof x === 'string' ? parseInt(x) : undefined,
                top: y,
                width: size,
                height: 'auto',
                imageRendering: 'pixelated',
                zIndex: 4,
                pointerEvents: 'none',
                transform: flip ? 'scaleX(-1)' : undefined,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            }}
        />
    );
}

// ── Center Carpet ──────────────────────────────────────────────────

function CenterCarpet({ top }: { top: number }) {
    return (
        <div style={{
            position: 'absolute',
            top,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <img
                src="/sprites/carpet/Carpet_13.png"
                alt="carpet"
                style={{
                    width: 200,
                    height: 'auto',
                    imageRendering: 'pixelated',
                    opacity: 0.85,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                }}
            />
        </div>
    );
}

// ── OfficeEnvironment ─────────────────────────────────────────────

export default function OfficeEnvironment({ height }: { height: number }) {
    const wallH = Math.round(height * 0.52);

    return (
        <>
            {/* Sky/outer background gradient */}
            <div className="office-bg" />

            {/* Cream wall (left side) — Wall_1 tile repeated */}
            <div
                className="office-wall"
                style={{
                    height: wallH,
                    backgroundImage: 'url(/sprites/tiles/Wall_1_Tile(64).png)',
                    backgroundSize: '64px 64px',
                    backgroundRepeat: 'repeat',
                    imageRendering: 'pixelated',
                }}
            />

            {/* Warm wood floor — Floor_10 tile repeated */}
            <div
                className="office-floor"
                style={{
                    top: wallH,
                    backgroundImage: 'url(/sprites/tiles/Floor_10_Tile(64).png)',
                    backgroundSize: '64px 64px',
                    backgroundRepeat: 'repeat',
                    imageRendering: 'pixelated',
                    opacity: 0.95,
                }}
            />

            {/* Center carpet */}
            <CenterCarpet top={wallH + 20} />

            {/* String lights along top of wall */}
            <StringLights />

            {/* Windows (sprite-based) */}
            <SpriteWindow x={24} y={wallH - 90} />
            <SpriteWindow x={110} y={wallH - 88} />

            {/* Clock + Logo */}
            <WallClock x={258} y={wallH - 42} />
            <WallLogo x={306} y={wallH - 30} />

            {/* Corner plants — real sprites */}
            {/* Far left monstera */}
            <CornerPlant x={0} y={wallH - 10} type="monstera" />
            {/* Far right monstera */}
            <CornerPlant x="0" y={wallH - 10} flip type="monstera" />
            {/* Small cactus accent left */}
            <CornerPlant x={62} y={wallH + 28} type="cactus" />
            {/* Small cactus accent right */}
            <CornerPlant x="52" y={wallH + 28} flip type="cactus" />
        </>
    );
}
