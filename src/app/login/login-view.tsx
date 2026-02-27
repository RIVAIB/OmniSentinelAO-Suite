'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

function LoginForm() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const searchParams = useSearchParams()
    const supabase = createClient()

    // Mostrar error de auth si viene del callback
    useEffect(() => {
        const error = searchParams.get('error')
        if (error) {
            toast.error(decodeURIComponent(error))
        }
    }, [searchParams])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        if (error) {
            toast.error('Error al enviar el enlace: ' + error.message)
        } else {
            toast.success('¡Enlace enviado! Revisa tu email.')
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                    id="email"
                    type="email"
                    placeholder="nombre@ejemplo.com"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Enlace Mágico'}
            </Button>
        </form>
    )
}

export function LoginView() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    )
}
