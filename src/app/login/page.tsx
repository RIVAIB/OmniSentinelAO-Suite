import { LoginView } from './login-view'

export default function LoginPage() {
    return (
        <div className="container relative flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-1 lg:px-0 min-h-screen">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                <div className="flex flex-col space-y-2 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">
                        War Room Login
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Introduce tu email para recibir un enlace de acceso
                    </p>
                </div>
                <LoginView />
            </div>
        </div>
    )
}
