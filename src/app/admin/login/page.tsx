import Image from "next/image";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-cream text-coffee">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Alma Café & Resto"
            width={140}
            height={140}
            className="object-contain drop-shadow-sm"
            priority
          />
        </div>

        <h1 className="font-serif text-2xl font-semibold text-center mb-2">Panel de Administración</h1>
        <p className="text-center text-coffee/60 text-sm mb-6">
          Gestiona el menú digital de Alma Café.
        </p>

        {message && (
          <p className="text-sage text-sm text-center mb-4 bg-sage/10 rounded-lg px-3 py-2">
            {message}
          </p>
        )}
        {error && (
          <p className="text-red-700 text-sm text-center mb-4 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <form action={signIn} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full rounded-xl border border-sand/50 bg-white/70 px-4 py-3 font-sans text-sm outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/20"
          />
          <input
            name="password"
            type="password"
            placeholder="Contraseña"
            required
            minLength={6}
            className="w-full rounded-xl border border-sand/50 bg-white/70 px-4 py-3 font-sans text-sm outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/20"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-copper text-white font-sans font-semibold py-3 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
