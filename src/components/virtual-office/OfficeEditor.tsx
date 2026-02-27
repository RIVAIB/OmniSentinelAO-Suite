'use client';

import '@/styles/pixel-art.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
    Application,
    Container,
    Sprite,
    Graphics,
    Assets,
    FederatedPointerEvent,
    Texture,
    AnimatedSprite,
} from 'pixi.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — TILE size is fixed; canvas/grid are computed dynamically at init
// ═══════════════════════════════════════════════════════════════════════════════

const TILE_W = 64;
const TILE_H = 32;
const WALL_RATIO = 0.15; // thin wall strip at top — more floor = more space

// These are populated at init time from the actual container dimensions
let CANVAS_W = 1400;
let CANVAS_H = 900;
let GRID_COLS = 20;
let GRID_ROWS = 20;
let ORIGIN_X = CANVAS_W / 2;
let ORIGIN_Y = 60;

/**
 * Computes GRID_COLS / GRID_ROWS so the isometric diamond covers
 * the FULL canvas left-to-right and top-to-bottom.
 */
function computeLayout(w: number, h: number) {
    CANVAS_W = w;
    CANVAS_H = h;
    ORIGIN_X = w / 2;
    ORIGIN_Y = Math.max(40, Math.round(h * 0.04));
    GRID_COLS = Math.ceil((w / 2) / (TILE_W / 2));
    const totalByHeight = Math.ceil((h - ORIGIN_Y) / (TILE_H / 2));
    GRID_ROWS = Math.max(totalByHeight - GRID_COLS, GRID_COLS);
}

function isoToScreen(gx: number, gy: number) {
    return {
        x: ORIGIN_X + (gx - gy) * (TILE_W / 2),
        y: ORIGIN_Y + (gx + gy) * (TILE_H / 2),
    };
}
function screenToIso(sx: number, sy: number) {
    const rx = sx - ORIGIN_X;
    const ry = sy - ORIGIN_Y;
    return {
        gridX: Math.round((rx / (TILE_W / 2) + ry / (TILE_H / 2)) / 2),
        gridY: Math.round((ry / (TILE_H / 2) - rx / (TILE_W / 2)) / 2),
    };
}
function inBounds(gx: number, gy: number) {
    return gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS;
}
function isoDepth(gx: number, gy: number) {
    return (gx + gy) * 10;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG
// ═══════════════════════════════════════════════════════════════════════════════

type Category = 'desks' | 'chairs' | 'plants' | 'equipment' | 'decor' | 'tiles';

interface Variant {
    direction: 'SE' | 'SW' | 'NW' | 'NE';
    label: string;
    sprite: string;
}

interface CatalogItem {
    id: string;
    name: string;
    category: Category;
    sprite: string;
    variants?: Variant[];
    frames?: string[];
    anchorY: number;
    baseScale?: number;
}

const MACBOOK_FRAMES = Array.from({ length: 11 }, (_, i) =>
    `/sprites/macbook/Macbook_1_Tile_Ani_${i + 1}.png`
);

const CATALOG: CatalogItem[] = [
    { id: 'desk_1', name: 'Desk A', category: 'desks', sprite: '/sprites/desk/Desk_1_Tile.png', anchorY: 0.85 },
    { id: 'desk_2', name: 'Desk B', category: 'desks', sprite: '/sprites/desk/Desk_1_B_Tile.png', anchorY: 0.85 },
    {
        id: 'chair',
        name: 'Silla',
        category: 'chairs',
        sprite: '/sprites/chair/GChair_9_A.png',
        anchorY: 0.9,
        variants: [
            { direction: 'SE', label: '↘', sprite: '/sprites/chair/GChair_9_A.png' },
            { direction: 'SW', label: '↙', sprite: '/sprites/chair/GChair_9_B.png' },
            { direction: 'NW', label: '↖', sprite: '/sprites/chair/GChair_9_C.png' },
            { direction: 'NE', label: '↗', sprite: '/sprites/chair/GChair_9_D.png' },
        ]
    },
    { id: 'plant_2', name: 'Monstera', category: 'plants', sprite: '/sprites/plants/Plant_2.png', anchorY: 0.95 },
    { id: 'cactus_1', name: 'Cactus A', category: 'plants', sprite: '/sprites/plants/Cactus_1.png', anchorY: 0.95 },
    { id: 'cactus_2', name: 'Cactus B', category: 'plants', sprite: '/sprites/plants/Cactus_2.png', anchorY: 0.95 },
    { id: 'sunflower', name: 'Sunflower', category: 'plants', sprite: '/sprites/plants/Sun_Flower.png', anchorY: 0.95 },
    { id: 'macbook_open', name: 'MacBook (abierto)', category: 'equipment', sprite: '/sprites/macbook/Macbook_1_Open_Tile.png', anchorY: 0.8 },
    { id: 'macbook_closed', name: 'MacBook (cerrado)', category: 'equipment', sprite: '/sprites/macbook/Macbook_1_Closed_Tile.png', anchorY: 0.8 },
    { id: 'macbook_ani', name: 'MacBook ✨', category: 'equipment', sprite: '/sprites/macbook/Macbook_1_Tile_Ani_1.png', frames: MACBOOK_FRAMES, anchorY: 0.8 },
    { id: 'keyboard', name: 'Teclado', category: 'equipment', sprite: '/sprites/keyboard/NewKeyboard_Tile.png', anchorY: 0.8 },
    { id: 'carpet', name: 'Alfombra', category: 'decor', sprite: '/sprites/carpet/Carpet_13.png', anchorY: 0.5, baseScale: 1.5 },
    { id: 'window_a', name: 'Ventana A', category: 'decor', sprite: '/sprites/windows/Window_7_A_Tile.png', anchorY: 0.9 },
    { id: 'window_b', name: 'Ventana B', category: 'decor', sprite: '/sprites/windows/Window_11.png', anchorY: 0.9 },
    { id: 'floor_1', name: 'Piso A', category: 'tiles', sprite: '/sprites/tiles/Floor_1_Tile(64).png', anchorY: 0.5 },
    { id: 'floor_10', name: 'Piso B', category: 'tiles', sprite: '/sprites/tiles/Floor_10_Tile(64).png', anchorY: 0.5 },
    { id: 'wall_1', name: 'Pared A', category: 'tiles', sprite: '/sprites/tiles/Wall_1_Tile(64).png', anchorY: 0.9 },
    { id: 'wall_2', name: 'Pared B', category: 'tiles', sprite: '/sprites/tiles/Wall_2_Tile(64).png', anchorY: 0.9 },
];

const CATEGORIES: { key: 'all' | Category; label: string; emoji: string }[] = [
    { key: 'all', label: 'Todos', emoji: '🏠' },
    { key: 'desks', label: 'Escritorios', emoji: '🪑' },
    { key: 'chairs', label: 'Sillas', emoji: '💺' },
    { key: 'plants', label: 'Plantas', emoji: '🌿' },
    { key: 'equipment', label: 'Equipos', emoji: '💻' },
    { key: 'decor', label: 'Decoración', emoji: '🪟' },
    { key: 'tiles', label: 'Pisos/Paredes', emoji: '🟫' },
];

interface PlacedItem {
    uid: string;
    spriteId: string;
    gridX: number;
    gridY: number;
    scale: number;
    variantIndex: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function OfficeEditor() {
    const canvasWrapRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const furLayerRef = useRef<Container | null>(null);
    const gridLayerRef = useRef<Container | null>(null);
    const outlineRef = useRef<Graphics | null>(null);
    const previewRef = useRef<Sprite | null>(null);
    const pixiMap = useRef<Map<string, Sprite | AnimatedSprite>>(new Map());

    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<'all' | Category>('all');
    const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(null);
    const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
    const [selectedUid, setSelectedUid] = useState<string | null>(null);
    const [showGrid, setShowGrid] = useState(true);
    const [statusMsg, setStatusMsg] = useState('');
    const [placeScale, setPlaceScale] = useState(1);
    const [placeVariant, setPlaceVariant] = useState(0);

    const selCatalogRef = useRef<CatalogItem | null>(null);
    const selUidRef = useRef<string | null>(null);
    const placedRef = useRef<PlacedItem[]>([]);
    const placeScaleRef = useRef(1);
    const placeVarRef = useRef(0);

    useEffect(() => { selCatalogRef.current = selectedCatalog; }, [selectedCatalog]);
    useEffect(() => { selUidRef.current = selectedUid; }, [selectedUid]);
    useEffect(() => { placedRef.current = placedItems; }, [placedItems]);
    useEffect(() => { placeScaleRef.current = placeScale; }, [placeScale]);
    useEffect(() => { placeVarRef.current = placeVariant; }, [placeVariant]);
    useEffect(() => { setPlaceVariant(0); }, [selectedCatalog]);

    useEffect(() => {
        if (!canvasWrapRef.current || appRef.current) return;
        let mounted = true;

        const init = async () => {
            const cw = canvasWrapRef.current!.offsetWidth || 1400;
            const ch = canvasWrapRef.current!.offsetHeight || 900;
            computeLayout(cw, ch);

            const app = new Application();
            await app.init({
                width: CANVAS_W, height: CANVAS_H,
                backgroundColor: 0x1a1f2e,
                antialias: false,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            });
            if (!mounted || !canvasWrapRef.current) { app.destroy(true); return; }

            app.canvas.style.width = '100%';
            app.canvas.style.height = '100%';
            canvasWrapRef.current.appendChild(app.canvas);
            appRef.current = app;

            const allSprites = CATALOG.flatMap(c => {
                const vars = c.variants?.map(v => v.sprite) ?? [];
                const fram = c.frames ?? [];
                return [c.sprite, ...vars, ...fram];
            });
            const urls = Array.from(new Set(allSprites));

            for (const url of urls) {
                try { await Assets.load(url); } catch { /* skip missing */ }
            }
            if (!mounted) return;

            buildScene(app);
            setIsLoading(false);
        };

        init();

        return () => {
            mounted = false;
            if (appRef.current) {
                appRef.current.destroy(true, { children: true, texture: false });
                appRef.current = null;
                furLayerRef.current = null;
                gridLayerRef.current = null;
                outlineRef.current = null;
                previewRef.current = null;
                pixiMap.current.clear();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const buildScene = (app: Application) => {
        const stage = app.stage;
        stage.eventMode = 'static';
        stage.hitArea = app.screen;

        const bg = new Graphics();
        const wallH = CANVAS_H * WALL_RATIO;
        bg.rect(0, 0, CANVAS_W, wallH).fill(0xf5e6d3);
        bg.rect(0, wallH, CANVAS_W, CANVAS_H - wallH).fill(0xc9a574);
        bg.rect(0, wallH - 4, CANVAS_W, 8).fill(0xb8946e);
        stage.addChild(bg);

        const gridLayer = new Container();
        stage.addChild(gridLayer);
        gridLayerRef.current = gridLayer;
        redrawGrid(gridLayer, true);

        const furLayer = new Container();
        furLayer.sortableChildren = true;
        stage.addChild(furLayer);
        furLayerRef.current = furLayer;

        const outline = new Graphics();
        outline.zIndex = 99990;
        furLayer.addChild(outline);
        outlineRef.current = outline;

        stage.on('pointermove', onStageMove);
        stage.on('pointerdown', onStageDown);
        stage.on('pointerup', onStageUp);
        stage.on('pointerupoutside', onStageUp);
    };

    const redrawGrid = (container: Container, visible: boolean) => {
        container.removeChildren();
        if (!visible) return;
        const g = new Graphics();
        g.alpha = 0.18;
        for (let gx = 0; gx <= GRID_COLS; gx++) {
            const a = isoToScreen(gx, 0); const b = isoToScreen(gx, GRID_ROWS);
            g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xffffff, width: 1 });
        }
        for (let gy = 0; gy <= GRID_ROWS; gy++) {
            const a = isoToScreen(0, gy); const b = isoToScreen(GRID_COLS, gy);
            g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xffffff, width: 1 });
        }
        container.addChild(g);
    };

    useEffect(() => {
        if (gridLayerRef.current) redrawGrid(gridLayerRef.current, showGrid);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showGrid]);

    const dragRef = useRef<{
        uid: string;
        sprite: Sprite | AnimatedSprite;
        offX: number;
        offY: number;
    } | null>(null);

    const onStageMove = useCallback((e: FederatedPointerEvent) => {
        const pos = e.global;
        const item = selCatalogRef.current;

        if (item && furLayerRef.current) {
            const { gridX, gridY } = screenToIso(pos.x, pos.y);
            const valid = inBounds(gridX, gridY);
            if (!previewRef.current) {
                const p = new Sprite(Texture.EMPTY);
                p.anchor.set(0.5, item.anchorY);
                p.alpha = 0.55;
                p.zIndex = 99998;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (p.texture.source as any).scaleMode = 'nearest';
                furLayerRef.current.addChild(p);
                previewRef.current = p;
            }

            const vIdx = placeVarRef.current;
            const spriteUrl = (item.variants && item.variants[vIdx])
                ? item.variants[vIdx].sprite
                : item.sprite;

            if (previewRef.current.texture.label !== spriteUrl) {
                try { previewRef.current.texture = Assets.get(spriteUrl); } catch { /* */ }
                previewRef.current.texture.label = spriteUrl;
            }

            const sp = isoToScreen(gridX, gridY);
            previewRef.current.x = sp.x;
            previewRef.current.y = sp.y;
            previewRef.current.scale.set(placeScaleRef.current * (item.baseScale ?? 1));
            previewRef.current.angle = 0;
            previewRef.current.tint = valid ? 0x4ade80 : 0xef4444;
        }

        if (dragRef.current) {
            dragRef.current.sprite.x = pos.x - dragRef.current.offX;
            dragRef.current.sprite.y = pos.y - dragRef.current.offY;
            drawOutline(dragRef.current.sprite.x, dragRef.current.sprite.y);
        }
    }, []);

    const onStageDown = useCallback((e: FederatedPointerEvent) => {
        const item = selCatalogRef.current;
        const { gridX, gridY } = screenToIso(e.global.x, e.global.y);

        if (item) {
            if (!inBounds(gridX, gridY)) return;
            if (previewRef.current) { previewRef.current.destroy(); previewRef.current = null; }

            const uid = `${item.id}_${Date.now()}`;
            const scale = placeScaleRef.current;
            const vIdx = placeVarRef.current;

            createAndRegisterSprite(uid, item, gridX, gridY, scale, vIdx);
            setPlacedItems(prev => [...prev, { uid, spriteId: item.id, gridX, gridY, scale, variantIndex: vIdx }]);
            setSelectedUid(uid);
            flash(`${item.name} colocado`);
        } else {
            setSelectedUid(null);
            clearOutline();
        }
    }, []);

    const onStageUp = useCallback(() => {
        if (!dragRef.current) return;
        const { uid, sprite } = dragRef.current;
        sprite.alpha = 1;
        sprite.tint = 0xffffff;

        const { gridX, gridY } = screenToIso(sprite.x, sprite.y);
        if (inBounds(gridX, gridY)) {
            const snap = isoToScreen(gridX, gridY);
            sprite.x = snap.x;
            sprite.y = snap.y;
            sprite.zIndex = isoDepth(gridX, gridY);
            setPlacedItems(prev => prev.map(p => p.uid === uid ? { ...p, gridX, gridY } : p));
        } else {
            const orig = placedRef.current.find(p => p.uid === uid);
            if (orig) { const s = isoToScreen(orig.gridX, orig.gridY); sprite.x = s.x; sprite.y = s.y; }
        }
        drawOutline(sprite.x, sprite.y);
        dragRef.current = null;
    }, []);

    const createAndRegisterSprite = (
        uid: string,
        catalogItem: CatalogItem,
        gx: number,
        gy: number,
        scale: number,
        variantIndex: number,
    ): Sprite | AnimatedSprite | undefined => {
        if (!furLayerRef.current) return;

        let sp: Sprite | AnimatedSprite;

        if (catalogItem.frames && catalogItem.frames.length > 0) {
            const textures = catalogItem.frames.map(f => {
                try { return Assets.get<Texture>(f); }
                catch { return Texture.EMPTY; }
            });
            const ani = new AnimatedSprite(textures);
            ani.animationSpeed = 0.25;
            ani.play();
            sp = ani;
        } else {
            let tex: Texture;
            const spriteUrl = (catalogItem.variants && catalogItem.variants[variantIndex])
                ? catalogItem.variants[variantIndex].sprite
                : catalogItem.sprite;

            try { tex = Assets.get(spriteUrl); }
            catch { return; }
            sp = new Sprite(tex);
        }

        const pos = isoToScreen(gx, gy);
        sp.anchor.set(0.5, catalogItem.anchorY);
        sp.scale.set(scale * (catalogItem.baseScale ?? 1));
        sp.angle = 0;
        sp.x = pos.x;
        sp.y = pos.y;
        sp.zIndex = isoDepth(gx, gy);
        sp.eventMode = 'static';
        sp.cursor = 'grab';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sp.texture.source as any).scaleMode = 'nearest';

        sp.on('pointerdown', (ev: FederatedPointerEvent) => {
            ev.stopPropagation();
            if (selCatalogRef.current) return;
            setSelectedUid(uid);
            drawOutline(sp.x, sp.y);
            dragRef.current = { uid, sprite: sp, offX: ev.global.x - sp.x, offY: ev.global.y - sp.y };
            sp.alpha = 0.85;
            sp.zIndex = 99995;
            sp.cursor = 'grabbing';
        });
        sp.on('pointerup', () => { sp.cursor = 'grab'; });

        furLayerRef.current.addChild(sp);
        pixiMap.current.set(uid, sp);

        return sp;
    };

    const applyScale = useCallback((newScale: number) => {
        const uid = selUidRef.current;
        if (!uid) return;
        const sp = pixiMap.current.get(uid);
        if (!sp) return;
        const item = placedRef.current.find(p => p.uid === uid);
        const cat = CATALOG.find(c => c.id === item?.spriteId);
        sp.scale.set(newScale * (cat?.baseScale ?? 1));
        setPlacedItems(prev => prev.map(p => p.uid === uid ? { ...p, scale: newScale } : p));
    }, []);

    const applyVariant = useCallback((vIdx: number) => {
        const uid = selUidRef.current;
        if (!uid) return;
        const item = placedRef.current.find(p => p.uid === uid);
        if (!item) return;
        const cat = CATALOG.find(c => c.id === item.spriteId);
        if (!cat || !cat.variants) return;
        const newIdx = Math.max(0, Math.min(vIdx, cat.variants.length - 1));
        const newUrl = cat.variants[newIdx].sprite;
        const sp = pixiMap.current.get(uid);
        if (sp && sp instanceof Sprite) {
            try { sp.texture = Assets.get(newUrl); } catch { /* */ }
        }
        setPlacedItems(prev => prev.map(p => p.uid === uid ? { ...p, variantIndex: newIdx } : p));
    }, []);

    const rotateNext = useCallback(() => {
        const uid = selUidRef.current;
        if (uid) {
            const item = placedRef.current.find(p => p.uid === uid);
            if (!item) return;
            const cat = CATALOG.find(c => c.id === item.spriteId);
            if (cat && cat.variants) {
                const next = (item.variantIndex + 1) % cat.variants.length;
                applyVariant(next);
            } else {
                flash('Este objeto no se puede rotar');
            }
        } else {
            const cat = selCatalogRef.current;
            if (cat && cat.variants) {
                setPlaceVariant(prev => (prev + 1) % cat.variants!.length);
            }
        }
    }, [applyVariant]);

    const deleteSelected = useCallback(() => {
        const uid = selUidRef.current;
        if (!uid) { flash('Selecciona un objeto primero'); return; }
        const sp = pixiMap.current.get(uid);
        if (sp) { sp.destroy(); pixiMap.current.delete(uid); }
        setPlacedItems(prev => prev.filter(p => p.uid !== uid));
        setSelectedUid(null);
        clearOutline();
        flash('Eliminado ✓');
    }, []);

    const clearAll = useCallback(() => {
        pixiMap.current.forEach(sp => sp.destroy());
        pixiMap.current.clear();
        setPlacedItems([]);
        setSelectedUid(null);
        clearOutline();
        flash('Lienzo limpio ✓');
    }, []);

    const exportJSON = useCallback(() => {
        const layout = { version: 2, items: placedRef.current.map(p => ({ ...p })) };
        const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: 'office-layout.json' }).click();
        URL.revokeObjectURL(url);
        flash('Exportado ✓');
    }, []);

    const importJSON = useCallback((raw: string) => {
        try {
            const layout = JSON.parse(raw);
            pixiMap.current.forEach(sp => sp.destroy());
            pixiMap.current.clear();
            clearOutline();
            setPlacedItems([]);
            setSelectedUid(null);

            const newItems: PlacedItem[] = [];
            for (const item of layout.items ?? []) {
                const cat = CATALOG.find(c => c.id === item.spriteId);
                if (!cat) continue;
                const scale = (item.scale as number) ?? 1;
                const vIdx = (item.variantIndex as number) ?? 0;
                createAndRegisterSprite(item.uid, cat, item.gridX, item.gridY, scale, vIdx);
                newItems.push({ uid: item.uid, spriteId: item.spriteId, gridX: item.gridX, gridY: item.gridY, scale, variantIndex: vIdx });
            }
            setPlacedItems(newItems);
            flash(`Importado: ${newItems.length} items`);
        } catch { flash('❌ Archivo inválido'); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (e.key === 'Escape') {
                setSelectedCatalog(null); setSelectedUid(null); clearOutline();
                if (previewRef.current) { previewRef.current.destroy(); previewRef.current = null; }
            }
            if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
            if (e.key === 'r' || e.key === 'R') rotateNext();
            if (e.key === '+' || e.key === '=') setPlaceScale(s => Math.min(4, parseFloat((s + 0.25).toFixed(2))));
            if (e.key === '-') setPlaceScale(s => Math.max(0.25, parseFloat((s - 0.25).toFixed(2))));
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [deleteSelected, rotateNext]);

    useEffect(() => {
        if (!selectedCatalog && previewRef.current) { previewRef.current.destroy(); previewRef.current = null; }
    }, [selectedCatalog]);

    const drawOutline = (cx: number, cy: number) => {
        const g = outlineRef.current; if (!g) return;
        const hw = TILE_W / 2, hh = TILE_H / 2;
        g.clear()
            .moveTo(cx, cy - hh)
            .lineTo(cx + hw, cy)
            .lineTo(cx, cy + hh)
            .lineTo(cx - hw, cy)
            .lineTo(cx, cy - hh)
            .stroke({ color: 0x22d3ee, width: 2, alpha: 0.9 });
    };
    const clearOutline = () => outlineRef.current?.clear();
    const flash = (msg: string) => { setStatusMsg(msg); setTimeout(() => setStatusMsg(''), 2500); };

    const filtered = activeCategory === 'all' ? CATALOG : CATALOG.filter(c => c.category === activeCategory);
    const selItem = placedItems.find(p => p.uid === selectedUid);
    const activeCatalogItem = selItem ? CATALOG.find(c => c.id === selItem.spriteId) : selectedCatalog;
    const displayScale = selItem ? selItem.scale : placeScale;
    const displayVariant = selItem ? selItem.variantIndex : placeVariant;

    return (
        <div className="flex flex-col" style={{ height: '100vh', background: '#0d1117' }}>
            <header className="flex items-center justify-between px-5 py-3 flex-shrink-0"
                style={{ background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🏢</span>
                    <div>
                        <h1 className="text-sm font-bold tracking-wide" style={{ color: '#22d3ee', fontFamily: 'monospace' }}>
                            RIVAIB Office Editor
                        </h1>
                        <p className="text-xs" style={{ color: '#4b5563' }}>Drag &amp; Drop Isométrico</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {statusMsg && (
                        <span className="text-xs px-3 py-1 rounded-full animate-pulse"
                            style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}>
                            {statusMsg}
                        </span>
                    )}
                    <p className="text-xs" style={{ color: '#4b5563' }}>
                        {selectedCatalog
                            ? <><span style={{ color: '#22d3ee' }}>Click</span> coloca · <kbd className="bg-white/10 px-1 rounded">R</kbd> rota · <span style={{ color: '#f87171' }}>Esc</span> cancela</>
                            : <><kbd className="bg-white/10 px-1 rounded">R</kbd> rota · <kbd className="bg-white/10 px-1 rounded">+/-</kbd> tamaño · <kbd className="bg-white/10 px-1 rounded">Del</kbd> borra</>
                        }
                    </p>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="flex flex-col flex-shrink-0"
                    style={{ width: 210, background: '#161b22', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="p-3 flex flex-col gap-1 flex-shrink-0"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {CATEGORIES.map(cat => (
                            <button key={cat.key}
                                onClick={() => setActiveCategory(cat.key)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-left"
                                style={{
                                    background: activeCategory === cat.key ? 'rgba(34,211,238,0.12)' : 'transparent',
                                    color: activeCategory === cat.key ? '#22d3ee' : '#6b7280',
                                    border: activeCategory === cat.key ? '1px solid rgba(34,211,238,0.2)' : '1px solid transparent',
                                }}>
                                <span>{cat.emoji}</span>{cat.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="grid grid-cols-2 gap-2">
                            {filtered.map(item => {
                                const sel = selectedCatalog?.id === item.id;
                                return (
                                    <button key={item.id} title={item.name}
                                        onClick={() => { setSelectedCatalog(sel ? null : item); setSelectedUid(null); clearOutline(); }}
                                        className="flex flex-col items-center rounded-lg p-1.5"
                                        style={{
                                            background: sel ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.02)',
                                            border: sel ? '1.5px solid #22d3ee' : '1.5px solid rgba(255,255,255,0.06)',
                                        }}>
                                        <div className="w-full rounded flex items-center justify-center"
                                            style={{ aspectRatio: '1', background: 'rgba(0,0,0,0.3)' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={item.sprite} alt={item.name} draggable={false}
                                                style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain', imageRendering: 'pixelated' }} />
                                        </div>
                                        <span className="mt-1 text-[10px] truncate w-full text-center"
                                            style={{ color: sel ? '#22d3ee' : '#6b7280' }}>
                                            {item.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="px-3 py-2 text-xs flex-shrink-0"
                        style={{ color: '#4b5563', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {placedItems.length} item{placedItems.length !== 1 ? 's' : ''} colocados
                    </div>
                </aside>

                <div className="flex-1 relative" style={{ background: '#0d1117', minHeight: 0 }}>
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="px-6 py-3 rounded-xl text-sm animate-pulse"
                                style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}>
                                Cargando sprites…
                            </div>
                        </div>
                    )}
                    <div ref={canvasWrapRef}
                        style={{
                            width: '100%', height: '100%',
                            cursor: selectedCatalog ? 'crosshair' : 'default',
                            overflow: 'hidden',
                        }} />
                </div>

                <aside className="flex flex-col flex-shrink-0 p-4 gap-5"
                    style={{ width: 210, background: '#161b22', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                        <h2 className="text-xs font-bold mb-4 uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                            {activeCatalogItem
                                ? (selectedUid ? `✦ ${activeCatalogItem.name}` : `➤ ${activeCatalogItem.name}`)
                                : 'Propiedades'}
                        </h2>

                        <div className="mb-5">
                            <div className="flex justify-between text-xs mb-2" style={{ color: '#6b7280' }}>
                                <span>Tamaño</span>
                                <span style={{ color: '#22d3ee', fontWeight: 600 }}>{displayScale.toFixed(2)}×</span>
                            </div>
                            <input type="range" min={0.25} max={4} step={0.05}
                                value={displayScale}
                                onChange={e => {
                                    const v = parseFloat(e.target.value);
                                    if (selectedUid) { applyScale(v); }
                                    else { setPlaceScale(v); }
                                }}
                                className="w-full accent-cyan-400" style={{ cursor: 'pointer' }} />
                        </div>

                        <div className="mb-5">
                            <div className="flex justify-between items-center text-xs mb-2" style={{ color: '#6b7280' }}>
                                <span>Dirección</span>
                                <kbd className="bg-white/10 px-1 rounded text-[10px]" title="Tecla R">R</kbd>
                            </div>
                            {activeCatalogItem?.variants ? (
                                <>
                                    <div className="grid grid-cols-4 gap-1 mb-2">
                                        {activeCatalogItem.variants.map((v, i) => {
                                            const isActive = displayVariant === i;
                                            return (
                                                <button key={v.direction}
                                                    onClick={() => {
                                                        if (selectedUid) applyVariant(i);
                                                        else setPlaceVariant(i);
                                                    }}
                                                    className="py-1.5 rounded text-[10px] font-bold"
                                                    title={v.direction}
                                                    style={{
                                                        background: isActive ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.04)',
                                                        color: isActive ? '#22d3ee' : '#4b5563',
                                                        border: isActive ? '1px solid rgba(34,211,238,0.35)' : '1px solid rgba(255,255,255,0.06)',
                                                    }}>
                                                    {v.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button onClick={rotateNext}
                                        className="w-full py-1.5 rounded text-xs mb-2"
                                        style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}>
                                        🔄 Rotar
                                    </button>
                                </>
                            ) : (
                                <div className="text-[10px] italic text-center py-2 rounded" style={{ background: 'rgba(255,255,255,0.02)', color: '#4b5563' }}>
                                    No rotable
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                if (selectedUid) { applyScale(1); applyVariant(0); }
                                else { setPlaceScale(1); setPlaceVariant(0); }
                            }}
                            className="w-full py-1.5 rounded text-xs"
                            style={{ background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}>
                            ↺ Resetear
                        </button>
                    </div>

                    <div className="flex-1" />

                    <div className="flex flex-col gap-2">
                        {selectedUid && (
                            <button onClick={deleteSelected}
                                className="w-full py-2 rounded-lg text-xs flex items-center justify-center gap-2"
                                style={{ background: '#3f1a1a', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                                🗑️ Borrar item
                            </button>
                        )}
                        <button onClick={() => { if (confirm('¿Borrar todo?')) clearAll() }}
                            className="w-full py-2 rounded-lg text-xs"
                            style={{ color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                            🧹 Limpiar todo
                        </button>
                        <hr className="border-white/10 my-1" />
                        <div className="flex gap-2">
                            <button onClick={exportJSON} className="flex-1 py-2 rounded bg-slate-800 text-xs text-cyan-400 border border-slate-700">
                                💾 Exportar
                            </button>
                            <label className="flex-1 py-2 rounded bg-slate-800 text-xs text-center border border-slate-700 cursor-pointer text-gray-300">
                                📂 Importar
                                <input type="file" className="hidden" accept=".json"
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) {
                                            const r = new FileReader();
                                            r.onload = ev => importJSON(ev.target?.result as string);
                                            r.readAsText(f);
                                        }
                                        e.target.value = '';
                                    }} />
                            </label>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
