"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import type { LoginActionState } from "@/app/login/actions";
import { Alert, Button, Field, Input } from "@/components/ui/primitives";

export function LoginForm({
  action,
}: {
  action: (state: LoginActionState, formData: FormData) => Promise<LoginActionState>;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const initialState: LoginActionState = { error: "" };
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <Field label="Username / Email">
        <Input
          name="identifier"
          type="text"
          required
          placeholder="Masukan Username atau Email"
        />
      </Field>

      <Field label="Password">
        <div className="relative">
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            placeholder="Masukan Password"
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-lg text-slate-500 transition hover:text-slate-900"
            aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {state.error ? <Alert>{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
