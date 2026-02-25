import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { MessageSquare, ChevronRight, Clock } from 'lucide-react'
import { NewSessionForm } from '@/components/session/NewSessionForm'
import { SessionList } from '@/components/session/SessionList'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
          WAR ROOM
        </h1>
        <p className="max-w-[600px] text-muted-foreground md:text-xl mb-8 leading-relaxed">
          Technical Debate & Decision Engine. Orchestrate real-time discussions between Claude and Gemini to solve complex engineering challenges.
        </p>
        <Link href="/login">
          <Button size="lg" className="font-bold bg-purple-600 hover:bg-purple-700 h-12 px-8 shadow-lg shadow-purple-500/20">
            ENTRAR AL WAR ROOM
          </Button>
        </Link>
      </div>
    )
  }

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .order('updated_at', { ascending: false })

  return (
    <div className="container py-12 max-w-6xl">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 uppercase">Mis Sesiones</h1>
          <p className="text-muted-foreground italic">
            Bienvenido, <span className="text-purple-400 font-medium">{user.email}</span>
          </p>
        </div>
        <NewSessionForm />
      </div>

      <SessionList initialSessions={sessions || []} />
    </div>
  )
}
