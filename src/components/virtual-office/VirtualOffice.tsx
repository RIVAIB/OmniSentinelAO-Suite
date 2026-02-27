'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import * as PIXI from 'pixi.js'

interface LayoutItem { id: string; x: number; y: number; w: number; h: number; angle: number; sx: number; sy: number }
interface AgentPosition { x: number; y: number }
interface LayoutData { bgMode: string; items: LayoutItem[]; agentPositions?: Record<string, AgentPosition> }
interface Agent { id: string; name: string; role: string; status: 'working' | 'idle' | 'meeting' | 'offline'; avatar: string; color: string }
interface VirtualOfficeProps { agents?: Agent[]; onAgentClick?: (agent: Agent) => void; initialMode?: 'view' | 'edit'; layoutKey?: string }

const CW = 2000, CH = 2000, VW = 900, VH = 600, MIN_SZ = 10
const DEFAULT_AGENTS: Agent[] = [
  { id: 'axiom',     name: 'AXIOM',       role: 'Strategy',       status: 'working', avatar: '🎯', color: '#FF6B6B' },
  { id: 'forge',     name: 'FORGE',       role: 'Dev',            status: 'working', avatar: '⚡', color: '#4ECDC4' },
  { id: 'nexus',     name: 'NEXUS',       role: 'Marketing',      status: 'idle',    avatar: '📡', color: '#45B7D1' },
  { id: 'apex',      name: 'APEX',        role: 'Finance',        status: 'working', avatar: '📊', color: '#96CEB4' },
  { id: 'jessy',     name: 'JESSY',       role: 'CRM/WhatsApp',   status: 'working', avatar: '📱', color: '#25D366' },
  { id: 'drriche',   name: 'DR.RICHE-MD', role: 'Medical Senior', status: 'working', avatar: '🧬', color: '#7EC8E3' },
]
const DEFAULT_AGENT_POSITIONS: Record<string, AgentPosition> = {
  axiom:   {x:400,y:650},
  forge:   {x:550,y:750},
  nexus:   {x:700,y:650},
  apex:    {x:400,y:850},
  jessy:   {x:700,y:850},
  drriche: {x:550,y:950},
}
const CATALOG = [
  // ── Furniture ──────────────────────────────────────────────────────────────
  {id:'desk_a',label:'Desk',cat:'Furniture',path:'assets/Desk/Desk_1_Tile.png'},
  {id:'desk_b',label:'Desk Alt',cat:'Furniture',path:'assets/Desk/Desk_1_B_Tile.png'},
  {id:'gchair_a',label:'GChair ↑',cat:'Furniture',path:'assets/Gaming Chair/GChair_9_A.png'},
  {id:'gchair_b',label:'GChair →',cat:'Furniture',path:'assets/Gaming Chair/GChair_9_B.png'},
  {id:'gchair_c',label:'GChair ↓',cat:'Furniture',path:'assets/Gaming Chair/GChair_9_C.png'},
  {id:'gchair_d',label:'GChair ←',cat:'Furniture',path:'assets/Gaming Chair/GChair_9_D.png'},
  {id:'chair_a',label:'Chair ↑',cat:'Furniture',path:'assets/Chair/Chair_2_A_Tile.png'},
  {id:'chair_b',label:'Chair →',cat:'Furniture',path:'assets/Chair/Chair_2_B_Tile.png'},
  {id:'chair_c',label:'Chair ↓',cat:'Furniture',path:'assets/Chair/Chair_2_C_Tile.png'},
  {id:'chair_d',label:'Chair ←',cat:'Furniture',path:'assets/Chair/Chair_2_D_Tile.png'},
  {id:'sofa_a',label:'Sofa ↑',cat:'Furniture',path:'assets/Sofa/Sofa_3_A_Tile.png'},
  {id:'sofa_b',label:'Sofa →',cat:'Furniture',path:'assets/Sofa/Sofa_3_B_Tile.png'},
  {id:'sofa_c',label:'Sofa ↓',cat:'Furniture',path:'assets/Sofa/Sofa_3_C_Tile.png'},
  {id:'sofa_d',label:'Sofa ←',cat:'Furniture',path:'assets/Sofa/Sofa_3_D_Tile.png'},
  {id:'lamp_a',label:'Lamp A',cat:'Furniture',path:'assets/Lamp/Lamp_8_A_Tile.png'},
  {id:'lamp_b',label:'Lamp B',cat:'Furniture',path:'assets/Lamp/Lamp_8_B_Tile.png'},
  {id:'carpet_3',label:'Carpet',cat:'Furniture',path:'assets/Carpet/Carpet_3_Tile.png'},
  {id:'carpet_7',label:'Carpet Round',cat:'Furniture',path:'assets/Carpet/Carpet_7.png'},
  {id:'carpet_13',label:'Carpet 13',cat:'Furniture',path:'assets/Carpet/Carpet_13.png'},
  {id:'carpet_14',label:'Carpet 14',cat:'Furniture',path:'assets/Carpet/Carpet_14.png'},
  {id:'shelving_6',label:'Shelving A',cat:'Furniture',path:'assets/Living Roon/shelving_6.png'},
  {id:'shelving_7',label:'Shelving B',cat:'Furniture',path:'assets/Living Roon/shelving_7.png'},
  {id:'small_table',label:'Small Table',cat:'Furniture',path:'assets/Living Roon/SmallTable_5.png'},
  {id:'table_10',label:'Table',cat:'Furniture',path:'assets/Living Roon/Table_10.png'},
  {id:'pillow',label:'Pillow',cat:'Furniture',path:'assets/Sofa/Pillow_11.png'},
  // ── Electronics ────────────────────────────────────────────────────────────
  {id:'imac_a',label:'iMac A',cat:'Electronics',path:'assets/PC/NewImac_A_Tile.png'},
  {id:'imac_b',label:'iMac B',cat:'Electronics',path:'assets/PC/NewImac_B_Tile.png'},
  {id:'old_imac_a',label:'Old iMac A',cat:'Electronics',path:'assets/PC/OldImac_A_Tile.png'},
  {id:'old_imac_b',label:'Old iMac B',cat:'Electronics',path:'assets/PC/OldImac_B_Tile.png'},
  {id:'pc_tower',label:'PC Tower',cat:'Electronics',path:'assets/PC/PcTower_Tile.png'},
  {id:'keyboard',label:'Keyboard',cat:'Electronics',path:'assets/PC/NewKeyboard_Tile.png'},
  {id:'old_keyboard',label:'Old Keyboard',cat:'Electronics',path:'assets/PC/OldKeyboard_Tile.png'},
  {id:'curved_scr',label:'Curved Screen',cat:'Electronics',path:'assets/PC/BendedScreen_A_Tile.png'},
  {id:'rot_scr_a',label:'Screen A',cat:'Electronics',path:'assets/PC/RotationScreen_A_Tile.png'},
  {id:'rot_scr_b',label:'Screen B',cat:'Electronics',path:'assets/PC/RotationScreen_B_Tile.png'},
  {id:'rot_scr_c',label:'Screen C',cat:'Electronics',path:'assets/PC/RotationScreen_C_Tile.png'},
  {id:'wacom',label:'Wacom',cat:'Electronics',path:'assets/PC/WacomTablet.png'},
  {id:'nes',label:'NES',cat:'Electronics',path:'assets/Console/Nes.png'},
  {id:'switch',label:'Nintendo Switch',cat:'Electronics',path:'assets/Console/Switch_5.png'},
  {id:'speaker',label:'Speaker',cat:'Electronics',path:'assets/Living Roon/Speaker_6_Tile.png'},
  {id:'microwave',label:'Microwave',cat:'Electronics',path:'assets/Microwave/Microwave_5_Tile.png'},
  {id:'bigtv_off',label:'TV (off)',cat:'Electronics',path:'assets/BigTv_Ani/BigTV_3_Off_Tile.png'},
  {id:'macbook_open',label:'MacBook Open',cat:'Electronics',path:'assets/MacBook_Ani/Macbook_1_Open_Tile.png'},
  {id:'macbook_closed',label:'MacBook Closed',cat:'Electronics',path:'assets/MacBook_Ani/Macbook_1_Closed_Tile.png'},
  // ── Decor ──────────────────────────────────────────────────────────────────
  {id:'plant1',label:'Plant 1',cat:'Decor',path:'assets/Plants/Plant_1.png'},
  {id:'plant2',label:'Plant 2',cat:'Decor',path:'assets/Plants/Plant_2.png'},
  {id:'plant5',label:'Plant 5',cat:'Decor',path:'assets/Plants/Plant_5.png'},
  {id:'cactus1',label:'Cactus 1',cat:'Decor',path:'assets/Plants/Cactus_1.png'},
  {id:'cactus2',label:'Cactus 2',cat:'Decor',path:'assets/Plants/Cactus_2.png'},
  {id:'sunflower',label:'Sunflower',cat:'Decor',path:'assets/Plants/Sun_Flower.png'},
  {id:'window7a',label:'Window A',cat:'Decor',path:'assets/Windows/Window_7_A_Tile.png'},
  {id:'window7b',label:'Window B',cat:'Decor',path:'assets/Windows/Window_7_B_Tile.png'},
  {id:'window7c',label:'Window C',cat:'Decor',path:'assets/Windows/Window_7_C_Tile.png'},
  {id:'window11',label:'Window 11',cat:'Decor',path:'assets/Windows/Window_11.png'},
  {id:'window11b',label:'Window 11B',cat:'Decor',path:'assets/Windows/Window_11_B.png'},
  {id:'window8',label:'Window 8',cat:'Decor',path:'assets/Windows/Window_8.png'},
  {id:'door_beige',label:'Door Beige',cat:'Decor',path:'assets/Doors/Door_1_Beige.png'},
  {id:'door_brown',label:'Door Brown',cat:'Decor',path:'assets/Doors/Door_2_Brown.png'},
  {id:'door_orange',label:'Door Orange',cat:'Decor',path:'assets/Doors/Door_3_Orange.png'},
  {id:'door_red',label:'Door Red',cat:'Decor',path:'assets/Doors/Door_4_Red.png'},
  {id:'door_green',label:'Door Green',cat:'Decor',path:'assets/Doors/Door_5_Green.png'},
  {id:'door_blue',label:'Door Blue',cat:'Decor',path:'assets/Doors/Door_6_Blue.png'},
  {id:'door_black',label:'Door Black',cat:'Decor',path:'assets/Doors/Door_7_Black.png'},
  {id:'poster16',label:'Poster 16',cat:'Decor',path:'assets/Poster/Poster_16.png'},
  {id:'poster17',label:'Poster 17',cat:'Decor',path:'assets/Poster/Poster_17.png'},
  {id:'book_big',label:'Book Big',cat:'Decor',path:'assets/Books/Book_Big_LightBlue.png'},
  {id:'book_blue',label:'Book Blue',cat:'Decor',path:'assets/Books/Book_Small_Blue.png'},
  {id:'book_red',label:'Book Red',cat:'Decor',path:'assets/Books/Book_Small_BrightRed.png'},
  {id:'book_green',label:'Book Green',cat:'Decor',path:'assets/Books/Book_Small_Green.png'},
  {id:'book_yellow',label:'Book Yellow',cat:'Decor',path:'assets/Books/Book_Small_Yellow.png'},
  {id:'book_purple',label:'Book Purple',cat:'Decor',path:'assets/Books/Book_Small_Purple.png'},
  {id:'book_orange',label:'Book Orange',cat:'Decor',path:'assets/Books/Book_Small_Orange.png'},
  {id:'present_a',label:'Present A',cat:'Decor',path:'assets/Present/Present_100.png'},
  {id:'present_b',label:'Present B',cat:'Decor',path:'assets/Present/Present_100_B.png'},
  {id:'present_c',label:'Present C',cat:'Decor',path:'assets/Present/Present_2.png'},
  {id:'air_cc',label:'Air Conditioner',cat:'Decor',path:'assets/Living Roon/AirCC_Tile.png'},
  {id:'bonsai',label:'Bonsai',cat:'Decor',path:'assets/Japanese_Room/Bonsai.png'},
  {id:'tori_gate',label:'Torii Gate',cat:'Decor',path:'assets/Japanese_Room/Japanese_Tori_Gate.png'},
  {id:'jp_lamp',label:'Japanese Lamp',cat:'Decor',path:'assets/Japanese_Room/Japanese_Lamp.png'},
  {id:'jp_shelf',label:'Japanese Shelf',cat:'Decor',path:'assets/Japanese_Room/Japanese_Shelf.png'},
  {id:'jp_vase',label:'Japanese Vase',cat:'Decor',path:'assets/Japanese_Room/Japanese_Vase.png'},
  {id:'jp_canvas',label:'Japanese Canvas',cat:'Decor',path:'assets/Japanese_Room/Japanese_Canvas.png'},
  // ── Animated ───────────────────────────────────────────────────────────────
  {id:'lavalamp',label:'Lava Lamp',cat:'Animated',animated:true,speed:0.06,frames:Array.from({length:24},(_,i)=>`assets/LavaLamp_Ani/LavaLamp_${i+1}.png`)},
  {id:'cat',label:'Cat (black)',cat:'Animated',animated:true,speed:0.08,frames:['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'].map(f=>`assets/Cat_Ani/Cat_99_${f}.png`)},
  {id:'cat2',label:'Cat (orange)',cat:'Animated',animated:true,speed:0.08,frames:['A','B','C','D','E'].map(f=>`assets/Cat_Ani/Cat_99_2_${f}.png`)},
  {id:'bigtv',label:'Big TV',cat:'Animated',animated:true,speed:0.1,frames:Array.from({length:19},(_,i)=>`assets/BigTv_Ani/BigTv_Ani_${i+1}.png`)},
  {id:'bigtv_b',label:'Big TV B',cat:'Animated',animated:true,speed:0.1,frames:Array.from({length:20},(_,i)=>`assets/BigTv_Ani/BigTv_Ani_B_${i+1}.png`)},
  {id:'macbook',label:'MacBook',cat:'Animated',animated:true,speed:0.08,frames:Array.from({length:11},(_,i)=>`assets/MacBook_Ani/Macbook_1_Tile_Ani_${i+1}.png`)},
  {id:'curved_scr_ani',label:'Curved Screen (ani)',cat:'Animated',animated:true,speed:0.07,frames:Array.from({length:18},(_,i)=>`assets/BendedScreen_Ani/Elect_13_Ani_${i+1}.png`)},
  {id:'pc_tower_ani',label:'PC Tower (ani)',cat:'Animated',animated:true,speed:0.1,frames:Array.from({length:9},(_,i)=>`assets/PC_Tower_Ani/Elect_16_Ani_${i+1}.png`)},
  {id:'jp_door',label:'Japanese Door',cat:'Animated',animated:true,speed:0.08,frames:Array.from({length:10},(_,i)=>`assets/Japanese_Room/Japanese_Door_Animation(Light)/Japanese_Door_Ani_${i+1}.png`)},
  {id:'dishwasher',label:'Dishwasher',cat:'Animated',animated:true,speed:0.08,frames:Array.from({length:11},(_,i)=>`assets/Kitchen/DishWasher/Dishwasher_${i+1}.png`)},
  {id:'sink_ani',label:'Sink (running)',cat:'Animated',animated:true,speed:0.15,frames:['1','2','3'].map(f=>`assets/Kitchen/Sink_Ani/Sink_${f}.png`)},
  {id:'toaster_ani',label:'Toaster',cat:'Animated',animated:true,speed:0.12,frames:['1','2','3','4','5'].map(f=>`assets/Kitchen/Toaster_Ani/Toaster_${f}.png`)},
  // ── Kitchen ────────────────────────────────────────────────────────────────
  {id:'kitchen_a',label:'Kitchen Counter',cat:'Kitchen',path:'assets/Kitchen/Kitchen_A_Tile.png'},
  {id:'sink',label:'Sink',cat:'Kitchen',path:'assets/Kitchen/Sink.png'},
  {id:'oven',label:'Oven',cat:'Kitchen',path:'assets/Kitchen/Oven.png'},
  {id:'stoves',label:'Stoves',cat:'Kitchen',path:'assets/Kitchen/Stoves.png'},
  {id:'fridge_red',label:'Fridge (red)',cat:'Kitchen',path:'assets/Kitchen/Fidge_Red.png'},
  {id:'fridge_2a',label:'Fridge (white)',cat:'Kitchen',path:'assets/Fridge/Fridge_2_A_Tile.png'},
  {id:'fridge_2c',label:'Fridge (gray)',cat:'Kitchen',path:'assets/Fridge/Fridge_2_C_Tile.png'},
  {id:'washing_machine',label:'Washing Machine',cat:'Kitchen',path:'assets/Kitchen/WashingMachine_Closed.png'},
  {id:'microwave_k',label:'Microwave',cat:'Kitchen',path:'assets/Kitchen/Kitchen_Tiles.png'},
  {id:'kitchen_table',label:'Kitchen Table',cat:'Kitchen',path:'assets/Kitchen/Kitchen_Table.png'},
  {id:'kitchen_stool',label:'Kitchen Stool',cat:'Kitchen',path:'assets/Kitchen/Kitchen_Stool.png'},
  {id:'kitchen_shelf',label:'Kitchen Shelf',cat:'Kitchen',path:'assets/Kitchen/Shelf.png'},
  {id:'kitchen_rack',label:'Kitchen Rack',cat:'Kitchen',path:'assets/Kitchen/Rack.png'},
  {id:'kitchen_window',label:'Kitchen Window',cat:'Kitchen',path:'assets/Kitchen/Kitchen_Window.png'},
  {id:'kitchen_rug',label:'Kitchen Rug',cat:'Kitchen',path:'assets/Kitchen/Kitchen_Rug.png'},
  {id:'toaster',label:'Toaster (off)',cat:'Kitchen',path:'assets/Kitchen/Toaster.png'},
  {id:'kettle',label:'Kettle',cat:'Kitchen',path:'assets/Kitchen/Ketel_7.png'},
  {id:'teapot',label:'Tea Pot',cat:'Kitchen',path:'assets/Kitchen/TeaPot.png'},
  {id:'pot',label:'Pot',cat:'Kitchen',path:'assets/Kitchen/Pot.png'},
  {id:'pot_full',label:'Pot (full)',cat:'Kitchen',path:'assets/Kitchen/Pot_Full.png'},
  {id:'frying_pan',label:'Frying Pan',cat:'Kitchen',path:'assets/Kitchen/Frying_Pan.png'},
  {id:'cutting_board',label:'Cutting Board',cat:'Kitchen',path:'assets/Kitchen/Cutting_Board.png'},
  {id:'mug_15',label:'Mug',cat:'Kitchen',path:'assets/Kitchen/Mug_15.png'},
  {id:'mug_green',label:'Mug (green)',cat:'Kitchen',path:'assets/Kitchen/Mug_Green.png'},
  {id:'mug_red',label:'Mug (red)',cat:'Kitchen',path:'assets/Kitchen/Mug_Red.png'},
  {id:'glass_1',label:'Glass 1',cat:'Kitchen',path:'assets/Kitchen/Glass_1.png'},
  {id:'glass_2',label:'Glass 2',cat:'Kitchen',path:'assets/Kitchen/Glass_2.png'},
  {id:'wine',label:'Wine',cat:'Kitchen',path:'assets/Kitchen/Wine.png'},
  {id:'cola',label:'Cola',cat:'Kitchen',path:'assets/Kitchen/Cola.png'},
  {id:'bottle',label:'Bottle',cat:'Kitchen',path:'assets/Kitchen/Bottle_12.png'},
  {id:'cereals',label:'Cereals',cat:'Kitchen',path:'assets/Kitchen/Cereals.png'},
  {id:'dish',label:'Dish',cat:'Kitchen',path:'assets/Kitchen/Dish.png'},
  {id:'trash_closed',label:'Trash (closed)',cat:'Kitchen',path:'assets/Kitchen/TrashBin_Closed.png'},
  {id:'trash_open',label:'Trash (open)',cat:'Kitchen',path:'assets/Kitchen/TrashBin_Open.png'},
  {id:'clothes_basket',label:'Clothes Basket',cat:'Kitchen',path:'assets/Kitchen/Clothes_Basket.png'},
  // Kitchen furniture colors (pick your style)
  {id:'kf_white_1',label:'Cabinet White 1',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_White/Kitchen_Furniture_White_1.png'},
  {id:'kf_white_2',label:'Cabinet White 2',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_White/Kitchen_Furniture_White_2.png'},
  {id:'kf_white_3',label:'Cabinet White 3',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_White/Kitchen_Furniture_White_3.png'},
  {id:'kf_black_1',label:'Cabinet Black 1',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_Black/Kitchen_Furniture_Black_1.png'},
  {id:'kf_black_2',label:'Cabinet Black 2',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_Black/Kitchen_Furniture_Black_2.png'},
  {id:'kf_wood_1',label:'Cabinet Wood 1',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_Wood/Kitchen_Furniture_Wood_1.png'},
  {id:'kf_wood_2',label:'Cabinet Wood 2',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_Wood/Kitchen_Furniture_Wood_2.png'},
  {id:'kf_green_1',label:'Cabinet Green 1',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_Green/Kitchen_Furniture_Green_1.png'},
  {id:'kf_green_2',label:'Cabinet Green 2',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_Green/Kitchen_Furniture_Green_2.png'},
  {id:'kf_red_1',label:'Cabinet Red 1',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_Red/Kitchen_Furniture_Red_1.png'},
  {id:'kf_orange_1',label:'Cabinet Orange 1',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_Orange/Kitchen_Furniture_Orange_1.png'},
  {id:'kf_pink_1',label:'Cabinet Pink 1',cat:'Kitchen',path:'assets/Kitchen/Kitchen Furnitures Colors/Kitchen_Furniture_Pink/Kitchen_Furniture_Pink_1.png'},
  // ── Bathroom ───────────────────────────────────────────────────────────────
  {id:'bath_mirror',label:'Mirror',cat:'Bathroom',path:'assets/Bathroom/Mirror.png'},
  {id:'bath_hanger',label:'Hanger',cat:'Bathroom',path:'assets/Bathroom/Hanger.png'},
  {id:'bath_towel_blue',label:'Towel Blue',cat:'Bathroom',path:'assets/Bathroom/Towel_Blue.png'},
  {id:'bath_towel_green',label:'Towel Green',cat:'Bathroom',path:'assets/Bathroom/Towel_Green.png'},
  {id:'bath_towel_red',label:'Towel Red',cat:'Bathroom',path:'assets/Bathroom/Towel_Red.png'},
  {id:'bath_hanging_towel',label:'Hanging Towel',cat:'Bathroom',path:'assets/Bathroom/Hanging_Towel.png'},
  {id:'wc_front1',label:'WC 1',cat:'Bathroom',path:'assets/Bathroom/Wc_Front_1.png'},
  {id:'wc_front2',label:'WC 2',cat:'Bathroom',path:'assets/Bathroom/Wc_Front_2.png'},
  {id:'wc_furniture',label:'WC Furniture',cat:'Bathroom',path:'assets/Bathroom/Wc_Furniture.png'},
  {id:'wc_tap1',label:'Tap/Sink',cat:'Bathroom',path:'assets/Bathroom/Wc_Tap_1.png'},
  {id:'wc_tap2',label:'Tap 2',cat:'Bathroom',path:'assets/Bathroom/Wc_Tap_2.png'},
  {id:'tap_shower',label:'Shower',cat:'Bathroom',path:'assets/Bathroom/Tap_Shower.png'},
  {id:'tap_wall',label:'Tap Wall',cat:'Bathroom',path:'assets/Bathroom/Tap_Wall.png'},
  {id:'shower_bin',label:'Shower Bin',cat:'Bathroom',path:'assets/Bathroom/Shower_Bin.png'},
  {id:'bath_long_shelf',label:'Long Shelf',cat:'Bathroom',path:'assets/Bathroom/Long_Shelf.png'},
  {id:'bath_small_shelf',label:'Small Shelf',cat:'Bathroom',path:'assets/Bathroom/Small_Shelf.png'},
  {id:'bath_tissues',label:'Tissues',cat:'Bathroom',path:'assets/Bathroom/Tissues.png'},
  {id:'bath_toilet_paper',label:'Toilet Paper',cat:'Bathroom',path:'assets/Bathroom/Toilet_Paper.png'},
  {id:'bath_duck',label:'Rubber Duck',cat:'Bathroom',path:'assets/Bathroom/Duck.png'},
  {id:'soap_green',label:'Soap Green',cat:'Bathroom',path:'assets/Bathroom/Soap_Green.png'},
  {id:'soap_red',label:'Soap Red',cat:'Bathroom',path:'assets/Bathroom/Soap_Red.png'},
  {id:'soap_yellow',label:'Soap Yellow',cat:'Bathroom',path:'assets/Bathroom/Soap_Yellow.png'},
  {id:'bath_1',label:'Bath 1',cat:'Bathroom',path:'assets/Bathroom/Bath_1.png'},
  {id:'bath_2',label:'Bath 2',cat:'Bathroom',path:'assets/Bathroom/Bath_2.png'},
  {id:'bath_carpet',label:'Bath Carpet',cat:'Bathroom',path:'assets/Bathroom/Bath_Carpet.png'},
  {id:'bath_window',label:'Bath Window',cat:'Bathroom',path:'assets/Bathroom/Bath_window.png'},
  // ── Animated (faltantes) ───────────────────────────────────────────────────
  {id:'washing_machine_ani',label:'Washing Machine',cat:'Animated',animated:true,speed:0.08,frames:['Closed','Open'].map(f=>`assets/Kitchen/Washing_Machine_Ani/WashingMachine_${f}.png`)},
  {id:'fridge_ani',label:'Fridge (open/close)',cat:'Animated',animated:true,speed:0.06,frames:['Base','Door_1_Closed','Door_1_Open','Door_2_Closed','Door_2_Open'].map(f=>`assets/Fridge/Fridge_Doors/Fridge_${f}.png`)},
  {id:'fridge_back_ani',label:'Fridge Back (open/close)',cat:'Animated',animated:true,speed:0.06,frames:['Base','Door_1_Closed','Door_1_Open','Door_2_Closed','Door_2_Open'].map(f=>`assets/Fridge/Fridge_Doors/Fridge(Back)_${f}.png`)},
  {id:'fridge_red_ani',label:'Fridge Red (open/close)',cat:'Animated',animated:true,speed:0.06,frames:['Base','Door_1_Closed','Door_1_Open','Door_2_Closed','Door_2_Open'].map(f=>`assets/Kitchen/Fridge_Red_Doors/Fidge_Red_${f}.png`)},
  {id:'kitchen_drawers_ani',label:'Kitchen Drawers',cat:'Animated',animated:true,speed:0.06,frames:['Base','Drawer_1_Closed','Drawer_1_Open','Drawer_2_Closed','Drawer_2_Open','Drawer_3_Closed','Drawer_3_Open'].map(f=>`assets/Kitchen/Kitchen_A_Drawers/Kitchen_A_${f}.png`)},
  {id:'oven_ani',label:'Oven (open/close)',cat:'Animated',animated:true,speed:0.06,frames:['Base','Door_Closed','Door_Open'].map(f=>`assets/Kitchen/Oven_Doors/Oven_${f}.png`)},
  {id:'wc_furniture_ani',label:'WC Furniture (drawers)',cat:'Animated',animated:true,speed:0.06,frames:['Base','Door_1_Closed','Door_1_Open','Door_2_Close','Door_2_Open'].map(f=>`assets/Bathroom/Wc_Furniture_Drawers/Wc_Furniture_${f}.png`)},
  {id:'jp_closet_ani',label:'Japanese Closet',cat:'Animated',animated:true,speed:0.06,frames:['Base','Door_1_Closed','Door_1_Open','Door_2_Closed','Door_2_Open','Drawer_Closed','Drawer_Open'].map(f=>`assets/Japanese_Room/Japanese_Closet_Drawers/Japanese_Closet_${f}.png`)},
  {id:'shelving7_ani',label:'Shelving (drawers)',cat:'Animated',animated:true,speed:0.06,frames:['Base','Drawer_1_Closed','Drawer_1_Open','Drawer_2_Closed','Drawer_2_Open'].map(f=>`assets/Living Roon/Shelving_7_Drawers/shelving_7_${f}.png`)},
  {id:'jp_door_transp',label:'Japanese Door (transp)',cat:'Animated',animated:true,speed:0.08,frames:Array.from({length:10},(_,i)=>`assets/Japanese_Room/Japanese_Door/Japanese_Door_Transp_${i+1}.png`)},
] as const
type CatalogItem = typeof CATALOG[number]
const DEFAULT_LAYOUT: LayoutData = { bgMode:'bg', items:[
  {id:'lavalamp',x:809,y:474,w:118,h:128,angle:0,sx:1.85,sy:2.01},{id:'cat',x:656,y:1163,w:76,h:76,angle:0,sx:2.38,sy:2.38},
  {id:'bigtv',x:346,y:707,w:283,h:255,angle:0,sx:2.22,sy:1.99},{id:'window7a',x:795,y:533,w:182,h:172,angle:0,sx:-1.43,sy:1.34},
  {id:'desk_a',x:1050,y:676,w:195,h:185,angle:0,sx:1.53,sy:1.45},{id:'desk_a',x:689,y:613,w:221,h:203,angle:0,sx:-1.73,sy:1.59},
  {id:'desk_b',x:868,y:523,w:208,h:190,angle:0,sx:-1.63,sy:1.49},{id:'desk_a',x:863,y:756,w:216,h:208,angle:0,sx:1.69,sy:1.63},
  {id:'gchair_a',x:754,y:635,w:159,h:170,angle:0,sx:-2.42,sy:2.66},{id:'curved_scr',x:1071,y:640,w:157,h:144,angle:0,sx:2.46,sy:2.26},
  {id:'gchair_a',x:782,y:793,w:185,h:180,angle:0,sx:2.81,sy:2.83},{id:'gchair_c',x:1021,y:729,w:185,h:162,angle:0,sx:2.81,sy:2.54},
  {id:'keyboard',x:827,y:526,w:154,h:126,angle:0,sx:-2.42,sy:1.97},{id:'gchair_d',x:699,y:599,w:169,h:162,angle:0,sx:2.57,sy:2.54},
], agentPositions:DEFAULT_AGENT_POSITIONS }
const P=(p:string)=>`/${p}`
const toWorld=(cx:number,cy:number,w:PIXI.Container)=>({x:(cx-w.x)/w.scale.x,y:(cy-w.y)/w.scale.y})
const getBounds=(sp:PIXI.Container)=>{try{const b=sp.getBounds();return{x:b.x,y:b.y,w:b.width,h:b.height}}catch{return null}}
const hitTest=(sp:PIXI.Container,cx:number,cy:number)=>{const b=getBounds(sp);if(!b)return false;return cx>=b.x&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h}
const STATUS_COLORS:Record<string,number>={working:0x4ade80,idle:0xfbbf24,meeting:0x60a5fa,offline:0x6b7280}

export default function VirtualOffice({agents=DEFAULT_AGENTS,onAgentClick,initialMode='view',layoutKey='virtual-office-layout'}:VirtualOfficeProps){
  const canvasRef=useRef<HTMLCanvasElement>(null),wrapRef=useRef<HTMLDivElement>(null),appRef=useRef<PIXI.Application|null>(null)
  const worldRef=useRef<PIXI.Container|null>(null),bgRef=useRef<PIXI.Sprite|null>(null),gridRef=useRef<PIXI.Graphics|null>(null)
  const selRef=useRef<PIXI.Container|null>(null),agentSpritesRef=useRef<Map<string,PIXI.Container>>(new Map())
  const ST=useRef({mode:'idle',lastClick:0}as any)
  const cacheBuster=useRef(Date.now())
  const [mode,setMode]=useState<'view'|'edit'>(initialMode)
  const modeRef=useRef(initialMode)
  const [selState,setSelState]=useState<{x:number;y:number;w:number;h:number;angle:number;isAgent?:boolean;agentId?:string}|null>(null)
  const [handles,setHandles]=useState<{x1:number;y1:number;x2:number;y2:number}|null>(null)
  const [showGrid,setShowGrid]=useState(false),[bgMode,setBgMode]=useState('bg'),[zoom,setZoom]=useState(35)
  const [activeCat,setActiveCat]=useState('All'),[search,setSearch]=useState(''),[loading,setLoading]=useState(true)
  const [agentPositions,setAgentPositions]=useState<Record<string,AgentPosition>>(DEFAULT_AGENT_POSITIONS)
  useEffect(()=>{modeRef.current=mode},[mode])

  const syncPanel=useCallback(()=>{const s=selRef.current;if(!s||!s.parent){setSelState(null);return};setSelState({x:Math.round(s.x),y:Math.round(s.y),w:Math.round((s as any).width||70),h:Math.round((s as any).height||70),angle:Math.round(s.angle||0),isAgent:!!(s as any)._isAgent,agentId:(s as any)._agentId})},[])
  const selectSprite=useCallback((sp:PIXI.Container|null)=>{selRef.current=sp;if(!sp){setSelState(null);setHandles(null);return};syncPanel()},[syncPanel])
  const loadLayout=useCallback(():LayoutData=>{try{const saved=localStorage.getItem(layoutKey);if(saved){const data=JSON.parse(saved);if(!data.agentPositions)data.agentPositions=DEFAULT_AGENT_POSITIONS;return data}}catch{};return DEFAULT_LAYOUT},[layoutKey])
  
  const saveLayout=useCallback(()=>{
    const world=worldRef.current;if(!world)return
    const items=world.children.filter(c=>(c instanceof PIXI.Sprite||c instanceof PIXI.AnimatedSprite)&&c!==bgRef.current&&(c as any)._catalogId).map(c=>({id:(c as any)._catalogId,x:c.x,y:c.y,w:c.width,h:c.height,angle:c.angle,sx:c.scale.x,sy:c.scale.y}))
    const pos:Record<string,AgentPosition>={};agentSpritesRef.current.forEach((sp,id)=>{pos[id]={x:sp.x,y:sp.y}})
    localStorage.setItem(layoutKey,JSON.stringify({bgMode,items,agentPositions:pos}));setAgentPositions(pos);console.log('Saved:',pos)
  },[bgMode,layoutKey])

  const createAgentSprite=useCallback((agent:Agent,pos:AgentPosition,isEdit:boolean):PIXI.Container=>{
    const c=new PIXI.Container();c.x=pos.x;c.y=pos.y;(c as any)._isAgent=true;(c as any)._agentId=agent.id
    const circle=new PIXI.Graphics();circle.circle(0,0,35);circle.fill({color:parseInt(agent.color.slice(1),16),alpha:0.9});circle.stroke({width:3,color:isEdit?0x00d4ff:0xffffff,alpha:0.8});c.addChild(circle)
    const status=new PIXI.Graphics();status.circle(25,-25,10);status.fill({color:STATUS_COLORS[agent.status]});status.stroke({width:2,color:0xffffff});c.addChild(status)
    const av=new PIXI.Text({text:agent.avatar,style:{fontSize:28}});av.anchor.set(0.5);c.addChild(av)
    const nm=new PIXI.Text({text:agent.name,style:{fontSize:14,fontWeight:'bold',fill:isEdit?0x00d4ff:0xffffff,dropShadow:{color:0x000000,distance:1,alpha:1,blur:1}}});nm.anchor.set(0.5,0);nm.y=45;c.addChild(nm)
    if(isEdit){const badge=new PIXI.Text({text:'✎',style:{fontSize:12,fill:0x00d4ff}});badge.anchor.set(0.5);badge.x=-30;badge.y=-30;c.addChild(badge)}
    if(!isEdit&&agent.status==='working'){let t=Math.random()*Math.PI*2;const anim=()=>{t+=0.05;c.scale.set(1+Math.sin(t)*0.05)};(c as any)._tick=anim;PIXI.Ticker.shared.add(anim)}
    return c
  },[])

  const renderAgents=useCallback((positions:Record<string,AgentPosition>,isEdit:boolean)=>{
    const world=worldRef.current;if(!world)return
    agentSpritesRef.current.forEach(sp=>{if((sp as any)._tick)PIXI.Ticker.shared.remove((sp as any)._tick);world.removeChild(sp);sp.destroy({children:true})})
    agentSpritesRef.current.clear()
    for(const agent of agents){const pos=positions[agent.id]||DEFAULT_AGENT_POSITIONS[agent.id];if(!pos)continue
      const sp=createAgentSprite(agent,pos,isEdit);sp.zIndex=1000+agents.indexOf(agent)
      if(!isEdit){sp.eventMode='static';sp.cursor='pointer';sp.on('pointerdown',()=>onAgentClick?.(agent))}
      world.addChild(sp);agentSpritesRef.current.set(agent.id,sp)}
  },[agents,createAgentSprite,onAgentClick])

  const doLoadBG=useCallback((m:string,world?:PIXI.Container|null)=>{
    const w=world||worldRef.current;if(!w)return
    if(bgRef.current){try{w.removeChild(bgRef.current);bgRef.current.destroy()}catch{};bgRef.current=null}
    const url=m==='bg'?P('assets/cuarto.png')+'?v='+cacheBuster.current:null;if(!url)return
    PIXI.Assets.load({src:url,alias:'bg_'+cacheBuster.current}).then(tex=>{if(!worldRef.current)return;const bg=new PIXI.Sprite(tex);bg.width=CW;bg.height=CH;bg.zIndex=-1000;w.addChildAt(bg,0);bgRef.current=bg}).catch(()=>{})
  },[])

  const loadItems=useCallback(async(layout:LayoutData)=>{
    const world=worldRef.current;if(!world)return
    world.children.slice().forEach(c=>{if((c instanceof PIXI.Sprite||c instanceof PIXI.AnimatedSprite)&&c!==bgRef.current&&!(c as any)._isAgent)world.removeChild(c)})
    for(const sv of layout.items){const item=CATALOG.find(i=>i.id===sv.id);if(!item)continue
      let sp:PIXI.Sprite|PIXI.AnimatedSprite
      try{if('animated' in item&&item.animated&&'frames' in item){const tx=await Promise.all(item.frames.map(f=>PIXI.Assets.load(P(f))));sp=new PIXI.AnimatedSprite(tx);(sp as PIXI.AnimatedSprite).animationSpeed=item.speed||0.08;(sp as PIXI.AnimatedSprite).play()}
        else if('path' in item){sp=new PIXI.Sprite(await PIXI.Assets.load(P(item.path)))}else continue}catch{continue}
      sp.x=sv.x;sp.y=sv.y;sp.width=sv.w;sp.height=sv.h;sp.angle=sv.angle;sp.scale.x=sv.sx;sp.scale.y=sv.sy;(sp as any)._catalogId=sv.id;world.addChild(sp)}
  },[])

  const addItem=useCallback(async(item:CatalogItem)=>{
    const world=worldRef.current;if(!world)return;let sp:PIXI.Sprite|PIXI.AnimatedSprite
    try{if('animated' in item&&item.animated&&'frames' in item){const tx=await Promise.all(item.frames.map(f=>PIXI.Assets.load(P(f))));sp=new PIXI.AnimatedSprite(tx);(sp as PIXI.AnimatedSprite).animationSpeed=item.speed||0.08;(sp as PIXI.AnimatedSprite).play()}
      else if('path' in item){sp=new PIXI.Sprite(await PIXI.Assets.load(P(item.path)))}else return}catch{return}
    sp.x=CW/2-sp.width/2;sp.y=CH/2-sp.height/2;(sp as any)._catalogId=item.id;world.addChild(sp);selectSprite(sp)
  },[selectSprite])

  const updateProp=useCallback((prop:string,val:string)=>{const sp=selRef.current;if(!sp)return;if(prop==='x')sp.x=+val;if(prop==='y')sp.y=+val;if(!(sp as any)._isAgent){if(prop==='w')(sp as any).width=Math.max(MIN_SZ,+val);if(prop==='h')(sp as any).height=Math.max(MIN_SZ,+val);if(prop==='angle')sp.angle=+val};setSelState(p=>p?{...p,[prop]:+val}:null)},[])
  const flipH=useCallback(()=>{const s=selRef.current;if(s&&!(s as any)._isAgent)s.scale.x*=-1},[])
  const flipV=useCallback(()=>{const s=selRef.current;if(s&&!(s as any)._isAgent)s.scale.y*=-1},[])
  const zOrder=useCallback((dir:string)=>{const s=selRef.current,w=worldRef.current;if(!s||!w||(s as any)._isAgent)return;const idx=w.getChildIndex(s),max=w.children.length-1;if(dir==='front'&&idx<max)w.setChildIndex(s,max);else if(dir==='back'&&idx>0)w.setChildIndex(s,0);else if(dir==='up'&&idx<max)w.setChildIndex(s,idx+1);else if(dir==='down'&&idx>0)w.setChildIndex(s,idx-1)},[])
  const deleteSel=useCallback(()=>{const s=selRef.current;if(!s||(s as any)._isAgent)return;s.parent?.removeChild(s);s.destroy();selectSprite(null)},[selectSprite])
  const clearAll=useCallback(()=>{const world=worldRef.current;if(!world)return;world.children.slice().forEach(c=>{if((c instanceof PIXI.Sprite||c instanceof PIXI.AnimatedSprite)&&c!==bgRef.current&&!(c as any)._isAgent)world.removeChild(c)});selectSprite(null)},[selectSprite])
  const resetView=useCallback(()=>{const world=worldRef.current;if(!world)return;const s=0.35;world.scale.set(s);world.x=(VW-CW*s)/2;world.y=(VH-CH*s)/2;setZoom(35)},[])
  const switchToEdit=useCallback(()=>{setMode('edit');selectSprite(null);renderAgents(agentPositions,true)},[agentPositions,renderAgents,selectSprite])
  const switchToView=useCallback(()=>{saveLayout();setMode('view');selectSprite(null);const pos:Record<string,AgentPosition>={};agentSpritesRef.current.forEach((sp,id)=>{pos[id]={x:sp.x,y:sp.y}});renderAgents(pos,false)},[saveLayout,renderAgents,selectSprite])

  useEffect(()=>{if(mode!=='edit'){setHandles(null);return};let raf:number
    const tick=()=>{raf=requestAnimationFrame(tick);const sp=selRef.current,world=worldRef.current,wrap=wrapRef.current,canvas=canvasRef.current;if(!sp||!sp.parent||!world||!wrap||!canvas){setHandles(null);return};const b=getBounds(sp);if(!b||b.w<1){setHandles(null);return};const cr=canvas.getBoundingClientRect(),wr=wrap.getBoundingClientRect();const ox=cr.left-wr.left,oy=cr.top-wr.top,pad=5;setHandles({x1:ox+b.x-pad,y1:oy+b.y-pad,x2:ox+b.x+b.w+pad,y2:oy+b.y+b.h+pad})}
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[mode])

  useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const app=new PIXI.Application()
    app.init({canvas,width:VW,height:VH,backgroundAlpha:0,resolution:window.devicePixelRatio||1,autoDensity:true}).then(async()=>{
      appRef.current=app;const world=new PIXI.Container();world.sortableChildren=true;worldRef.current=world;app.stage.addChild(world)
      const s0=0.35;world.scale.set(s0);world.x=(VW-CW*s0)/2;world.y=(VH-CH*s0)/2
      const border=new PIXI.Graphics();border.setStrokeStyle({width:2,color:0x00d4ff,alpha:0.2});border.rect(0,0,CW,CH);border.stroke();border.zIndex=-500;world.addChild(border)
      const grid=new PIXI.Graphics();grid.zIndex=-400;gridRef.current=grid;world.addChild(grid)
      const layout=loadLayout();setBgMode(layout.bgMode);setAgentPositions(layout.agentPositions||DEFAULT_AGENT_POSITIONS);doLoadBG(layout.bgMode,world);await loadItems(layout);renderAgents(layout.agentPositions||DEFAULT_AGENT_POSITIONS,modeRef.current==='edit');setLoading(false)})
    const onWheel=(e:WheelEvent)=>{e.preventDefault();const world=worldRef.current;if(!world||ST.current.mode!=='idle')return;const f=e.deltaY>0?0.9:1.1,ns=Math.min(Math.max(world.scale.x*f,0.12),4),rect=canvas.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;world.x=mx-(mx-world.x)*(ns/world.scale.x);world.y=my-(my-world.y)*(ns/world.scale.y);world.scale.set(ns);setZoom(Math.round(ns*100))}
    const onDown=(e:PointerEvent)=>{if(ST.current.mode==='resize')return;const world=worldRef.current;if(!world)return
      if(e.button===1||e.button===2){ST.current={...ST.current,mode:'pan',panMouse:{x:e.clientX,y:e.clientY},panWorld:{x:world.x,y:world.y}};canvas.setPointerCapture(e.pointerId);e.preventDefault();return}
      if(e.button!==0)return;const rect=canvas.getBoundingClientRect(),cx=e.clientX-rect.left,cy=e.clientY-rect.top;if(modeRef.current==='view')return
      const all=world.children.filter(c=>((c instanceof PIXI.Sprite||c instanceof PIXI.AnimatedSprite)&&c!==bgRef.current)||(c as any)._isAgent)as PIXI.Container[]
      let hit:PIXI.Container|null=null;const sorted=[...all].sort((a,b)=>(b.zIndex||0)-(a.zIndex||0));for(const item of sorted){if(hitTest(item,cx,cy)){hit=item;break}}
      if(!hit){selectSprite(null);return};const now=Date.now();if(hit===selRef.current&&now-ST.current.lastClick<300&&!(hit as any)._isAgent){hit.parent?.removeChild(hit);hit.destroy();selectSprite(null);ST.current={...ST.current,lastClick:0};return}
      ST.current={...ST.current,lastClick:now};selectSprite(hit);if(!(hit as any)._isAgent){world.setChildIndex(hit,world.children.length-1);hit.alpha=0.78}
      const wp=toWorld(cx,cy,world);ST.current={...ST.current,mode:'drag',dragOff:{x:wp.x-hit.x,y:wp.y-hit.y}};canvas.setPointerCapture(e.pointerId)}
    const onMove=(e:PointerEvent)=>{const world=worldRef.current;if(!world)return;const rect=canvas.getBoundingClientRect(),cx=e.clientX-rect.left,cy=e.clientY-rect.top
      if(ST.current.mode==='pan'){world.x=ST.current.panWorld.x+(e.clientX-ST.current.panMouse.x);world.y=ST.current.panWorld.y+(e.clientY-ST.current.panMouse.y);return}
      if(ST.current.mode==='drag'){const sp=selRef.current;if(!sp)return;const wp=toWorld(cx,cy,world);sp.x=wp.x-ST.current.dragOff.x;sp.y=wp.y-ST.current.dragOff.y;syncPanel();return}
      if(ST.current.mode==='resize'){const sp=selRef.current;if(!sp||(sp as any)._isAgent)return;const dsx=cx-ST.current.startMouse.x,dsy=cy-ST.current.startMouse.y,sc=world.scale.x,dwx=dsx/sc,dwy=dsy/sc,{x,y,w,h}=ST.current.startSprite
        switch(ST.current.corner){case'br':(sp as any).width=Math.max(MIN_SZ,w+dwx);(sp as any).height=Math.max(MIN_SZ,h+dwy);break;case'tl':{const nw=Math.max(MIN_SZ,w-dwx),nh=Math.max(MIN_SZ,h-dwy);sp.x=x+(w-nw);sp.y=y+(h-nh);(sp as any).width=nw;(sp as any).height=nh;break};case'tr':{const nh=Math.max(MIN_SZ,h-dwy);sp.y=y+(h-nh);(sp as any).width=Math.max(MIN_SZ,w+dwx);(sp as any).height=nh;break};case'bl':{const nw=Math.max(MIN_SZ,w-dwx);sp.x=x+(w-nw);(sp as any).width=nw;(sp as any).height=Math.max(MIN_SZ,h+dwy);break}};syncPanel()}}
    const onUp=(e:PointerEvent)=>{const sp=selRef.current;if(ST.current.mode==='drag'&&sp){sp.alpha=1};ST.current={...ST.current,mode:'idle'};try{canvas.releasePointerCapture(e.pointerId)}catch{};syncPanel()}
    const onKey=(e:KeyboardEvent)=>{if(modeRef.current!=='edit')return;const sp=selRef.current;if(!sp||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?10:1;if(e.key==='ArrowLeft')sp.x-=step;if(e.key==='ArrowRight')sp.x+=step;if(e.key==='ArrowUp')sp.y-=step;if(e.key==='ArrowDown')sp.y+=step;syncPanel()}
    canvas.addEventListener('wheel',onWheel,{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);window.addEventListener('keydown',onKey)
    return()=>{canvas.removeEventListener('wheel',onWheel);canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('pointercancel',onUp);window.removeEventListener('keydown',onKey);appRef.current?.destroy(true);appRef.current=null}},[])

  const startResize=useCallback((e:React.PointerEvent,corner:string)=>{const sp=selRef.current;if(!sp||(sp as any)._isAgent)return;e.stopPropagation();e.preventDefault();const world=worldRef.current;if(!world)return
    const el=e.currentTarget as HTMLElement;el.setPointerCapture(e.pointerId);ST.current={...ST.current,mode:'resize',corner,startMouse:{x:e.clientX,y:e.clientY},startSprite:{x:sp.x,y:sp.y,w:(sp as any).width,h:(sp as any).height}}
    const onMove=(ev:PointerEvent)=>{if(ST.current.mode!=='resize')return;const s=selRef.current,w=worldRef.current;if(!s||!w||(s as any)._isAgent)return;const dsx=ev.clientX-ST.current.startMouse.x,dsy=ev.clientY-ST.current.startMouse.y,sc=w.scale.x,dwx=dsx/sc,dwy=dsy/sc,{x,y,w:sw,h:sh}=ST.current.startSprite
      switch(ST.current.corner){case'br':(s as any).width=Math.max(MIN_SZ,sw+dwx);(s as any).height=Math.max(MIN_SZ,sh+dwy);break;case'tl':{const nw=Math.max(MIN_SZ,sw-dwx),nh=Math.max(MIN_SZ,sh-dwy);s.x=x+(sw-nw);s.y=y+(sh-nh);(s as any).width=nw;(s as any).height=nh;break};case'tr':{const nh=Math.max(MIN_SZ,sh-dwy);s.y=y+(sh-nh);(s as any).width=Math.max(MIN_SZ,sw+dwx);(s as any).height=nh;break};case'bl':{const nw=Math.max(MIN_SZ,sw-dwx);s.x=x+(sw-nw);(s as any).width=nw;(s as any).height=Math.max(MIN_SZ,sh+dwy);break}};syncPanel()}
    const onUp=()=>{ST.current={...ST.current,mode:'idle'};syncPanel();el.removeEventListener('pointermove',onMove);el.removeEventListener('pointerup',onUp)}
    el.addEventListener('pointermove',onMove);el.addEventListener('pointerup',onUp)},[syncPanel])

  const B:React.CSSProperties={padding:'4px 8px',background:'#1e1e2e',border:'1px solid #333',borderRadius:4,color:'#aaa',cursor:'pointer',fontSize:11}
  const G:React.CSSProperties={background:'#1a1a28',borderRadius:6,padding:8,border:'1px solid #2a2a3a',display:'flex',flexDirection:'column',gap:4}
  const L:React.CSSProperties={color:'#888',fontSize:10,display:'flex',flexDirection:'column',gap:2,flex:1}
  const I:React.CSSProperties={background:'#0f0f1a',border:'1px solid #333',borderRadius:3,padding:'3px 5px',color:'#ddd',fontSize:11,width:'100%',boxSizing:'border-box'}
  const T:React.CSSProperties={color:'#00d4ff',fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:1}
  const CATS=['All',...new Set(CATALOG.map(c=>c.cat))]
  const items=CATALOG.filter(c=>(activeCat==='All'||c.cat===activeCat)&&(!search||c.label.toLowerCase().includes(search.toLowerCase())))
  const HS=10,HCURS:Record<string,string>={tl:'nwse-resize',tr:'nesw-resize',bl:'nesw-resize',br:'nwse-resize'}

  return(<div style={{display:'flex',height:'100%',background:'#0f0f1a',color:'#e0e0e0',fontFamily:'system-ui,sans-serif',fontSize:12,userSelect:'none'}}>
    {mode==='edit'&&<div style={{width:200,background:'#16161e',borderRight:'1px solid #2a2a3a',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'10px 12px',borderBottom:'1px solid #2a2a3a',background:'#1a1a2e'}}><div style={{color:'#00d4ff',fontWeight:700,fontSize:13}}>OFFICE EDITOR</div><div style={{color:'#555',fontSize:9,marginTop:2}}>Mission Control · RIVAIB</div></div>
      <div style={{padding:'8px 12px',borderBottom:'1px solid #2a2a3a',display:'flex',gap:4}}><button onClick={()=>setShowGrid(g=>!g)} style={{...B,border:`1px solid ${showGrid?'#00d4ff':'#333'}`,background:showGrid?'#00d4ff22':'#1e1e2e',color:showGrid?'#00d4ff':'#888'}}>⊞</button><button onClick={resetView} style={B}>🎯</button><span style={{color:'#444',fontSize:10,marginLeft:'auto'}}>{zoom}%</span></div>
      <div style={{padding:'8px 12px',borderBottom:'1px solid #2a2a3a',display:'flex',gap:4}}><button onClick={saveLayout} style={B}>💾</button><button onClick={clearAll} style={{...B,color:'#ff6b6b'}}>🗑</button></div>
      <div style={{padding:'8px 12px',borderBottom:'1px solid #2a2a3a',background:'#1a1a28'}}><div style={{color:'#f0a',fontSize:10,fontWeight:600,marginBottom:4}}>💡 AGENTS</div><div style={{color:'#666',fontSize:9,lineHeight:1.5}}>Arrastra los agents para posicionarlos. Click Save & View para guardar.</div></div>
      <div style={{padding:'6px 12px',borderBottom:'1px solid #2a2a3a'}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{...I,padding:'5px 8px'}}/></div>
      <div style={{padding:'6px 12px',borderBottom:'1px solid #2a2a3a',display:'flex',flexWrap:'wrap',gap:3}}>{CATS.map(cat=><button key={cat} onClick={()=>setActiveCat(cat)} style={{padding:'2px 5px',background:activeCat===cat?'#00d4ff22':'transparent',border:`1px solid ${activeCat===cat?'#00d4ff':'#333'}`,borderRadius:3,color:activeCat===cat?'#00d4ff':'#888',cursor:'pointer',fontSize:10}}>{cat}</button>)}</div>
      <div style={{flex:1,overflowY:'auto',padding:'4px 8px'}}>{items.map(item=><div key={item.id} onClick={()=>addItem(item)} style={{padding:'5px 8px',marginBottom:2,background:'#1a1a28',borderRadius:4,cursor:'pointer',border:'1px solid #22223a',display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:10,color:'animated' in item?'#f0a':'#0af',minWidth:14}}>{'animated' in item?'▶':'◆'}</span><div><div style={{color:'#ccc',fontSize:11}}>{item.label}</div><div style={{color:'#555',fontSize:9}}>{item.cat}</div></div></div>)}</div>
    </div>}
    <div ref={wrapRef} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#080810',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:'repeating-conic-gradient(#141420 0% 25%, #0e0e1a 0% 50%)',backgroundSize:'16px 16px',opacity:0.5}}/>
      {loading&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.8)',zIndex:100}}><div style={{color:'#00d4ff',fontSize:16}}>Loading...</div></div>}
      <button onClick={mode==='view'?switchToEdit:switchToView} style={{position:'absolute',top:10,right:10,zIndex:50,padding:'8px 16px',background:mode==='edit'?'#22c55e':'#3b82f6',border:'none',borderRadius:6,color:'white',fontWeight:600,cursor:'pointer',fontSize:12}}>{mode==='edit'?'✓ Save & View':'✏️ Edit'}</button>
      <canvas ref={canvasRef} style={{position:'relative',zIndex:1,display:'block',touchAction:'none'}}/>
      {mode==='edit'&&handles&&selState&&!selState.isAgent&&(()=>{const{x1,y1,x2,y2}=handles,bw=x2-x1,bh=y2-y1;return<><div style={{position:'absolute',left:x1,top:y1,width:bw,height:bh,border:'1.5px solid #00d4ff',background:'rgba(0,212,255,0.04)',pointerEvents:'none',zIndex:10,boxSizing:'border-box'}}/>{[{c:'tl',left:x1-HS/2,top:y1-HS/2},{c:'tr',left:x2-HS/2,top:y1-HS/2},{c:'bl',left:x1-HS/2,top:y2-HS/2},{c:'br',left:x2-HS/2,top:y2-HS/2}].map(({c,left,top})=><div key={c} onPointerDown={e=>startResize(e,c)} style={{position:'absolute',left,top,width:HS,height:HS,background:'#fff',border:'1.5px solid #00d4ff',borderRadius:2,cursor:HCURS[c],zIndex:11,boxSizing:'border-box'}}/>)}</>})()}
      {mode==='edit'&&handles&&selState?.isAgent&&(()=>{const{x1,y1,x2,y2}=handles,bw=x2-x1,bh=y2-y1;return<div style={{position:'absolute',left:x1,top:y1,width:bw,height:bh,border:'2px dashed #f0a',background:'rgba(255,0,170,0.1)',pointerEvents:'none',zIndex:10,boxSizing:'border-box',borderRadius:'50%'}}/>})()}
      {mode==='view'&&!loading&&<div style={{position:'absolute',bottom:10,left:10,background:'rgba(0,0,0,0.8)',borderRadius:8,padding:12,zIndex:50}}><div style={{color:'#888',fontSize:10,marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>Agents</div><div style={{display:'flex',flexDirection:'column',gap:4}}>{agents.map(a=><div key={a.id} style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:8,height:8,borderRadius:'50%',background:`#${STATUS_COLORS[a.status].toString(16).padStart(6,'0')}`}}/><span style={{color:a.color,fontSize:11,fontWeight:600}}>{a.name}</span><span style={{color:'#666',fontSize:9}}>{a.status}</span></div>)}</div></div>}
    </div>
    {mode==='edit'&&<div style={{width:175,background:'#16161e',borderLeft:'1px solid #2a2a3a',padding:10,display:'flex',flexDirection:'column',gap:7,overflowY:'auto'}}>
      <div style={{color:'#00d4ff',fontWeight:700,fontSize:11,letterSpacing:1}}>PROPIEDADES</div>
      {!selState?<div style={{color:'#444',fontSize:10,textAlign:'center',marginTop:30,lineHeight:2.2}}>Click → seleccionar<br/>Doble click → borrar<br/>↑↓←→ mover<br/>Handles → resize<br/>Scroll → zoom<br/>Clic der → pan</div>
      :selState.isAgent?<div style={G}><div style={{...T,color:'#f0a'}}>🤖 {selState.agentId?.toUpperCase()}</div><div style={{color:'#888',fontSize:10,lineHeight:1.5}}>Arrastra para mover.</div><div style={{display:'flex',gap:4,marginTop:8}}><label style={L}>X<input type="number" value={selState.x} onChange={e=>updateProp('x',e.target.value)} style={I}/></label><label style={L}>Y<input type="number" value={selState.y} onChange={e=>updateProp('y',e.target.value)} style={I}/></label></div></div>
      :<><div style={G}><div style={T}>Posición</div><div style={{display:'flex',gap:4}}><label style={L}>X<input type="number" value={selState.x} onChange={e=>updateProp('x',e.target.value)} style={I}/></label><label style={L}>Y<input type="number" value={selState.y} onChange={e=>updateProp('y',e.target.value)} style={I}/></label></div></div>
        <div style={G}><div style={T}>Tamaño</div><div style={{display:'flex',gap:4}}><label style={L}>W<input type="number" value={selState.w} onChange={e=>updateProp('w',e.target.value)} style={I}/></label><label style={L}>H<input type="number" value={selState.h} onChange={e=>updateProp('h',e.target.value)} style={I}/></label></div></div>
        <div style={G}><div style={T}>Ángulo</div><input type="range" min="-180" max="180" value={selState.angle} onChange={e=>updateProp('angle',e.target.value)} style={{width:'100%'}}/><div style={{textAlign:'center',color:'#999',fontSize:11}}>{selState.angle}°</div></div>
        <div style={G}><div style={T}>Voltear</div><div style={{display:'flex',gap:4}}><button onClick={flipH} style={{...B,flex:1}}>↔ H</button><button onClick={flipV} style={{...B,flex:1}}>↕ V</button></div></div>
        <div style={G}><div style={T}>Z-Order</div><div style={{display:'flex',gap:4,marginBottom:4}}><button onClick={()=>zOrder('front')} style={{...B,flex:1,fontSize:10}}>Top</button><button onClick={()=>zOrder('back')} style={{...B,flex:1,fontSize:10}}>Bot</button></div><div style={{display:'flex',gap:4}}><button onClick={()=>zOrder('up')} style={{...B,flex:1}}>▲</button><button onClick={()=>zOrder('down')} style={{...B,flex:1}}>▼</button></div></div>
        <div style={G}><div style={T}>Acciones</div><button onClick={deleteSel} style={{...B,width:'100%',color:'#ff6b6b'}}>🗑 Eliminar</button></div></>}
    </div>}
  </div>)
}
