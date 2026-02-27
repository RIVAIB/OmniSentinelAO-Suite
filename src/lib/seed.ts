/**
 * Seed script for RIVAIB Mission Control
 * Run with: npx tsx src/lib/seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Make sure .env.local has:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// RIVAIB AGENTS DATA
// ============================================

const agents = [
  {
    name: 'CLAWDIO',
    type: 'orchestrator',
    status: 'active',
    config: {
      systemPrompt: 'You are CLAWDIO, the central orchestrator for RIVAIB Health Clinic. Your role is to route incoming messages to the appropriate specialist agent and coordinate multi-step workflows.',
      model: 'claude-3-5-sonnet',
      temperature: 0.3,
      maxTokens: 2048,
      tools: ['route_message', 'create_mission', 'escalate_to_human'],
      metadata: {
        role: 'Central Orchestrator',
        channels: ['whatsapp', 'telegram', 'webchat'],
      },
    },
  },
  {
    name: 'JESSY',
    type: 'specialist',
    status: 'active',
    config: {
      systemPrompt: 'You are JESSY, the WhatsApp assistant for RIVAIB Health Clinic. You handle patient conversations with a warm, professional H2H (Human-to-Human) feel. You never say "sesión" or "consulta" - always use "Evaluación Diagnóstica" and "Programa de Rehabilitación". Standard program is 13 sessions.',
      model: 'claude-3-5-sonnet',
      temperature: 0.7,
      maxTokens: 1024,
      tools: ['check_availability', 'book_appointment', 'get_patient_info', 'send_reminder'],
      metadata: {
        role: 'WhatsApp Patient Assistant',
        protocol: 'H2H + MLP + REHAB-ENGINE',
        channels: ['whatsapp'],
      },
    },
  },
  {
    name: 'NEXUS',
    type: 'specialist',
    status: 'active',
    config: {
      systemPrompt: 'You are NEXUS, the marketing specialist for RIVAIB Health Clinic. You manage lead capture, remarketing campaigns to the 7000+ patient database, and growth strategies.',
      model: 'claude-3-5-sonnet',
      temperature: 0.6,
      maxTokens: 2048,
      tools: ['capture_lead', 'create_campaign', 'analyze_funnel', 'schedule_post'],
      metadata: {
        role: 'Marketing Automation',
        funnelStages: 16,
        patientDatabase: '7000+',
      },
    },
  },
  {
    name: 'APEX',
    type: 'specialist',
    status: 'inactive',
    config: {
      systemPrompt: 'You are APEX, the finance specialist for RIVAIB Health Clinic. You manage billing, payments, financial reporting, and BigCapital integration.',
      model: 'claude-3-5-sonnet',
      temperature: 0.2,
      maxTokens: 2048,
      tools: ['generate_invoice', 'process_payment', 'financial_report', 'sync_bigcapital'],
      metadata: {
        role: 'Finance Management',
        integration: 'BigCapital',
        currency: 'BOB',
      },
    },
  },
  {
    name: 'AXIOM',
    type: 'specialist',
    status: 'active',
    config: {
      systemPrompt: 'You are AXIOM, the CEO/strategic advisor for RIVAIB Health Clinic. You provide business intelligence, strategic recommendations, and executive dashboards.',
      model: 'claude-3-5-sonnet',
      temperature: 0.4,
      maxTokens: 4096,
      tools: ['generate_report', 'analyze_metrics', 'strategic_recommendation', 'competitor_analysis'],
      metadata: {
        role: 'CEO Strategic Advisor',
        vision: 'RIVAIB Holding: Health, Tech, MED-Nutrition',
      },
    },
  },
  {
    name: 'FORGE',
    type: 'utility',
    status: 'maintenance',
    config: {
      systemPrompt: 'You are FORGE, the senior developer assistant for RIVAIB. You help with code generation, debugging, system architecture, and technical documentation. You explain the WHY behind decisions and point out potential issues without filtering.',
      model: 'claude-3-5-sonnet',
      temperature: 0.5,
      maxTokens: 8192,
      tools: ['generate_code', 'debug_error', 'review_code', 'create_migration'],
      metadata: {
        role: 'Development Assistant',
        stack: ['Next.js', 'TypeScript', 'Supabase', 'Notion API', 'whatsapp-web.js'],
      },
    },
  },
];

// ============================================
// SEED FUNCTION
// ============================================

async function seed() {
  console.log('🌱 Starting seed process...\n');

  // Clear existing agents (optional - comment out if you want to keep existing)
  console.log('🗑️  Clearing existing agents...');
  const { error: deleteError } = await supabase
    .from('agents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('Error clearing agents:', deleteError.message);
  }

  // Insert agents
  console.log('📝 Inserting RIVAIB agents...\n');

  for (const agent of agents) {
    const { data, error } = await supabase
      .from('agents')
      .insert(agent)
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to insert ${agent.name}:`, error.message);
    } else {
      const statusIcon = agent.status === 'active' ? '🟢' : agent.status === 'maintenance' ? '🟡' : '⚫';
      console.log(`${statusIcon} ${agent.name} (${agent.type}) - ${agent.status}`);
    }
  }

  console.log('\n✅ Seed completed!');
  console.log(`📊 Total agents inserted: ${agents.length}`);
}

// Run seed
seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
